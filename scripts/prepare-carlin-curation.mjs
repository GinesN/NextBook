import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { curatedClassification, canonicalCuratedTitle } from './carlin-curation-tags.mjs';

const folder = 'work/curation';
const candidates = JSON.parse(readFileSync(`${folder}/candidates.json`, 'utf8'));
const cache = JSON.parse(readFileSync(`${folder}/cache.json`, 'utf8'));
const covers = existsSync(`${folder}/covers.json`) ? JSON.parse(readFileSync(`${folder}/covers.json`, 'utf8')) : {};
const old = new Map((existsSync('work/enrichment/metadata.json') ? JSON.parse(readFileSync('work/enrichment/metadata.json', 'utf8')) : []).map(row => [row.book_id, row.metadata]));
const excluded = /cuaderno|colorear|dibujar|pegatinas|actividades|matem[aá]ticas|diccionario|gram[aá]tica|easy reading|ejercicios|vacaciones|franc[eé]s para viajar|busca en el cuerpo humano|monta tu propio diario/i;
const seenTitles = new Set();
const seenWorks = new Set();
const available = [];
const compactSynopsis = value => {
  const text = value.replace(/LA SAGA CON M[AÁ]S DE[^.]*\./g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= 1400) return text;
  const end = Math.max(text.lastIndexOf('.', 1400), text.lastIndexOf('?', 1400), text.lastIndexOf('!', 1400));
  return text.slice(0, end > 250 ? end + 1 : 1397) + (end > 250 ? '' : '…');
};
for (const book of candidates) {
  const source = cache[book.id];
  if (!source || source.isbn !== book.id || source.language !== 'spa' || !source.author || !source.publisher
    || source.description.length < 120 || !source.page_count || !source.cover_url.startsWith('https://static.cegal.es/imagenes/')
    || !covers[source.cover_url]?.valid
    || excluded.test(source.title) || /educativo|didactico|libros de texto|enseñanza.*idiomas|aprendizaje.*idiomas/i.test(source.categories)
    || /^Collins$/i.test(source.author) || /^(Aurora Quirón|Carmen Rodríguez|Cristina Soler Navarro|Equipo Susaeta|Francisco Arredondo|Elena Crespi)/i.test(source.author)) continue;
  const title = canonicalCuratedTitle(source.title);
  const work = old.get(book.id)?.work_key;
  if (seenTitles.has(title) || (work && seenWorks.has(work))) continue;
  const tags = curatedClassification(book, source);
  if (!tags.themes.length) continue;
  seenTitles.add(title); if (work) seenWorks.add(work);
  available.push({ book: { ...book, ...tags, title: source.title, author: source.author, confidence: 1 }, metadata: {
    curated: true, author: source.author, publisher: source.publisher,
    description: compactSynopsis(source.description), description_language: 'es',
    themes: tags.themes, page_count: source.page_count, published_date: source.published_date,
    cover_url: source.cover_url, categories: source.categories, binding: source.binding,
    source_url: source.source_url, source: 'Ficha bibliográfica por ISBN · Todos tus libros / CEGAL',
    classification_method: 'materias bibliográficas y revisión de obras; ritmo y dificultad orientativos',
    selection_reason: 'selección editorial por notoriedad de autor u obra y variedad; sin datos de ventas locales',
    checked_at: source.checked_at,
  } });
}
const weights = { Romance: 75, 'Thriller y misterio': 65, 'Fantasía': 60, 'Narrativa literaria': 50,
  'Narrativa contemporánea': 35, 'Novela histórica': 45, 'Ciencia ficción / distopía': 25, Terror: 20,
  'Cuentos y narrativa infantil': 55, 'Cómic / novela gráfica': 25, 'Clásicos': 15,
  'Biografía / memorias': 8, 'Divulgación científica': 6, 'Bienestar y crecimiento personal': 10,
  'Historia y sociedad': 3, Cocina: 2, 'Poesía': 5, Teatro: 3, Aventura: 5, 'Filosofía': 3 };
