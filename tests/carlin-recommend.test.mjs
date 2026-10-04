import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCarlinEnrichment, recommendCarlinBooks, nextCarlinResponse, parseCarlinSelectionContext, typeOptions, carlinAffinity, preferenceQuestions } from '../supabase/functions/_shared/carlin.ts';

const titles = ['El faro', 'La bruma', 'El jardín', 'La frontera', 'El espejo', 'La promesa', 'El refugio', 'La marea', 'El sendero', 'La estación', 'El invierno', 'La ventana'];
const books = titles.map((title, index) => ({ id: `book-${index}`, group: title, title, author: `Autor ${index % 4}`, genre: 'Ficción', subgenre: 'Thriller y misterio', type: 'Ficción/creativo', audience: 'Adulto/General', themes: ['misterio'], tone: 'Intrigante', pace: 'Rápido', difficulty: 'Media', price: 14, stock: 1, confidence: .8 }));
const profile = { recipient: 'self', age: 30, type: 'Ficción/creativo', subgenre: 'Thriller y misterio', theme: 'any', pace: 'any', difficulty: 'any', length: 'any', budget: 20 };
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

test('mantiene volúmenes distintos de una saga al deduplicar ediciones', () => {
  const saga = [1,2,3].map(number=>({...books[number],group:`saga-${number}`,title:`La saga del bosque encantado ${number}`}));
  assert.equal(recommendCarlinBooks(saga,profile,{seed:'saga'}).length,3);
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
  assert.equal(response.recommendations.length, 3);
  assert.equal(response.recommendations[0].book.id, 'romance');
  assert.ok(response.recommendations[0].affinity.percent < 100);
  assert.ok(response.recommendations.slice(1).every(item => item.affinity.percent < response.recommendations[0].affinity.percent && /amplía tu elección/.test(item.explanation)));
  assert.equal(response.alternativesAvailable, true);
  assert.equal(chosen.subgenre, null); // Resolver un camino no muta las respuestas originales.
});

test('un camino con varios géneros permite afinarlos sin salir de ese camino', () => {
  const fantasy = { ...books[0], id: 'fantasy', group: 'fantasy', title: 'La torre encantada', subgenre: 'Fantasía' };
  const scifi = { ...books[0], id: 'scifi', group: 'scifi', title: 'Viaje a otro planeta', subgenre: 'Ciencia ficción / distopía' };
  const catalog = [...books, fantasy, scifi];
  const chosen = { ...profile, type: 'reading:imagination', subgenre: null };
  const question = nextCarlinResponse(catalog, chosen);
  assert.equal(question.question, 'subgenre');
  assert.deepEqual(new Set(question.options.map(option => option.value)), new Set(['any', 'Fantasía', 'Ciencia ficción / distopía']));
  const results = nextCarlinResponse(catalog, { ...chosen, subgenre: 'Fantasía' });
  assert.equal(results.recommendations.length, 3);
  assert.deepEqual(ids(results.recommendations).slice(0, 2), ['fantasy', 'scifi']);
});

test('completa tres opciones relajando el tema antes del género sin falsear la afinidad', () => {
  const exact = { ...books[0], themes: ['secretos'] };
  const alternatives = books.slice(1, 5);
  const excluded = [
    { ...exact, id: 'expensive', group: 'expensive', title: 'Demasiado caro', price: 21 },
    { ...exact, id: 'sold-out', group: 'sold-out', title: 'Agotado', stock: 0 },
    { ...exact, id: 'child', group: 'child', title: 'Para niños', audience: 'Infantil 0-5' },
    { ...exact, id: 'unknown', group: 'unknown', title: 'Sin precio', price: null },
    { ...exact, id: 'book-edition', title: `${exact.title} (otra edición)` },
  ];
  const chosen = { ...profile, theme: 'secretos', pace: 'Rápido', difficulty: 'Media' };
  const selection = recommendCarlinBooks([exact, ...alternatives, ...excluded], chosen, { seed: 'fill', seenIds: [exact.id] });
  assert.equal(selection.length, 3);
  assert.ok(selection[0].book.title.startsWith(exact.title)); // Una novedad lejana no sustituye la mejor coincidencia.
  assert.ok(selection[0].affinity.percent < 100);
  assert.ok(selection.slice(1).every(item => item.affinity.percent < selection[0].affinity.percent && /otros temas/.test(item.explanation)));
  assert.ok(ids(selection).every(id => id.startsWith('book-')));
  assert.equal(new Set(selection.map(item => item.book.title)).size, 3);
});

test('la afinidad refleja las preferencias concretas y no inventa puntuaciones al sorprender', () => {
  const specific = { ...profile, theme: 'MISTERIO', pace: 'Rápido', difficulty: 'Media' };
  const exact = carlinAffinity(books[0], specific);
  assert.ok(exact.percent > 70 && exact.percent < 100);
  assert.ok(exact.criteria.every(criterion => criterion.matched));
  const alternative = carlinAffinity({ ...books[0], difficulty: 'Difícil' }, specific);
  assert.ok(alternative.percent < exact.percent);
  assert.equal(alternative.criteria.filter(criterion => !criterion.matched).length, 1);
  assert.equal(carlinAffinity(books[0], { ...profile, type: 'any', subgenre: 'any' }), undefined);
  assert.deepEqual(carlinAffinity({ ...books[0], confidence: 0, stock: 100 }, specific), exact);
  const result = nextCarlinResponse(books, specific, { seed: 'affinity' });
  assert.equal(result.kind, 'results');
  assert.ok(result.recommendations.every(item => item.affinity.percent === exact.percent));
});

