import configuredBookstores from './bookstores.json';

export type Bookstore = { slug: string; name: string };

// Add the public branding here when a new catalog/store is activated in Supabase.
export const bookstores: Bookstore[] = configuredBookstores;

export function currentBookstore(location: Pick<Location, 'search' | 'pathname'>): Bookstore | undefined {
  const requested = new URLSearchParams(location.search).get('libreria');
  const route = location.pathname.replace(/\/+$/, '').split('/').pop();
  return bookstores.find(store => store.slug === requested || store.slug === route);
}
