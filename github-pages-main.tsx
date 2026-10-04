import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import './app/globals.css';

const isCarlin = new URLSearchParams(window.location.search).get('libreria') === 'carlin-la-reina';
const Quiz = lazy(() => isCarlin ? import('@/components/carlin-app') : import('@/components/nextbook-app'));
document.title = isCarlin ? 'Carlin La Reina · NextBook' : 'NextBook · Tu próxima lectura';

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-foreground" aria-busy="true">Preparando NextBook…</main>}><Quiz /></Suspense>,
);
