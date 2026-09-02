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
  intent: string;
  focus: string;
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

type AdaptiveOption = { id: string; label: string; detail: string; tokens: string[] };
type InterestFollowUp = { kicker: string; title: string; description: string; options: AdaptiveOption[] };

export const readerIntentOptions: AdaptiveOption[] = [
  { id: 'escape', label: 'Desconectar', detail: 'Sumergirme en otra historia', tokens: ['immersive', 'adventure', 'dramatic'] },
  { id: 'understand', label: 'Entender mejor', detail: 'Mirar el mundo con otra perspectiva', tokens: ['reflective', 'literary', 'society', 'identity'] },
  { id: 'feel', label: 'Sentir de cerca', detail: 'Una lectura íntima y emocional', tokens: ['emotional', 'relationships', 'love'] },
  { id: 'grow', label: 'Moverme por dentro', detail: 'Ideas que sigan conmigo al cerrar el libro', tokens: ['practical', 'motivating', 'growth', 'habits'] },
];

export const giftIntentOptions: AdaptiveOption[] = [
  { id: 'surprise', label: 'Sorprender', detail: 'Algo que no se espere', tokens: ['immersive', 'adventure', 'dark'] },
  { id: 'connect', label: 'Emocionar', detail: 'Un regalo que deje huella', tokens: ['emotional', 'relationships', 'love'] },
  { id: 'open', label: 'Abrir conversación', detail: 'Un libro para comentar después', tokens: ['reflective', 'literary', 'society'] },
  { id: 'support', label: 'Acompañar', detail: 'Un regalo con intención', tokens: ['growth', 'identity', 'friendship'] },
];

const interestFollowUps: Record<string, InterestFollowUp> = {
  relationships: { kicker: 'Afinamos el vínculo', title: '¿Qué tipo de historia te interesa más?', description: 'Así distinguimos entre una lectura romántica, íntima o centrada en las relaciones humanas.', options: [
    { id: 'rel-intimacy', label: 'Amor e intimidad', detail: 'Relaciones que se sienten de cerca', tokens: ['relationships', 'love', 'emotional'] },
    { id: 'rel-friendship', label: 'Amistades que importan', detail: 'Vínculos que acompañan', tokens: ['friendship', 'relationships'] },
    { id: 'rel-complex', label: 'Vínculos complejos', detail: 'Lo que no siempre se dice', tokens: ['psychological', 'relationships', 'dark'] },
  ] },
  society: { kicker: 'Una mirada más precisa', title: '¿Desde dónde quieres mirar el mundo?', description: 'Escoge la perspectiva que más te interesa explorar.', options: [
    { id: 'soc-people', label: 'Las personas', detail: 'Conductas, decisiones y naturaleza humana', tokens: ['human nature', 'society'] },
    { id: 'soc-now', label: 'El presente', detail: 'Preguntas sobre la vida contemporánea', tokens: ['modern life', 'society'] },
    { id: 'soc-perspective', label: 'Otra perspectiva', detail: 'Ideas que invitan a pensar', tokens: ['reflective', 'literary', 'society'] },
  ] },
  identity: { kicker: 'Vamos un paso más allá', title: '¿Qué quieres explorar de la identidad?', description: 'Esta respuesta nos ayuda a encontrar una historia con una resonancia más personal.', options: [
    { id: 'id-coming', label: 'Encontrar mi lugar', detail: 'Cambios, descubrimiento y crecimiento', tokens: ['identity', 'young adult', 'growth'] },
    { id: 'id-belonging', label: 'Pertenecer', detail: 'Comunidad, amistad y vínculos', tokens: ['identity', 'friendship'] },
    { id: 'id-voice', label: 'Tener voz', detail: 'Miradas individuales frente al mundo', tokens: ['identity', 'society'] },
  ] },
  growth: { kicker: 'Concretemos el cambio', title: '¿Qué te gustaría llevarte de la lectura?', description: 'Elegiremos libros que encajen con el tipo de impulso que buscas ahora.', options: [
    { id: 'grow-habits', label: 'Hábitos que sostener', detail: 'Ideas prácticas para el día a día', tokens: ['growth', 'habits', 'practical'] },
    { id: 'grow-decisions', label: 'Decisiones más claras', detail: 'Perspectiva para avanzar con intención', tokens: ['decision-making', 'performance', 'growth'] },
    { id: 'grow-drive', label: 'Motivación y foco', detail: 'Un empujón para pasar a la acción', tokens: ['motivating', 'practical', 'growth'] },
  ] },
  history: { kicker: 'Elige el ángulo', title: '¿Qué parte del pasado te atrae?', description: 'La historia puede vivirse desde el conflicto, la memoria o la supervivencia.', options: [
    { id: 'hist-conflict', label: 'Conflicto y tensión', detail: 'Grandes acontecimientos y sus consecuencias', tokens: ['conflict', 'history', 'dramatic'] },
    { id: 'hist-memory', label: 'Memoria y época', detail: 'Viajar a otro tiempo con calma', tokens: ['history', 'literary'] },
    { id: 'hist-survival', label: 'Resistir y sobrevivir', detail: 'Personajes ante situaciones límite', tokens: ['conflict', 'adventure'] },
  ] },
  adventure: { kicker: 'Elige la aventura', title: '¿Qué clase de viaje te apetece?', description: 'Nos ayudará a encontrar el ritmo y la compañía adecuados.', options: [
    { id: 'adv-journey', label: 'Una gran travesía', detail: 'Explorar y perderse en el camino', tokens: ['adventure', 'immersive'] },
    { id: 'adv-friends', label: 'Con una buena compañía', detail: 'Amistad, lealtad y equipo', tokens: ['friendship', 'adventure'] },
    { id: 'adv-courage', label: 'Salir de la zona cómoda', detail: 'Retos que hacen crecer', tokens: ['adventure', 'growth'] },
  ] },
  suspense: { kicker: 'Afinamos el suspense', title: '¿Qué clase de tensión buscas?', description: 'No todos los misterios se viven igual: elige tu lado más atractivo.', options: [
    { id: 'sus-mystery', label: 'Resolver el enigma', detail: 'Pistas, giros y preguntas', tokens: ['suspense', 'psychological'] },
    { id: 'sus-dark', label: 'Lo oscuro e inquietante', detail: 'Una atmósfera que atrapa', tokens: ['dark', 'fear'] },
    { id: 'sus-pulse', label: 'Ritmo y adrenalina', detail: 'No querer dejar de leer', tokens: ['tense', 'dramatic'] },
  ] },
  other: { kicker: 'Sigamos por sensaciones', title: '¿Qué te gustaría encontrar?', description: 'Aunque no encaje en una categoría concreta, podemos afinar por el efecto que buscas.', options: [
    { id: 'other-unexpected', label: 'Algo inesperado', detail: 'Una historia que me saque de lo habitual', tokens: ['immersive', 'adventure'] },
    { id: 'other-human', label: 'Una mirada humana', detail: 'Personajes e ideas que acompañen', tokens: ['reflective', 'human nature'] },
    { id: 'other-emotion', label: 'Una emoción genuina', detail: 'Una lectura cercana y memorable', tokens: ['emotional', 'accessible'] },
  ] },
};

