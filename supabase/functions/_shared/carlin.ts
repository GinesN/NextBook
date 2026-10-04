export type CarlinBook = {
  id: string;
  group: string;
  title: string;
  author: string;
  genre: string;
  subgenre: string;
  type: string;
  audience: string;
  themes: string[];
  tone: string;
  pace: string;
  difficulty: string;
  price: number | null;
  stock: number;
  confidence: number;
  description?: string;
  publisher?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
  metadataSource?: string;
  binding?: string;
};

export type CarlinQuestion = 'recipient' | 'age' | 'type' | 'subgenre' | 'theme' | 'pace' | 'difficulty' | 'budget';
export type CarlinProfile = {
  recipient: 'self' | 'gift' | null;
  age: number | null;
  type: string | null;
  subgenre: string | null;
  theme: string | null;
  pace: string | null;
  difficulty: string | null;
  budget: number | 'any' | null;
};
export type CatalogOption = { value: string; label: string; count: number };
export type PublicCarlinBook = Pick<CarlinBook, 'id' | 'title' | 'author' | 'subgenre' | 'themes' | 'price' | 'description' | 'publisher' | 'coverUrl' | 'pageCount' | 'publishedDate' | 'binding'>;
export type CarlinSelectionContext = { seed?: string; seenIds?: string[] };
export type CarlinAffinity = { percent: number; criteria: { label: string; matched: boolean }[] };
export type CarlinRecommendation = { book: PublicCarlinBook; explanation: string; affinity?: CarlinAffinity };
export type PublicCatalogOption = { value: string | number; label: string };
export type CarlinResponse =
  | { kind: 'question'; question: CarlinQuestion; options: PublicCatalogOption[] }
  | { kind: 'results'; recommendations: CarlinRecommendation[]; alternativesAvailable?: boolean };

export const initialCarlinProfile: CarlinProfile = {
  recipient: null,
  age: null,
  type: null,
  subgenre: null,
  theme: null,
  pace: null,
  difficulty: null,
  budget: null,
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const readable = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const titleKey = (title: string) => normalize(title).replace(/\([^)]*\)/g, ' ').replace(/\b\d+\b/g, ' ').replace(/[^a-z]+/g, ' ').replace(/\s+/g, ' ').trim()
  || normalize(title).replace(/[^a-z0-9]+/g, ' ').trim();

export function applyCarlinEnrichment(books: CarlinBook[], rows: Array<{ book_id: string; metadata: Record<string, unknown> }>) {
  const byId = new Map(rows.map(row => [row.book_id, row.metadata]));
  const text = (value: unknown, limit = 200) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  return books.map(book => {
    const metadata = byId.get(book.id);
    if (!metadata) return book;
    const specificThemes = Array.isArray(metadata.themes) ? metadata.themes.map(value => text(value, 60)).filter(Boolean) : [];
    const curated = metadata.curated === true;
    const themes = [...new Map([...specificThemes, ...(curated ? [] : book.themes)].map(theme => [normalize(theme), theme])).values()].slice(0, 16);
    const pageCount = typeof metadata.page_count === 'number' && metadata.page_count > 0 ? Math.round(metadata.page_count) : undefined;
    const cover = text(metadata.cover_url, 500);
    return { ...book, themes,
      author: curated ? text(metadata.author) || book.author : book.author || text(metadata.author), publisher: text(metadata.publisher),
      description: metadata.description_language === 'es' ? text(metadata.description, 1600) : '',
      pageCount, publishedDate: text(metadata.published_date, 80),
      binding: text(metadata.binding, 120),
      coverUrl: cover.startsWith('https://covers.openlibrary.org/b/') || cover.startsWith('https://static.cegal.es/imagenes/') ? cover : undefined,
      metadataSource: text(metadata.source),
    };
  });
}
// Estas fichas figuran como adultas en el origen, aunque sus títulos parecen de series infantiles.
const adultAudienceNeedsReview = new Set([
  '9788408321569', '9791387741372', '9791387695934', '9788408320289',
  '9788427299511', '9788427256279',
]);

