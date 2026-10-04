export type Book = {
  book_id: number; title: string; author: string; genre: string; subgenre: string;
  genres?: string[]; audience: string; age_min: number; themes: string; mood: string;
  pace_1_3?: number; difficulty_1_5: number; popularity_1_100: number; gift_score_1_5: number;
  demo_price_eur: number; demo_stock: boolean; language_seed: string;
  description_seed: string; keywords: string; catalog_status: string;
};
export type ReaderProfile = {
  recipient: 'self' | 'gift' | ''; age: number | null; interests: string[]; intent: string;
  focus: string; genre: string; mood: string; pace: number | null | undefined;
  difficulty: number | null | undefined; budget: number | null | undefined;
};
export type Recommendation = { book: Book; score: number; match: number | null; matchedInterests: string[] };
export type QuestionId = 'recipient' | 'age' | 'genre' | 'interests' | 'focus' | 'intent' | 'mood' | 'pace' | 'difficulty' | 'budget';
type AdaptiveOption = { id: string; label: string; detail: string; tokens: string[] };
type InterestFollowUp = { kicker: string; title: string; description: string; options: AdaptiveOption[] };
export const createInitialProfile = (): ReaderProfile => ({
  recipient: '', age: null, interests: [], intent: '', focus: '', genre: '', mood: '', pace: undefined, difficulty: undefined, budget: undefined,
});
export const interestOptions = [
  { id: 'relationships', label: 'Amor y relaciones', tokens: ['love', 'relationships', 'intimacy', 'desire'] },
  { id: 'family', label: 'Familia y amistad', tokens: ['family', 'friendship', 'ancestry', 'loyalty'] },
  { id: 'suspense', label: 'Crímenes y secretos', tokens: ['crime', 'mystery', 'secrets', 'conspiracy', 'manipulation'] },
  { id: 'fantasy', label: 'Magia y mitología', tokens: ['magic', 'supernatural', 'mythology', 'imagination', 'parallel worlds'] },
  { id: 'future', label: 'Ciencia y otros futuros', tokens: ['science', 'technology', 'dystopia', 'apocalypse', 'time travel'] },
  { id: 'history', label: 'Historia y guerras', tokens: ['history', 'war', 'revolution', 'colonialism', 'slavery'] },
  { id: 'adventure', label: 'Viajes y aventuras', tokens: ['adventure', 'journey', 'survival', 'treasure', 'nature'] },
  { id: 'identity', label: 'Identidad y crecer', tokens: ['identity', 'coming of age', 'belonging', 'independence', 'alienation'] },
  { id: 'society', label: 'Sociedad y justicia', tokens: ['society', 'justice', 'racism', 'class', 'poverty', 'politics', 'power', 'gender'] },
  { id: 'growth', label: 'Sentido de la vida', tokens: ['meaning', 'philosophy', 'spirituality', 'growth', 'faith', 'mortality'] },
  { id: 'art', label: 'Libros, arte y creación', tokens: ['art', 'books', 'language', 'knowledge', 'education'] },
  { id: 'humor', label: 'Humor y sátira', tokens: ['humor', 'humorous'] },
  { id: 'other', label: 'Prefiero descubrir', tokens: [] },
];
export const genreOptions = [
  { value: 'any', label: 'Sorpréndeme' },
  { value: 'Literary / Classic', label: 'Literatura y clásicos' },
  { value: 'Contemporary fiction', label: 'Narrativa contemporánea' },
  { value: 'Romance / Contemporary', label: 'Romance' },
  { value: 'Historical fiction', label: 'Novela histórica' },
  { value: 'Adventure', label: 'Aventuras' },
  { value: 'Mystery / Thriller', label: 'Misterio y thriller' },
  { value: 'Science fiction', label: 'Ciencia ficción y distopías' },
  { value: 'Fantasy', label: 'Fantasía y mitología' },
  { value: 'Horror', label: 'Terror' },
  { value: 'Young adult', label: 'Juvenil' },
  { value: 'Essay / Philosophy', label: 'Ensayo y filosofía' },
  { value: 'Memoir / Reportage', label: 'Memorias y testimonios' },
];
export const moodOptions = [
  { value: 'reflective', label: 'Que invite a pensar', detail: 'Ideas y matices para saborear', tokens: ['reflective'] },
  { value: 'emotional', label: 'Que me emocione', detail: 'Cercano, íntimo, con huella', tokens: ['emotional'] },
  { value: 'intense', label: 'Que me tenga en tensión', detail: 'Una atmósfera intensa', tokens: ['dark', 'tense'] },
  { value: 'inspiring', label: 'Que me dé esperanza', detail: 'Otros caminos son posibles', tokens: ['inspiring'] },
  { value: 'humorous', label: 'Que me haga sonreír', detail: 'Humor, ironía o sátira', tokens: ['humorous', 'light'] },
  { value: 'any', label: 'Estoy abierto a todo', detail: 'Sin una sensación concreta', tokens: [] },
];
export const paceOptions = [
  { value: 1, label: 'Pausado', detail: 'Detenerme en las palabras y las ideas' },
  { value: 2, label: 'Equilibrado', detail: 'Historia y momentos de reflexión' },
  { value: 3, label: 'Ágil', detail: 'Que avance y me anime a seguir' },
  { value: null, label: 'Me da igual el ritmo', detail: 'Lo importante es la historia' },
];
export const readerIntentOptions: AdaptiveOption[] = [
  { id: 'escape', label: 'Desconectar', detail: 'Entrar en otro mundo', tokens: ['immersive', 'adventure', 'magic', 'imagination'] },
  { id: 'understand', label: 'Entender otras vidas', detail: 'Ampliar mi mirada', tokens: ['society', 'justice', 'identity', 'history', 'class', 'power', 'freedom'] },
  { id: 'feel', label: 'Conectar y emocionarme', detail: 'Personajes que me importen', tokens: ['emotional', 'love', 'family', 'friendship'] },
  { id: 'grow', label: 'Encontrar nuevas ideas', detail: 'Preguntas que sigan conmigo', tokens: ['meaning', 'philosophy', 'growth', 'spirituality', 'knowledge'] },
  { id: 'any', label: 'No busco un efecto concreto', detail: 'Dejar espacio a la sorpresa', tokens: [] },
];
export const giftIntentOptions: AdaptiveOption[] = [
  { id: 'surprise', label: 'Sorprender', detail: 'Una historia fuera de lo habitual', tokens: ['immersive', 'adventure', 'magic', 'imagination'] },
  { id: 'connect', label: 'Emocionar', detail: 'Un regalo que deje huella', tokens: ['emotional', 'love', 'family', 'friendship'] },
  { id: 'open', label: 'Abrir conversación', detail: 'Ideas para compartir después', tokens: ['society', 'justice', 'philosophy', 'history', 'identity'] },
  { id: 'support', label: 'Acompañar', detail: 'Esperanza y una mirada cercana', tokens: ['compassion', 'growth', 'inspiring', 'friendship'] },
  { id: 'any', label: 'Sin una intención concreta', detail: 'Guiarnos por sus gustos', tokens: [] },
];
const option = (id: string, label: string, detail: string, tokens: string[]): AdaptiveOption => ({ id, label, detail, tokens });
const followUps: Record<string, { title: string; options: AdaptiveOption[] }> = {
  relationships: { title: '¿Qué relaciones te interesa explorar?', options: [
    option('rel-love', 'Una historia de amor', 'Deseo, encuentros y vínculos', ['love', 'intimacy', 'desire']),
    option('rel-complex', 'Relaciones difíciles', 'Celos, secretos y decisiones', ['relationships', 'jealousy', 'abuse', 'secrets']),
    option('rel-second', 'Volver a empezar', 'Tiempo, pérdidas y segundas oportunidades', ['regret', 'aging', 'loss']),
  ] },
  family: { title: '¿Qué vínculo te gustaría seguir?', options: [
    option('fam-generations', 'Familias y generaciones', 'Raíces, memoria y herencias', ['family', 'ancestry', 'memory']),
    option('fam-friends', 'Una amistad inolvidable', 'Lealtad y compañía', ['friendship', 'loyalty']),
    option('fam-healing', 'Cuidar y reconstruirse', 'Encontrar apoyo frente a la pérdida', ['compassion', 'loss', 'family']),
  ] },
  suspense: { title: '¿Qué clase de misterio te atrae?', options: [
    option('sus-crime', 'Investigar un crimen', 'Pistas y preguntas sin resolver', ['crime', 'mystery']),
    option('sus-secrets', 'Secretos y manipulación', 'Personajes de los que no fiarse', ['secrets', 'manipulation', 'conspiracy']),
    option('sus-moral', 'El lado humano del crimen', 'Culpa, justicia y decisiones', ['guilt', 'morality', 'justice']),
  ] },
  fantasy: { title: '¿Qué puerta de la imaginación abrimos?', options: [
    option('fant-magic', 'Magia y otros mundos', 'Reglas distintas a las nuestras', ['magic', 'parallel worlds', 'supernatural']),
    option('fant-myth', 'Mitos y leyendas', 'Reimaginar dioses y héroes', ['mythology', 'fate']),
    option('fant-human', 'Lo extraordinario en lo cotidiano', 'Una fantasía con preguntas humanas', ['imagination', 'identity', 'meaning']),
  ] },
  future: { title: '¿Qué pregunta sobre el futuro te interesa?', options: [
    option('future-control', 'Sociedades y distopías', 'Libertad frente al control', ['dystopia', 'power', 'freedom']),
    option('future-science', 'Ciencia e inteligencia artificial', 'Inventos que cambian nuestras vidas', ['science', 'technology', 'consciousness']),
    option('future-end', 'Sobrevivir a un mundo cambiado', 'Catástrofes y nuevas comunidades', ['apocalypse', 'survival', 'epidemic']),
  ] },
  history: { title: '¿Desde dónde te gustaría vivir la historia?', options: [
    option('hist-war', 'Guerra y resistencia', 'Vidas bajo presión', ['war', 'resistance', 'survival']),
    option('hist-social', 'Cambios y conflictos sociales', 'Revoluciones, desigualdad y poder', ['history', 'revolution', 'colonialism', 'slavery']),
    option('hist-private', 'La vida detrás de los hechos', 'Familias, amores y memoria', ['family', 'love', 'memory']),
  ] },
  adventure: { title: '¿Qué viaje te apetece emprender?', options: [
    option('adv-travel', 'Explorar y descubrir', 'Travesías y destinos inesperados', ['adventure', 'journey', 'treasure']),
    option('adv-nature', 'Enfrentarse a la naturaleza', 'Resistencia y supervivencia', ['nature', 'survival']),
    option('adv-friends', 'Una aventura compartida', 'Amistad y lealtad en el camino', ['friendship', 'loyalty', 'adventure']),
  ] },
  identity: { title: '¿Qué búsqueda personal te interesa más?', options: [
    option('id-growing', 'Crecer y encontrar mi lugar', 'Primeras experiencias y cambios', ['coming of age', 'childhood', 'belonging']),
    option('id-voice', 'Construir una voz propia', 'Autonomía frente a expectativas', ['independence', 'gender', 'identity']),
    option('id-roots', 'Entender mis raíces', 'Memoria, pertenencia y migración', ['memory', 'migration', 'ancestry']),
  ] },
  society: { title: '¿Qué pregunta sobre la sociedad te mueve?', options: [
    option('soc-justice', 'Justicia y desigualdad', 'Prejuicios y oportunidades', ['justice', 'racism', 'poverty', 'class']),
    option('soc-power', 'Poder y libertad', 'Quién decide cómo vivimos', ['power', 'politics', 'freedom']),
    option('soc-life', 'Expectativas y vida cotidiana', 'Trabajo, normas y pertenencia', ['society', 'work', 'gender', 'belonging']),
  ] },
  growth: { title: '¿Qué te gustaría preguntarte al leer?', options: [
    option('grow-meaning', 'Qué significa vivir', 'Decisiones, tiempo y sentido', ['meaning', 'mortality', 'regret']),
    option('grow-spirit', 'Creencias y búsqueda interior', 'Fe y espiritualidad', ['faith', 'spirituality', 'growth']),
    option('grow-philosophy', 'Ideas filosóficas', 'Libertad, conciencia y moral', ['philosophy', 'consciousness', 'morality']),
  ] },
  art: { title: '¿Qué faceta de la creación te llama?', options: [
    option('art-books', 'Libros que hablan de libros', 'Lectores, escritores y bibliotecas', ['books', 'language']),
    option('art-making', 'Crear y buscar una voz', 'La vida artística por dentro', ['art', 'ambition']),
    option('art-ideas', 'El valor del conocimiento', 'Aprender, imaginar y cuestionar', ['knowledge', 'education', 'imagination']),
  ] },
  humor: { title: '¿Qué clase de humor te apetece?', options: [
    option('humor-social', 'Ironía sobre la sociedad', 'Convenciones y apariencias', ['humorous', 'society', 'class', 'politics']),
    option('humor-human', 'Humor con corazón', 'Amistad y rarezas cotidianas', ['humorous', 'friendship', 'compassion']),
  ] },
};
const splitTags = (value: string) => value.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
const tagsOf = (book: Book) => new Set([...splitTags(book.themes), ...splitTags(book.keywords), ...splitTags(book.mood)]);
export const bookGenres = (book: Book) => book.genres?.length ? book.genres : [book.subgenre];
const overlap = (tokens: string[], tags: Set<string>) => tokens.filter(token => tags.has(token)).length;
const hasInterest = (book: Book, interest: typeof interestOptions[number]) => overlap(interest.tokens, tagsOf(book)) > 0;
export function getEligibleBooks(books: Book[], profile: ReaderProfile): Book[] {
  return books.filter(book => book.demo_stock && Number.isFinite(book.age_min) && (profile.age === null || book.age_min <= profile.age)
    && Number.isFinite(book.demo_price_eur) && (profile.budget == null || book.demo_price_eur <= profile.budget));
}
function questionPool(books: Book[], profile: ReaderProfile): Book[] {
  const agePool = getEligibleBooks(books, { ...profile, budget: null });
  return !profile.genre || profile.genre === 'any' ? agePool : agePool.filter(book => bookGenres(book).includes(profile.genre));
}
export const getAvailableGenres = (books: Book[], profile: ReaderProfile) => genreOptions.filter(
  genre => genre.value === 'any' || getEligibleBooks(books, { ...profile, budget: null }).some(book => bookGenres(book).includes(genre.value)),
);
export const getAvailableInterests = (books: Book[], profile: ReaderProfile) => interestOptions.filter(
  interest => interest.id === 'other' || questionPool(books, profile).some(book => hasInterest(book, interest)),
);
export function getInterestFollowUp(interestIds: string[] | string, pool?: Book[]): InterestFollowUp {
  const ids = [...new Set(typeof interestIds === 'string' ? [interestIds] : interestIds)].filter(id => followUps[id]).sort();
  const choices = ids.flatMap(id => followUps[id].options);
  const supported = pool ? choices.filter(choice => pool.some(book => overlap(choice.tokens, tagsOf(book)) > 0)) : choices;
  return {
    kicker: 'Una pista más personal', title: ids.length === 1 ? followUps[ids[0]].title : 'De esos temas, ¿qué te atrae especialmente?',
    description: 'Da prioridad a lo que más te interesa, o mantén la búsqueda abierta.',
    options: [...supported, option('any', 'Cualquiera de estas perspectivas', 'Sin dar prioridad a una sola', [])],
  };
}
export const getAvailableFocus = (books: Book[], profile: ReaderProfile) => getInterestFollowUp(profile.interests, questionPool(books, profile));
export function getQuestionSequence(books: Book[], profile: ReaderProfile): QuestionId[] {
  const pool = getEligibleBooks(books, { ...profile, budget: null });
  return ['recipient', 'age', 'genre', 'interests',
    ...(profile.interests.some(id => id !== 'other') && getAvailableFocus(books, profile).options.length > 2 ? ['focus' as const] : []),
    'intent', 'mood',
    ...(new Set(pool.map(book => book.pace_1_3).filter(Boolean)).size > 1 ? ['pace' as const] : []),
    ...(new Set(pool.map(book => book.difficulty_1_5)).size > 1 ? ['difficulty' as const] : []), 'budget'];
}
export function isQuestionAnswered(profile: ReaderProfile, question: QuestionId): boolean {
  const integerBetween = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  switch (question) {
    case 'recipient': return profile.recipient === 'self' || profile.recipient === 'gift';
    case 'age': return integerBetween(profile.age, 13, 100);
    case 'genre': return genreOptions.some(option => option.value === profile.genre);
    case 'interests': return profile.interests.length > 0 && profile.interests.length <= 3;
    case 'focus': return getInterestFollowUp(profile.interests).options.some(option => option.id === profile.focus);
    case 'intent': return (profile.recipient === 'gift' ? giftIntentOptions : readerIntentOptions).some(option => option.id === profile.intent);
    case 'mood': return moodOptions.some(option => option.value === profile.mood);
    case 'pace': return profile.pace === null || integerBetween(profile.pace, 1, 3);
    case 'difficulty': return profile.difficulty === null || integerBetween(profile.difficulty, 1, 5);
    case 'budget': return profile.budget === null || typeof profile.budget === 'number' && Number.isFinite(profile.budget) && profile.budget >= 0;
  }
}
export function updateReaderProfile<K extends keyof ReaderProfile>(profile: ReaderProfile, key: K, value: ReaderProfile[K], books: Book[]): ReaderProfile {
  const next = { ...profile, [key]: value };
  if (key === 'recipient' && value !== profile.recipient) next.intent = '';
  if (key === 'genre' && value !== profile.genre) { next.interests = []; next.focus = ''; }
  if (key === 'interests') next.focus = '';
  if (key === 'age') {
    if (!getAvailableGenres(books, next).some(genre => genre.value === next.genre)) { next.genre = ''; next.focus = ''; }
    next.interests = next.interests.filter(id => getAvailableInterests(books, next).some(interest => interest.id === id));
    if (!getAvailableFocus(books, next).options.some(option => option.id === next.focus)) next.focus = '';
  }
  return next;
}
const relatedGenres = [['Literary / Classic', 'Contemporary fiction'], ['Fantasy', 'Science fiction'],
  ['Mystery / Thriller', 'Horror'], ['Adventure', 'Historical fiction'], ['Essay / Philosophy', 'Memoir / Reportage']];
