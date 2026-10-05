/* eslint-disable next/no-img-element -- GitHub Pages usa Vite y no dispone del optimizador de imágenes de Next. */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, RefreshCw, UserRound } from 'lucide-react';

import booksData from '@/app/data/books.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { LegalFooter } from '@/components/legal-footer';
import {
  formatPrice,
  bookThemeLabels,
  createInitialProfile,
  genreLabel,
  getAvailableFocus,
  getAvailableGenres,
  getAvailableInterests,
  getEligibleBooks,
  getQuestionSequence,
  giftIntentOptions,
  isQuestionAnswered,
  moodOptions,
  paceOptions,
  readerIntentOptions,
  recommendBooks,
  updateReaderProfile,
  type Book,
  type QuestionId,
  type ReaderProfile,
} from '@/lib/recommend';

const books = booksData as Book[];
const difficultyLabels = ['Muy ligera', 'Accesible', 'Intermedia', 'Exigente', 'Muy exigente'];
const accentClasses = ['bg-[#284a39]', 'bg-[#7e9373]', 'bg-[#b96546]'];
const siteBasePath = import.meta.env.BASE_URL;

export default function Home() {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionId>('recipient');
  const [profile, setProfile] = useState<ReaderProfile>(createInitialProfile);
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<ReturnType<typeof recommendBooks>>([]);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const questionRef = useRef<HTMLElement>(null);
  const previousQuestion = useRef(currentQuestion);
  const questionSequence = getQuestionSequence(books, profile);
  const step = questionSequence.indexOf(currentQuestion);
  const totalSteps = questionSequence.length;
  const alternativeRecommendations = useMemo(() => showResults ? recommendBooks(books, profile, { seenIds }) : [], [profile, seenIds, showResults]);
  const canShowAlternatives = alternativeRecommendations.some(item => !recommendations.some(current => current.book.book_id === item.book.book_id));
  const singleChoice = ['recipient', 'genre', 'intent', 'focus', 'mood', 'pace', 'difficulty'].includes(currentQuestion);
  const canContinue = isQuestionAnswered(profile, currentQuestion);
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  useEffect(() => {
    if (previousQuestion.current === currentQuestion || showResults) return;
    previousQuestion.current = currentQuestion;
    const shell = questionRef.current;
    if (shell && (window.matchMedia('(max-width: 1023px)').matches || shell.getBoundingClientRect().top < 0)) {
      shell.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    shell?.querySelector<HTMLElement>('#question-title')?.focus({ preventScroll: true });
  }, [currentQuestion, showResults]);

  const displaySelection = (reader: ReaderProfile, alreadySeen = seenIds) => {
    const selection = recommendBooks(books, reader, { seenIds: alreadySeen });
    setRecommendations(selection);
    setSeenIds([...alreadySeen, ...selection.map(item => item.book.book_id)].slice(-60));
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const advance = (reader: ReaderProfile) => {
    if (!isQuestionAnswered(reader, currentQuestion)) return;
    const sequence = getQuestionSequence(books, reader);
    const index = sequence.indexOf(currentQuestion);
    if (index < sequence.length - 1) setCurrentQuestion(sequence[index + 1]);
    else displaySelection(reader);
  };

  const update = <K extends keyof ReaderProfile>(key: K, value: ReaderProfile[K]) => {
    const updated = updateReaderProfile(profile, key, value, books);
    setProfile(updated);
    if (singleChoice && key === currentQuestion) advance(updated);
  };

  const toggleInterest = (id: string) => {
    setProfile((current) => {
      const selected = current.interests.includes(id);
      if (id === 'other') return { ...current, interests: selected ? [] : ['other'], focus: '' };
      if (current.interests.includes('other')) return { ...current, interests: [id], focus: '' };
      if (!selected && current.interests.length >= 3) return current;
      return {
        ...current,
        interests: selected ? current.interests.filter((item) => item !== id) : [...current.interests, id],
        focus: '',
      };
    });
  };

  const restart = () => {
    setCurrentQuestion('recipient');
    previousQuestion.current = 'recipient';
    setProfile(createInitialProfile());
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <Header results={showResults} />
      {showResults ? (
        <Results recommendations={recommendations} eligibleCount={getEligibleBooks(books, profile).length} onRestart={restart}
          onEdit={() => { previousQuestion.current = 'recipient'; setShowResults(false); setCurrentQuestion('budget'); }}
          onAlternatives={canShowAlternatives ? () => displaySelection(profile) : undefined} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-7 sm:px-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(390px,.97fr)] lg:gap-16 lg:px-10 lg:pb-20 lg:pt-10">
          <Intro questionId={currentQuestion} />
          <section ref={questionRef} className="question-shell scroll-mt-5" aria-labelledby="question-title">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">Pregunta {step + 1} de {totalSteps}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{progress}%</p>
            </div>
            <Progress aria-label="Progreso del cuestionario" className="mt-3" value={progress} />

            <Question questionId={currentQuestion} profile={profile} update={update} toggleInterest={toggleInterest} />

            <div className="mt-8 flex items-center gap-3">
              {step > 0 && (
                <Button aria-label="Atrás" variant="ghost" className="h-12 rounded-full px-4" onClick={() => setCurrentQuestion(questionSequence[step - 1])}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Atrás</span>
                </Button>
              )}
              {singleChoice ? <p className="text-sm text-muted-foreground">Elige una opción para seguir.</p> :
                <Button disabled={!canContinue} className="h-12 flex-1 rounded-full px-5 text-base" size="lg" onClick={() => advance(profile)}>
                  {step === totalSteps - 1 ? <><BookOpen className="size-4" /> Ver mis recomendaciones</> : <>Continuar <ArrowRight className="ml-1 size-4" aria-hidden="true" /></>}
                </Button>}
            </div>
            {currentQuestion === 'interests' && profile.interests.length === 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Elige al menos un interés para continuar.</p>}
            {currentQuestion === 'intent' && !profile.intent && <p className="mt-3 text-center text-xs text-muted-foreground">Elige qué esperas de esta lectura para continuar.</p>}
            {currentQuestion === 'focus' && !profile.focus && <p className="mt-3 text-center text-xs text-muted-foreground">Elige la opción que más se parezca a lo que buscas.</p>}
          </section>
        </section>
      )}
      <LegalFooter />
    </main>
  );
}

function Header({ results }: { results: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <a className="flex items-center gap-2.5" href="#top" aria-label="NextBook, inicio">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><BookOpen className="size-4" /></span>
        <span className="font-heading text-xl font-semibold tracking-[-0.03em]">NextBook</span>
      </a>
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[.12em] text-muted-foreground sm:text-sm">
        <Check className="size-4 text-primary" /> {results ? 'Tu selección' : `Tu próxima lectura, entre ${books.length} títulos`}
      </span>
    </header>
  );
}

function Intro({ questionId }: { questionId: QuestionId }) {
  const notes: Record<QuestionId, string> = {
    recipient: 'Una recomendación que empieza por la persona.',
    age: 'Cada lector tiene su momento y su punto de partida.',
    genre: 'El género orienta; la sorpresa también forma parte del hallazgo.',
    interests: 'Los temas que te atraen revelan mucho de una lectura ideal.',
    intent: 'Ahora afinamos qué esperas de esta lectura.',
    focus: 'Tus intereses abren caminos distintos para conocerte mejor.',
    mood: 'A veces elegimos un libro por cómo queremos sentirnos.',
    pace: 'Una historia puede atraparte con calma o a toda velocidad.',
    difficulty: 'La mejor lectura también respeta tu ritmo.',
    budget: 'Solo queda ajustar la selección a tu presupuesto.',
  };
  return (
    <div id="top" className="flex flex-col justify-center lg:min-h-[650px]">
      <p className="eyebrow">Tu próxima gran lectura</p>
      <h1 className="mt-5 max-w-3xl font-heading text-[clamp(3.2rem,6.5vw,6.5rem)] leading-[.9] font-semibold tracking-[-0.07em]">
        Un libro que se sienta <span className="text-primary italic">muy tú.</span>
      </h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
        Cuéntanos qué buscas y encontraremos tres títulos que encajen contigo, sin perderte entre estanterías infinitas.
      </p>
      <blockquote className="mt-10 max-w-lg border-l border-primary/50 pl-5 font-heading text-lg italic leading-7 text-foreground/75">
        “{notes[questionId]}”
      </blockquote>
      <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>Preguntas que se adaptan a ti</span><span aria-hidden="true">•</span><span>Unos 2 minutos</span><span aria-hidden="true">•</span><span>Sin registro</span>
      </div>
    </div>
  );
}

type QuestionProps = {
  questionId: QuestionId;
  profile: ReaderProfile;
  update: <K extends keyof ReaderProfile>(key: K, value: ReaderProfile[K]) => void;
  toggleInterest: (id: string) => void;
};

function Question({ questionId, profile, update, toggleInterest }: QuestionProps) {
  if (questionId === 'recipient') return (
    <QuestionFrame kicker="Empecemos por lo esencial" title="¿Para quién buscamos?" description="Ajustaremos la selección según sea una lectura personal o un regalo.">
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['self', 'Para mí', 'Mi próxima lectura', UserRound],
          ['gift', 'Para regalar', 'Quiero acertar con alguien', Gift],
        ] as const).map(([value, label, detail, Icon]) => (
          <Choice key={value} selected={profile.recipient === value} onClick={() => update('recipient', value)}>
            <Icon className="mb-6 size-5 text-primary" />
            <span className="font-semibold">{label}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{detail}</span>
          </Choice>
        ))}
      </div>
    </QuestionFrame>
  );

  if (questionId === 'age') return (
    <QuestionFrame kicker="El lector" title={profile.recipient === 'gift' ? '¿Qué edad tiene quien lo recibirá?' : '¿Qué edad tienes?'} description="Esta demo incluye lecturas a partir de 13 años. La edad orienta la selección; no sustituye la valoración de una persona adulta.">
      <div className="rounded-xl border border-border bg-[#f9faf3] p-5 sm:p-6">
        <label className="flex items-center gap-4"><input className="min-w-0 flex-1 bg-transparent font-heading text-4xl font-semibold outline-none placeholder:text-muted-foreground/50" aria-label="Edad del lector" type="number" inputMode="numeric" min="13" max="100" step="1" placeholder="Tu edad" value={profile.age ?? ''} onChange={(event) => update('age', event.target.value === '' ? null : Number(event.target.value))} /><span className="text-sm font-medium text-primary">años</span></label>
        <p className="mt-4 text-xs text-muted-foreground">Indica una edad entre 13 y 100 años.</p>
      </div>
    </QuestionFrame>
  );

  if (questionId === 'interests') return (
    <QuestionFrame kicker="Lo que le mueve" title={profile.recipient === 'gift' ? '¿Qué temas le interesan?' : '¿Qué temas te interesan?'} description="Elige entre uno y tres. Priorizaremos los libros que conecten con ellos.">
      <div className="grid gap-2 sm:grid-cols-2">
        {getAvailableInterests(books, profile).map((interest) => <Choice compact key={interest.id} selected={profile.interests.includes(interest.id)} onClick={() => toggleInterest(interest.id)} disabled={interest.id !== 'other' && !profile.interests.includes(interest.id) && profile.interests.length >= 3}>{interest.label}</Choice>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{profile.interests.length}/3 seleccionados</p>
    </QuestionFrame>
  );

  if (questionId === 'intent') {
    const options = profile.recipient === 'gift' ? giftIntentOptions : readerIntentOptions;
    return <QuestionFrame kicker="La intención" title={profile.recipient === 'gift' ? '¿Qué quieres que sienta al recibirlo?' : '¿Qué quieres que te deje esta lectura?'} description="Tu respuesta nos permite recomendar con una intención más clara, no solo por género.">
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => <Choice key={option.id} selected={profile.intent === option.id} onClick={() => update('intent', option.id)}><span className="font-semibold">{option.label}</span><span className="mt-1 block text-sm text-muted-foreground">{option.detail}</span></Choice>)}
      </div>
    </QuestionFrame>;
  }

  if (questionId === 'focus') {
    const followUp = getAvailableFocus(books, profile);
    return <QuestionFrame kicker={followUp.kicker} title={followUp.title} description={followUp.description}>
      <div className="grid gap-3 sm:grid-cols-2">
        {followUp.options.map((option) => <Choice key={option.id} selected={profile.focus === option.id} onClick={() => update('focus', option.id)}><span className="font-semibold">{option.label}</span><span className="mt-1 block text-sm text-muted-foreground">{option.detail}</span></Choice>)}
      </div>
    </QuestionFrame>;
  }

  if (questionId === 'genre') return (
    <QuestionFrame kicker="Una pista, no una jaula" title={profile.recipient === 'gift' ? '¿Qué universo suele engancharle?' : '¿Qué universo te apetece explorar?'} description="Puedes elegir uno o dejar que NextBook te sorprenda.">
      <div className="grid gap-2 sm:grid-cols-2">
        {getAvailableGenres(books, profile).map((genre) => <Choice compact key={genre.value} selected={profile.genre === genre.value} onClick={() => update('genre', genre.value)}>{genre.label}</Choice>)}
      </div>
    </QuestionFrame>
  );

  if (questionId === 'mood') return (
    <QuestionFrame kicker="La sensación" title={profile.recipient === 'gift' ? '¿Con qué sensación debería quedarse?' : '¿Con qué sensación quieres quedarte?'} description="Piensa en cómo quieres que se sienta la lectura.">
      <div className="grid gap-3 sm:grid-cols-2">
        {moodOptions.map((mood) => <Choice key={mood.value} selected={profile.mood === mood.value} onClick={() => update('mood', mood.value)}><span className="font-semibold">{mood.label}</span><span className="mt-1 block text-sm text-muted-foreground">{mood.detail}</span></Choice>)}
      </div>
    </QuestionFrame>
  );

  if (questionId === 'pace') return (
    <QuestionFrame kicker="Cómo avanza la historia" title={profile.recipient === 'gift' ? '¿Qué ritmo suele disfrutar?' : '¿A qué ritmo quieres leer?'} description="El ritmo es distinto de la dificultad: una historia puede ser sencilla y avanzar con calma.">
      <div className="grid gap-3 sm:grid-cols-2">
        {paceOptions.map(pace => <Choice key={pace.value ?? 'any'} selected={profile.pace === pace.value} onClick={() => update('pace', pace.value)}><span className="font-semibold">{pace.label}</span><span className="mt-1 block text-sm text-muted-foreground">{pace.detail}</span></Choice>)}
      </div>
    </QuestionFrame>
  );

  if (questionId === 'difficulty') return (
    <QuestionFrame kicker="El ritmo" title="¿Qué dificultad buscas?" description="Desde una lectura muy ligera hasta un libro que pida toda tu atención.">
      <div className="grid gap-2 sm:grid-cols-2">
        {difficultyLabels.map((label, index) => <Choice compact key={label} selected={profile.difficulty === index + 1} onClick={() => update('difficulty', index + 1)}>{label}</Choice>)}
        <Choice compact selected={profile.difficulty === null} onClick={() => update('difficulty', null)}>No tengo preferencia</Choice>
      </div>
    </QuestionFrame>
  );

  return (
    <QuestionFrame kicker="Último detalle" title="¿Cuál es el presupuesto?" description="Probamos el filtro con precios simulados. No son ofertas ni precios actuales de una librería.">
      <div className="rounded-xl border border-border bg-[#f9faf3] p-5 sm:p-6">
        {profile.budget === null ? <p className="font-heading text-4xl font-semibold">Sin límite</p> : <label className="flex items-center gap-4"><input className="min-w-0 flex-1 bg-transparent font-heading text-4xl font-semibold outline-none placeholder:text-muted-foreground/50" aria-label="Presupuesto máximo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Tu límite" value={profile.budget ?? ''} onChange={(event) => update('budget', event.target.value === '' ? undefined : Number(event.target.value))} /><span className="text-sm text-muted-foreground">€ por libro</span></label>}
      </div>
      <button type="button" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => update('budget', profile.budget === null ? undefined : null)}>{profile.budget === null ? 'Definir un límite' : 'No tengo límite de presupuesto'}</button>
    </QuestionFrame>
  );
}