function matchesAge(book: CarlinBook, age: number) {
  if (age <= 2) return book.audience === 'Infantil 0-5';
  if (age <= 5) return book.audience === 'Infantil 0-5'
    || (book.audience === 'Infantil 3-12' && ['Muy fácil', 'Fácil'].includes(book.difficulty) && book.subgenre !== 'Terror');
  if (age <= 8) return ['Infantil 3-12', 'Infantil 6-8', 'Infantil 6-12'].includes(book.audience);
  if (age <= 12) return ['Infantil 3-12', 'Infantil 6-12', 'Infantil/Juvenil 9-14'].includes(book.audience);
  if (age <= 17) return ['Infantil/Juvenil 9-14', 'Juvenil 13-17', 'Juvenil/Young Adult'].includes(book.audience);
  return book.audience === 'Adulto/General' && book.genre !== 'Infantil'
    && !/infantil|juvenil/.test(normalize(book.subgenre)) && !adultAudienceNeedsReview.has(book.id);
}

const readingPaths = [
  { value: 'reading:mystery', label: 'Misterio y suspense', genres: ['Thriller y misterio'] },
  { value: 'reading:romance', label: 'Amor y relaciones', genres: ['Romance'] },
  { value: 'reading:imagination', label: 'Fantasía, ciencia ficción y aventuras', genres: ['Fantasía', 'Ciencia ficción / distopía', 'Aventura'] },
  { value: 'reading:history', label: 'Historia y otras épocas', genres: ['Novela histórica', 'Historia y sociedad'] },
  { value: 'reading:literary', label: 'Novelas y clásicos', genres: ['Narrativa contemporánea', 'Narrativa literaria', 'Clásicos'] },
  { value: 'reading:comic', label: 'Cómic y novela gráfica', genres: ['Cómic / novela gráfica'] },
  { value: 'reading:horror', label: 'Terror y lo sobrenatural', genres: ['Terror'] },
  { value: 'reading:lives', label: 'Vidas reales y biografías', genres: ['Biografía / memorias'] },
  { value: 'reading:wellbeing', label: 'Bienestar y crecimiento personal', genres: ['Bienestar y crecimiento personal'] },
  { value: 'reading:discovery', label: 'Aprender y descubrir', genres: ['Divulgación científica', 'Filosofía', 'Cocina'] },
  { value: 'reading:poetry', label: 'Poesía y teatro', genres: ['Poesía', 'Teatro'] },
  { value: 'reading:children', label: 'Cuentos y primeras historias', genres: ['Cuentos y narrativa infantil'] },
];

function matchesReadingPath(book: CarlinBook, value: string) {
  const path = readingPaths.find(path => path.value === value);
  return path ? path.genres.includes(book.subgenre) : book.type === value;
}

function inventoryFor(books: CarlinBook[], profile: CarlinProfile, through: 'age' | 'type' | 'subgenre' = 'subgenre') {
  return books.filter((book) => book.stock > 0 && book.price !== null
    && profile.age !== null && matchesAge(book, profile.age)
    && (through === 'age' || !profile.type || profile.type === 'any' || matchesReadingPath(book, profile.type))
    && (through !== 'subgenre' || !profile.subgenre || profile.subgenre === 'any' || book.subgenre === profile.subgenre));
}

function themedInventory(books: CarlinBook[], profile: CarlinProfile) {
  const pool = inventoryFor(books, profile);
  if (!profile.theme || profile.theme === 'any') return pool;
  const selectedTheme = normalize(profile.theme);
  return pool.filter((book) => book.themes.some((theme) => normalize(theme) === selectedTheme));
}

function optionsByCount(values: string[], limit: number, minimum = 3): CatalogOption[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, limit)
    .map(([value, count]) => ({ value, label: readable(value), count }));
}

function withAny(options: CatalogOption[], count: number): CatalogOption[] {
  return [{ value: 'any', label: 'Prefiero que me sorprendas', count }, ...options];
}

