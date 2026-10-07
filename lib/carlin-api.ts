import type { CarlinProfile, CarlinResponse, CarlinSelectionContext } from '../supabase/functions/_shared/carlin';

const questions = ['recipient', 'age', 'type', 'subgenre', 'theme', 'pace', 'difficulty', 'length', 'budget'];
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, limit = 1600): value is string => typeof value === 'string' && value.length <= limit;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function isCarlinResponse(value: unknown): value is CarlinResponse {
  if (!record(value)) return false;
  if (value.kind === 'question') return questions.includes(value.question as string)
    && Array.isArray(value.options) && value.options.length <= 50 && value.options.every(option => record(option)
      && (text(option.value, 80) || number(option.value)) && text(option.label, 200));
  if (value.kind !== 'results' || !Array.isArray(value.recommendations) || value.recommendations.length > 3
    || value.alternativesAvailable !== undefined && typeof value.alternativesAvailable !== 'boolean') return false;
  return value.recommendations.every(item => {
    if (!record(item) || !record(item.book)) return false;
    const book = item.book;
    return text(item.explanation, 2000) && text(book.id, 80) && text(book.title, 400) && text(book.author, 400)
      && text(book.subgenre, 100) && Array.isArray(book.themes) && book.themes.length <= 16 && book.themes.every(theme => text(theme, 100))
      && (book.price === null || number(book.price) && book.price > 0)
      && ['description', 'publisher', 'publishedDate', 'binding'].every(key => book[key] === undefined || text(book[key]))
      && (book.pageCount === undefined || number(book.pageCount) && book.pageCount > 0)
      && (book.coverUrl === undefined || text(book.coverUrl, 500)
        && (book.coverUrl.startsWith('https://covers.openlibrary.org/b/') || book.coverUrl.startsWith('https://static.cegal.es/imagenes/')))
      && (item.affinity === undefined || record(item.affinity) && number(item.affinity.percent) && item.affinity.percent >= 0 && item.affinity.percent <= 100);
  });
}

export async function fetchCarlinNext(apiUrl: string, publicApiKey: string, profile: CarlinProfile, selection: CarlinSelectionContext,
  tracking?: { bookstoreSlug: string; runId: string }): Promise<CarlinResponse> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: publicApiKey, Authorization: `Bearer ${publicApiKey}` },
      body: JSON.stringify({ profile, selection, ...tracking }),
      signal: AbortSignal.timeout(25_000),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(record(data) && text(data.error, 300) ? data.error : 'No hemos podido conectar con la librería.');
    if (!isCarlinResponse(data)) throw new Error('La librería ha devuelto una respuesta inesperada. Inténtalo de nuevo.');
    return data;
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new Error('La librería ha tardado demasiado. Inténtalo de nuevo.');
    throw error;
  }
}
