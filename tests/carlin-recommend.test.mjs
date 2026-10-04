import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCarlinEnrichment, recommendCarlinBooks, nextCarlinResponse, parseCarlinSelectionContext, typeOptions, carlinAffinity } from '../supabase/functions/_shared/carlin.ts';

const titles = ['El faro', 'La bruma', 'El jardín', 'La frontera', 'El espejo', 'La promesa', 'El refugio', 'La marea', 'El sendero', 'La estación', 'El invierno', 'La ventana'];
const books = titles.map((title, index) => ({ id: `book-${index}`, group: title, title, author: `Autor ${index % 4}`, genre: 'Ficción', subgenre: 'Thriller y misterio', type: 'Ficción/creativo', audience: 'Adulto/General', themes: ['misterio'], tone: 'Intrigante', pace: 'Rápido', difficulty: 'Media', price: 14, stock: 1, confidence: .8 }));
const profile = { recipient: 'self', age: 30, type: 'Ficción/creativo', subgenre: 'Thriller y misterio', theme: 'any', pace: 'any', difficulty: 'any', budget: 20 };
const ids = selection => selection.map(({ book }) => book.id);

test('la variedad mantiene edad, presupuesto, tema y stock como restricciones', () => {
  const excluded = [
    { ...books[0], id: 'no-stock', title: 'Agotado', group: 'agotado', stock: 0 },
    { ...books[0], id: 'expensive', title: 'Caro', group: 'caro', price: 21 },
    { ...books[0], id: 'child', title: 'Infantil', group: 'infantil', audience: 'Infantil 0-5' },
    { ...books[0], id: 'wrong-theme', title: 'Viajes', group: 'viajes', themes: ['viajes'] },
    { ...books[0], id: 'unknown-price', title: 'Sin precio', group: 'sin-precio', price: null },
  ];
  for (let run = 0; run < 20; run++) {
    const selection = recommendCarlinBooks([...books, ...excluded], { ...profile, theme: 'misterio' }, { seed: `run-${run}` });
    assert.equal(selection.length, 3);
    assert.ok(ids(selection).every(id => id.startsWith('book-')));
    assert.ok(selection.every(({ book }) => book.price <= 20));
    assert.ok(selection.every(({ book }) => !('stock' in book) && !('confidence' in book)));
  }
});

test('mismo intento estable y nuevos intentos con variedad real', () => {
  assert.deepEqual(ids(recommendCarlinBooks(books, profile, { seed: 'same' })), ids(recommendCarlinBooks(books, profile, { seed: 'same' })));
  const differentSets = new Set(Array.from({ length: 20 }, (_, index) => ids(recommendCarlinBooks(books, profile, { seed: `different-${index}` })).sort().join(',')));
  assert.ok(differentSets.size > 10);
});

test('evita vistos hasta agotar alternativas y después evita el último conjunto', () => {
  let seenIds = [];
  const allShown = new Set();
  for (let run = 0; run < 4; run++) {
    const selection = recommendCarlinBooks(books, profile, { seed: `cycle-${run}`, seenIds });
    assert.equal(selection.length, 3);
    assert.ok(ids(selection).every(id => !allShown.has(id)));
    ids(selection).forEach(id => allShown.add(id));
    seenIds = [...ids(selection), ...seenIds];
  }
  const lastSet = seenIds.slice(0, 3);
  const next = recommendCarlinBooks(books, profile, { seed: 'recycle', seenIds });
  assert.ok(ids(next).every(id => !lastSet.includes(id)));
});

test('no repite distintas ediciones del mismo libro y diversifica autores', () => {
  const duplicate = { ...books[0], id: 'duplicate-edition', title: `${books[0].title} (edición especial)` };
  const selection = recommendCarlinBooks([duplicate, ...books], profile, { seed: 'diversity', seenIds: [books[0].id] });
  assert.ok(!ids(selection).includes(duplicate.id) && !ids(selection).includes(books[0].id));
  assert.equal(new Set(selection.map(({ book }) => book.author)).size, 3);
});

test('prioriza nivel y ritmo solicitados y funciona con un único candidato', () => {
  const difficult = books.slice(0, 3).map(book => ({ ...book, difficulty: 'Difícil' }));
  const selection = recommendCarlinBooks([...difficult, ...books.slice(3)], { ...profile, difficulty: 'Difícil' }, { seed: 'preference' });
  assert.deepEqual(new Set(ids(selection)), new Set(difficult.map(book => book.id)));
  const response = nextCarlinResponse([books[0]], profile, { seed: 'single' });
  assert.equal(response.kind, 'results');
  assert.equal(response.recommendations.length, 1);
  assert.equal(response.alternativesAvailable, false);
});