export function typeOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile, 'age');
  const paths = readingPaths.map(path => ({ value: path.value, label: path.label,
    count: pool.filter(book => matchesReadingPath(book, path.value)).length,
  })).filter(path => path.count > 0);
  return withAny(paths, pool.length);
}

export function subgenreOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile, 'type');
  return withAny(optionsByCount(pool.map((book) => book.subgenre), 48, 1), pool.length);
}

export function themeOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile);
  const themes = pool.flatMap((book) => book.themes);
  const usefulThemes = optionsByCount(themes, 48, 1).filter((option) => option.count < pool.length);
  return withAny(usefulThemes, pool.length);
}

export function preferenceQuestions(books: CarlinBook[], profile: CarlinProfile): ('pace' | 'difficulty')[] {
  const pool = themedInventory(books, profile);
  const questions: ('pace' | 'difficulty')[] = [];
  if (pool.some(book => book.type === 'Ficción/creativo')
    && new Set(pool.map((book) => book.pace).filter(Boolean)).size >= 2) questions.push('pace');
  if (new Set(pool.map((book) => book.difficulty).filter(Boolean)).size >= 2) questions.push('difficulty');
  return questions;
}

export function preferenceOptions(books: CarlinBook[], profile: CarlinProfile, field: 'pace' | 'difficulty'): CatalogOption[] {
  const pool = themedInventory(books, profile);
  return withAny(optionsByCount(pool.map((book) => book[field]), 8, 1), pool.length);
}

export function budgetOptions(books: CarlinBook[], profile: CarlinProfile): { value: number | 'any'; label: string; count: number }[] {
  const pool = themedInventory(books, profile);
  const limits = [10, 15, 20, 30].map((value) => ({
    value,
    label: `Hasta ${value} €`,
    count: pool.filter((book) => (book.price ?? Infinity) <= value).length,
  })).filter((option) => option.count > 0);
  return [...limits, { value: 'any', label: 'Sin límite', count: pool.length }];
}

export function carlinQuestionSequence(books: CarlinBook[], profile: CarlinProfile): CarlinQuestion[] {
  const questions: CarlinQuestion[] = ['recipient', 'age', 'type'];
  if (subgenreOptions(books, profile).length > 2) questions.push('subgenre');
  if (themeOptions(books, profile).length > 1) questions.push('theme');
  questions.push(...preferenceQuestions(books, profile));
  questions.push('budget');
  return questions;
}

function selectionRandom(seed?: string) {
  if (!seed) return Math.random;
  let state = 2166136261;
  for (const letter of seed) state = Math.imul(state ^ letter.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function matchingBooks(books: CarlinBook[], profile: CarlinProfile) {
  return themedInventory(books, profile).filter(book => profile.budget === 'any' || (book.price ?? Infinity) <= (profile.budget ?? 0));
}

export function carlinAffinity(book: CarlinBook, profile: CarlinProfile): CarlinAffinity | undefined {
  const criteria: { label: string; matched: boolean; weight: number }[] = [];
  if (profile.subgenre && profile.subgenre !== 'any') {
    criteria.push({ label: `Género: ${profile.subgenre}`, matched: book.subgenre === profile.subgenre, weight: 36 });
  } else if (profile.type && profile.type !== 'any') {
    const path = readingPaths.find(path => path.value === profile.type);
    criteria.push({ label: `Lectura: ${path?.label ?? profile.type}`, matched: matchesReadingPath(book, profile.type), weight: 36 });
  }
  if (profile.theme && profile.theme !== 'any') criteria.push({ label: `Tema: ${readable(profile.theme)}`,
    matched: book.themes.some(theme => normalize(theme) === normalize(profile.theme!)), weight: 36 });
  if (profile.pace && profile.pace !== 'any') criteria.push({ label: `Ritmo: ${profile.pace}`, matched: book.pace === profile.pace, weight: 14 });
  if (profile.difficulty && profile.difficulty !== 'any') criteria.push({ label: `Nivel: ${profile.difficulty}`, matched: book.difficulty === profile.difficulty, weight: 14 });
  if (!criteria.length) return undefined;
  const possible = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const matched = criteria.reduce((sum, criterion) => sum + (criterion.matched ? criterion.weight : 0), 0);
  return { percent: Math.round(100 * matched / possible), criteria: criteria.map(({ label, matched }) => ({ label, matched })) };
}

export function parseCarlinSelectionContext(value: unknown): CarlinSelectionContext {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    seed: typeof input.seed === 'string' ? input.seed.slice(0, 80) : undefined,
    seenIds: Array.isArray(input.seenIds) ? [...new Set(input.seenIds.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(id)))].slice(0, 120) : [],
  };
}

