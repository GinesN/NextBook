import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { readCarlinCatalog } from './carlin-source.mjs';

// Selección editorial, no un ranking de ventas. Solo consulta ISBN del stock local.
const [input, mode = 'collect'] = process.argv.slice(2);
if (!input) throw new Error('Uso: node scripts/curate-carlin-catalog.mjs <inventario.jsonl> [collect|prepare]');
const folder = 'work/curation';
mkdirSync(folder, { recursive: true });
const { books } = readCarlinCatalog(input);
const normalized = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clean = text => String(text ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/\s+/g, ' ').trim();
const recognizable = /king|sanderson|rowling|folle?t?t|allende|perez.reverte|gomez.jurado|garcia.marquez|vargas.llosa|saramago|orwell|austen|dosto|tolstoi|tolkien|asimov|herbert|cixin|bradbury|huxley|murakami|ruiz.zaf|harari|rojas.estape|coelho|bucay|sharma|dicker|redondo|falcones|posteguillo|navarro|mola|castillo|lackberg|christ?ie|grisham|connelly|larsson|robin.cook|higgins.clark|simenon|silva|portabales|oruna|gellida|maxwell|benavent|kellen|hoover|ron\b|longarela|roberts|lindsey|gabaldon|steel|keyes|moyes|sparks|riley|jacobs|hannah|hazelwood|julia.quinn|quinn,.julia|james\b|collins|gallego|rothfuss|maas|yarros|shannon|bardugo|riordan|armentrout|meyer|wolff|kinney|pilkey|dahl|carle|bonilla|muncaster|punset|roberto.santiago|blue.jeans|tirado|serrano|benegas|rippin|ibanez|laperla|teckentrup|donaldson|smallman|lobel|esquivel|marias|marse|montero|almudena.grandes|delibes|mendoza|vila.matas|dostoev|kafka|camus|hemingway|steinbeck|woolf|eco\b|zusak|boyne|golding|saint.exupery|shakespeare|garcia.lorca|machado|neruda|fuertes|jimenez|manuel.vilas|eloy.moreno|albert.espinosa|maria.du[e ]|antonio.scurati|lemaitre|sierra|molist|zueco|asensi|neville|harris|harper.lee|patria|aramburu|lem\b|sagan|hawking|smil|eduardo.punset|irene.vallejo|marie.kondo|james.clear|karlos.argui|jamie.oliver|freida|mcfadden|alice.munro|atwood|auster|pennac|ferrante|joyce|galdos|baroja|valle.inclan|cervantes|dumas|verne|carroll|stevenson|dickens|le.gu[iy]n|pratchett|gaiman|hobb|jay.kristoff|kenyon|charlaine.harris|colgan|levi|frank\b|javier.moro|donato.carrisi|federico.moccia|joe.hill|kathleen|mark.levy|marc.levy|harriet|ana.huang|adam.silvera|karen.*mcmanus|godoy|marcus|cherry.chic|maria.martinez|alina.not|broadbent/;
const famousSeries = /harry.potter|senor.de.los.anillos|hobbit|principito|rebelion.en.la.granja|1984\b|orgullo.y.prejuicio|don.quijote|cien.anos.de.soledad|sombra.del.viento|dune\b|fundacion|juegos.del.hambre|crepusculo|reina.roja|guardianes.de.la.ciudadela|diario.de.greg|geronimo.stilton|tea.stilton|anna.kadabra|marcus.pocus|amanda.black|futbolisimos|forasteros.del.tiempo|isadora.moon|mirabella|polican|mortadelo|filemon|asterix|tintin|maus|superpatata|dragon.ball|one.piece|naruto|detective.conan|los.compas|perro.apestoso|escuela.de.monstruos|detectives.zoopencos|unicornia|monstruo.de.colores|pollo.pepe|elmer|oruga.glotona|bluey|peppa.pig|pipi.calzaslargas|pippi|matilda|charlie.y.la.fabrica/;
const excluded = /diccionario|gramatica|matematic|calculo|summer|vacaciones|cuaderno|pegatinas|colorea|colorear|manual|atlas.de.carreteras|easy.reading|aprende.ingles|trazos|problemas.de|santillana|rubio|oxford|workbook|student|teacher|primaria|secundaria|cartas.administrativas/;
const literaryLearning = /escuela.de.monstruos|detectives.zoopencos/;
const titleKey = title => normalized(title).replace(/\([^)]*\)/g, '').replace(/\b(debolsillo|booket|bolsillo|planeta|alfaguara|susaeta|sm|montena)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const metas = existsSync('work/enrichment/metadata.json') ? JSON.parse(readFileSync('work/enrichment/metadata.json', 'utf8')) : [];
const oldMetadata = new Map(metas.map(row => [row.book_id, row.metadata]));
const ranked = books.filter(book => book.stock > 0 && book.price && /^97[89]\d{10}$/.test(book.id)
  && (!excluded.test(normalized(book.title)) || literaryLearning.test(normalized(book.title)))
  && (recognizable.test(normalized(`${book.author} ${oldMetadata.get(book.id)?.author ?? ''}`)) || famousSeries.test(normalized(book.title))))
  .map(book => ({ ...book, selectionScore: (famousSeries.test(normalized(book.title)) ? 30 : 0) + (oldMetadata.get(book.id)?.description ? 12 : 0) + (oldMetadata.get(book.id)?.cover_url ? 4 : 0) + Math.min(book.stock, 5) }))
  .sort((a, b) => b.selectionScore - a.selectionScore || a.title.localeCompare(b.title, 'es'));
// Intercalar géneros y limitar autores evita dedicar la preselección a una saga.
const genreBuckets = new Map();
const groups = new Set();
const titles = new Set();
const authorCounts = new Map();
for (const book of ranked) {
  const author = normalized(oldMetadata.get(book.id)?.author || book.author).split(/[ ,]+/).sort().join(' ');
  const key = titleKey(book.title);
  if (groups.has(book.group) || titles.has(key) || (author && (authorCounts.get(author) ?? 0) >= 9)) continue;
  groups.add(book.group); titles.add(key);
  if (author) authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
  const bucket = genreBuckets.get(book.subgenre) ?? [];
  bucket.push(book); genreBuckets.set(book.subgenre, bucket);
}
const candidates = [];
while ([...genreBuckets.values()].some(bucket => bucket.length)) {
  for (const bucket of genreBuckets.values()) if (bucket.length) candidates.push(bucket.shift());
}
writeFileSync(`${folder}/candidates.json`, JSON.stringify(candidates));
const cachePath = `${folder}/cache.json`;
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const checkpoint = () => writeFileSync(cachePath, JSON.stringify(cache));

function parsePage(html, url, isbn) {
  const docs = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => {
    try { const parsed = JSON.parse(match[1]); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return []; }
  });
  const book = docs.find(doc => doc['@type'] === 'Book' && doc.workExample?.some(edition => String(edition.isbn ?? '').replace(/\D/g, '') === isbn));
  if (!book) return null;
  const edition = book.workExample.find(edition => String(edition.isbn ?? '').replace(/\D/g, '') === isbn);
  const fields = Object.fromEntries([...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)].map(match => [clean(match[1]).replace(/\s*:\s*$/, ''), clean(match[2])]));
  const description = clean(book.description).split(/La cr[ií]tica ha dicho|Rese[nñ]as:|Sobre el autor|Opiniones de la cr[ií]tica/i)[0].trim();
  return { title: clean(book.name), author: clean(book.author?.name ?? ''), description,
    cover_url: typeof book.image === 'string' ? book.image : '', publisher: fields.Editorial ?? '',
    page_count: Number(edition.numberOfPages) || null, published_date: String(edition.datePublished ?? '').slice(0, 10),
    language: edition.inLanguage ?? '', categories: fields['Categorías'] ?? fields['Materia thema'] ?? '',
    binding: fields['Encuadernación'] ?? '', age: fields['Edad de interés'] ?? '', source_url: url, isbn,
    checked_at: new Date().toISOString() };
}

