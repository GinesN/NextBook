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
export type PublicCarlinBook = Pick<CarlinBook, 'id' | 'title' | 'author' | 'subgenre' | 'themes' | 'price'>;
export type CarlinRecommendation = { book: PublicCarlinBook; explanation: string };
export type PublicCatalogOption = { value: string | number; label: string };
export type CarlinResponse =
  | { kind: 'question'; question: CarlinQuestion; options: PublicCatalogOption[] }
  | { kind: 'results'; recommendations: CarlinRecommendation[] };

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

function inventoryFor(books: CarlinBook[], profile: CarlinProfile, through: 'age' | 'type' | 'subgenre' = 'subgenre') {
  return books.filter((book) => book.stock > 0 && book.price !== null
    && profile.age !== null && matchesAge(book, profile.age)
    && (through === 'age' || !profile.type || profile.type === 'any' || book.type === profile.type)
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
  const labels: Record<string, string> = profile.age !== null && profile.age >= 18
    ? { 'Ficción/creativo': 'Novelas e historias', 'No ficción': 'Ideas y vida real', Educativo: 'Aprender y practicar' }
    : { 'Ficción/creativo': 'Cuentos e historias', 'No ficción': 'Descubrir el mundo', Educativo: 'Aprender jugando' };
  return withAny(optionsByCount(pool.map((book) => book.type), 3).map((option) => ({ ...option, label: labels[option.value] ?? option.label })), pool.length);
}

export function subgenreOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile, 'type');
  return withAny(optionsByCount(pool.map((book) => book.subgenre), 12), pool.length);
}

export function themeOptions(books: CarlinBook[], profile: CarlinProfile): CatalogOption[] {
  const pool = inventoryFor(books, profile);
  const themes = pool.flatMap((book) => book.themes);
  const usefulThemes = optionsByCount(themes, 36, 2).filter((option) => option.count < pool.length);
  return withAny(usefulThemes, pool.length);
}

export function preferenceQuestions(books: CarlinBook[], profile: CarlinProfile): ('pace' | 'difficulty')[] {
  const pool = themedInventory(books, profile);
  const questions: ('pace' | 'difficulty')[] = [];
  if (profile.type === 'Ficción/creativo'
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
  const questions: CarlinQuestion[] = ['recipient', 'age', 'type', 'subgenre'];
  if (themeOptions(books, profile).length > 1) questions.push('theme');
  questions.push(...preferenceQuestions(books, profile));
  questions.push('budget');
  return questions;
}

export function recommendCarlinBooks(books: CarlinBook[], profile: CarlinProfile): CarlinRecommendation[] {
  if (profile.age === null || !profile.type || !profile.subgenre || profile.budget === null) return [];
  const budget = profile.budget;
  const selectedTheme = !profile.theme || profile.theme === 'any' ? null : normalize(profile.theme);
  const eligible = themedInventory(books, profile).filter((book) => budget === 'any' || (book.price ?? Infinity) <= budget);
  const ranked = eligible.map((book) => {
    const themeMatch = selectedTheme !== null && book.themes.some((theme) => normalize(theme) === selectedTheme);
    const paceMatch = profile.pace && profile.pace !== 'any' && book.pace === profile.pace;
    const difficultyMatch = profile.difficulty && profile.difficulty !== 'any' && book.difficulty === profile.difficulty;
    const score = (themeMatch ? 24 : 0) + (paceMatch ? 12 : 0) + (difficultyMatch ? 12 : 0)
      + (book.author ? 2 : 0) + book.confidence + Math.min(book.stock, 5);
    const reasons: string[] = [];
    if (themeMatch) reasons.push(`conecta con ${profile.theme}`);
    if (paceMatch) reasons.push(`avanza con un ritmo ${book.pace.toLowerCase()}`);
    if (difficultyMatch) reasons.push(`tiene un nivel ${book.difficulty.toLowerCase()}`);
    if (reasons.length === 0) reasons.push('se ajusta a la edad y al tipo de lectura que buscas');
    return { book, score, explanation: `Te puede encajar porque ${reasons.join(' y ')}.` };
  }).sort((a, b) => b.score - a.score || b.book.stock - a.book.stock || a.book.title.localeCompare(b.book.title, 'es'));

  const selected = new Set<string>();
  const selectedTitles: string[] = [];
  const recommendations: CarlinRecommendation[] = [];
  for (const item of ranked) {
    if (selected.has(item.book.group)) continue;
    const normalizedTitle = titleKey(item.book.title);
    if (selectedTitles.some((title) => title === normalizedTitle
      || (title.length >= 20 && normalizedTitle.includes(title))
      || (normalizedTitle.length >= 20 && title.includes(normalizedTitle)))) continue;
    selected.add(item.book.group);
    selectedTitles.push(normalizedTitle);
    const { id, title, author, subgenre, themes, price } = item.book;
    recommendations.push({ book: { id, title, author, subgenre, themes: themes.slice(0, 3), price }, explanation: item.explanation });
    if (recommendations.length === 3) break;
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

export function nextCarlinResponse(books: CarlinBook[], profile: CarlinProfile): CarlinResponse {
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
  if (!selected(profile.type, types)) return ask('type', types);
  const subgenres = subgenreOptions(books, profile);
  if (!selected(profile.subgenre, subgenres)) return ask('subgenre', subgenres);

  const themes = themeOptions(books, profile);
  if (themes.length > 1 && !selected(profile.theme, themes)) return ask('theme', themes);
  for (const preference of preferenceQuestions(books, profile)) {
    const options = preferenceOptions(books, profile, preference);
    if (!selected(profile[preference], options)) return ask(preference, options);
  }

  const budgets = budgetOptions(books, profile);
  if (!selected(profile.budget, budgets)) return ask('budget', budgets);
  return { kind: 'results', recommendations: recommendCarlinBooks(books, profile) };
}

export const formatCarlinPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
