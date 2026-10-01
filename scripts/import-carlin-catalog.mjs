import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { readCarlinCatalog } from './carlin-source.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const inputPath = args.find((arg) => !arg.startsWith('--'));
if (!inputPath) throw new Error('Uso: node scripts/import-carlin-catalog.mjs <catalogo.jsonl> [--dry-run]');

const { books, skipped } = readCarlinCatalog(inputPath);
console.log(`${books.length} fichas válidas; ${skipped} filas sin identificador o título omitidas.`);
if (dryRun) process.exit(0);

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno.');
const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const importToken = randomUUID();
const batchSize = 200;

for (let start = 0; start < books.length; start += batchSize) {
  const rows = books.slice(start, start + batchSize).map((book) => ({
    bookstore_slug: 'carlin-la-reina',
    book_id: book.id,
    group_key: book.group,
    title: book.title,
    author: book.author,
    genre: book.genre,
    subgenre: book.subgenre,
    book_type: book.type,
    audience: book.audience,
    themes: book.themes,
    tone: book.tone,
    pace: book.pace,
    difficulty: book.difficulty,
    price: book.price,
    stock: book.stock,
    confidence: book.confidence,
    active: true,
    import_token: importToken,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('bookstore_catalog').upsert(rows, { onConflict: 'bookstore_slug,book_id' });
  if (error) throw new Error(`La importación se detuvo en el lote ${Math.floor(start / batchSize) + 1}: ${error.message}`);
  console.log(`Importadas ${Math.min(start + batchSize, books.length)} de ${books.length} fichas.`);
}

const { data: activated, error: activationError } = await supabase.rpc('activate_bookstore_catalog', {
  p_bookstore_slug: 'carlin-la-reina', p_import_token: importToken,
});
if (activationError) throw new Error(`Fichas cargadas pero activación pendiente: ${activationError.message}`);
if (activated !== books.length) throw new Error(`Activación incompleta: ${activated} de ${books.length} fichas.`);
console.log(`Catálogo de Carlin La Reina activado con ${activated} fichas.`);
