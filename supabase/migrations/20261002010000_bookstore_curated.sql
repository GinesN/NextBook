-- La selección se prepara aparte y se activa solo después de validar las 500 fichas.
create table if not exists public.bookstore_curated (
  bookstore_slug text not null,
  book_id text not null,
  metadata jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bookstore_slug, book_id),
  foreign key (bookstore_slug, book_id) references public.bookstore_catalog(bookstore_slug, book_id)
);
alter table public.bookstore_curated enable row level security;
revoke all on public.bookstore_curated from public, anon, authenticated;
grant select, insert, update, delete on public.bookstore_curated to service_role;

-- Instantánea privada para poder recuperar exactamente el catálogo previo.
create table if not exists public.bookstore_catalog_snapshots (
  snapshot_id text not null,
  bookstore_slug text not null,
  book_id text not null,
  row_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, bookstore_slug, book_id)
);
alter table public.bookstore_catalog_snapshots enable row level security;
revoke all on public.bookstore_catalog_snapshots from public, anon, authenticated;
grant select, insert, update on public.bookstore_catalog_snapshots to service_role;
