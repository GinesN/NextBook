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
  categories?: string;
};

export type CarlinQuestion = 'recipient' | 'age' | 'type' | 'subgenre' | 'theme' | 'pace' | 'difficulty' | 'length' | 'budget';
export type CarlinProfile = {
  recipient: 'self' | 'gift' | null;
  age: number | null;
  type: string | null;
  subgenre: string | null;
  theme: string | null;
  pace: string | null;
  difficulty: string | null;
  length?: string | null;
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
  length: null,
  budget: null,
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const readable = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const titleKey = (title: string) => normalize(title).replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
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
      categories: text(metadata.categories, 1200),
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
  const questions: ('pace' | 'difficulty')[] = [];
  if (inventoryFor(books, profile, 'type').some(book => book.type === 'Ficción/creativo')
    && preferenceOptions(books, profile, 'pace').length > 2) questions.push('pace');
  if (preferenceOptions(books, profile, 'difficulty').length > 2) questions.push('difficulty');
  return questions;
}

export function preferenceOptions(books: CarlinBook[], profile: CarlinProfile, field: 'pace' | 'difficulty'): CatalogOption[] {
  // Son preferencias suaves: un tema minoritario no debe impedir preguntarlas.
  const pool = inventoryFor(books, profile, 'age');
  return withAny(optionsByCount(pool.map((book) => book[field]), 8, 1), pool.length);
}

export function lengthOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile, 'age');
  const choices = [
    { value: 'short', label: 'Corto · hasta 240 páginas', matches: (pages: number) => pages <= 240 },
    { value: 'medium', label: 'Intermedio · de 241 a 480 páginas', matches: (pages: number) => pages > 240 && pages <= 480 },
    { value: 'long', label: 'Largo · más de 480 páginas', matches: (pages: number) => pages > 480 },
  ].map(({ value, label, matches }) => ({ value, label, count: pool.filter(book => book.pageCount && matches(book.pageCount)).length }))
    .filter(option => option.count > 0);
  return withAny(choices, pool.length);
}