if (mode === 'collect') {
  console.log(`Preselección: ${candidates.length} fichas reconocibles del stock.`);
  let completed = 0;
  const pending = candidates.filter(book => !(book.id in cache));
  let cursor = 0;
  let nextRequest = Date.now();
  let blocked = false;
  const worker = async () => {
  while (cursor < pending.length) {
    if (blocked || existsSync(`${folder}/stop`)) break;
    const complete = Object.values(cache).filter(meta => meta?.description?.length >= 120 && meta?.cover_url && meta?.author && meta.language === 'spa').length;
    if (complete >= 650) break;
    const book = pending[cursor++];
    const slot = Math.max(Date.now(), nextRequest);
    nextRequest = slot + 1100;
    await new Promise(resolve => setTimeout(resolve, slot - Date.now()));
    try {
      const response = await fetch(`https://www.todostuslibros.com/busquedas?keyword=${book.id}`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'NextBook/1.0 (catalogue validation; https://github.com/GinesN/NextBook)' } });
      if ([403, 429].includes(response.status)) throw new Error(`Fuente no disponible (${response.status}); se conserva el progreso`);
      cache[book.id] = response.ok ? parsePage(await response.text(), response.url, book.id) : null;
      checkpoint();
      completed++;
      if (completed % 20 === 0) console.log(`Consultados ${Object.keys(cache).length}/${candidates.length}; completos ${Object.values(cache).filter(meta => meta?.description?.length >= 120 && meta?.cover_url && meta?.author).length}`);
    } catch (error) {
      checkpoint();
      console.error(`${book.id}: ${error.message}`);
      if (/Fuente no disponible/.test(error.message)) { blocked = true; throw error; }
    }
  }
  };
  await Promise.all([worker(), worker(), worker()]);
}
writeFileSync(`${folder}/candidates.json`, JSON.stringify(candidates));
writeFileSync(`${folder}/source-report.json`, JSON.stringify({ candidates: candidates.length, consulted: Object.keys(cache).length, complete: Object.values(cache).filter(meta => meta?.description?.length >= 120 && meta.cover_url && meta.author && meta.language === 'spa').length }, null, 2));
console.log(readFileSync(`${folder}/source-report.json`, 'utf8'));
