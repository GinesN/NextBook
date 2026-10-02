-- Recupera las filas del catálogo anterior. La Edge Function seguirá limitada
-- a bookstore_curated hasta desplegar deliberadamente una versión distinta.
begin;
update public.bookstore_catalog c set
title=s.row_data->>'title', author=s.row_data->>'author', genre=s.row_data->>'genre',
subgenre=s.row_data->>'subgenre', book_type=s.row_data->>'book_type', audience=s.row_data->>'audience',
themes=array(select jsonb_array_elements_text(s.row_data->'themes')),
tone=s.row_data->>'tone', pace=s.row_data->>'pace', difficulty=s.row_data->>'difficulty',
price=(s.row_data->>'price')::numeric, stock=(s.row_data->>'stock')::integer,
confidence=(s.row_data->>'confidence')::real, active=(s.row_data->>'active')::boolean,
import_token=s.row_data->>'import_token', updated_at=(s.row_data->>'updated_at')::timestamptz
from public.bookstore_catalog_snapshots s
where s.snapshot_id='before-curation-2026-10-02' and s.bookstore_slug='carlin-la-reina'
and c.bookstore_slug=s.bookstore_slug and c.book_id=s.book_id;
commit;
