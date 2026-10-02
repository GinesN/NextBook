import { createClient } from 'npm:@supabase/supabase-js@2';
import { applyCarlinEnrichment, nextCarlinResponse, parseCarlinProfile, parseCarlinSelectionContext, type CarlinBook } from '../_shared/carlin.ts';

const bookstoreSlug = 'carlin-la-reina';
const cacheDurationMs = 120_000;
let catalogCache: { books: CarlinBook[]; expiresAt: number } | null = null;

function allowedOrigin(origin: string | null) {
  if (!origin) return null;
  if (origin === 'https://ginesn.github.io') return origin;
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return origin;
  } catch { /* URL inválida */ }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ?? 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function loadCatalog(): Promise<CarlinBook[]> {
  if (catalogCache && Date.now() < catalogCache.expiresAt) return catalogCache.books;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
  const secretKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !secretKey) throw new Error('Supabase admin key is missing');
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const books: CarlinBook[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('bookstore_catalog')
      .select('book_id,group_key,title,author,genre,subgenre,book_type,audience,themes,tone,pace,difficulty,price,stock,confidence')
      .eq('bookstore_slug', bookstoreSlug).eq('active', true)
      .order('book_id').range(from, from + 999);
    if (error) throw new Error(`Catalog read failed: ${error.code}`);
    for (const row of data ?? []) books.push({
      id: row.book_id, group: row.group_key, title: row.title, author: row.author,
      genre: row.genre, subgenre: row.subgenre, type: row.book_type,
      audience: row.audience, themes: row.themes, tone: row.tone,
      pace: row.pace, difficulty: row.difficulty,
      price: row.price === null ? null : Number(row.price), stock: row.stock,
      confidence: row.confidence,
    });
    if ((data ?? []).length < 1000) break;
  }
  const metadataRows: Array<{ book_id: string; metadata: Record<string, unknown> }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('bookstore_curated').select('book_id,metadata')
      .eq('bookstore_slug', bookstoreSlug).order('book_id').range(from, from + 999);
    if (error) throw new Error(`Enrichment read failed: ${error.code}`);
    metadataRows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const curatedIds = new Set(metadataRows.filter(row => row.metadata.curated === true).map(row => row.book_id));
  const enriched = applyCarlinEnrichment(books.filter(book => curatedIds.has(book.id)), metadataRows)
    .filter(book => book.description && book.coverUrl && book.author && book.themes.length > 0);
  catalogCache = { books: enriched, expiresAt: Date.now() + cacheDurationMs };
  return enriched;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigin(origin)) return json({ error: 'Origen no permitido.' }, 403, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, origin);
  try {
    const body = await request.text();
    if (body.length > 8192) return json({ error: 'Solicitud demasiado grande.' }, 413, origin);
    const input = JSON.parse(body);
    const profile = parseCarlinProfile(input?.profile);
    const books = await loadCatalog();
    if (books.length === 0) return json({ error: 'El catálogo aún no está disponible.' }, 503, origin);
    return json(nextCarlinResponse(books, profile, parseCarlinSelectionContext(input?.selection)), 200, origin);
  } catch (error) {
    console.error('Carlin recommendation error', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'No hemos podido consultar la librería. Inténtalo de nuevo.' }, 500, origin);
  }
});