const genreCounts = {};
const authors = new Map();
const selected = [];
const remaining = [...available];
while (remaining.length && selected.length < 500) {
  remaining.sort((a, b) => ((genreCounts[a.book.subgenre] ?? 0) / (weights[a.book.subgenre] ?? 5))
    - ((genreCounts[b.book.subgenre] ?? 0) / (weights[b.book.subgenre] ?? 5))
    || b.book.selectionScore - a.book.selectionScore);
  const index = remaining.findIndex(item => (authors.get(item.book.author) ?? 0) < 9);
  if (index < 0) break;
  const [item] = remaining.splice(index, 1);
  genreCounts[item.book.subgenre] = (genreCounts[item.book.subgenre] ?? 0) + 1;
  authors.set(item.book.author, (authors.get(item.book.author) ?? 0) + 1);
  selected.push(item);
}
const audiences = {};
for (const { book } of selected) audiences[book.audience] = (audiences[book.audience] ?? 0) + 1;
const report = { target: 500, available: available.length, selected: selected.length, genres: genreCounts,
  audiences, authors: authors.size, covers: selected.filter(item => item.metadata.cover_url).length,
  descriptions: selected.filter(item => item.metadata.description).length,
  withPages: selected.filter(item => item.metadata.page_count).length,
  excludedSchoolMaterials: true, source: 'stock local + fichas bibliográficas por ISBN',
  salesRanking: false };
writeFileSync(`${folder}/selected.json`, JSON.stringify(selected));
writeFileSync(`${folder}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${folder}/review.tsv`, ['ISBN\tTítulo\tAutor\tGénero\tPúblico\tTemas\tFuente', ...selected.map(({ book, metadata }) => [book.id, book.title, book.author, book.subgenre, book.audience, book.themes.join(', '), metadata.source_url].join('\t'))].join('\n'));
const cell = value => `"${String(value).replace(/"/g, '""')}"`;
writeFileSync(`${folder}/curated.csv`, ['bookstore_slug,book_id,metadata', ...selected.map(({ book, metadata }) => ['carlin-la-reina', book.id, JSON.stringify(metadata)].map(cell).join(','))].join('\n'));
const sqlRows = selected.map(({ book }) => ({ book_id: book.id, title: book.title, author: book.author, genre: book.genre,
  subgenre: book.subgenre, book_type: book.type, audience: book.audience, themes: book.themes, pace: book.pace, difficulty: book.difficulty }));
writeFileSync(`${folder}/activate.sql`, `begin;
do $$ begin
  if (select count(*) from public.bookstore_curated where bookstore_slug='carlin-la-reina' and metadata->>'curated'='true') <> 500 then raise exception 'Se requieren exactamente 500 fichas completas'; end if;
  if exists(select 1 from public.bookstore_curated where bookstore_slug='carlin-la-reina' and (length(metadata->>'description') < 120 or coalesce(metadata->>'cover_url','')='' or coalesce(metadata->>'author','')='')) then raise exception 'Hay fichas incompletas'; end if;
end $$;
insert into public.bookstore_catalog_snapshots(snapshot_id,bookstore_slug,book_id,row_data)
select 'before-curation-2026-10-02',bookstore_slug,book_id,to_jsonb(c) from public.bookstore_catalog c where bookstore_slug='carlin-la-reina'
on conflict do nothing;
update public.bookstore_catalog set active=false where bookstore_slug='carlin-la-reina';
update public.bookstore_catalog c set title=x.title,author=x.author,genre=x.genre,subgenre=x.subgenre,book_type=x.book_type,
audience=x.audience,themes=array(select jsonb_array_elements_text(x.themes)),pace=x.pace,difficulty=x.difficulty,
confidence=1,active=true,import_token='curated-500-2026-10-02',updated_at=now()
from jsonb_to_recordset($curation$${JSON.stringify(sqlRows)}$curation$::jsonb) as x(book_id text,title text,author text,genre text,subgenre text,book_type text,audience text,themes jsonb,pace text,difficulty text)
where c.bookstore_slug='carlin-la-reina' and c.book_id=x.book_id;
commit;
select active,count(*) from public.bookstore_catalog where bookstore_slug='carlin-la-reina' group by active;
select subgenre,count(*) from public.bookstore_catalog where bookstore_slug='carlin-la-reina' and active group by subgenre order by count(*) desc;
`);
console.log(JSON.stringify(report, null, 2));
