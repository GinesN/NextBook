-- Membership is checked by the database, not by an email embedded in JavaScript.
-- This grants access only to the member's bookstore label; it cannot read inventory.
create table if not exists public.bookstore_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  bookstore_slug text not null check (bookstore_slug ~ '^[a-z0-9-]{1,80}$'),
  bookstore_name text not null check (length(bookstore_name) between 1 and 120),
  primary key (user_id, bookstore_slug)
);
alter table public.bookstore_memberships enable row level security;
revoke all on public.bookstore_memberships from public, anon, authenticated;
grant select (bookstore_slug, bookstore_name) on public.bookstore_memberships to authenticated;
grant select, insert, update, delete on public.bookstore_memberships to service_role;
create policy "Members can read their own bookstore"
  on public.bookstore_memberships for select to authenticated
  using ((select auth.uid()) = user_id);