test('la sinopsis aporta relevancia temática sin fingir que una etiqueta sea una coincidencia perfecta', () => {
  const chosen = { ...profile, theme: 'tecnología' };
  const tagged = { ...books[0], themes: ['tecnología'] };
  const supported = { ...tagged, description: 'Una red de tecnología y robots transforma la ciudad. La inteligencia artificial controla cada decisión.', categories: 'Ciencia ficción: tecnología y robots' };
  const related = { ...books[0], themes: ['espacio'], description: 'Un viaje espacial hacia un planeta lejano.' };
  const unrelated = { ...books[0], themes: ['cocina'], description: 'Recetas para preparar una cena.' };
  const score = book => carlinAffinity(book, chosen).percent;
  assert.ok(score(supported) > score(tagged));
  assert.ok(score(tagged) > score(related));
  assert.ok(score(related) > score(unrelated));
  assert.ok(score(supported) < 100);
});

test('géneros cercanos, ritmos intermedios y niveles vecinos tienen coincidencia parcial', () => {
  const chosen = { ...profile, type: 'reading:imagination', subgenre: 'Fantasía', pace: 'Ágil', difficulty: 'Fácil' };
  const exact = { ...books[0], subgenre: 'Fantasía', pace: 'Ágil', difficulty: 'Fácil' };
  const score = book => carlinAffinity(book, chosen).percent;
  assert.ok(score(exact) > score({ ...exact, subgenre: 'Ciencia ficción / distopía' }));
  assert.ok(score({ ...exact, subgenre: 'Ciencia ficción / distopía' }) > score({ ...exact, subgenre: 'Cocina' }));
  assert.ok(score({ ...exact, pace: 'Equilibrado' }) > score({ ...exact, pace: 'Pausado' }));
  assert.ok(score({ ...exact, difficulty: 'Media' }) > score({ ...exact, difficulty: 'Alta' }));
});

test('la extensión usa páginas reales y cambia el orden sin cambiar edad, stock ni presupuesto', () => {
  const variants = books.slice(0, 4).map((book, index) => ({ ...book, pageCount: [180, 320, 550, 850][index] }));
  const short = { ...profile, length: 'short' };
  const long = { ...profile, length: 'long' };
  assert.equal(recommendCarlinBooks(variants, short, {seed:'length'})[0].book.id, variants[0].id);
  assert.ok(['book-2','book-3'].includes(recommendCarlinBooks(variants, long, {seed:'length'})[0].book.id));
  assert.ok(carlinAffinity(variants[1], short).percent > carlinAffinity(variants[2], short).percent);
  const response = nextCarlinResponse(variants, {...profile,length:null});
  assert.equal(response.question, 'length');
  assert.deepEqual(response.options.map(option => option.value), ['any','short','medium','long']);
});

test('un tema con un solo título no elimina preguntas útiles sobre ritmo o nivel', () => {
  const catalog = [
    {...books[0],themes:['tecnología'],pace:'Ágil',difficulty:'Fácil'},
    {...books[1],themes:['familia'],pace:'Equilibrado',difficulty:'Media'},
    {...books[2],themes:['amistad'],pace:'Pausado',difficulty:'Alta'},
  ];
  const chosen = {...profile,theme:'tecnología',pace:null,difficulty:null};
  assert.deepEqual(preferenceQuestions(catalog,chosen),['pace','difficulty']);
  assert.equal(nextCarlinResponse(catalog,chosen).question,'pace');
});

test('variedad limitada a candidatos cercanos y porcentaje independiente del azar o historial', () => {
  const chosen = {...profile,theme:'tecnología',pace:'Ágil',difficulty:'Fácil',length:'short'};
  const exact = {...books[0],themes:['tecnología'],pace:'Ágil',difficulty:'Fácil',pageCount:180};
  const poor = books.slice(1).map(book=>({...book,subgenre:'Cocina',type:'No ficción',themes:['cocina'],pace:'Pausado',difficulty:'Alta',pageCount:900}));
  const expected = carlinAffinity(exact,chosen).percent;
  const selection = recommendCarlinBooks([exact,...poor],chosen,{seed:'quality',seenIds:[exact.id]});
  assert.equal(selection[0].book.id,exact.id);
  assert.equal(selection[0].affinity.percent,expected);
  assert.ok(selection.slice(1).every(item=>item.affinity.percent<expected));
  assert.equal(recommendCarlinBooks([exact,...poor],chosen,{seed:'other'})[0].affinity.percent,expected);
});

test('sin preferencias no inventa afinidad y con poca información no promete certeza', () => {
  const sparse = {...profile,type:'reading:mystery',subgenre:'any'};
  const detailed = {...sparse,pace:'Rápido',difficulty:'Media',length:'short'};
  const book = {...books[0],pageCount:180};
  assert.ok(carlinAffinity(book,sparse).percent<carlinAffinity(book,detailed).percent);
  assert.ok(carlinAffinity(book,detailed).percent<100);
  assert.equal(carlinAffinity(book,{...profile,type:'any',subgenre:'any'}),undefined);
  const missing = {...book,pageCount:undefined};
  assert.ok(carlinAffinity(missing,detailed).percent<carlinAffinity(book,detailed).percent);
  assert.deepEqual(carlinAffinity({...book,stock:1000,confidence:0,price:2},detailed),carlinAffinity(book,detailed));
});
