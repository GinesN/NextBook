'use client';
/* eslint-disable next/no-img-element -- GitHub Pages publica esta app como sitio Vite estático. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, RefreshCw, UserRound, X } from 'lucide-react';
import { LegalFooter } from '@/components/legal-footer';
import { fetchCarlinNext } from '@/lib/carlin-api';

import {
  formatCarlinPrice, initialCarlinProfile,
  type CarlinProfile, type CarlinQuestion, type CarlinRecommendation,
  type CarlinResponse, type CarlinSelectionContext, type PublicCatalogOption,
} from '@/supabase/functions/_shared/carlin';

const siteBasePath = import.meta.env.BASE_URL;
const apiUrl = import.meta.env.VITE_CARLIN_API_URL
  || 'https://aesmyvfjcfcjegytsacy.supabase.co/functions/v1/carlin-recommend';
const publicApiKey = 'sb_publishable_7hEvf7ILNYgc5cKar9_u6w_oFgQJgsk';
const recipientOptions: PublicCatalogOption[] = [
  { value: 'self', label: 'Para mí' }, { value: 'gift', label: 'Para regalar' },
];
const progressByQuestion: Record<CarlinQuestion, number> = {
  recipient: 8, age: 18, type: 30, subgenre: 40, theme: 50,
  pace: 62, difficulty: 74, length: 84, budget: 94,
};
type HistoryEntry = { question: CarlinQuestion; options: PublicCatalogOption[]; profile: CarlinProfile };

function keepElementVisible(id: string, block: ScrollLogicalPosition = 'nearest') {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block }));
}

function keepQuestionVisible() {
  keepElementVisible('question-title');
}

const recentBooksStorageKey = 'nextbook:carlin:recent-books:v1';
const newSelectionSeed = () => crypto.randomUUID();

async function fetchNext(profile: CarlinProfile, selection: CarlinSelectionContext): Promise<CarlinResponse> {
  return fetchCarlinNext(apiUrl, publicApiKey, profile, selection);
}

export default function CarlinApp() {
  const [profile, setProfile] = useState<CarlinProfile>(initialCarlinProfile);
  const [question, setQuestion] = useState<CarlinQuestion>('recipient');
  const [options, setOptions] = useState<PublicCatalogOption[]>(recipientOptions);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [recommendations, setRecommendations] = useState<CarlinRecommendation[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [alternativesAvailable, setAlternativesAvailable] = useState(true);
  const recentBooks = useRef<string[]>([]);
  const selectionSeed = useRef<string | null>(null);
  if (selectionSeed.current === null) selectionSeed.current = newSelectionSeed();
  useEffect(() => {
    // Retira únicamente el historial antiguo; la nueva selección vive en memoria.
    try { localStorage.removeItem(recentBooksStorageKey); } catch { /* Almacenamiento bloqueado. */ }
  }, []);
  const currentValue = profile[question];
  const canContinue = currentValue !== null && currentValue !== '';

  const showSelection = (response: Extract<CarlinResponse, { kind: 'results' }>) => {
    const recent = [...new Set([...response.recommendations.map(({ book }) => book.id), ...(recentBooks.current ?? [])])].slice(0, 120);
    recentBooks.current = recent;
    setRecommendations(response.recommendations);
    setAlternativesAvailable(response.alternativesAvailable ?? true);
    keepElementVisible('results-title', 'start');
  };

  const moreRecommendations = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    selectionSeed.current = newSelectionSeed();
    try {
      const response = await fetchNext(profile, { seed: selectionSeed.current, seenIds: recentBooks.current ?? [] });
      if (response.kind !== 'results') throw new Error('Necesitamos ajustar tus respuestas antes de buscar otra selección.');
      showSelection(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No hemos podido buscar otra selección. Inténtalo de nuevo.');
    } finally { setPending(false); }
  };

  const choose = (value: string | number) => {
    setError('');
    const updated = { ...profile, [question]: value } as CarlinProfile;
    if (question === 'recipient') Object.assign(updated, { age: 30, type: null, subgenre: null, theme: null, pace: null, difficulty: null, length: null, budget: null });
    if (question === 'age') Object.assign(updated, { type: null, subgenre: null, theme: null, pace: null, difficulty: null, length: null, budget: null });
    if (question === 'type') Object.assign(updated, { subgenre: null, theme: null, pace: null, difficulty: null, length: null, budget: null });
    if (question === 'subgenre') Object.assign(updated, { theme: null, pace: null, difficulty: null, length: null, budget: null });
    if (question === 'theme') Object.assign(updated, { pace: null, difficulty: null, length: null, budget: null });
    if (question === 'pace' || question === 'difficulty') Object.assign(updated, { length: null, budget: null });
    if (question === 'length') updated.budget = null;
    setProfile(updated);
    if (question !== 'age') void advance(updated);
  };

  const advance = async (nextProfile = profile) => {
    const answer = nextProfile[question];
    if ((question !== 'recipient' && (answer === null || answer === '')) || pending) return;
    setError('');
    const entry = { question, options, profile: nextProfile };
    if (question === 'recipient') {
      setHistory((current) => [...current, entry]);
      setQuestion('age');
      setOptions([]);
      keepQuestionVisible();
      return;
    }
    setPending(true);
    try {
      const response = await fetchNext(nextProfile, { seed: selectionSeed.current ?? undefined, seenIds: recentBooks.current ?? [] });
      setHistory((current) => [...current, entry]);
      if (response.kind === 'question') {
        setQuestion(response.question);
        setOptions(response.options);
        keepQuestionVisible();
      } else {
        showSelection(response);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No hemos podido conectar. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  };

  const next = () => void advance(profile);

  const back = () => {
    if (pending || history.length === 0) return;
    const entry = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setQuestion(entry.question);
    setOptions(entry.options);
    setProfile(entry.profile);
    setRecommendations(null);
    setError('');
    keepQuestionVisible();
  };

  const restart = () => {
    selectionSeed.current = newSelectionSeed();
    setProfile(initialCarlinProfile);
    setQuestion('recipient');
    setOptions(recipientOptions);
    setHistory([]);
    setRecommendations(null);
    setError('');
    keepQuestionVisible();
  };

  return <main id="top" className="carlin-page">
    <header className="carlin-header">
      <a className="carlin-logo" href={`${siteBasePath}presentacion/`} aria-label="NextBook, volver a la presentación">
        <span className="carlin-logo-mark"><BookOpen size={18} strokeWidth={1.7} /></span><span>NextBook<span className="carlin-logo-dot">.</span></span>
      </a>
      <div className="carlin-header-center"><span className="carlin-header-line" /><span>Una experiencia de Carlin La Reina</span><span className="carlin-header-line" /></div>
    </header>

    {recommendations ? <Results recommendations={recommendations} onRestart={restart} onBack={back} onMore={() => void moreRecommendations()} alternativesAvailable={alternativesAvailable} pending={pending} error={error} /> : (
      <div className="carlin-journey">
        <aside className="carlin-hero" style={{ backgroundImage: `linear-gradient(180deg,rgba(17,39,35,.25),rgba(10,31,27,.43) 34%,rgba(9,29,26,.92)),url('${siteBasePath}presentacion/hero-bookshop.png')` }}>
          <div className="carlin-hero-top"><span className="carlin-hero-orbit" aria-hidden="true"><BookOpen size={18} strokeWidth={1.5} /></span><span>CARLIN LA REINA <span className="carlin-hero-separator">/</span> NEXTBOOK</span></div>
          <div className="carlin-hero-content">
            <p className="carlin-overline carlin-overline-light"><span className="carlin-overline-rule" /> UNA LIBRERÍA. INFINITAS HISTORIAS.</p>
            <h1>Hay un libro<br />que <em>te está</em><br />esperando.</h1>
            <p className="carlin-hero-subtitle">Lecturas seleccionadas del catálogo de Carlin La Reina para encontrar una historia que encaje contigo.</p>
          </div>
          <div className="carlin-hero-bottom"><span>EL PLACER DE ENCONTRARLO</span><span className="carlin-hero-book" aria-hidden="true"><BookOpen size={22} strokeWidth={1.5} /></span><span>SIN PERDERSE ENTRE MILES</span></div>
        </aside>

        <section className="carlin-workspace" aria-labelledby="question-title" aria-busy={pending}>
          <div className="carlin-workspace-head"><span>EL DESCUBRIMIENTO</span><span>{String(history.length + 1).padStart(2, '0')} <span className="carlin-step-total">/ 09</span></span></div>
          <div className="carlin-progress" aria-hidden="true"><span style={{ width: `${progressByQuestion[question]}%` }} /></div>
          <span className="sr-only">Progreso del cuestionario: {progressByQuestion[question]} %</span>
          <div className="carlin-question-content">
            <p className="carlin-overline"><span className="carlin-overline-rule" /> {kickerFor(question)}</p>
            <h2 id="question-title">{titleFor(question, profile.recipient === 'gift')}</h2>
            <p className="carlin-question-description">{descriptionFor(question)}</p>
            {question === 'age' ? <AgeWheel age={profile.age} onChange={(age) => choose(age)} /> : (
              <div className="carlin-options">
                {options.map((option, index) => <Choice key={String(option.value)} selected={currentValue === option.value} disabled={pending} onClick={() => choose(option.value)} index={index} question={question} label={option.label} />)}
              </div>
            )}
            {error && <div className="carlin-error" role="alert"><strong>No hemos podido avanzar.</strong><span>{error}</span><button type="button" onClick={next}>Reintentar conexión ↗</button></div>}
          </div>
          <div className="carlin-footer-actions">
            <button type="button" className="carlin-back" onClick={back} disabled={history.length === 0 || pending}><ArrowLeft size={17} /> Atrás</button>
            {question === 'age' && <button type="button" className="carlin-next" onClick={next} disabled={!canContinue || pending}>
              <span>{pending ? 'Buscando en la librería…' : `Continuar con ${profile.age ?? 'esta edad'}`}</span><ArrowRight size={19} />
            </button>}
          </div>
          <p className="carlin-workspace-note">Sin registro · Preguntas que cambian contigo · Selección de la librería</p>
        </section>
      </div>
    )}
    <LegalFooter showNextBookLink />
  </main>;
}

function kickerFor(question: CarlinQuestion) {
  const values: Record<CarlinQuestion, string> = {
    recipient: '01 — EMPEZAMOS POR TI', age: '02 — EL LECTOR', type: '03 — LA PRIMERA PISTA',
    subgenre: '04 — AFINAMOS', theme: '05 — LO QUE TE MUEVE',
    pace: '06 — EL RITMO', difficulty: '07 — EL NIVEL', length: '08 — A TU MEDIDA', budget: '09 — EL ÚLTIMO DETALLE',
  };
  return values[question];
}

function titleFor(question: CarlinQuestion, gift: boolean) {
  const values: Record<CarlinQuestion, string> = {
    recipient: '¿Para quién buscamos?',
    age: gift ? '¿Qué edad tiene quien lo recibirá?' : '¿Qué edad tienes?',
    type: gift ? '¿Qué le gustaría leer?' : '¿Qué te apetece leer?',
    subgenre: gift ? '¿Qué historias suele disfrutar?' : '¿Qué historias te atraen?',
    theme: gift ? '¿Qué tema le haría ilusión?' : '¿Qué tema te llama?',
    pace: gift ? '¿Qué ritmo le gustaría?' : '¿Qué ritmo te apetece?',
    difficulty: gift ? '¿Qué nivel le vendría bien?' : '¿Qué nivel buscas?',
    length: gift ? '¿Qué extensión suele disfrutar?' : '¿Qué extensión te apetece?',
    budget: '¿Qué presupuesto tienes?',
  };
  return values[question];
}

function descriptionFor(question: CarlinQuestion) {
  const values: Record<CarlinQuestion, string> = {
    recipient: 'Cada buena recomendación empieza con una persona. Cuéntanos a quién va dirigido este hallazgo.',
    age: 'Así podremos elegir libros adecuados para su momento lector.',
    type: 'Elige lo que más te atraiga entre las lecturas disponibles para esta edad. Después afinaremos la selección.',
    subgenre: 'Escoge el camino que más te tiente. También puedes dejarte sorprender.',
    theme: 'Explora los temas presentes en los libros disponibles. Hay más opciones en la lista; también puedes dejarte sorprender.',
    pace: 'Hay lecturas que se saborean y otras que no te dejan parar.',
    difficulty: 'Buscaremos un nivel que resulte cómodo y estimulante.',
    length: 'Puedes elegir una lectura breve o una historia en la que quedarte más tiempo.',
    budget: 'Ajustaremos las recomendaciones al precio que prefieras.',
  };
  return values[question];
}

function AgeWheel({ age, onChange }: { age: number | null; onChange: (age: number) => void }) {
  const value = age ?? 30;
  return <div className="carlin-age-picker">
    <div className="carlin-age-wheel" aria-live="polite"><strong>{value}</strong><span>años</span></div>
    <label className="carlin-age-label" htmlFor="carlin-age-range">Desliza para elegir cualquier edad entre 0 y 100</label>
    <input id="carlin-age-range" className="carlin-age-range" type="range" min="0" max="100" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <div className="carlin-age-range-labels"><span>0 años</span><span>100 años</span></div>
    <p className="carlin-age-hint">Ajustaremos las recomendaciones a su etapa lectora y a los libros disponibles.</p>
  </div>;
}

function Choice({ selected, disabled, onClick, index, question, label }: {
  selected: boolean; disabled: boolean; onClick: () => void; index: number; question: CarlinQuestion; label: ReactNode;
}) {
  const Icon = question === 'recipient' ? index === 0 ? UserRound : Gift : null;
  return <button type="button" className={`carlin-choice ${selected ? 'carlin-choice-selected' : ''}`} aria-pressed={selected} disabled={disabled} onClick={onClick}>
    {Icon && <Icon size={20} strokeWidth={1.6} className="carlin-choice-icon" aria-hidden="true" />}
    <span className="carlin-choice-label">{label}</span>
    <span className="carlin-choice-indicator">{selected ? <Check size={15} strokeWidth={2.5} /> : <ArrowRight size={15} />}</span>
  </button>;
}

type BookDetails = { title: string; authors: string[]; description?: string; cover?: string; publisher?: string; publishedDate?: string; pageCount?: number; categories?: string[]; loaded: boolean };

function catalogBookDetails(book: CarlinRecommendation['book']): BookDetails {
  return { title: book.title, authors: book.author ? [book.author] : [], description: cleanBookText(book.description),
    cover: book.coverUrl, publisher: book.publisher, publishedDate: book.publishedDate, pageCount: book.pageCount,
    loaded: Boolean(book.publisher || book.description || book.coverUrl),
  };
}

const cleanBookText = (text?: string) => text?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^[^a-záéíóúüñ]{40,}(?=[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ])/, '').trim() || undefined;
const normalizeBookText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function findGoogleBooksDetails(book: CarlinRecommendation['book'], signal: AbortSignal): Promise<BookDetails | undefined> {
  const isbn = /^[0-9Xx]{10,13}$/.test(book.id);
  const query = isbn ? `isbn:${book.id}` : `intitle:${book.title}${book.author ? `+inauthor:${book.author}` : ''}`;
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.search = new URLSearchParams({ q: query, maxResults: '5', printType: 'books' }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok) return undefined;
  const data = await response.json() as { items?: Array<{ volumeInfo?: { title?: string; authors?: string[]; description?: string; imageLinks?: { thumbnail?: string; smallThumbnail?: string }; publisher?: string; publishedDate?: string; pageCount?: number; categories?: string[]; industryIdentifiers?: Array<{ type?: string; identifier?: string }> } }> };
  const targetTitle = normalizeBookText(book.title);
  const targetAuthor = normalizeBookText(book.author);
  const match = data.items?.find(({ volumeInfo }) => {
    if (!volumeInfo?.title) return false;
    const candidateTitle = normalizeBookText(volumeInfo.title);
    const sameTitle = candidateTitle === targetTitle || candidateTitle.startsWith(targetTitle) || targetTitle.startsWith(candidateTitle);
    if (!sameTitle) return false;
    if (isbn && volumeInfo.industryIdentifiers?.length) {
      return volumeInfo.industryIdentifiers.some(({ identifier }) => identifier?.replace(/[-\s]/g, '') === book.id);
    }
    return !targetAuthor || volumeInfo.authors?.some((author) => normalizeBookText(author).includes(targetAuthor) || targetAuthor.includes(normalizeBookText(author)));
  })?.volumeInfo;
  if (!match) return undefined;
  const thumbnail = match.imageLinks?.thumbnail ?? match.imageLinks?.smallThumbnail;
  return {
    title: match.title ?? book.title,
    authors: match.authors ?? (book.author ? [book.author] : []),
    description: cleanBookText(match.description),
    cover: thumbnail?.replace(/^http:/, 'https:'),
    publisher: match.publisher,
    publishedDate: match.publishedDate,
    pageCount: match.pageCount,
    categories: match.categories ?? [],
    loaded: true,
  };
}

