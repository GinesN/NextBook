import { mkdir, readFile, writeFile } from 'node:fs/promises';

const catalogPath = 'app/data/books.json';
const cachePath = 'work/demo-covers/search-cache.json';
const books = JSON.parse(await readFile(catalogPath, 'utf8'));
await mkdir('work/demo-covers', { recursive: true });
let cache = {};
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(word => word && !['the', 'a', 'an', 'of', 'and'].includes(word)).join(' ');
const authorAliases = {
  'Fyodor Dostoevsky': ['Fyodor Dostoyevsky', 'Fiódor Dostoievski', 'Фёдор Михайлович Достоевский'],
  'Leo Tolstoy': ['Лев Толстой', 'Лев Николаевич Толстой'],
  'Mikhail Bulgakov': ['Михаил Булгаков'],
  'Haruki Murakami': ['村上春樹'],
  'Sayaka Murata': ['村田沙耶香'],
  'Banana Yoshimoto': ['吉本 ばなな'],
};
const authorMatches = (expected, actual) => {
  const candidate = normalize(actual).split(' ');
  return [expected, ...(authorAliases[expected] ?? [])].some(name => {
    const tokens = normalize(name).split(' ').filter(token => token.length > 1);
    return tokens.length > 0 && (tokens.every(token => candidate.includes(token)) || normalize(name).replaceAll(' ', '') === normalize(actual).replaceAll(' ', ''));
  });
};

function selectCover(book, docs) {
  const title = normalize(book.title);
  return docs.flatMap(doc => {
    const authors = doc.author_name ?? [];
    if (!book.author.split(/\s+and\s+/).every(name => authors.some(author => authorMatches(name, author)))) return [];
    const editions = doc.editions?.docs ?? [];
    const matchedEdition = editions.find(edition => normalize(edition.title ?? '') === title && edition.cover_i > 0);
    const titleMatches = normalize(doc.title ?? '') === title || editions.some(edition => normalize(edition.title ?? '') === title);
    if (!titleMatches) return [];
    const id = matchedEdition?.cover_i ?? doc.cover_i;
    if (!Number.isInteger(id) || id <= 0) return [];
    return [{ id, work: doc.key, title: matchedEdition?.title ?? doc.title, author: authors.join(' / '), weight: (matchedEdition ? 100 : 0) + Math.log1p(doc.edition_count ?? 0) }];
  }).sort((a, b) => b.weight - a.weight)[0];
}

async function search(group, key, titleOnly = false) {
  if (cache[key]) return cache[key];
  const q = group.map(book => titleOnly ? `title:${JSON.stringify(book.title)}` : `(title:${JSON.stringify(book.title)} AND author:${JSON.stringify(book.author)})`).join(' OR ');
  const parameters = new URLSearchParams({ q, fields: 'key,title,author_name,cover_i,edition_count,editions,editions.title,editions.cover_i', lang: 'en', limit: '100' });
  const response = await fetch(`https://openlibrary.org/search.json?${parameters}`, { headers: { 'User-Agent': 'NextBook (nextbookesp@gmail.com)' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.docs)) throw new Error('Unexpected search response');
  cache[key] = body.docs;
  await writeFile(cachePath, JSON.stringify(cache));
  await new Promise(resolve => setTimeout(resolve, 1000));
  return body.docs;
}

let enriched = 0;
for (let start = 0; start < books.length; start += 10) {
  const group = books.slice(start, start + 10);
  const docs = await search(group, `batch:${group.map(book => book.book_id).join(',')}`);
  for (const book of group) {
    const cover = selectCover(book, docs);
    if (cover) {
      Object.assign(book, { cover_url: `https://covers.openlibrary.org/b/id/${cover.id}-L.jpg?default=false`, cover_work: cover.work, cover_title: cover.title, cover_author: cover.author });
      enriched++;
    }
  }
  console.log(`Cover metadata: ${Math.min(start + 10, books.length)}/${books.length} searched; ${enriched} matched`);
}
for (const book of books.filter(book => !book.cover_url)) {
  const cover = selectCover(book, await search([book], `single:${book.book_id}`));
  if (cover) Object.assign(book, { cover_url: `https://covers.openlibrary.org/b/id/${cover.id}-L.jpg?default=false`, cover_work: cover.work, cover_title: cover.title, cover_author: cover.author });
}
const remaining = books.filter(book => !book.cover_url);
for (let start = 0; start < remaining.length; start += 4) {
  const group = remaining.slice(start, start + 4);
  const docs = await search(group, `titles:${group.map(book => book.book_id).join(',')}`, true);
  for (const book of group) {
    const cover = selectCover(book, docs);
    if (cover) Object.assign(book, { cover_url: `https://covers.openlibrary.org/b/id/${cover.id}-L.jpg?default=false`, cover_work: cover.work, cover_title: cover.title, cover_author: cover.author });
  }
}
await writeFile(catalogPath, `${JSON.stringify(books, null, 2)}\n`);
const report = { total: books.length, covers: books.filter(book => book.cover_url).length, missing: books.filter(book => !book.cover_url).map(({ book_id, title, author }) => ({ book_id, title, author })), source: 'Open Library Search API; matched title and author; covers loaded directly from the Covers API' };
await writeFile('work/demo-covers/report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
