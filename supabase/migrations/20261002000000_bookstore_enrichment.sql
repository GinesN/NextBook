-- Datos bibliográficos verificados por ISBN; el inventario sigue siendo privado.
create table if not exists public.bookstore_enrichment (
  bookstore_slug text not null,
  book_id text not null,
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (bookstore_slug, book_id),
  foreign key (bookstore_slug, book_id) references public.bookstore_catalog (bookstore_slug, book_id)
);
alter table public.bookstore_enrichment enable row level security;
revoke all on table public.bookstore_enrichment from public, anon, authenticated;
grant select, insert, update, delete on table public.bookstore_enrichment to service_role;