async function findBookDetails(book: CarlinRecommendation['book'], signal: AbortSignal): Promise<BookDetails> {
  // Las fichas comprobadas se sirven desde Supabase, sin repetir consultas externas.
  const stored = catalogBookDetails(book);
  if (stored.loaded) return stored;
  type Edition = { title?: string; authors?: Array<{ name?: string }>; cover?: { medium?: string; large?: string }; publish_date?: string; publishers?: Array<{ name?: string }>; number_of_pages?: number; subjects?: Array<{ name?: string }>; notes?: string | { value?: string } };
  let info: Edition | undefined;
  let google: BookDetails | undefined;
  try { google = await findGoogleBooksDetails(book, signal); } catch { /* Open Library sirve de respaldo. */ }
  if (/^[0-9Xx]{10,13}$/.test(book.id)) {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(`ISBN:${book.id}`)}&jscmd=data&format=json`, { signal });
    if (response.ok) {
      const data = await response.json() as Record<string, Edition>;
      info = data[`ISBN:${book.id}`];
    }
  }
  if (!info) {
    const searchUrl = new URL('https://openlibrary.org/search.json');
    searchUrl.search = new URLSearchParams({ q: `${book.title} ${book.author}`.trim(), limit: '1', fields: 'title,author_name,first_publish_year,cover_i,first_sentence,number_of_pages_median,key' }).toString();
    const response = await fetch(searchUrl, { signal });
    if (response.ok) {
      const data = await response.json() as { docs?: Array<{ title?: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; first_sentence?: string[]; number_of_pages_median?: number; key?: string }> };
      const match = data.docs?.[0];
      if (match) info = {
        title: match.title, authors: (match.author_name ?? []).map((name) => ({ name })),
        cover: match.cover_i ? { large: `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg?default=false` } : undefined,
        publish_date: match.first_publish_year ? String(match.first_publish_year) : undefined,
        number_of_pages: match.number_of_pages_median,
        notes: match.first_sentence?.join(' '),
      };
    }
  }
  const cover = google?.cover ?? info?.cover?.large ?? info?.cover?.medium;
  const note = google?.description ?? cleanBookText(typeof info?.notes === 'string' ? info.notes : info?.notes?.value);
  return {
    title: google?.title ?? info?.title ?? book.title,
    authors: google?.authors ?? info?.authors?.map((author) => author.name).filter((name): name is string => Boolean(name)) ?? (book.author ? [book.author] : []),
    description: note,
    cover,
    publisher: google?.publisher ?? info?.publishers?.map((publisher) => publisher.name).filter(Boolean).join(', '),
    publishedDate: google?.publishedDate ?? info?.publish_date,
    pageCount: google?.pageCount ?? info?.number_of_pages,
    categories: google?.categories ?? info?.subjects?.map((subject) => subject.name).filter((name): name is string => Boolean(name)) ?? [],
    loaded: true,
  };
}

function fallbackBookDescription(book: CarlinRecommendation['book']) {
  if (book.themes.length) return `La ficha de este libro destaca ${book.themes.slice(0, 3).join(', ')}. No encontramos una sinopsis editorial para esta edición.`;
  return 'No encontramos una sinopsis editorial para esta edición. Abre la ficha para consultar los datos disponibles del libro.';
}

function Results({ recommendations, onRestart, onBack, onMore, alternativesAvailable, pending, error }: {
  recommendations: CarlinRecommendation[]; onRestart: () => void; onBack: () => void; onMore: () => void; alternativesAvailable: boolean; pending: boolean; error: string;
}) {
  const [details, setDetails] = useState<Record<string, BookDetails>>({});
  const [selectedBook, setSelectedBook] = useState<CarlinRecommendation['book'] | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(recommendations.map(async ({ book }) => {
      try {
        const found = await findBookDetails(book, controller.signal);
        if (!controller.signal.aborted) setDetails((current) => ({ ...current, [book.id]: found }));
      } catch {
        if (!controller.signal.aborted) setDetails(current => ({ ...current, [book.id]: { ...catalogBookDetails(book), loaded: true } }));
      }
    }));
    return () => controller.abort();
  }, [recommendations]);

  useEffect(() => {
    if (!selectedBook) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    const closeFromBackdrop = (event: MouseEvent) => {
      if (event.target !== dialog || !dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSelectedBook(null);
    };
    dialog?.addEventListener('click', closeFromBackdrop);
    return () => { dialog?.removeEventListener('click', closeFromBackdrop); dialog?.close(); document.body.style.overflow = previousOverflow; opener?.focus(); };
  }, [selectedBook]);

  return <section className="carlin-results">
    <div className="carlin-results-intro">
      <p className="carlin-overline"><span className="carlin-overline-rule" /> TU SELECCIÓN PERSONAL</p>
      <h1 id="results-title">Las historias que<br /><em>podrían ser tuyas.</em></h1>
      <p>Elegidas de los libros de Carlin La Reina según tus respuestas. Quizá aquí empiece tu próxima gran lectura.</p>
      <div className="carlin-results-meta"><BookOpen size={18} strokeWidth={1.5} aria-hidden="true" /> CURADO POR NEXTBOOK PARA CARLIN LA REINA</div>
      {recommendations.length > 0 && recommendations.length < 3 && <p className="carlin-affinity-note">Con la edad y el presupuesto indicados no hay tres títulos distintos disponibles. Puedes ampliar el presupuesto para explorar más opciones.</p>}
    </div>

    {recommendations.length > 0 ? <div className="carlin-results-grid">
      {recommendations.map(({ book, affinity }, index) => {
        const info = details[book.id] ?? catalogBookDetails(book);
        return <article className={`carlin-result-card carlin-result-card-${index + 1}`} key={book.id}>
        <button type="button" className="carlin-result-card-trigger" aria-label={`Ver más información sobre ${book.title}`} aria-haspopup="dialog" onClick={() => setSelectedBook(book)}><span className="carlin-sr-only">Abrir información del libro</span></button>
        <div className={`carlin-result-art carlin-result-art-${index + 1}`}>
          {info?.cover ? <img className="carlin-cover" src={info.cover} alt={`Portada de ${book.title}`} loading="lazy" onError={() => setDetails(current => ({ ...current, [book.id]: { ...info, cover: undefined } }))} /> : <div className="carlin-fallback-cover">
            <div className="carlin-fallback-brand"><BookOpen size={15} strokeWidth={1.5} /><span>CARLIN LA REINA</span><span>·</span><span>NB / 0{index + 1}</span></div>
            <span className="carlin-fallback-mark" aria-hidden="true"><BookOpen size={56} strokeWidth={1.3} /></span>
            <h3>{book.title}</h3>
            <p>{book.author || 'Una lectura por descubrir'}</p>
            <div className="carlin-fallback-foot"><span>UNA HISTORIA PARA TI</span><ArrowRight size={17} /></div>
          </div>}
        </div>
        <div className="carlin-result-body">
          <div className="carlin-result-labels"><p className="carlin-result-kicker">PARA TU MOMENTO LECTOR</p>{affinity && <span className="carlin-affinity" aria-label={`${affinity.percent}% de afinidad`}>{affinity.percent}%</span>}</div>
          <h2>{book.title}</h2>
          {book.author && <p className="carlin-result-author">{book.author}</p>}
          <p className="carlin-result-synopsis">{info?.description || (info?.loaded ? fallbackBookDescription(book) : 'Buscando la sinopsis y los datos de esta edición…')}</p>
          <div className="carlin-result-bottom"><span>{book.price === null ? 'Consultar en librería' : formatCarlinPrice(book.price)}</span><ArrowRight size={17} aria-hidden="true" /></div>
        </div>
      </article>;
      })}
    </div> : <div className="carlin-empty"><BookOpen size={35} strokeWidth={1.5} aria-hidden="true" /><h2>Esta vez no hemos dado con el libro.</h2><p>Prueba con un presupuesto más amplio o una sección diferente.</p><button type="button" onClick={onBack}>Cambiar mi presupuesto <ArrowRight size={16} /></button></div>}

    {error && <p className="carlin-error" role="alert">{error}</p>}
    <div className="carlin-results-actions"><p>La disponibilidad y el precio pueden cambiar. Confírmalos con la librería antes de comprar.</p><div className="carlin-results-buttons">{alternativesAvailable && recommendations.length > 0 && <button type="button" onClick={onMore} disabled={pending}><RefreshCw size={16} className={pending ? 'carlin-spin' : ''} />{pending ? 'Buscando otras lecturas…' : 'Ver otras recomendaciones'}</button>}<button type="button" onClick={onRestart} disabled={pending}>Empezar de nuevo</button></div></div>
    {selectedBook && <div className="carlin-detail-backdrop">
      <dialog ref={dialogRef} className="carlin-detail-dialog" aria-modal="true" aria-labelledby="carlin-detail-title" onCancel={() => setSelectedBook(null)}>
        <button className="carlin-detail-close" type="button" aria-label="Cerrar ficha" onClick={() => setSelectedBook(null)}><X size={20} /></button>
        {details[selectedBook.id]?.cover && <img className="carlin-detail-cover" src={details[selectedBook.id].cover} alt={`Portada de ${selectedBook.title}`} />}
        <div className="carlin-detail-copy">
          <p className="carlin-result-kicker">FICHA DEL LIBRO · CARLIN LA REINA</p>
          <h2 id="carlin-detail-title">{selectedBook.title}</h2>
          {selectedBook.author && <p className="carlin-result-author">{selectedBook.author}</p>}
          {selectedBook.price !== null && <p className="carlin-detail-price">{formatCarlinPrice(selectedBook.price)}</p>}
          <p className="carlin-detail-description">{details[selectedBook.id]?.description || (details[selectedBook.id]?.loaded ? fallbackBookDescription(selectedBook) : 'Buscando la sinopsis y los datos editoriales de esta edición…')}</p>
          {selectedBook.themes.length > 0 && <p className="carlin-detail-themes"><strong>Temas de la ficha:</strong> {selectedBook.themes.join(' · ')}</p>}
          <dl className="carlin-detail-facts">
            <div><dt>ISBN</dt><dd>{selectedBook.id}</dd></div>
            {selectedBook.binding && <div><dt>Formato</dt><dd>{selectedBook.binding}</dd></div>}
            {details[selectedBook.id]?.publisher && <div><dt>Editorial</dt><dd>{details[selectedBook.id].publisher}</dd></div>}
            {details[selectedBook.id]?.publishedDate && <div><dt>Publicación</dt><dd>{details[selectedBook.id].publishedDate}</dd></div>}
            {details[selectedBook.id]?.pageCount && <div><dt>Páginas</dt><dd>{details[selectedBook.id].pageCount}</dd></div>}
          </dl>
        </div>
      </dialog>
    </div>}
  </section>;
}
