import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readCarlinCatalog } from './carlin-source.mjs';

// Solo transmite ISBN públicos; nunca precios, stock ni respuestas de usuarios.
const [inputPath, outputDir = 'work/enrichment'] = process.argv.slice(2);
if (!inputPath) throw new Error('Uso: node scripts/enrich-carlin-catalog.mjs <catalogo.jsonl> [directorio-local]');
const folder = resolve(outputDir);
mkdirSync(folder, { recursive: true });
const { books } = readCarlinCatalog(inputPath);
const cachePath = `${folder}/cache.json`;
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : { editions: {}, works: {}, authors: {} };
const checkpoint = () => writeFileSync(cachePath, JSON.stringify(cache));
let previousRequest = 0;
async function request(url) {
  const delay = Math.max(0, 1100 - (Date.now() - previousRequest));
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  previousRequest = Date.now();
  for (let retry = 0; retry < 3; retry++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'NextBook/1.0 (https://github.com/GinesN/NextBook)' }, signal: AbortSignal.timeout(25000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (retry === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 3000 * (retry + 1)));
    }
  }
}
const textOf = value => typeof value === 'string' ? value : value?.value ?? '';
const clean = value => textOf(value).replace(/<[^>]*>/g, ' ').replace(/\*\*|__/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const themeRules = [
  ['amistad', /\b(friendship|amigos|amistad)\b/], ['familia', /\b(family|families|familia|familiares)\b/],
  ['hermanos', /\b(siblings|brothers|sisters|hermanos|hermanas)\b/], ['maternidad', /\b(motherhood|maternidad)\b/],
  ['adolescencia', /\b(adolescence|coming.of.age|adolescencia|adolescentes)\b/], ['amor', /\b(love stories|romance|amor|enamorad[oa]s?)\b/],
  ['identidad', /\b(identity|identidad|self.discovery)\b/], ['duelo', /\b(grief|bereavement|duelo|perdida de un ser querido)\b/],
  ['secretos familiares', /\b(family secrets|secretos familiares)\b/], ['superación', /\b(resilience|resiliencia|superacion)\b/],
  ['viajes', /\b(travel|journeys|viajes|viajeros)\b/], ['aventura', /\b(adventure|aventura|aventuras)\b/],
  ['magia', /\b(magic|witchcraft|magia|hechizos|brujeria)\b/], ['dragones', /\b(dragons|dragones)\b/],
  ['mitología', /\b(mythology|mitologia|mitologicos)\b/], ['espacio', /\b(space travel|outer space|viajes espaciales|espacio exterior)\b/],
  ['distopías', /\b(dystopia|dystopian|distopia|distopias|distopico)\b/], ['inteligencia artificial', /\b(artificial intelligence|inteligencia artificial)\b/],
  ['misterio', /\b(mystery|mysteries|misterio|misterios)\b/], ['investigación', /\b(detectives|detective|investigation|investigacion)\b/],
  ['crimen', /\b(crime|murder|crimen|crimenes|asesinato|asesinatos)\b/], ['suspense', /\b(suspense|thriller)\b/],
  ['terror psicológico', /\b(psychological horror|terror psicologico)\b/], ['fantasmas', /\b(ghosts|ghost stories|fantasmas)\b/],
  ['historia', /\b(historical fiction|historical events|historia universal|historia mundial|historia de espana|historia de roma|historia de europa)\b/],
  ['Segunda Guerra Mundial', /\b(world war.*1939|second world war|segunda guerra mundial)\b/], ['Guerra Civil española', /\b(spanish civil war|guerra civil espanola)\b/],
  ['migración', /\b(immigration|migration|refugees|inmigracion|migracion|refugiados)\b/], ['feminismo', /\b(feminism|feminismo|feminista)\b/],
  ['justicia social', /\b(social justice|justicia social|desigualdad social)\b/], ['política', /\b(politics|politica|politicos)\b/],
  ['naturaleza', /\b(nature|naturaleza|ecologia|ecology)\b/], ['animales', /\b(animals|animales|zoology|zoologia)\b/],
  ['ciencia', /\b(science|ciencia|cientificos)\b/], ['filosofía', /\b(philosophy|filosofia)\b/],
  ['psicología', /\b(psychology|psicologia)\b/], ['bienestar', /\b(well.being|bienestar|mindfulness|meditacion)\b/],
  ['cocina', /\b(cooking|cookery|recipes|cocina|recetas)\b/], ['deporte', /\b(sports|sport|deporte|deportes)\b/],
  ['arte', /\b(art history|historia del arte|pintura|painting)\b/], ['música', /\b(music|musica|musicos)\b/],
  ['economía', /\b(economics|economia|finanzas|finance)\b/], ['idiomas', /\b(language learning|foreign language|aprendizaje de idiomas)\b/],
  ['relaciones familiares', /\b(family relationships|family life|mothers and daughters|fathers and sons|relaciones familiares)\b/],
  ['memoria', /\b(memory|memories|memoria|recuerdos)\b/], ['soledad', /\b(loneliness|solitude|soledad)\b/],
  ['venganza', /\b(revenge|venganza)\b/], ['traición', /\b(betrayal|traicion)\b/], ['libertad', /\b(freedom|libertad)\b/],
  ['escuela', /\b(schools|school stories|escuela|colegio)\b/], ['humor', /\b(humor|humour|humorous fiction|humoristico)\b/],
  ['crecimiento personal', /\b(personal growth|personal development|crecimiento personal|desarrollo personal)\b/],
  ['religión', /\b(religion|religious life|vida religiosa)\b/], ['espiritualidad', /\b(spirituality|espiritualidad)\b/],
  ['salud', /\b(health|salud|medicina|medicine)\b/], ['matemáticas', /\b(mathematics|matematicas)\b/],
  ['educación', /\b(education|educacion|teaching|ensenanza)\b/], ['fútbol', /\b(soccer|football|futbol)\b/],
  ['piratas', /\b(pirates|piratas)\b/], ['dinosaurios', /\b(dinosaurs|dinosaurios)\b/], ['vampiros', /\b(vampires|vampiros)\b/],
  ['superhéroes', /\b(superheroes|superheroes)\b/], ['robots', /\b(robots|robot)\b/], ['tecnología', /\b(technology|tecnologia)\b/],
];
const genreRules = [
  ['Fantasía', /\b(fantasy fiction|fiction[, /]+fantasy|fantastic fiction|fantasia)\b/],
  ['Ciencia ficción / distopía', /\b(science fiction|fiction[, /]+science fiction|ciencia ficcion|dystopian fiction)\b/],
  ['Thriller y misterio', /\b(detective and mystery|mystery fiction|fiction[, /]+mystery|thrillers|suspense fiction)\b/],
  ['Terror', /\b(horror fiction|fiction[, /]+horror|ghost stories|terror)\b/],
  ['Romance', /\b(love stories|romance fiction|fiction[, /]+romance)\b/],
  ['Novela histórica', /\b(historical fiction|fiction[, /]+historical)\b/],
  ['Cómic / novela gráfica', /\b(graphic novels|comic books|historietas|novela grafica)\b/],
];

const pending = books.filter(book => /^\d{13}$/.test(book.id) && !(book.id in cache.editions));
for (let start = 0; start < pending.length; start += 40) {
  const batch = pending.slice(start, start + 40);
  const query = new URLSearchParams({ bibkeys: batch.map(book => `ISBN:${book.id}`).join(','), jscmd: 'details', format: 'json' });
  const data = await request(`https://openlibrary.org/api/books?${query}`);
  for (const book of batch) {
    const edition = data?.[`ISBN:${book.id}`]?.details;
    // Una coincidencia de ISBN exacta evita atribuir la obra equivocada.
    cache.editions[book.id] = edition?.isbn_13?.includes(book.id) ? edition : null;
  }
  checkpoint();
  console.log(`ISBN consultados: ${Object.keys(cache.editions).length}/${books.length}; coincidencias: ${Object.values(cache.editions).filter(Boolean).length}`);
}

const matched = books.filter(book => cache.editions[book.id]);
const workKeys = [...new Set(matched.flatMap(book => cache.editions[book.id].works?.map(work => work.key) ?? []))];
const pendingWorks = workKeys.filter(key => !(key in cache.works) && /^\/works\/OL\d+W$/.test(key));
for (let start = 0; start < pendingWorks.length; start += 50) {
  const keys = pendingWorks.slice(start, start + 50);
  const response = await request(`https://openlibrary.org/api/get_many?${new URLSearchParams({ keys: JSON.stringify(keys) })}`);
  if (response?.status !== 'ok') throw new Error('No se pudo completar el lote de obras');
  for (const key of keys) cache.works[key] = response.result?.[key] ?? null;
  checkpoint();
  console.log(`Obras verificadas: ${Object.keys(cache.works).length}/${workKeys.length}`);
}
const authorKeys = [...new Set(matched.flatMap(book => {
  const edition = cache.editions[book.id];
  const work = cache.works[edition.works?.[0]?.key];
  return [...(edition.authors ?? []), ...(work?.authors?.map(item => item.author) ?? [])].filter(author => !author.name).map(author => author.key);
}))];
const pendingAuthors = authorKeys.filter(key => !(key in cache.authors) && /^\/authors\/OL\d+A$/.test(key));
for (let start = 0; start < pendingAuthors.length; start += 50) {
  const keys = pendingAuthors.slice(start, start + 50);
  const response = await request(`https://openlibrary.org/api/get_many?${new URLSearchParams({ keys: JSON.stringify(keys) })}`);
  if (response?.status !== 'ok') throw new Error('No se pudo completar el lote de autores');
  for (const key of keys) cache.authors[key] = response.result?.[key] ?? null;
  checkpoint();
}
const rows = matched.map(book => {
  const edition = cache.editions[book.id];
  const work = cache.works[edition.works?.[0]?.key];
  const editionDescription = clean(edition.description);
  const description = editionDescription.length >= 100 ? editionDescription : clean(work?.description);
  const usableDescription = description.length >= 100 && !/^(includes bibliographical|incluye referencias|\d+.*edicion)/i.test(description) ? description.slice(0, 6000) : '';
  const subjects = [...new Set([...(edition.subjects ?? []), ...(work?.subjects ?? [])])].filter(subject => typeof subject === 'string');
  const themes = themeRules.filter(([, pattern]) => pattern.test(normalized(`${subjects.join(' ')} ${usableDescription}`))).map(([label]) => label);
  const genres = genreRules.filter(([, pattern]) => pattern.test(normalized(subjects.join(' ')))).map(([label]) => label);
  const verifiedSubgenre = genres.length === 1 && !/infantil|juvenil/i.test(book.subgenre) ? genres[0] : '';
  const spanish = /\b(una|unos|las|los|del|para|sus|pero|historia|tambien)\b/i.test(usableDescription) && !/\b(the|with|this|their)\b/i.test(usableDescription);
  const authors = edition.authors?.length ? edition.authors : work?.authors?.map(item => item.author) ?? [];
  const author = authors.map(item => item.name ?? cache.authors[item.key]?.name).filter(Boolean).join(', ');
  const cover = edition.covers?.find(id => id > 0) ?? work?.covers?.find(id => id > 0);
  return { bookstore_slug: 'carlin-la-reina', book_id: book.id, metadata: {
    author, publisher: edition.publishers?.join(', ') ?? '',
    description: spanish ? usableDescription : '', original_description: usableDescription,
    description_language: usableDescription ? spanish ? 'es' : 'other' : '',
    themes, subjects: subjects.slice(0, 60), verified_subgenre: verifiedSubgenre, page_count: edition.number_of_pages ?? null,
    published_date: edition.publish_date ?? '', cover_url: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg?default=false` : '',
    work_key: work?.key ?? '', source: 'Open Library · ISBN exacto', checked_at: new Date().toISOString(),
  }};
});
writeFileSync(`${folder}/metadata.json`, JSON.stringify(rows));
const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
writeFileSync(`${folder}/metadata.csv`, ['bookstore_slug,book_id,metadata', ...rows.map(row => [row.bookstore_slug, row.book_id, JSON.stringify(row.metadata)].map(csvCell).join(','))].join('\n'));
const dollars = '$nextbook_enrichment$';
const sql = `insert into public.bookstore_enrichment (bookstore_slug, book_id, metadata)\nselect x.bookstore_slug, x.book_id, x.metadata\nfrom jsonb_to_recordset(${dollars}${JSON.stringify(rows)}${dollars}::jsonb) as x(bookstore_slug text, book_id text, metadata jsonb)\non conflict (bookstore_slug, book_id) do update set metadata=excluded.metadata, updated_at=now();\nselect count(*) as enriched_books from public.bookstore_enrichment where bookstore_slug='carlin-la-reina';\n`;
writeFileSync(`${folder}/import.sql`, sql);
const report = { scanned: books.length, exactIsbnMatches: rows.length, authors: rows.filter(row => row.metadata.author).length, covers: rows.filter(row => row.metadata.cover_url).length, descriptions: rows.filter(row => row.metadata.original_description).length, spanishDescriptions: rows.filter(row => row.metadata.description).length, specificThemes: rows.filter(row => row.metadata.themes.length).length };
writeFileSync(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
