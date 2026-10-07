import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import './app/globals.css';
import { currentBookstore } from '@/lib/bookstores';

const bookstore = currentBookstore(window.location);
const isCarlin = Boolean(bookstore);
const Quiz = lazy(() => isCarlin ? import('@/components/carlin-app') : import('@/components/nextbook-app'));
document.title = bookstore ? `${bookstore.name} · NextBook` : 'NextBook · Tu próxima lectura';

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-foreground" aria-busy="true">Preparando NextBook…</main>}><Quiz bookstore={bookstore} /></Suspense>,
);
