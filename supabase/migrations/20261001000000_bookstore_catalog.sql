-- El inventario permanece en Supabase. Ninguna fila es legible con la clave publicable.
create table if not exists public.bookstore_catalog (
  bookstore_slug text not null,
  book_id text not null,
  group_key text not null,
  title text not null,
  author text not null default '',
  genre text not null default '',
  subgenre text not null default '',
  book_type text not null default '',
  audience text not null default '',
  themes text[] not null default '{}',
  tone text not null default '',
  pace text not null default '',
  difficulty text not null default '',
  price numeric(10,2),
  stock integer not null default 0,
  confidence real not null default 0,
  active boolean not null default false,
  import_token text not null default '',
  updated_at timestamptz not null default now(),
  primary key (bookstore_slug, book_id),
  constraint bookstore_catalog_stock_nonnegative check (stock >= 0),
  constraint bookstore_catalog_price_positive check (price is null or price > 0)
);

alter table public.bookstore_catalog enable row level security;
revoke all on table public.bookstore_catalog from anon, authenticated;
grant select, insert, update, delete on table public.bookstore_catalog to service_role;

-- Se invoca solo con la clave secreta al terminar todos los lotes de importación.
create or replace function public.activate_bookstore_catalog(p_bookstore_slug text, p_import_token text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_bookstore_slug <> 'carlin-la-reina' or length(p_import_token) < 20 then
    raise exception 'Invalid catalog activation';
  end if;
  select count(*) into v_count
  from public.bookstore_catalog
  where bookstore_slug = p_bookstore_slug and import_token = p_import_token;
  if v_count = 0 then
    raise exception 'No imported rows for this token';
  end if;
  update public.bookstore_catalog
  set active = (import_token = p_import_token)
  where bookstore_slug = p_bookstore_slug;
  return v_count;
end;
$$;

revoke all on function public.activate_bookstore_catalog(text, text) from public, anon, authenticated;
grant execute on function public.activate_bookstore_catalog(text, text) to service_role;
