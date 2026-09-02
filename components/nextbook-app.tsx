'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, RefreshCw, Sparkles, UserRound } from 'lucide-react';

import booksData from '@/app/data/books.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  formatPrice,
  genreOptions,
  interestOptions,
  moodOptions,
  recommendBooks,
  type Book,
  type ReaderProfile,
} from '@/lib/recommend';

const books = booksData as Book[];
const totalSteps = 7;
const initialProfile: ReaderProfile = {
  recipient: 'self',
  age: 25,
  interests: [],
  genre: 'any',
  mood: 'reflective',
  difficulty: 3,
  budget: 22,
};

const difficultyLabels = ['Muy ligera', 'Accesible', 'Intermedia', 'Exigente', 'Muy exigente'];
const accentClasses = ['bg-[#9a4c36]', 'bg-[#536849]', 'bg-[#3f5366]'];
const siteBasePath = import.meta.env.BASE_URL;

export default function Home() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ReaderProfile>(initialProfile);
  const [showResults, setShowResults] = useState(false);

  const recommendations = useMemo(() => recommendBooks(books, profile), [profile]);
  const canContinue = step !== 2 || profile.interests.length > 0;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const update = <K extends keyof ReaderProfile>(key: K, value: ReaderProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const toggleInterest = (id: string) => {
    setProfile((current) => {
      const selected = current.interests.includes(id);
      if (id === 'other') return { ...current, interests: selected ? [] : ['other'] };
      if (current.interests.includes('other')) return { ...current, interests: [id] };
      if (!selected && current.interests.length >= 3) return current;
      return {
        ...current,
        interests: selected ? current.interests.filter((item) => item !== id) : [...current.interests, id],
      };
    });
  };

  const next = () => {
    if (step < totalSteps - 1) setStep((current) => current + 1);
    else {
      setShowResults(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const restart = () => {
    setStep(0);
    setProfile(initialProfile);
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <Header results={showResults} />
      {showResults ? (
        <Results recommendations={recommendations} profile={profile} onRestart={restart} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-7 sm:px-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(390px,.97fr)] lg:gap-16 lg:px-10 lg:pb-20 lg:pt-10">
          <Intro step={step} />
          <section className="question-shell" aria-labelledby="question-title">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">Pregunta {step + 1} de {totalSteps}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{progress}%</p>
            </div>
            <Progress aria-label="Progreso del cuestionario" className="mt-3" value={progress} />

            <Question step={step} profile={profile} update={update} toggleInterest={toggleInterest} />

            <div className="mt-8 flex items-center gap-3">
              {step > 0 && (
                <Button variant="ghost" className="h-12 rounded-full px-4" onClick={() => setStep((current) => current - 1)}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Atrás</span>
                </Button>
              )}
              <Button disabled={!canContinue} className="h-12 flex-1 rounded-full px-5 text-base" size="lg" onClick={next}>
                {step === totalSteps - 1 ? <><Sparkles className="size-4" /> Ver mis recomendaciones</> : <>Continuar <ArrowRight className="ml-1 size-4" aria-hidden="true" /></>}
              </Button>
            </div>
            {step === 2 && profile.interests.length === 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Elige al menos un interés para continuar.</p>}
          </section>
        </section>
      )}
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
        <Check className="size-4 text-primary" /> {results ? 'Tu selección' : 'Tu próxima lectura, entre 250 títulos'}
      </span>
    </header>
  );
}

function Intro({ step }: { step: number }) {
  const notes = [
    'Una recomendación que empieza por la persona.',
    'La edad marca el punto de partida, no el límite.',
    'Los temas que te atraen revelan mucho de una lectura ideal.',
    'El género orienta; la sorpresa también forma parte del hallazgo.',
    'A veces elegimos un libro por cómo queremos sentirnos.',
    'La mejor lectura también respeta tu ritmo.',
    'Solo queda ajustar la selección a tu presupuesto.',
  ];
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
        “{notes[step]}”
      </blockquote>
      <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>7 preguntas</span><span aria-hidden="true">•</span><span>Menos de 2 minutos</span><span aria-hidden="true">•</span><span>Sin registro</span>
      </div>
    </div>
  );
}

type QuestionProps = {
  step: number;
  profile: ReaderProfile;
  update: <K extends keyof ReaderProfile>(key: K, value: ReaderProfile[K]) => void;
  toggleInterest: (id: string) => void;
};

function Question({ step, profile, update, toggleInterest }: QuestionProps) {
  if (step === 0) return (
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

  if (step === 1) return (
    <QuestionFrame kicker="El lector" title="¿Qué edad tiene?" description="Solo la usamos para descartar títulos que no correspondan a su franja de edad.">
      <div className="rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4"><span className="font-heading text-4xl font-semibold">{profile.age}</span><span className="text-sm font-medium text-primary">años</span></div>
        <input className="range-control mt-6 w-full" aria-label="Edad del lector" type="range" min="5" max="100" step="1" value={profile.age} onChange={(event) => update('age', Number(event.target.value))} />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>5 años</span><span>100 años</span></div>
      </div>
    </QuestionFrame>
  );

  if (step === 2) return (
    <QuestionFrame kicker="Lo que le mueve" title="¿Qué temas le interesan?" description="Elige entre uno y tres. Priorizaremos los libros que conecten con ellos.">
      <div className="grid gap-2 sm:grid-cols-2">
        {interestOptions.map((interest) => <Choice compact key={interest.id} selected={profile.interests.includes(interest.id)} onClick={() => toggleInterest(interest.id)} disabled={!profile.interests.includes(interest.id) && profile.interests.length >= 3}>{interest.label}</Choice>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{profile.interests.length}/3 seleccionados</p>
    </QuestionFrame>
  );

  if (step === 3) return (
    <QuestionFrame kicker="Una pista, no una jaula" title="¿Algún género preferido?" description="Puedes elegir uno o dejar que NextBook te sorprenda.">
      <div className="grid gap-2 sm:grid-cols-2">
        {genreOptions.map((genre) => <Choice compact key={genre.value} selected={profile.genre === genre.value} onClick={() => update('genre', genre.value)}>{genre.label}</Choice>)}
      </div>
    </QuestionFrame>
  );

  if (step === 4) return (
    <QuestionFrame kicker="La sensación" title="¿Qué mood apetece?" description="Piensa en cómo quieres que se sienta la lectura.">
      <div className="grid gap-3 sm:grid-cols-2">
        {moodOptions.map((mood) => <Choice key={mood.value} selected={profile.mood === mood.value} onClick={() => update('mood', mood.value)}><span className="font-semibold">{mood.label}</span><span className="mt-1 block text-sm text-muted-foreground">{mood.detail}</span></Choice>)}
      </div>
    </QuestionFrame>
  );

  if (step === 5) return (
    <QuestionFrame kicker="El ritmo" title="¿Qué dificultad buscas?" description="Desde una lectura muy ligera hasta un libro que pida toda tu atención.">
      <div className="rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4"><span className="font-heading text-4xl font-semibold">{profile.difficulty}</span><span className="text-sm font-medium text-primary">{difficultyLabels[profile.difficulty - 1]}</span></div>
        <input className="range-control mt-6 w-full" aria-label="Dificultad" type="range" min="1" max="5" step="1" value={profile.difficulty} onChange={(event) => update('difficulty', Number(event.target.value))} />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>Ligera</span><span>Exigente</span></div>
      </div>
    </QuestionFrame>
  );

  return (
    <QuestionFrame kicker="Último detalle" title="¿Cuál es el presupuesto?" description="Solo mostraremos libros que entren en este límite.">
      <div className="rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4"><span className="font-heading text-4xl font-semibold">{profile.budget === null ? 'Sin límite' : `${profile.budget} €`}</span><span className="text-sm text-muted-foreground">por libro</span></div>
        <input className="range-control mt-6 w-full disabled:opacity-35" aria-label="Presupuesto máximo" type="range" min="10" max="30" step="1" disabled={profile.budget === null} value={profile.budget ?? 30} onChange={(event) => update('budget', Number(event.target.value))} />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>10 €</span><span>30 €</span></div>
      </div>
      <button type="button" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => update('budget', profile.budget === null ? 22 : null)}>{profile.budget === null ? 'Definir un límite' : 'No tengo límite de presupuesto'}</button>
    </QuestionFrame>
  );
}

function QuestionFrame({ kicker, title, description, children }: { kicker: string; title: string; description: string; children: React.ReactNode }) {
  return <><p className="mt-8 text-sm font-medium text-primary">{kicker}</p><h2 id="question-title" className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h2><p className="mb-7 mt-3 leading-6 text-muted-foreground">{description}</p>{children}</>;
}

function Choice({ selected, onClick, children, compact = false, disabled = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} aria-pressed={selected} onClick={onClick} className={`choice-card ${compact ? 'choice-card--compact' : ''} ${selected ? 'choice-card--selected' : ''}`}><span className={`choice-dot ${selected ? 'choice-dot--selected' : ''}`}>{selected && <Check className="size-3.5" />}</span>{children}</button>;
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-full border px-3 py-1.5 text-sm transition ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50'}`}>{children}</button>;
}

function Results({ recommendations, profile, onRestart }: { recommendations: ReturnType<typeof recommendBooks>; profile: ReaderProfile; onRestart: () => void }) {
  return (
    <section id="top" className="mx-auto w-full max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:px-10">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_420px]">
        <div><p className="eyebrow">Tu NextBook</p><h1 className="mt-4 max-w-4xl font-heading text-[clamp(3.2rem,7vw,6.5rem)] leading-[.92] font-semibold tracking-[-0.065em]">{recommendations.length === 1 ? 'Un libro para tu ' : 'Tus libros para tu '}<span className="text-primary italic">momento lector.</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Hemos comparado tus respuestas con los 250 títulos del catálogo y estos son los que mejor encajan.</p></div>
        <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card"><img src={`${siteBasePath}og.png`} alt="Libro abierto y una pila de libros de NextBook" className="aspect-[1.9/1] h-full w-full object-cover" /></div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">Pulsa una recomendación para descubrir su ficha editorial.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <Dialog key={recommendation.book.book_id}>
            <DialogTrigger render={<button type="button" className="block h-full w-full text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4" />}>
              <Card className="result-card h-full justify-between rounded-[1.5rem] border-0 py-0 ring-1 ring-border transition-shadow hover:shadow-xl hover:shadow-primary/10">
                <div>
                  <div className={`h-2 ${accentClasses[index]}`} />
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center justify-between gap-4"><span className="font-heading text-3xl italic text-muted-foreground/60">0{index + 1}</span><Badge variant="secondary" className="h-7 px-3 text-sm">{recommendation.match}% afinidad</Badge></div>
                    <div className="mt-8 min-h-28"><h2 className="font-heading text-3xl font-semibold leading-[1.03] tracking-[-0.045em]">{recommendation.book.title}</h2><p className="mt-3 text-sm text-muted-foreground">{recommendation.book.author}</p></div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6"><p className="min-h-28 leading-6 text-foreground/80">{recommendation.explanation}</p><div className="mt-5 flex flex-wrap gap-2"><Badge variant="outline">{genreOptions.find((item) => item.value === recommendation.book.subgenre)?.label ?? recommendation.book.subgenre}</Badge><Badge variant="outline">Dificultad {recommendation.book.difficulty_1_5}/5</Badge></div></CardContent>
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
                  <section><p className="text-xs font-medium uppercase tracking-[.13em] text-primary">Por qué es para ti</p><p className="mt-3 leading-7 text-foreground/85">{recommendation.explanation}</p></section>
                  <section><p className="text-xs font-medium uppercase tracking-[.13em] text-primary">Sobre el libro</p><p className="mt-3 leading-7 text-muted-foreground">{recommendation.book.description_seed}</p></section>
                </div>
                <aside className="rounded-2xl bg-muted/60 p-5">
                  <dl className="space-y-5 text-sm">
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Género</dt><dd className="mt-1 font-medium">{genreOptions.find((item) => item.value === recommendation.book.subgenre)?.label ?? recommendation.book.subgenre}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Temas</dt><dd className="mt-1 leading-6">{recommendation.book.themes}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Dificultad</dt><dd className="mt-1 font-medium">{difficultyLabels[recommendation.book.difficulty_1_5 - 1]} · {recommendation.book.difficulty_1_5}/5</dd></div>
                    <div><dt className="text-xs uppercase tracking-[.12em] text-muted-foreground">Público</dt><dd className="mt-1">{recommendation.book.audience}</dd></div>
                  </dl>
                  <div className="mt-7 border-t border-border pt-5"><p className="text-xs uppercase tracking-[.12em] text-muted-foreground">Precio</p><p className="mt-1 font-heading text-3xl font-semibold">{formatPrice(recommendation.book.demo_price_eur)}</p></div>
                </aside>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {recommendations.length === 0 && <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No hay títulos disponibles con esta combinación de edad y presupuesto. Prueba a ampliar el presupuesto o ajustar la edad.</p>}

      <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-border pt-7 sm:flex-row sm:items-center"><p className="max-w-2xl text-sm leading-6 text-muted-foreground">Precios, disponibilidad y metadatos proceden del Excel inicial y son datos demo. La recomendación respeta la edad y el presupuesto indicados.</p><Button variant="outline" className="h-11 rounded-full px-5" onClick={onRestart}><RefreshCw className="size-4" /> Repetir cuestionario</Button></div>
    </section>
  );
}
