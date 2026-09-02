export type Book = {
  book_id: number;
  title: string;
  author: string;
  genre: string;
  subgenre: string;
  audience: string;
  age_min: number;
  themes: string;
  mood: string;
  difficulty_1_5: number;
  popularity_1_100: number;
  gift_score_1_5: number;
  demo_price_eur: number;
  demo_stock: boolean;
  language_seed: string;
  description_seed: string;
  keywords: string;
  catalog_status: string;
};

export type ReaderProfile = {
  recipient: 'self' | 'gift';
  age: number;
  interests: string[];
  genre: string;
  mood: string;
  difficulty: number;
  budget: number | null;
};

export type Recommendation = {
  book: Book;
  score: number;
  match: number;
  explanation: string;
  matchedInterests: string[];
};

export const interestOptions = [
  { id: 'relationships', label: 'Relaciones y amor', tokens: ['relationships', 'love'] },
  { id: 'society', label: 'Sociedad y mundo', tokens: ['society', 'modern life', 'human nature'] },
  { id: 'identity', label: 'Identidad', tokens: ['identity'] },
  { id: 'growth', label: 'Crecimiento personal', tokens: ['growth', 'habits', 'performance', 'decision-making'] },
  { id: 'history', label: 'Historia y conflicto', tokens: ['history', 'conflict'] },
  { id: 'adventure', label: 'Aventura y amistad', tokens: ['adventure', 'friendship'] },
  { id: 'suspense', label: 'Misterio y suspense', tokens: ['fear', 'suspense', 'dark', 'psychological'] },
  { id: 'other', label: 'Otros', tokens: [] },
] as const;

export const genreOptions = [
  { value: 'any', label: 'Sorpréndeme' },
  { value: 'Literary / Classic', label: 'Literaria y clásicos' },
  { value: 'Romance / Contemporary', label: 'Romance contemporáneo' },
  { value: 'Historical fiction', label: 'Ficción histórica' },
  { value: 'Horror', label: 'Terror' },
  { value: 'Self-development', label: 'Desarrollo personal' },
  { value: 'Young adult', label: 'Juvenil' },
] as const;

export const moodOptions = [
  { value: 'reflective', label: 'Reflexivo', detail: 'Para pensar y saborear', tokens: ['reflective', 'literary'] },
  { value: 'emotional', label: 'Emocional', detail: 'Cercano y conmovedor', tokens: ['emotional', 'accessible'] },
  { value: 'intense', label: 'Intenso', detail: 'Con tensión y ritmo', tokens: ['dark', 'tense', 'immersive', 'dramatic'] },
  { value: 'inspiring', label: 'Inspirador', detail: 'Práctico y motivador', tokens: ['practical', 'motivating'] },
] as const;

const genreLabel = (value: string) => genreOptions.find((option) => option.value === value)?.label ?? value;
const moodLabel = (value: string) => moodOptions.find((option) => option.value === value)?.label.toLowerCase() ?? value;

export function recommendBooks(books: Book[], profile: ReaderProfile): Recommendation[] {
  const selectedInterests = interestOptions.filter((option) => option.id !== 'other' && profile.interests.includes(option.id));
  const otherSelected = profile.interests.includes('other');
  const desiredMood = moodOptions.find((option) => option.value === profile.mood) ?? moodOptions[0];

  const eligible = books.filter((book) => (
    book.demo_stock
    && profile.age >= book.age_min
    && (profile.budget === null || book.demo_price_eur <= profile.budget)
  ));

  return eligible
    .map((book) => {
      const searchable = `${book.themes}, ${book.keywords}, ${book.mood}, ${book.subgenre}`.toLowerCase();
      const matchedInterests = selectedInterests
        .filter((interest) => interest.tokens.some((token) => searchable.includes(token)))
        .map((interest) => interest.label);
      const matchesKnownInterest = interestOptions
        .filter((interest) => interest.id !== 'other')
        .some((interest) => interest.tokens.some((token) => searchable.includes(token)));
      const otherMatched = otherSelected && !matchesKnownInterest;

      let score = matchedInterests.length * 8 + (otherMatched ? 8 : 0);
      const genreMatched = profile.genre !== 'any' && book.subgenre === profile.genre;
      if (genreMatched) score += 18;

      const moodMatched = desiredMood.tokens.some((token) => book.mood.toLowerCase().includes(token));
      if (moodMatched) score += 10;

      const difficultyGap = Math.abs(book.difficulty_1_5 - profile.difficulty);
      score += difficultyGap === 0 ? 10 : difficultyGap === 1 ? 6 : difficultyGap === 2 ? 2 : 0;

      if (profile.recipient === 'gift') score += (book.gift_score_1_5 / 5) * 10;
      score += book.popularity_1_100 / 20;
      if (profile.budget) score += Math.max(0, 2 * (1 - book.demo_price_eur / profile.budget));
      if (profile.age < 18 && book.audience.toLowerCase().includes('teen')) score += 6;

      const possible = Math.max(
        1,
        selectedInterests.length * 8
          + (otherSelected ? 8 : 0)
          + (profile.genre === 'any' ? 0 : 18)
          + 10
          + 10
          + (profile.recipient === 'gift' ? 10 : 0)
          + 5
          + 2
          + (profile.age < 18 ? 6 : 0),
      );
      const match = Math.max(48, Math.min(99, Math.round((score / possible) * 100)));

      const reasonParts: string[] = [];
      if (matchedInterests.length) reasonParts.push(`sus temas de ${matchedInterests.slice(0, 2).join(' y ').toLowerCase()} dialogan con lo que te interesa`);
      if (otherMatched) reasonParts.push('se aleja de las categorías habituales y abre una lectura con una mirada distinta');
      if (genreMatched) reasonParts.push(`encuentra el tono propio de la ${genreLabel(book.subgenre).toLowerCase()} que elegiste`);
      if (moodMatched) reasonParts.push(`mantiene el pulso ${moodLabel(profile.mood)} que quieres encontrar ahora`);
      if (difficultyGap <= 1) reasonParts.push(`su nivel de dificultad acompaña tu ritmo sin pedirte un esfuerzo innecesario`);
      if (profile.recipient === 'gift' && book.gift_score_1_5 >= 4) reasonParts.push('tiene un atractivo amplio que lo convierte en una apuesta especialmente acertada para regalar');

      const readerContext = profile.recipient === 'gift'
        ? 'Está pensado como un regalo con personalidad, fácil de recomendar y de recordar.'
        : 'Es una lectura con la que puedes quedarte desde la primera página y hacerla tuya.';

      return {
        book,
        score,
        match,
        matchedInterests,
        explanation: `${reasonParts.length ? `Lo elegimos porque ${reasonParts.slice(0, 3).join('. ')}.` : 'Lo elegimos por el equilibrio entre su tono, su ritmo y su recorrido dentro del catálogo.'} ${readerContext}`,
      };
    })
    .sort((a, b) => b.score - a.score || b.book.popularity_1_100 - a.book.popularity_1_100 || a.book.book_id - b.book.book_id)
    .slice(0, 3);
}

export const formatPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