export function scoreBook(book: Book, profile: ReaderProfile): Recommendation {
  const tags = tagsOf(book);
  const interests = interestOptions.filter(interest => interest.id !== 'other' && profile.interests.includes(interest.id));
  const focus = getInterestFollowUp(profile.interests).options.find(option => option.id === profile.focus);
  const intent = (profile.recipient === 'gift' ? giftIntentOptions : readerIntentOptions).find(option => option.id === profile.intent);
  const mood = moodOptions.find(option => option.value === profile.mood);
  let earned = 0; let possible = 0;
  const signal = (weight: number, similarity: number) => { possible += weight; earned += weight * similarity; };
  const matchedInterests = interests.filter(interest => overlap(interest.tokens, tags) > 0).map(interest => interest.label);
  if (interests.length) {
    const centralThemes = new Set(splitTags(book.themes).slice(0, 2));
    const similarities = interests.map(interest => {
      const hits = overlap(interest.tokens, tags);
      return hits >= 2 ? 1 : hits === 0 ? 0 : overlap(interest.tokens, centralThemes) > 0 ? 0.85 : 0.55;
    });
    signal(28, similarities.reduce<number>((sum, value) => sum + value, 0) / interests.length);
  }
  if (focus?.tokens.length) signal(12, Math.min(1, overlap(focus.tokens, tags) / Math.min(2, focus.tokens.length)));
  if (profile.genre && profile.genre !== 'any') {
    const genres = bookGenres(book);
    const similarity = book.subgenre === profile.genre ? 1 : genres.includes(profile.genre) ? 0.85
      : relatedGenres.some(family => family.includes(profile.genre) && genres.some(genre => family.includes(genre))) ? 0.25 : 0;
    signal(22, similarity);
  }
  if (intent?.tokens.length) signal(8, Math.min(1, overlap(intent.tokens, tags) / 2));
  if (mood?.tokens.length) signal(12, overlap(mood.tokens, tags) > 0 ? 1 : 0);
  if (typeof profile.pace === 'number' && profile.pace >= 1 && profile.pace <= 3) signal(10, book.pace_1_3 ? Math.max(0, 1 - Math.abs(book.pace_1_3 - profile.pace) / 2) : 0.5);
  if (typeof profile.difficulty === 'number' && profile.difficulty >= 1 && profile.difficulty <= 5) {
    // A harder book costs more than a book that is easier than requested.
    const gap = book.difficulty_1_5 - profile.difficulty;
    signal(18, Math.max(0, 1 - Math.abs(gap) * (gap > 0 ? 0.4 : 0.2)));
  }
  // Neutral evidence reserve; this measures content fit, not a learned probability.
  // Synthetic popularity, price, gift rating and repetition never inflate affinity.
  const score = possible ? (earned + 6) / (possible + 12) * 100 : 0;
  return { book, score, match: possible ? Math.round(score) : null, matchedInterests };
}
export function recommendBooks(books: Book[], profile: ReaderProfile, options: { seenIds?: number[] } = {}): Recommendation[] {
  const ranked = getEligibleBooks(books, profile).map(book => scoreBook(book, profile)).sort((a, b) => b.score - a.score || a.book.book_id - b.book.book_id);
  const seen = new Set(options.seenIds ?? []);
  const selected: Recommendation[] = []; const authors = new Set<string>(); const titles = new Set<string>();
  const titleKey = (book: Book) => `${book.title.toLowerCase().normalize('NFKC').trim()}|${book.author.toLowerCase().trim()}`;
  while (selected.length < 3) {
    const remaining = ranked.filter(item => !titles.has(titleKey(item.book)));
    if (!remaining.length) break;
    // Novelty and author variety are allowed only within five affinity points.
    const nearBest = remaining.filter(item => item.score >= remaining[0].score - 5);
    const freshAuthors = nearBest.filter(item => !authors.has(item.book.author));
    const candidates = freshAuthors.length ? freshAuthors : nearBest;
    const choice = candidates.find(item => !seen.has(item.book.book_id)) ?? candidates[0];
    selected.push(choice); titles.add(titleKey(choice.book)); authors.add(choice.book.author);
  }
  return selected.sort((a, b) => b.score - a.score || a.book.book_id - b.book.book_id);
}
export const formatPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
export const genreLabel = (value: string) => genreOptions.find(option => option.value === value)?.label ?? value;
const themeLabels: Record<string, string> = {
  adventure:'aventura',friendship:'amistad',idealism:'idealismo',humor:'humor',family:'familia',memory:'memoria',solitude:'soledad',history:'historia',magic:'magia',
  love:'amor',relationships:'relaciones',aging:'paso del tiempo',patience:'paciencia',crime:'crimen',justice:'justicia',community:'comunidad',honor:'honor',
  power:'poder',politics:'política',corruption:'corrupción',dystopia:'distopía',surveillance:'vigilancia',freedom:'libertad',war:'guerra',technology:'tecnología',identity:'identidad',
  books:'libros',wealth:'riqueza',class:'clase social',ambition:'ambición','mental health':'salud mental',loss:'pérdida',racism:'racismo',childhood:'infancia',
  regret:'arrepentimiento',belonging:'pertenencia',morality:'moral',imagination:'imaginación',independence:'independencia',work:'trabajo',revenge:'venganza',obsession:'obsesión',
  abuse:'maltrato',guilt:'culpa',sacrifice:'sacrificio',poverty:'pobreza',education:'educación',growth:'crecimiento personal',compassion:'compasión',faith:'creencias',
  violence:'violencia',ideology:'ideología',resentment:'resentimiento',addiction:'adicción',mortality:'mortalidad',meaning:'sentido de la vida',jealousy:'celos',
  disillusion:'desencanto',architecture:'arquitectura',prejudice:'prejuicios',loyalty:'lealtad',beauty:'belleza',fear:'miedo',supernatural:'lo sobrenatural',evil:'el mal',
  science:'ciencia',apocalypse:'fin del mundo',survival:'supervivencia',nature:'naturaleza',secrets:'secretos',treasure:'tesoros','coming of age':'crecer y madurar',
  fate:'destino',innocence:'inocencia','time travel':'viajes en el tiempo',perseverance:'perseverancia',dignity:'dignidad',desire:'deseo',art:'arte',dreams:'sueños',
  spirituality:'espiritualidad',slavery:'esclavitud',trauma:'trauma',ancestry:'raíces familiares',journey:'viajes',time:'tiempo',city:'vida urbana',language:'lenguaje',
  gender:'género y roles sociales',alienation:'alienación',migration:'migración',epidemic:'epidemias',judgment:'juicio moral',philosophy:'filosofía',consciousness:'conciencia',
  manipulation:'manipulación',knowledge:'conocimiento',conspiracy:'conspiraciones',intimacy:'intimidad',body:'cuerpo',colonialism:'colonialismo',tradition:'tradición',
  resistance:'resistencia','parallel worlds':'mundos paralelos',disappearance:'desapariciones','modern life':'vida contemporánea',
  fame:'fama',sport:'deporte',illness:'enfermedad',animals:'animales',mythology:'mitología',revolution:'revolución',
  greed:'codicia',society:'sociedad',rivalry:'rivalidad',mystery:'misterio',
};
export const bookThemeLabels = (book: Book) => splitTags(book.themes).map(theme => themeLabels[theme] ?? theme);