export function recommendCarlinBooks(books: CarlinBook[], profile: CarlinProfile, context: CarlinSelectionContext = {}): CarlinRecommendation[] {
  if (profile.age === null || !profile.type || !profile.subgenre || profile.budget === null) return [];
  const random = selectionRandom(context.seed);
  const recentIds = context.seenIds ?? [];
  const recentGroup = new Map<string, number>();
  const recentTitle = new Map<string, number>();
  for (const book of books) {
    const index = recentIds.indexOf(book.id);
    if (index < 0) continue;
    recentGroup.set(book.group, Math.min(recentGroup.get(book.group) ?? Infinity, index));
    recentTitle.set(titleKey(book.title), Math.min(recentTitle.get(titleKey(book.title)) ?? Infinity, index));
  }
  const selectedTheme = !profile.theme || profile.theme === 'any' ? null : normalize(profile.theme);
  const eligible = matchingBooks(books, profile);
  const ranked = eligible.map((book) => {
    const themeMatch = selectedTheme !== null && book.themes.some((theme) => normalize(theme) === selectedTheme);
    const paceMatch = profile.pace && profile.pace !== 'any' && book.pace === profile.pace;
    const difficultyMatch = profile.difficulty && profile.difficulty !== 'any' && book.difficulty === profile.difficulty;
    const affinity = carlinAffinity(book, profile);
    const score = affinity?.percent ?? 0;
    const reasons: string[] = [];
    if (themeMatch) reasons.push(`conecta con ${profile.theme}`);
    if (paceMatch) reasons.push(`avanza con un ritmo ${book.pace.toLowerCase()}`);
    if (difficultyMatch) reasons.push(`tiene un nivel ${book.difficulty.toLowerCase()}`);
    if (reasons.length === 0) reasons.push('se ajusta a la edad y al tipo de lectura que buscas');
    return { book, score, affinity, recent: Math.min(recentGroup.get(book.group) ?? Infinity, recentTitle.get(titleKey(book.title)) ?? Infinity), explanation: `Te puede encajar porque ${reasons.join(' y ')}.` };
  });

  const selected = new Set<string>();
  const selectedTitles: string[] = [];
  const recommendations: CarlinRecommendation[] = [];
  const selectedAuthors = new Set<string>();
  const selectedGenres = new Set<string>();
  while (recommendations.length < 3) {
    let candidates = ranked.filter(item => {
      const title = titleKey(item.book.title);
      return !selected.has(item.book.group) && !selectedTitles.some(previous => previous === title
        || (previous.length >= 20 && title.includes(previous)) || (title.length >= 20 && previous.includes(title)));
    });
    if (!candidates.length) break;
    const fresh = candidates.filter(item => item.recent === Infinity);
    if (fresh.length) candidates = fresh;
    else {
      // Al agotar títulos nuevos, recupera los vistos hace más tiempo.
      const oldest = Math.max(...candidates.map(item => item.recent));
      candidates = candidates.filter(item => item.recent >= Math.max(0, oldest - 12));
      const notLastSet = candidates.filter(item => item.recent >= 3);
      if (notLastSet.length) candidates = notLastSet;
    }
    const bestScore = Math.max(...candidates.map(item => item.score));
    candidates = candidates.filter(item => item.score === bestScore);
    const mixedAuthors = candidates.filter(item => !item.book.author || !selectedAuthors.has(normalize(item.book.author)));
    if (mixedAuthors.length) candidates = mixedAuthors;
    const mixedGenres = candidates.filter(item => !selectedGenres.has(item.book.subgenre));
    if (profile.subgenre === 'any' && mixedGenres.length) candidates = mixedGenres;
    // Muestreo ponderado: la calidad favorece un título, sin fijarlo siempre arriba.
    const draws = candidates.map(item => ({ item, draw: -Math.log(Math.max(random(), Number.EPSILON)) / (1 + Math.max(0, Math.min(1, item.book.confidence))) }));
    draws.sort((a, b) => a.draw - b.draw);
    const item = draws[0].item;
    const normalizedTitle = titleKey(item.book.title);
    selected.add(item.book.group);
    selectedTitles.push(normalizedTitle);
    if (item.book.author) selectedAuthors.add(normalize(item.book.author));
    selectedGenres.add(item.book.subgenre);
    const { id, title, author, subgenre, themes, price, description, publisher, coverUrl, pageCount, publishedDate, binding } = item.book;
    recommendations.push({ book: { id, title, author, subgenre, themes: themes.slice(0, 6), price, description, publisher, coverUrl, pageCount, publishedDate, binding }, explanation: item.explanation, affinity: item.affinity });
  }
  return recommendations;
}