test('enriquecimiento separado conserva inventario y permite temas específicos', () => {
  const enriched = applyCarlinEnrichment([{ ...books[0], author: '' }], [{ book_id: books[0].id, metadata: { author: 'Autor comprobado', themes: ['secretos familiares'], description: 'Sinopsis comprobada', description_language: 'es', page_count: 280, cover_url: 'https://example.com/invalid.jpg' } }]);
  assert.equal(enriched[0].stock, books[0].stock);
  assert.equal(enriched[0].price, books[0].price);
  assert.equal(enriched[0].author, 'Autor comprobado');
  assert.equal(enriched[0].coverUrl, undefined);
  assert.equal(enriched[0].description, 'Sinopsis comprobada');
  assert.ok(enriched[0].themes.includes('secretos familiares'));
});

test('limita y valida el historial que llega del navegador', () => {
  const context = parseCarlinSelectionContext({ seed: 'x'.repeat(200), seenIds: ['valid', 'valid', '<invalid>', 3, ...Array.from({ length: 140 }, (_, n) => `id-${n}`)] });
  assert.equal(context.seed.length, 80);
  assert.equal(context.seenIds.length, 120);
  assert.equal(context.seenIds.filter(id => id === 'valid').length, 1);
  assert.ok(!context.seenIds.includes('<invalid>'));
});

test('los caminos de lectura se adaptan a edad y stock y filtran la selección', () => {
  const romance = { ...books[0], id: 'romance', group: 'romance', title: 'Un romance', subgenre: 'Romance' };
  const child = { ...books[0], id: 'comic-child', subgenre: 'Cómic / novela gráfica', audience: 'Infantil 6-8' };
  const soldOut = { ...books[0], id: 'sold-out', subgenre: 'Terror', stock: 0 };
  const catalog = [...books, romance, child, soldOut];
  const options = typeOptions(catalog, { ...profile, type: null });
  assert.deepEqual(options.map(option => option.value), ['any', 'reading:mystery', 'reading:romance']);
  assert.deepEqual(typeOptions(catalog, { ...profile, age: 7 }).map(option => option.value), ['any', 'reading:comic']);
  const chosen = { ...profile, type: 'reading:romance', subgenre: null };
  const response = nextCarlinResponse(catalog, chosen, { seed: 'romance' });
  assert.equal(response.kind, 'results');
  assert.deepEqual(ids(response.recommendations), ['romance']);
  assert.equal(chosen.subgenre, null); // Resolver un camino no muta las respuestas originales.
});

test('un camino con varios géneros permite afinarlos sin salir de ese camino', () => {
  const fantasy = { ...books[0], id: 'fantasy', group: 'fantasy', subgenre: 'Fantasía' };
  const scifi = { ...books[0], id: 'scifi', group: 'scifi', subgenre: 'Ciencia ficción / distopía' };
  const catalog = [...books, fantasy, scifi];
  const chosen = { ...profile, type: 'reading:imagination', subgenre: null };
  const question = nextCarlinResponse(catalog, chosen);
  assert.equal(question.question, 'subgenre');
  assert.deepEqual(new Set(question.options.map(option => option.value)), new Set(['any', 'Fantasía', 'Ciencia ficción / distopía']));
  const results = nextCarlinResponse(catalog, { ...chosen, subgenre: 'Fantasía' });
  assert.deepEqual(ids(results.recommendations), ['fantasy']);
});

test('la afinidad refleja las preferencias concretas y no inventa puntuaciones al sorprender', () => {
  const specific = { ...profile, theme: 'MISTERIO', pace: 'Rápido', difficulty: 'Media' };
  const exact = carlinAffinity(books[0], specific);
  assert.equal(exact.percent, 100);
  assert.ok(exact.criteria.every(criterion => criterion.matched));
  const alternative = carlinAffinity({ ...books[0], difficulty: 'Difícil' }, specific);
  assert.equal(alternative.percent, 86);
  assert.equal(alternative.criteria.filter(criterion => !criterion.matched).length, 1);
  assert.equal(carlinAffinity(books[0], { ...profile, type: 'any', subgenre: 'any' }), undefined);
  assert.deepEqual(carlinAffinity({ ...books[0], confidence: 0, stock: 100 }, specific), exact);
  const result = nextCarlinResponse(books, specific, { seed: 'affinity' });
  assert.equal(result.kind, 'results');
  assert.ok(result.recommendations.every(item => item.affinity.percent === 100));
});
