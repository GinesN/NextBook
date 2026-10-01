'use client';

import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, RefreshCw, Sparkles, UserRound } from 'lucide-react';

import {
  ageOptions, formatCarlinPrice, initialCarlinProfile,
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
  recipient: 8, age: 21, type: 35, subgenre: 50, theme: 64,
  pace: 78, difficulty: 78, budget: 90,
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
    setProfile((current) => {
      const updated = { ...current, [question]: value } as CarlinProfile;
      if (question === 'age') return { ...updated, type: null, subgenre: null, theme: null, pace: null, difficulty: null, budget: null };
      if (question === 'type') return { ...updated, subgenre: null, theme: null, pace: null, difficulty: null, budget: null };
      if (question === 'subgenre') return { ...updated, theme: null, pace: null, difficulty: null, budget: null };
      if (question === 'theme') return { ...updated, pace: null, difficulty: null, budget: null };
      if (question === 'pace' || question === 'difficulty') return { ...updated, budget: null };
      return updated;
    });
  };

  const next = async () => {
    if (!canContinue || pending) return;
    setError('');
    const entry = { question, options, profile };
    if (question === 'recipient') {
      setHistory((current) => [...current, entry]);
      setQuestion('age');
      setOptions(ageOptions);
      return;
    }
    setPending(true);
    try {
      const response = await fetchNext(profile);
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
          <div className="carlin-workspace-head"><span>EL DESCUBRIMIENTO</span><span>{String(history.length + 1).padStart(2, '0')} <span className="carlin-step-total">/ 07</span></span></div>
          <div className="carlin-progress" aria-hidden="true"><span style={{ width: `${progressByQuestion[question]}%` }} /></div>
          <span className="sr-only">Progreso del cuestionario: {progressByQuestion[question]} %</span>
          <div className="carlin-question-content">
            <p className="carlin-overline"><span className="carlin-overline-rule" /> {kickerFor(question)}</p>
            <h2 id="question-title">{titleFor(question, profile.recipient === 'gift')}</h2>
            <p className="carlin-question-description">{descriptionFor(question)}</p>
            <div className={`carlin-options ${question === 'age' ? 'carlin-options-ages' : ''}`}>
              {options.map((option, index) => <Choice key={String(option.value)} selected={currentValue === option.value} onClick={() => choose(option.value)} index={index} question={question} label={option.label} />)}
            </div>
            {error && <div className="carlin-error" role="alert"><strong>No hemos podido avanzar.</strong><span>{error}</span><button type="button" onClick={next}>Reintentar conexión ↗</button></div>}
          </div>
          <div className="carlin-footer-actions">
            <button type="button" className="carlin-back" onClick={back} disabled={history.length === 0 || pending}><ArrowLeft size={17} /> Atrás</button>
            <button type="button" className="carlin-next" onClick={next} disabled={!canContinue || pending}>
              <span>{pending ? 'Buscando en la librería…' : question === 'budget' ? 'Descubrir mis libros' : 'Continuar'}</span>
              {question === 'budget' ? <Sparkles size={19} /> : <ArrowRight size={19} />}
            </button>
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
    theme: 'Un detalle puede marcar la diferencia entre un libro cualquiera y uno inolvidable.',
    pace: 'Hay lecturas que se saborean y otras que no te dejan parar.',
    difficulty: 'Buscaremos un nivel que resulte cómodo y estimulante.',
    budget: 'Ajustaremos las recomendaciones al precio que prefieras.',
  };
  return values[question];
}

function Choice({ selected, onClick, index, question, label }: {
  selected: boolean; onClick: () => void; index: number; question: CarlinQuestion; label: ReactNode;
}) {
  const Icon = question === 'recipient' ? index === 0 ? UserRound : Gift : null;
  return <button type="button" className={`carlin-choice ${selected ? 'carlin-choice-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
    <span className="carlin-choice-index">{String(index + 1).padStart(2, '0')}</span>
    {Icon && <Icon size={20} strokeWidth={1.6} className="carlin-choice-icon" aria-hidden="true" />}
    <span className="carlin-choice-label">{label}</span>
    <span className="carlin-choice-indicator">{selected ? <Check size={15} strokeWidth={2.5} /> : <ArrowRight size={15} />}</span>
  </button>;
}

function Results({ recommendations, onRestart, onBack }: {
  recommendations: CarlinRecommendation[]; onRestart: () => void; onBack: () => void;
}) {
  return <section className="carlin-results">
    <div className="carlin-results-intro">
      <p className="carlin-overline"><span className="carlin-overline-rule" /> TU SELECCIÓN PERSONAL</p>
      <h1>Las historias que<br /><em>podrían ser tuyas.</em></h1>
      <p>Elegidas de los libros de Carlin La Reina según tus respuestas. Quizá aquí empiece tu próxima gran lectura.</p>
      <div className="carlin-results-meta"><span>✦</span> CURADO POR NEXTBOOK PARA CARLIN LA REINA</div>
    </div>

    {recommendations.length > 0 ? <div className="carlin-results-grid">
      {recommendations.map(({ book, explanation }, index) => <article className="carlin-result-card" key={book.id}>
        <div className={`carlin-result-art carlin-result-art-${index + 1}`}>
          <div className="carlin-result-art-top"><span>CARLIN LA REINA</span><span>NB / 0{index + 1}</span></div>
          <span className="carlin-result-art-number">0{index + 1}</span>
          <div className="carlin-result-art-bottom"><span>{book.subgenre}</span><span>✳</span></div>
        </div>
        <div className="carlin-result-body">
          <p className="carlin-result-kicker">RECOMENDACIÓN 0{index + 1}</p>
          <h2>{book.title}</h2>
          {book.author && <p className="carlin-result-author">{book.author}</p>}
          <p className="carlin-result-explanation">{explanation}</p>
          <div className="carlin-result-bottom"><span>PRECIO EN CATÁLOGO</span><strong>{book.price === null ? 'Consultar' : formatCarlinPrice(book.price)}</strong></div>
        </div>
      </article>)}
    </div> : <div className="carlin-empty"><span>✳</span><h2>Esta vez no hemos dado con el libro.</h2><p>Prueba con un presupuesto más amplio o una sección diferente.</p><button type="button" onClick={onBack}>Cambiar mi presupuesto <ArrowRight size={16} /></button></div>}

    <div className="carlin-results-actions"><p>La disponibilidad y el precio pueden cambiar. Confírmalos con la librería antes de comprar.</p><button type="button" onClick={onRestart}><RefreshCw size={16} /> Empezar de nuevo</button></div>
  </section>;
}