function QuestionFrame({ kicker, title, description, children }: { kicker: string; title: string; description: string; children: React.ReactNode }) {
  return <><p className="mt-8 text-sm font-medium text-primary">{kicker}</p><h2 id="question-title" tabIndex={-1} className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] outline-none sm:text-4xl">{title}</h2><p className="mb-7 mt-3 leading-6 text-muted-foreground">{description}</p>{children}</>;
}

function Choice({ selected, onClick, children, compact = false, disabled = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} aria-pressed={selected} onClick={onClick} className={`choice-card ${compact ? 'choice-card--compact' : ''} ${selected ? 'choice-card--selected' : ''}`}><span className={`choice-dot ${selected ? 'choice-dot--selected' : ''}`}>{selected && <Check className="size-3.5" />}</span>{children}</button>;
}

function Results({ recommendations, eligibleCount, onRestart, onEdit, onAlternatives }: {
  recommendations: ReturnType<typeof recommendBooks>; eligibleCount: number; onRestart: () => void;
  onEdit: () => void; onAlternatives?: () => void;
}) {
  return (
    <section id="top" className="mx-auto w-full max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:px-10">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_420px]">
        <div><p className="eyebrow">Tu NextBook</p><h1 className="mt-4 max-w-4xl font-heading text-[clamp(3.2rem,7vw,6.5rem)] leading-[.92] font-semibold tracking-[-0.065em]">{recommendations.length === 0 ? 'Busquemos tu ' : recommendations.length === 1 ? 'Un libro para tu ' : recommendations.length === 2 ? 'Dos lecturas para tu ' : 'Tres lecturas para tu '}<span className="text-primary italic">momento lector.</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{recommendations.length ? `Tu selección entre los ${books.length} títulos de la demo, respetando la edad y el presupuesto que has indicado.` : 'No hay títulos que cumplan los límites que has indicado. Puedes revisar el presupuesto sin volver a empezar.'}</p></div>
        <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card"><img src={`${siteBasePath}og.png`} alt="Libro abierto y una pila de libros de NextBook" className="aspect-[1.9/1] h-full w-full object-cover" /></div>
      </div>

      {recommendations.length > 0 && <p className="mt-8 text-sm text-muted-foreground">Pulsa una recomendación para descubrir más sobre el libro.</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <Dialog key={recommendation.book.book_id}>
            <DialogTrigger render={<button type="button" aria-label={`Ver ficha de ${recommendation.book.title}`} className="block h-full w-full text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4" />}>
              <Card className={`result-card h-full justify-between rounded-[1.5rem] border-0 py-0 ring-1 ${index === 0 ? 'ring-primary/30' : 'ring-border'} transition-shadow hover:shadow-xl hover:shadow-primary/10`}>
                <div>
                  <div className={`h-2 ${accentClasses[index]}`} />
                  <CardHeader className="p-6 pb-3">
                    <div className="flex min-h-10 items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><BookOpen className="size-6 shrink-0 text-primary/60" aria-hidden="true" /><p className="recommendation-label">{index === 0 ? 'Nuestra primera recomendación' : 'Para tu momento lector'}</p></div><span className={`recommendation-rank ${index === 0 ? 'recommendation-rank-first' : ''}`} aria-label={`Recomendación ${index + 1}`}>{index + 1}</span></div>
                    <div className="mt-8 min-h-28"><h2 className="font-heading text-3xl font-semibold leading-[1.03] tracking-[-0.045em]">{recommendation.book.title}</h2><p className="mt-3 text-sm text-muted-foreground">{recommendation.book.author}</p></div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6"><p className="min-h-28 leading-6 text-foreground/80">{recommendation.book.description_seed}</p><div className="mt-5 flex flex-wrap gap-2"><Badge variant="outline">{genreLabel(recommendation.book.subgenre)}</Badge><Badge variant="outline">{difficultyLabels[recommendation.book.difficulty_1_5 - 1]}</Badge></div></CardContent>
                </div>
                <div className="flex items-center justify-between border-t border-border bg-muted/45 px-6 py-5"><span className="text-xs uppercase tracking-[.12em] text-muted-foreground">Precio</span><span className="font-heading text-2xl font-semibold">{formatPrice(recommendation.book.demo_price_eur)}</span></div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[min(780px,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-[1.5rem] p-0 sm:max-w-2xl" showCloseButton>
              <div className={`h-2 ${accentClasses[index]}`} />
              <DialogHeader className="gap-3 px-7 pb-5 pt-8 sm:px-9">
                <p className="eyebrow">Ficha editorial</p>
                <DialogTitle className="max-w-xl font-heading text-4xl font-semibold leading-[.98] tracking-[-.05em] sm:text-5xl">{recommendation.book.title}</DialogTitle>
                <DialogDescription className="text-base">{recommendation.book.author}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-7 px-7 pb-8 sm:grid-cols-[1.2fr_.8fr] sm:px-9">
                <div className="space-y-7">
                  <section><p className="text-xs font-medium uppercase tracking-[.13em] text-primary">Sobre el libro</p><p className="mt-3 leading-7 text-muted-foreground">{recommendation.book.description_seed}</p></section>
                  <section><p className="text-xs font-medium uppercase tracking-[.13em] text-primary">Temas que encontrarás</p><div className="mt-3 flex flex-wrap gap-2">{bookThemeLabels(recommendation.book).map(theme => <Badge key={theme} variant="outline">{theme}</Badge>)}</div></section>
                </div>
                <aside className="rounded-2xl bg-muted/60 p-5">
                  <dl className="space-y-5 text-sm">
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Género</dt><dd className="mt-1 font-medium">{(recommendation.book.genres ?? [recommendation.book.subgenre]).map(genreLabel).join(' · ')}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Ritmo</dt><dd className="mt-1 leading-6">{paceOptions.find(pace => pace.value === recommendation.book.pace_1_3)?.label ?? 'Sin clasificar'}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Dificultad</dt><dd className="mt-1 font-medium">{difficultyLabels[recommendation.book.difficulty_1_5 - 1]} · {recommendation.book.difficulty_1_5}/5</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Edad orientativa</dt><dd className="mt-1">A partir de {recommendation.book.age_min} años</dd></div>
                  </dl>
                  <div className="mt-7 border-t border-border pt-5"><p className="text-xs uppercase tracking-[.12em] text-muted-foreground">Precio</p><p className="mt-1 font-heading text-3xl font-semibold">{formatPrice(recommendation.book.demo_price_eur)}</p></div>
                </aside>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {recommendations.length > 0 && recommendations.length < 3 && <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Solo {eligibleCount === 1 ? 'un título cumple' : `${eligibleCount} títulos cumplen`} los límites de edad y presupuesto. Puedes ampliar el presupuesto para tener más opciones.</p>}
      <p className="mt-7 text-xs leading-5 text-muted-foreground">Catálogo de demostración: precios y disponibilidad simulados. Temas, ritmo, dificultad y edades son orientaciones editoriales.</p>

      <div className="mt-10 flex flex-wrap justify-end gap-3 border-t border-border pt-7">
        <Button render={<a href={`${siteBasePath}presentacion/`} aria-label="Volver a la landing" />} nativeButton={false} className="h-11 w-full rounded-full px-5 sm:mr-auto sm:w-auto"><ArrowLeft className="size-4" aria-hidden="true" /> Volver a la landing</Button>
        <Button variant="ghost" className="h-11 rounded-full px-5" onClick={onEdit}><ArrowLeft className="size-4" /> Revisar respuestas</Button>
        {onAlternatives && <Button variant="outline" className="h-11 rounded-full px-5" onClick={onAlternatives}><BookOpen className="size-4" /> Ver otra selección</Button>}
        <Button variant="outline" className="h-11 rounded-full px-5" onClick={onRestart}><RefreshCw className="size-4" /> Repetir cuestionario</Button>
      </div>
    </section>
  );
}
