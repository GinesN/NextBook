import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { applyCarlinEnrichment, nextCarlinResponse, parseCarlinProfile, parseCarlinSelectionContext, type CarlinBook } from '../_shared/carlin.ts';
import { allowedCarlinOrigin, carlinJson, readCarlinRequest, RequestInputError } from '../_shared/http.ts';
import { parseBookstoreSlug, parseQuizRunId } from '../_shared/statistics.ts';

const cacheDurationMs = 120_000;
const catalogCache = new Map<string, { books: CarlinBook[]; expiresAt: number }>();
const catalogLoading = new Map<string, Promise<CarlinBook[]>>();
declare const EdgeRuntime: { waitUntil(task: Promise<void>): void };

function adminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
  const secretKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !secretKey) throw new Error('Supabase admin key is missing');
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function recordCompletion(bookstoreSlug: string, runId: string, bookIds: string[]): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await adminClient().rpc('record_bookstore_completion', {
        p_bookstore_slug: bookstoreSlug, p_run_id: runId, p_book_ids: bookIds,
      }).abortSignal(AbortSignal.timeout(8000));
      if (!error) return;
      if (attempt === 1) console.error('Bookstore completion write failed', bookstoreSlug, error.code);
    } catch {
      if (attempt === 1) console.error('Bookstore completion connection failed', bookstoreSlug);
    }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
  }
}

async function loadCatalog(bookstoreSlug: string): Promise<CarlinBook[]> {
  const cached = catalogCache.get(bookstoreSlug);
  if (cached && Date.now() < cached.expiresAt) return cached.books;
  const loading = catalogLoading.get(bookstoreSlug);
  if (loading) return loading;
  const promise = queryCatalog(bookstoreSlug);
  catalogLoading.set(bookstoreSlug, promise);
  try { return await promise; }
  finally { catalogLoading.delete(bookstoreSlug); }
}

async function queryCatalog(bookstoreSlug: string): Promise<CarlinBook[]> {
  const signal = AbortSignal.timeout(20_000);

  const supabase = adminClient();
  const { data: bookstore, error: storeError } = await supabase.from('bookstores').select('slug')
    .eq('slug', bookstoreSlug).eq('active', true).abortSignal(signal).maybeSingle();
  if (storeError) throw new Error(`Bookstore read failed: ${storeError.code}`);
  if (!bookstore) throw new RequestInputError(404, 'La librería no está disponible.');
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
  catalogCache.set(bookstoreSlug, { books: enriched, expiresAt: Date.now() + cacheDurationMs });
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
    const bookstoreSlug = parseBookstoreSlug(input.bookstoreSlug);
    const runId = parseQuizRunId(input.runId);
    const books = await loadCatalog(bookstoreSlug);
    if (books.length === 0) return carlinJson({ error: 'El catálogo aún no está disponible.' }, 503, origin);
    const response = nextCarlinResponse(books, profile, parseCarlinSelectionContext(input?.selection));
    if (response.kind === 'results' && runId) {
      // Statistics never change the selection or block the reader's results.
      const task = recordCompletion(bookstoreSlug, runId, response.recommendations.map(({ book }) => book.id));
      if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
      else void task;
    }
    return carlinJson(response, 200, origin);
  } catch (error) {
    if (error instanceof RequestInputError) return carlinJson({ error: error.message }, error.status, origin);
    console.error('Carlin recommendation error', error instanceof Error ? error.message : 'unknown');
    return carlinJson({ error: 'No hemos podido consultar la librería. Inténtalo de nuevo.' }, 503, origin);
  }
});