export function parseCarlinProfile(value: unknown): CarlinProfile {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const option = (field: string) => typeof input[field] === 'string' && (input[field] as string).length <= 80
    ? input[field] as string : null;
  const age = input.age;
  const budget = input.budget;
  return {
    recipient: input.recipient === 'self' || input.recipient === 'gift' ? input.recipient : null,
    age: typeof age === 'number' && Number.isInteger(age) && age >= 0 && age <= 100 ? age : null,
    type: option('type'),
    subgenre: option('subgenre'),
    theme: option('theme'),
    pace: option('pace'),
    difficulty: option('difficulty'),
    budget: budget === 'any' || [10, 15, 20, 30].includes(budget as number) ? budget as CarlinProfile['budget'] : null,
  };
}

export function nextCarlinResponse(books: CarlinBook[], profile: CarlinProfile, context: CarlinSelectionContext = {}): CarlinResponse {
  const ask = (question: CarlinQuestion, options: PublicCatalogOption[]): CarlinResponse => ({
    kind: 'question', question, options: options.map(({ value, label }) => ({ value, label })),
  });
  const selected = (value: string | number | null, options: PublicCatalogOption[]) =>
    options.some((option) => option.value === value);

  if (!profile.recipient) return ask('recipient', [
    { value: 'self', label: 'Para mí' }, { value: 'gift', label: 'Para regalar' },
  ]);
  if (profile.age === null) return ask('age', Array.from({ length: 11 }, (_, age) => ({ value: age * 10, label: `${age * 10} años` })));

  const types = typeOptions(books, profile);
  const legacyType = inventoryFor(books, profile, 'age').some(book => book.type === profile.type);
  if (!selected(profile.type, types) && !legacyType) return ask('type', types);
  const subgenres = subgenreOptions(books, profile);
  // Un único género disponible no necesita una segunda elección idéntica.
  if (profile.subgenre === null && subgenres.length === 2) profile = { ...profile, subgenre: subgenres[1].value };
  if (!selected(profile.subgenre, subgenres)) return ask('subgenre', subgenres);

  const themes = themeOptions(books, profile);
  if (themes.length > 1 && !selected(profile.theme, themes)) return ask('theme', themes);
  for (const preference of preferenceQuestions(books, profile)) {
    const options = preferenceOptions(books, profile, preference);
    if (!selected(profile[preference], options)) return ask(preference, options);
  }

  const budgets = budgetOptions(books, profile);
  if (!selected(profile.budget, budgets)) return ask('budget', budgets);
  return { kind: 'results', recommendations: recommendCarlinBooks(books, profile, context), alternativesAvailable: new Set(matchingBooks(books, profile).map(book => titleKey(book.title))).size > 3 };
}

export const formatCarlinPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
