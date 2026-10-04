import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { applyCarlinEnrichment, nextCarlinResponse, parseCarlinProfile, parseCarlinSelectionContext, type CarlinBook } from '../_shared/carlin.ts';
import { allowedCarlinOrigin, carlinJson, readCarlinRequest, RequestInputError } from '../_shared/http.ts';

const bookstoreSlug = 'carlin-la-reina';
const cacheDurationMs = 120_000;
let catalogCache: { books: CarlinBook[]; expiresAt: number } | null = null;
let catalogLoading: Promise<CarlinBook[]> | null = null;

async function loadCatalog(): Promise<CarlinBook[]> {
  if (catalogCache && Date.now() < catalogCache.expiresAt) return catalogCache.books;
  if (catalogLoading) return catalogLoading;
  catalogLoading = queryCatalog();
  try { return await catalogLoading; }
  finally { catalogLoading = null; }
}

async function queryCatalog(): Promise<CarlinBook[]> {
  const signal = AbortSignal.timeout(20_000);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
  const secretKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !secretKey) throw new Error('Supabase admin key is missing');
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const books: CarlinBook[] = [];
  for (let from = 0; from < 10_000; from += 1000) {
    const { data, error } = await supabase.from('bookstore_catalog')
      .select('book_id,group_key,title,author,genre,subgenre,book_type,audience,themes,tone,pace,difficulty,price,stock,confidence')
      .eq('bookstore_slug', bookstoreSlug).eq('active', true)
      .order('book_id').range(from, from + 999).abortSignal(signal);
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
  for (let from = 0; from < 10_000; from += 1000) {
    const { data, error } = await supabase.from('bookstore_curated').select('book_id,metadata')
      .eq('bookstore_slug', bookstoreSlug).order('book_id').range(from, from + 999).abortSignal(signal);
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

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedCarlinOrigin(origin)) return carlinJson({ error: 'Origen no permitido.' }, 403, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: carlinJson(null, 200, origin).headers });
  if (request.method !== 'POST') return carlinJson({ error: 'Método no permitido.' }, 405, origin);
  try {
    const input = await readCarlinRequest(request);
    const profile = parseCarlinProfile(input?.profile);
    const books = await loadCatalog();
    if (books.length === 0) return carlinJson({ error: 'El catálogo aún no está disponible.' }, 503, origin);
    return carlinJson(nextCarlinResponse(books, profile, parseCarlinSelectionContext(input?.selection)), 200, origin);
  } catch (error) {
    if (error instanceof RequestInputError) return carlinJson({ error: error.message }, error.status, origin);
    console.error('Carlin recommendation error', error instanceof Error ? error.message : 'unknown');
    return carlinJson({ error: 'No hemos podido consultar la librería. Inténtalo de nuevo.' }, 503, origin);
  }
});