export function budgetOptions(books: CarlinBook[], profile: CarlinProfile): { value: number | 'any'; label: string; count: number }[] {
  const pool = inventoryFor(books, profile, 'age');
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
  if (lengthOptions(books, profile).length > 2) questions.push('length');
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

function recommendationPool(books: CarlinBook[], profile: CarlinProfile) {
  // Edad, disponibilidad y presupuesto nunca se amplían para completar la selección.
  return inventoryFor(books, profile, 'age').filter(book => profile.budget === 'any' || (book.price ?? Infinity) <= (profile.budget ?? 0));
}

const genreFamilies = [
  ['Fantasía', 'Ciencia ficción / distopía', 'Aventura'],
  ['Thriller y misterio', 'Terror'],
  ['Narrativa contemporánea', 'Narrativa literaria', 'Clásicos', 'Novela histórica', 'Teatro'],
  ['Romance', 'Narrativa contemporánea'],
  ['Historia y sociedad', 'Biografía / memorias', 'Novela histórica'],
  ['Bienestar y crecimiento personal', 'Filosofía', 'Biografía / memorias'],
  ['Poesía', 'Teatro', 'Narrativa literaria'],
];

const themeFamilies = [
  ['investigación', 'crimen', 'misterio', 'suspense', 'secretos', 'justicia', 'venganza'],
  ['magia', 'dragones', 'mundos imaginarios', 'aventura'],
  ['distopías', 'tecnología', 'espacio', 'ciencia', 'viajes en el tiempo'],
  ['amor', 'amistad', 'familia', 'emociones', 'duelo'],
  ['historia', 'Segunda Guerra Mundial', 'Guerra Civil española', 'guerra', 'memoria'],
  ['bienestar', 'crecimiento personal', 'superación', 'identidad', 'filosofía'],
  ['naturaleza', 'animales', 'dinosaurios'],
  ['miedo', 'fantasmas', 'vampiros'],
  ['libertad', 'poder', 'feminismo', 'justicia'],
  ['viajes', 'aventura', 'piratas'],
].map(family => family.map(normalize));

// Evidencia léxica orientativa: no interpreta la sinopsis como una reseña del lector.
const themeStems: Record<string, string[]> = {
  amistad: ['amist', 'amig'], familia: ['famil', 'herman', 'madre', 'padre'], amor: ['amor', 'enamor', 'pareja', 'romant'],
  secretos: ['secret', 'ocult', 'revel'], investigación: ['investig', 'detectiv', 'inspect', 'polici', 'enigma'],
  crimen: ['crimen', 'asesin', 'homicid', 'delito'], magia: ['magia', 'magico', 'hechiz', 'bruja', 'mago'],
  aventura: ['aventur', 'expedicion', 'hazana'], dragones: ['dragon'], 'mundos imaginarios': ['fantasia', 'reino'],
  distopías: ['distop', 'totalitar', 'utop'], 'viajes en el tiempo': ['temporal'], espacio: ['galax', 'espacial', 'planeta'],
  tecnología: ['tecnolog', 'robot', 'artificial'], vampiros: ['vampir'], fantasmas: ['fantasm', 'espiritu'],
  miedo: ['miedo', 'terror', 'pesadilla'], historia: ['historica', 'historico', 'siglo', 'medieval'],
  'Segunda Guerra Mundial': ['nazis', 'holocausto'], 'Guerra Civil española': ['franquis'], guerra: ['guerra', 'soldad'],
  humor: ['humor', 'comico', 'divertid', 'risa'], escuela: ['escuela', 'colegio', 'instituto', 'hogwarts'],
  emociones: ['emocion', 'sentim'], identidad: ['identidad'], superación: ['superacion', 'superar', 'resilien'],
  duelo: ['duelo', 'perdida'], naturaleza: ['naturaleza', 'bosque', 'selva', 'ecolog'], animales: ['animal', 'perro', 'gato', 'ovejita'],
  fútbol: ['futbol'], piratas: ['pirata'], dinosaurios: ['dinosaur'], superhéroes: ['superheroe'], viajes: ['viaje', 'viajar'],
  misterio: ['mister', 'enigma'], suspense: ['suspense', 'thriller', 'intriga'], venganza: ['vengan', 'vengar'],
  justicia: ['justicia', 'tribunal', 'abogado'], poder: ['poder', 'ambicion', 'politica'], libertad: ['libertad', 'liberacion', 'rebelion'],
  feminismo: ['feminism'], 'crecimiento personal': ['autoayuda'], bienestar: ['bienestar', 'felicidad', 'meditacion'],
  ciencia: ['ciencia', 'cientific', 'divulg'], filosofía: ['filosof'], cocina: ['cocina', 'receta'],
  memoria: ['memoria', 'recuerdo'], arte: ['arte', 'artista', 'pintura'], música: ['musica', 'musico'],
};
const normalizedThemeStems = new Map(Object.entries(themeStems).map(([theme, stems]) => [normalize(theme), stems]));
const contentCache = new WeakMap<CarlinBook, { synopsis: string; words: string[]; categories: string }>();

function themeStrength(book: CarlinBook, theme: string) {
  const key = normalize(theme);
  let content = contentCache.get(book);
  if (!content) {
    const synopsis = normalize(book.description ?? '');
    content = { synopsis, words: synopsis.match(/[a-z]+/g) ?? [], categories: normalize(book.categories ?? '') };
    contentCache.set(book, content);
  }
  const stems = normalizedThemeStems.get(key) ?? key.split(' ').filter(word => word.length > 3);
  const mentions = content.words.filter(word => stems.some(stem => word.startsWith(stem))).length;
  const phrase = key.includes(' ') && content.synopsis.includes(key) ? 1 : 0;
  const prominence = Math.min(1, Math.sqrt((mentions + phrase) * 30 / Math.max(40, content.words.length)));
  const categoryEvidence = stems.some(stem => new RegExp(`\\b${stem}`).test(content!.categories)) || content.categories.includes(key);
  const exact = book.themes.some(value => normalize(value) === key);
  if (exact) return .65 + .2 * prominence + (categoryEvidence ? .15 : 0);
  const related = themeFamilies.some(family => family.includes(key) && book.themes.some(value => family.includes(normalize(value))));
  return Math.max(related ? .3 : 0, .5 * prominence + (categoryEvidence ? .15 : 0));
}

function genreSimilarity(actual: string, requested: string) {
  if (actual === requested) return 1;
  if (readingPaths.some(path => path.genres.includes(actual) && path.genres.includes(requested))) return .8;
  if (genreFamilies.some(family => family.includes(actual) && family.includes(requested))) return .55;
  return .05;
}

function pathSimilarity(book: CarlinBook, pathValue: string) {
  if (matchesReadingPath(book, pathValue)) return 1;
  const path = readingPaths.find(path => path.value === pathValue);
  return path ? Math.max(...path.genres.map(genre => genreSimilarity(book.subgenre, genre))) : 0;
}

function ordinalSimilarity(actual: string, requested: string, kind: 'pace' | 'difficulty') {
  const aliases: Record<string, string> = { rapido: 'agil', lento: 'pausado', dificil: 'alta' };
  const canonical = (value: string) => aliases[normalize(value)] ?? normalize(value);
  const scale = kind === 'pace' ? ['pausado', 'equilibrado', 'agil'] : ['muy facil', 'facil', 'media', 'alta'];
  const actualIndex = scale.indexOf(canonical(actual));
  const requestedIndex = scale.indexOf(canonical(requested));
  if (actualIndex < 0 || requestedIndex < 0) return .5;
  const distance = actualIndex - requestedIndex;
  // Un nivel más exigente de lo pedido penaliza más que uno más accesible.
  const slope = kind === 'difficulty' && distance > 0 ? .8 : .45;
  return Math.exp(-slope * distance * distance);
}

function lengthSimilarity(pages: number | undefined, requested: string) {
  if (!pages || !Number.isFinite(pages)) return .5;
  const interval = requested === 'short' ? [0, 240] : requested === 'medium' ? [241, 480] : [481, Infinity];
  const distance = Math.max(interval[0] - pages, pages - interval[1], 0);
  return Math.exp(-distance / 180);
}

function affinityScore(book: CarlinBook, profile: CarlinProfile) {
  const criteria: { label: string; value: number; weight: number }[] = [];
  const specific = (value: string | null | undefined) => !!value && value !== 'any';
  const hasPath = specific(profile.type);
  const hasGenre = specific(profile.subgenre);
  if (hasPath) {
    const path = readingPaths.find(path => path.value === profile.type);
    criteria.push({ label: `Lectura: ${path?.label ?? profile.type}`, value: pathSimilarity(book, profile.type!), weight: hasGenre ? 12 : 30 });
  }
  if (hasGenre) criteria.push({ label: `Género: ${profile.subgenre}`, value: genreSimilarity(book.subgenre, profile.subgenre!), weight: hasPath ? 18 : 30 });
  if (specific(profile.theme)) criteria.push({ label: `Tema: ${readable(profile.theme!)}`, value: themeStrength(book, profile.theme!), weight: 30 });
  if (specific(profile.pace)) criteria.push({ label: `Ritmo: ${profile.pace}`, value: ordinalSimilarity(book.pace, profile.pace!, 'pace'), weight: 12 });
  if (specific(profile.difficulty)) criteria.push({ label: `Nivel: ${profile.difficulty}`, value: ordinalSimilarity(book.difficulty, profile.difficulty!, 'difficulty'), weight: 16 });
  if (specific(profile.length)) criteria.push({ label: 'Extensión', value: lengthSimilarity(book.pageCount, profile.length!), weight: 12 });
  if (!criteria.length) return undefined;
  const possible = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const matched = criteria.reduce((sum, criterion) => sum + criterion.value * criterion.weight, 0);
  // Regularización conservadora: pocas respuestas no equivalen a certeza absoluta.
  // Es una afinidad editorial, no una probabilidad aprendida ni un percentil del ranking.
  const score = 100 * (matched + 12 * .5) / (possible + 12);
  return { score, affinity: { percent: Math.round(score), criteria: criteria.map(({ label, value }) => ({ label, matched: value >= .65 })) } };
}

export function carlinAffinity(book: CarlinBook, profile: CarlinProfile): CarlinAffinity | undefined {
  return affinityScore(book, profile)?.affinity;
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
  const eligible = recommendationPool(books, profile);
  const ranked = eligible.map((book) => {
    const themeMatch = selectedTheme !== null && book.themes.some((theme) => normalize(theme) === selectedTheme);
    const genreMatch = !profile.subgenre || profile.subgenre === 'any' || book.subgenre === profile.subgenre;
    const pathMatch = profile.type === 'any' || matchesReadingPath(book, profile.type!);
    const paceMatch = profile.pace && profile.pace !== 'any' && book.pace === profile.pace;
    const difficultyMatch = profile.difficulty && profile.difficulty !== 'any' && book.difficulty === profile.difficulty;
    const evaluated = affinityScore(book, profile);
    const affinity = evaluated?.affinity;
    const score = evaluated?.score ?? 50;
    const reasons: string[] = [];
    if (themeMatch) reasons.push(`conecta con ${profile.theme}`);
    if (paceMatch) reasons.push(`avanza con un ritmo ${book.pace.toLowerCase()}`);
    if (difficultyMatch) reasons.push(`tiene un nivel ${book.difficulty.toLowerCase()}`);
    if (reasons.length === 0) reasons.push(genreMatch && pathMatch ? 'se ajusta a la edad y al tipo de lectura que buscas' : 'es adecuado para la edad indicada y respeta tu presupuesto');
    const alternative = !genreMatch || !pathMatch ? ` Como alternativa, amplía tu elección hacia ${book.subgenre.toLowerCase()}.`
      : selectedTheme !== null && !themeMatch ? ' Como alternativa, explora otros temas dentro de tu elección de lectura.' : '';
    return { book, score, affinity, recent: Math.min(recentGroup.get(book.group) ?? Infinity, recentTitle.get(titleKey(book.title)) ?? Infinity), explanation: `Te puede encajar porque ${reasons.join(' y ')}.${alternative}` };
  });

  const selected = new Set<string>();
  const selectedTitles: string[] = [];
  const recommendations: CarlinRecommendation[] = [];
  const selectedAuthors = new Set<string>();
  const selectedGenres = new Set<string>();
  while (recommendations.length < 3) {
    let candidates = ranked.filter(item => {
      const title = titleKey(item.book.title);
      return !selected.has(item.book.group) && !selectedTitles.includes(title);
    });
    if (!candidates.length) break;
    // La variedad se permite dentro de una banda de calidad; nunca elige una
    // novedad muy lejana antes de una coincidencia claramente mejor.
    const bestScore = Math.max(...candidates.map(item => item.score));
    candidates = candidates.filter(item => item.score >= bestScore - 5);
    const fresh = candidates.filter(item => item.recent === Infinity);
    if (fresh.length) candidates = fresh;
    else {
      // Al agotar títulos nuevos, recupera los vistos hace más tiempo.
      const oldest = Math.max(...candidates.map(item => item.recent));
      candidates = candidates.filter(item => item.recent >= Math.max(0, oldest - 12));
      const notLastSet = candidates.filter(item => item.recent >= 3);
      if (notLastSet.length) candidates = notLastSet;
    }
    const freshBestScore = Math.max(...candidates.map(item => item.score));
    candidates = candidates.filter(item => item.score >= freshBestScore - 1);
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
    length: ['any', 'short', 'medium', 'long'].includes(input.length as string) ? input.length as string : null,
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
  if (profile.subgenre === null && subgenres.length === 2) profile = { ...profile, subgenre: 'any' };
  if (!selected(profile.subgenre, subgenres)) return ask('subgenre', subgenres);

  const themes = themeOptions(books, profile);
  if (themes.length > 1 && !selected(profile.theme, themes)) return ask('theme', themes);
  for (const preference of preferenceQuestions(books, profile)) {
    const options = preferenceOptions(books, profile, preference);
    if (!selected(profile[preference], options)) return ask(preference, options);
  }

  const lengths = lengthOptions(books, profile);
  if (lengths.length > 2 && !selected(profile.length ?? null, lengths)) return ask('length', lengths);

  const budgets = budgetOptions(books, profile);
  if (!selected(profile.budget, budgets)) return ask('budget', budgets);
  const recommendations = recommendCarlinBooks(books, profile, context);
  const selectedIds = new Set(recommendations.map(item => item.book.id));
  const selectedBooks = books.filter(book => selectedIds.has(book.id));
  const weakestScore = Math.min(...selectedBooks.map(book => affinityScore(book, profile)?.score ?? 50));
  const alternativesAvailable = recommendationPool(books, profile).some(book =>
    !selectedBooks.some(selectedBook => selectedBook.group === book.group || titleKey(selectedBook.title) === titleKey(book.title))
    && (affinityScore(book, profile)?.score ?? 50) >= weakestScore - 5);
  return { kind: 'results', recommendations, alternativesAvailable };
}

export const formatCarlinPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
