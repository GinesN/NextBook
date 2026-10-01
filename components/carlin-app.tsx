'use client';
/* eslint-disable next/no-img-element -- GitHub Pages publica esta app como sitio Vite estático. */

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, Gift, RefreshCw, UserRound, X } from 'lucide-react';

import {
  formatCarlinPrice, initialCarlinProfile,
  type CarlinProfile, type CarlinQuestion, type CarlinRecommendation,
  type CarlinResponse, type PublicCatalogOption,
} from '@/supabase/functions/_shared/carlin';

const siteBasePath = import.meta.env.BASE_URL;
const apiUrl = import.meta.env.VITE_CARLIN_API_URL
  || 'https://aesmyvfjcfcjegytsacy.supabase.co/functions/v1/carlin-recommend';
const publicApiKey = 'sb_publishable_7hEvf7ILNYgc5cKar9_u6w_oFgQJgsk';
const recipientOptions: PublicCatalogOption[] = [
  { value: 'self', label: 'Para mí' }, { value: 'gift', label: 'Para regalar' },
];
const progressByQuestion: Record<CarlinQuestion, number> = {
  recipient: 8, age: 18, type: 30, subgenre: 42, theme: 55,
  pace: 68, difficulty: 80, budget: 92,
};
type HistoryEntry = { question: CarlinQuestion; options: PublicCatalogOption[]; profile: CarlinProfile };

async function fetchNext(profile: CarlinProfile): Promise<CarlinResponse> {
  const response = await fetch(apiUrl, {
    method: 'POST', headers: apiUrl.includes('127.0.0.1')
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', Authorization: `Bearer ${publicApiKey}`, apikey: publicApiKey },
    body: JSON.stringify({ profile }),
  });
  const data = await response.json().catch(() => null) as { error?: string; kind?: string } | null;
  if (!response.ok) throw new Error(data?.error || 'No hemos podido conectar con la librería.');
  if (data?.kind !== 'question' && data?.kind !== 'results') throw new Error('La librería ha devuelto una respuesta inesperada.');
  return data as CarlinResponse;
}

