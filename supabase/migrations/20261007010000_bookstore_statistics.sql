-- Durable, server-written statistics. Readers only receive aggregates for their stores.
create table public.bookstores (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text not null check (length(name) between 1 and 120),
  questionnaire_path text not null check (questionnaire_path ~ '^/[a-z0-9/-]+/$'),
  qr_path text not null check (qr_path ~ '^/[a-z0-9/.-]+\.svg$'),
  timezone text not null default 'Europe/Madrid',
  active boolean not null default true,
  tracking_since timestamptz not null default now()
);
insert into public.bookstores (slug, name, questionnaire_path, qr_path)
values ('carlin-la-reina', 'Carlin La Reina', '/carlin-la-reina/', '/librerias/carlin-la-reina/qr.svg');

create table public.bookstore_quiz_runs (
  bookstore_slug text not null references public.bookstores(slug),
  run_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (bookstore_slug, run_id)
);
create index bookstore_quiz_runs_by_date on public.bookstore_quiz_runs (bookstore_slug, completed_at);

-- Keep title/author snapshots, so later catalog imports do not erase the history.
create table public.bookstore_recommendation_events (
  bookstore_slug text not null,
  run_id uuid not null,
  book_id text not null,
  title text not null,
  author text not null,
  position smallint not null check (position between 1 and 3),
  primary key (bookstore_slug, run_id, book_id),
  unique (bookstore_slug, run_id, position),
  foreign key (bookstore_slug, run_id) references public.bookstore_quiz_runs(bookstore_slug, run_id) on delete cascade
);

alter table public.bookstores enable row level security;
alter table public.bookstore_quiz_runs enable row level security;
alter table public.bookstore_recommendation_events enable row level security;
revoke all on public.bookstores, public.bookstore_quiz_runs, public.bookstore_recommendation_events from public, anon, authenticated;
grant select, insert, update, delete on public.bookstores, public.bookstore_quiz_runs, public.bookstore_recommendation_events to service_role;
grant select on public.bookstores to authenticated;

-- This helper avoids granting access to membership user IDs in the browser.
create function public.my_bookstore_slugs()
returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(m.bookstore_slug), '{}'::text[])
  from public.bookstore_memberships m where m.user_id = (select auth.uid());
$$;
revoke all on function public.my_bookstore_slugs() from public, anon, authenticated;
grant execute on function public.my_bookstore_slugs() to authenticated;
create policy "Members can read their bookstore configuration" on public.bookstores
  for select to authenticated using (slug = any ((select public.my_bookstore_slugs())::text[]));