export const getInterestFollowUp = (interestId: string) => interestFollowUps[interestId] ?? interestFollowUps.other;

const genreLabel = (value: string) => genreOptions.find((option) => option.value === value)?.label ?? value;
const moodLabel = (value: string) => moodOptions.find((option) => option.value === value)?.label.toLowerCase() ?? value;

export function recommendBooks(books: Book[], profile: ReaderProfile): Recommendation[] {
  const selectedInterests = interestOptions.filter((option) => option.id !== 'other' && profile.interests.includes(option.id));
  const otherSelected = profile.interests.includes('other');
  const desiredMood = moodOptions.find((option) => option.value === profile.mood) ?? moodOptions[0];
  const intentOptions = profile.recipient === 'gift' ? giftIntentOptions : readerIntentOptions;
  const selectedIntent = intentOptions.find((option) => option.id === profile.intent);
  const selectedFocus = getInterestFollowUp(profile.interests[0] ?? 'other').options.find((option) => option.id === profile.focus);

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

      const intentMatched = selectedIntent?.tokens.some((token) => searchable.includes(token)) ?? false;
      const focusMatched = selectedFocus?.tokens.some((token) => searchable.includes(token)) ?? false;
      if (intentMatched) score += 7;
      if (focusMatched) score += 9;

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
          + (selectedIntent ? 7 : 0)
          + (selectedFocus ? 9 : 0)
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
      if (focusMatched && selectedFocus) reasonParts.push(`conecta especialmente con tu búsqueda de ${selectedFocus.label.toLowerCase()}`);
      if (intentMatched && selectedIntent) reasonParts.push(`acompaña tu intención de ${selectedIntent.label.toLowerCase()} a través de la lectura`);
      if (difficultyGap <= 1) reasonParts.push(`su nivel de dificultad acompaña tu ritmo sin pedirte un esfuerzo innecesario`);
      if (profile.recipient === 'gift' && book.gift_score_1_5 >= 4) reasonParts.push('tiene un atractivo amplio que lo convierte en una apuesta especialmente acertada para regalar');

      const readerContext = profile.recipient === 'gift'
        ? 'Está pensado como un regalo con personalidad, fácil de recomendar y de recordar.'
        : 'Es una lectura con la que puedes quedarte desde la primera página y hacerla tuya.';
      const editorialReasons = reasonParts
        .slice(0, 3)
        .map((reason) => `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`)
        .join('. ');

      return {
        book,
        score,
        match,
        matchedInterests,
        explanation: `${editorialReasons || 'Lo elegimos por el equilibrio entre su tono, su ritmo y su recorrido dentro del catálogo.'} ${readerContext}`,
      };
    })
    .sort((a, b) => b.score - a.score || b.book.popularity_1_100 - a.book.popularity_1_100 || a.book.book_id - b.book.book_id)
    .slice(0, 3);
}

export const formatPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