export default function CarlinApp() {
  const [profile, setProfile] = useState<CarlinProfile>(initialCarlinProfile);
  const [question, setQuestion] = useState<CarlinQuestion>('recipient');
  const [options, setOptions] = useState<PublicCatalogOption[]>(recipientOptions);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [recommendations, setRecommendations] = useState<CarlinRecommendation[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const currentValue = profile[question];
  const canContinue = currentValue !== null && currentValue !== '';

  const choose = (value: string | number) => {
    setError('');
    const updated = { ...profile, [question]: value } as CarlinProfile;
    if (question === 'recipient') Object.assign(updated, { age: 30, type: null, subgenre: null, theme: null, pace: null, difficulty: null, budget: null });
    if (question === 'age') Object.assign(updated, { type: null, subgenre: null, theme: null, pace: null, difficulty: null, budget: null });
    if (question === 'type') Object.assign(updated, { subgenre: null, theme: null, pace: null, difficulty: null, budget: null });
    if (question === 'subgenre') Object.assign(updated, { theme: null, pace: null, difficulty: null, budget: null });
    if (question === 'theme') Object.assign(updated, { pace: null, difficulty: null, budget: null });
    if (question === 'pace' || question === 'difficulty') updated.budget = null;
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPending(true);
    try {
      const response = await fetchNext(nextProfile);
      setHistory((current) => [...current, entry]);
      if (response.kind === 'question') {
        setQuestion(response.question);
        setOptions(response.options);
      } else {
        setRecommendations(response.recommendations);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  };

  const restart = () => {
    setProfile(initialCarlinProfile);
    setQuestion('recipient');
    setOptions(recipientOptions);
    setHistory([]);
    setRecommendations(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <main id="top" className="carlin-page">
    <header className="carlin-header">
      <a className="carlin-logo" href={`${siteBasePath}presentacion/`} aria-label="NextBook, volver a la presentación">
        <span className="carlin-logo-mark"><BookOpen size={18} strokeWidth={1.7} /></span><span>NextBook<span className="carlin-logo-dot">.</span></span>
      </a>
      <div className="carlin-header-center"><span className="carlin-header-line" /><span>Una experiencia de Carlin La Reina</span><span className="carlin-header-line" /></div>
      <span className="carlin-edition">EDICIÓN LOCAL <span>01 / 01</span></span>
    </header>

    {recommendations ? <Results recommendations={recommendations} onRestart={restart} onBack={back} /> : (
      <div className="carlin-journey">
        <aside className="carlin-hero" style={{ backgroundImage: `linear-gradient(180deg,rgba(17,39,35,.25),rgba(10,31,27,.43) 34%,rgba(9,29,26,.92)),url('${siteBasePath}presentacion/hero-bookshop.png')` }}>
          <div className="carlin-hero-top"><span className="carlin-hero-orbit">✳</span><span>CARLIN LA REINA <span className="carlin-hero-separator">/</span> NEXTBOOK</span></div>
          <div className="carlin-hero-content">
            <p className="carlin-overline carlin-overline-light"><span className="carlin-overline-rule" /> UNA LIBRERÍA. INFINITAS HISTORIAS.</p>
            <h1>Hay un libro<br />que <em>te está</em><br />esperando.</h1>
            <p className="carlin-hero-subtitle">Una selección hecha desde los estantes de Carlin La Reina, pensada alrededor de ti.</p>
          </div>
          <div className="carlin-hero-bottom"><span>EL PLACER DE ENCONTRARLO</span><span className="carlin-hero-star">✦</span><span>SIN PERDERSE ENTRE MILES</span></div>
        </aside>

        <section className="carlin-workspace" aria-labelledby="question-title" aria-busy={pending}>
          <div className="carlin-workspace-head"><span>EL DESCUBRIMIENTO</span><span>{String(history.length + 1).padStart(2, '0')} <span className="carlin-step-total">/ 08</span></span></div>
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
  </main>;
}

function kickerFor(question: CarlinQuestion) {
  const values: Record<CarlinQuestion, string> = {
    recipient: '01 — EMPEZAMOS POR TI', age: '02 — EL LECTOR', type: '03 — LA PRIMERA PISTA',
    subgenre: '04 — AFINAMOS', theme: '05 — LO QUE TE MUEVE',
    pace: '06 — EL RITMO', difficulty: '06 — EL NIVEL', budget: '07 — EL ÚLTIMO DETALLE',
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
    budget: '¿Qué presupuesto tienes?',
  };
  return values[question];
}

function descriptionFor(question: CarlinQuestion) {
  const values: Record<CarlinQuestion, string> = {
    recipient: 'Cada buena recomendación empieza con una persona. Cuéntanos a quién va dirigido este hallazgo.',
    age: 'Así podremos elegir libros adecuados para su momento lector.',
    type: 'Nos guiarán los libros que la librería tiene disponibles para esta edad.',
    subgenre: 'Escoge el camino que más te tiente. También puedes dejarte sorprender.',
    theme: 'Explora los temas presentes en los libros disponibles. Hay más opciones en la lista; también puedes dejarte sorprender.',
    pace: 'Hay lecturas que se saborean y otras que no te dejan parar.',
    difficulty: 'Buscaremos un nivel que resulte cómodo y estimulante.',
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
    <span className="carlin-choice-index">{String(index + 1).padStart(2, '0')}</span>
    {Icon && <Icon size={20} strokeWidth={1.6} className="carlin-choice-icon" aria-hidden="true" />}
    <span className="carlin-choice-label">{label}</span>
    <span className="carlin-choice-indicator">{selected ? <Check size={15} strokeWidth={2.5} /> : <ArrowRight size={15} />}</span>
  </button>;
}

type BookDetails = { title: string; authors: string[]; description?: string; cover?: string; publisher?: string; publishedDate?: string; pageCount?: number; categories?: string[]; infoLink?: string; loaded: boolean };

async function findBookDetails(book: CarlinRecommendation['book'], signal: AbortSignal): Promise<BookDetails> {
  type Edition = { title?: string; authors?: Array<{ name?: string }>; cover?: { medium?: string; large?: string }; info_url?: string; publish_date?: string; publishers?: Array<{ name?: string }>; number_of_pages?: number; subjects?: Array<{ name?: string }>; notes?: string | { value?: string } };
  let info: Edition | undefined;
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
        info_url: match.key ? `https://openlibrary.org${match.key}` : undefined,
        publish_date: match.first_publish_year ? String(match.first_publish_year) : undefined,
        number_of_pages: match.number_of_pages_median,
        notes: match.first_sentence?.join(' '),
      };
    }
  }
  const cover = info?.cover?.large ?? info?.cover?.medium;
  const note = typeof info?.notes === 'string' ? info.notes : info?.notes?.value;
  return {
    title: info?.title ?? book.title,
    authors: info?.authors?.map((author) => author.name).filter((name): name is string => Boolean(name)) ?? (book.author ? [book.author] : []),
    description: note,
    cover,
    publisher: info?.publishers?.map((publisher) => publisher.name).filter(Boolean).join(', '),
    publishedDate: info?.publish_date,
    pageCount: info?.number_of_pages,
    categories: info?.subjects?.map((subject) => subject.name).filter((name): name is string => Boolean(name)) ?? [],
    infoLink: info?.info_url?.replace(/^http:/, 'https:') ?? `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`,
    loaded: true,
  };
}

function Results({ recommendations, onRestart, onBack }: {
  recommendations: CarlinRecommendation[]; onRestart: () => void; onBack: () => void;
}) {
  const [details, setDetails] = useState<Record<string, BookDetails>>({});
  const [selectedBook, setSelectedBook] = useState<CarlinRecommendation['book'] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(recommendations.map(async ({ book }) => {
      try {
        const found = await findBookDetails(book, controller.signal);
        if (!controller.signal.aborted) setDetails((current) => ({ ...current, [book.id]: found }));
      } catch { /* Las fichas siguen funcionando aunque Google Books no responda. */ }
    }));
    return () => controller.abort();
  }, [recommendations]);

  useEffect(() => {
    if (!selectedBook) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedBook(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedBook]);

  return <section className="carlin-results">
    <div className="carlin-results-intro">
      <p className="carlin-overline"><span className="carlin-overline-rule" /> TU SELECCIÓN PERSONAL</p>
      <h1>Las historias que<br /><em>podrían ser tuyas.</em></h1>
      <p>Elegidas de los libros de Carlin La Reina según tus respuestas. Quizá aquí empiece tu próxima gran lectura.</p>
      <div className="carlin-results-meta"><span>✦</span> CURADO POR NEXTBOOK PARA CARLIN LA REINA</div>
    </div>

    {recommendations.length > 0 ? <div className="carlin-results-grid">
      {recommendations.map(({ book, explanation }, index) => <article className="carlin-result-card" key={book.id}>
        <button type="button" className={`carlin-result-art carlin-result-art-${index + 1}`} aria-label={`Abrir la ficha de ${book.title}`} onClick={() => setSelectedBook(book)}>
          {details[book.id]?.cover ? <img className="carlin-cover" src={details[book.id].cover} alt={`Portada de ${book.title}`} loading="lazy" /> : <>
            <span className="carlin-result-art-top"><span>CARLIN LA REINA</span><span>NB / 0{index + 1}</span></span>
            <span className="carlin-result-art-book-title">{book.title}</span>
            <span className="carlin-result-art-bottom"><span>{book.author || book.subgenre}</span><span>✳</span></span>
          </>}
          <span className="carlin-cover-hint">{details[book.id]?.cover ? 'VER FICHA' : details[book.id]?.loaded ? 'VER DETALLES' : 'BUSCANDO PORTADA'}</span>
        </button>
        <div className="carlin-result-body">
          <p className="carlin-result-kicker">RECOMENDACIÓN 0{index + 1}</p>
          <h2>{book.title}</h2>
          {book.author && <p className="carlin-result-author">{book.author}</p>}
          <p className="carlin-result-explanation">{explanation}</p>
          <div className="carlin-result-bottom"><span>PRECIO EN CATÁLOGO</span><strong>{book.price === null ? 'Consultar' : formatCarlinPrice(book.price)}</strong></div>
          <button type="button" className="carlin-result-open" onClick={() => setSelectedBook(book)}>Ver ficha completa <ArrowRight size={15} /></button>
        </div>
      </article>)}
    </div> : <div className="carlin-empty"><span>✳</span><h2>Esta vez no hemos dado con el libro.</h2><p>Prueba con un presupuesto más amplio o una sección diferente.</p><button type="button" onClick={onBack}>Cambiar mi presupuesto <ArrowRight size={16} /></button></div>}

    <div className="carlin-results-actions"><p>La disponibilidad y el precio pueden cambiar. Confírmalos con la librería antes de comprar.</p><button type="button" onClick={onRestart}><RefreshCw size={16} /> Empezar de nuevo</button></div>
    {selectedBook && <div className="carlin-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
      <dialog open className="carlin-detail-dialog" aria-modal="true" aria-labelledby="carlin-detail-title">
        <button className="carlin-detail-close" type="button" aria-label="Cerrar ficha" onClick={() => setSelectedBook(null)}><X size={20} /></button>
        {details[selectedBook.id]?.cover && <img className="carlin-detail-cover" src={details[selectedBook.id].cover} alt={`Portada de ${selectedBook.title}`} />}
        <div className="carlin-detail-copy">
          <p className="carlin-result-kicker">FICHA DEL LIBRO · CARLIN LA REINA</p>
          <h2 id="carlin-detail-title">{selectedBook.title}</h2>
          {selectedBook.author && <p className="carlin-result-author">{selectedBook.author}</p>}
          <p className="carlin-detail-description">{details[selectedBook.id]?.description || `Una recomendación de la sección ${selectedBook.subgenre}, elegida según tus respuestas.`}</p>
          {selectedBook.themes.length > 0 && <p className="carlin-detail-themes"><strong>Temas:</strong> {selectedBook.themes.join(' · ')}</p>}
          <dl className="carlin-detail-facts">
            {details[selectedBook.id]?.publisher && <div><dt>Editorial</dt><dd>{details[selectedBook.id].publisher}</dd></div>}
            {details[selectedBook.id]?.publishedDate && <div><dt>Publicación</dt><dd>{details[selectedBook.id].publishedDate}</dd></div>}
            {details[selectedBook.id]?.pageCount && <div><dt>Páginas</dt><dd>{details[selectedBook.id].pageCount}</dd></div>}
            {selectedBook.price !== null && <div><dt>Precio en catálogo</dt><dd>{formatCarlinPrice(selectedBook.price)}</dd></div>}
          </dl>
          <a className="carlin-detail-link" href={details[selectedBook.id]?.infoLink ?? `https://openlibrary.org/search?q=${encodeURIComponent(selectedBook.title)}`} target="_blank" rel="noreferrer">Ficha de Open Library <ExternalLink size={15} /></a>
        </div>
      </dialog>
    </div>}
  </section>;
}