-- Called only by the recommendation server. One transaction, including all books.
-- A retry for the same run is a no-op even if the catalog changed in the meantime.
create function public.record_bookstore_completion(p_bookstore_slug text, p_run_id uuid, p_book_ids jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_inserted integer; v_books integer;
begin
  if p_run_id is null or jsonb_typeof(p_book_ids) is distinct from 'array' or jsonb_array_length(p_book_ids) > 3 then
    raise exception 'Invalid questionnaire completion' using errcode = '22023';
  end if;
  if not exists (select 1 from public.bookstores where slug = p_bookstore_slug and active) then
    raise exception 'Bookstore unavailable' using errcode = '22023';
  end if;
  insert into public.bookstore_quiz_runs (bookstore_slug, run_id) values (p_bookstore_slug, p_run_id)
    on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;
  insert into public.bookstore_recommendation_events (bookstore_slug, run_id, book_id, title, author, position)
    select p_bookstore_slug, p_run_id, c.book_id, c.title, c.author, b.ordinality::smallint
    from jsonb_array_elements_text(p_book_ids) with ordinality b(book_id, ordinality)
    join public.bookstore_catalog c on c.bookstore_slug = p_bookstore_slug and c.book_id = b.book_id and c.active;
  get diagnostics v_books = row_count;
  if v_books <> jsonb_array_length(p_book_ids) then
    raise exception 'Invalid recommendation books' using errcode = '22023';
  end if;
  return true;
end;
$$;
revoke all on function public.record_bookstore_completion(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_bookstore_completion(text, uuid, jsonb) to service_role;

-- Authorization is checked here on every call, including CSV exports.
create function public.bookstore_statistics(p_bookstore_slug text, p_start_date date default null, p_end_date date default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_store public.bookstores%rowtype;
  v_start date; v_end date; v_from timestamptz; v_until timestamptz;
  v_total bigint; v_period bigint; v_recommendations bigint; v_unique bigint;
  v_daily jsonb; v_books jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.bookstore_memberships where user_id = auth.uid() and bookstore_slug = p_bookstore_slug
  ) then raise exception 'Access denied' using errcode = '42501'; end if;
  select * into v_store from public.bookstores where slug = p_bookstore_slug and active;
  if not found then raise exception 'Bookstore unavailable' using errcode = '22023'; end if;
  v_start := coalesce(p_start_date, (v_store.tracking_since at time zone v_store.timezone)::date);
  v_end := coalesce(p_end_date, (now() at time zone v_store.timezone)::date);
  if v_start > v_end or v_end - v_start > 36525 then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  v_from := v_start::timestamp at time zone v_store.timezone;
  v_until := (v_end + 1)::timestamp at time zone v_store.timezone;
  select count(*) into v_total from public.bookstore_quiz_runs where bookstore_slug = p_bookstore_slug;
  select count(*) into v_period from public.bookstore_quiz_runs
    where bookstore_slug = p_bookstore_slug and completed_at >= v_from and completed_at < v_until;
  select count(*), count(distinct e.book_id) into v_recommendations, v_unique
    from public.bookstore_recommendation_events e join public.bookstore_quiz_runs q using (bookstore_slug, run_id)
    where q.bookstore_slug = p_bookstore_slug and q.completed_at >= v_from and q.completed_at < v_until;
  select coalesce(jsonb_agg(jsonb_build_object('date', activity_date, 'count', total) order by activity_date), '[]'::jsonb) into v_daily
    from (select (completed_at at time zone v_store.timezone)::date as activity_date, count(*) total
      from public.bookstore_quiz_runs where bookstore_slug = p_bookstore_slug and completed_at >= v_from and completed_at < v_until
      group by 1) d;
  select coalesce(jsonb_agg(jsonb_build_object('id', book_id, 'title', title, 'author', author,
      'count', total, 'firstCount', first_total) order by total desc, first_total desc, title, book_id), '[]'::jsonb) into v_books
    from (select e.book_id, (array_agg(e.title order by q.completed_at desc, q.run_id))[1] title,
      (array_agg(e.author order by q.completed_at desc, q.run_id))[1] author,
      count(*) total, count(*) filter (where e.position = 1) first_total
      from public.bookstore_recommendation_events e join public.bookstore_quiz_runs q using (bookstore_slug, run_id)
      where q.bookstore_slug = p_bookstore_slug and q.completed_at >= v_from and q.completed_at < v_until
      group by e.book_id) b;
  return jsonb_build_object('bookstoreSlug', v_store.slug, 'bookstoreName', v_store.name,
    'timezone', v_store.timezone, 'trackingSince', v_store.tracking_since, 'startDate', v_start, 'endDate', v_end,
    'totalCompleted', v_total, 'periodCompleted', v_period, 'totalRecommendations', v_recommendations,
    'uniqueBooks', v_unique, 'daily', v_daily, 'books', v_books);
end;
$$;
revoke all on function public.bookstore_statistics(text, date, date) from public, anon, authenticated;
grant execute on function public.bookstore_statistics(text, date, date) to authenticated;

-- Catalog imports can now activate any explicitly registered bookstore.
create or replace function public.activate_bookstore_catalog(p_bookstore_slug text, p_import_token text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if not exists (select 1 from public.bookstores where slug = p_bookstore_slug and active)
    or p_import_token is null or length(p_import_token) < 20 then raise exception 'Invalid catalog activation'; end if;
  select count(*) into v_count from public.bookstore_catalog where bookstore_slug = p_bookstore_slug and import_token = p_import_token;
  if v_count = 0 then raise exception 'No imported rows for this token'; end if;
  update public.bookstore_catalog set active = (import_token = p_import_token) where bookstore_slug = p_bookstore_slug;
  return v_count;
end;
$$;
revoke all on function public.activate_bookstore_catalog(text, text) from public, anon, authenticated;
grant execute on function public.activate_bookstore_catalog(text, text) to service_role;
