import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCarlinCatalog } from './carlin-source.mjs';
import { applyCarlinEnrichment, initialCarlinProfile, recommendCarlinBooks, subgenreOptions } from '../supabase/functions/_shared/carlin.ts';
const [input] = process.argv.slice(2);
if (!input) throw new Error('Uso: node --experimental-strip-types scripts/check-carlin-curation.mjs <inventario.jsonl>');
const original = new Map(readCarlinCatalog(input).books.map(book => [book.id, book]));
const selected = JSON.parse(readFileSync('work/curation/selected.json', 'utf8'));
const covers = JSON.parse(readFileSync('work/curation/covers.json', 'utf8'));
assert.equal(selected.length, 500);
const ids = new Set(selected.map(item => item.book.id));
assert.equal(ids.size, 500);
for (const { book, metadata } of selected) {
  const before = original.get(book.id);
  assert.ok(before);
  assert.equal(book.price, before.price);
  assert.equal(book.stock, before.stock);
  assert.ok(book.stock > 0 && book.price > 0);
  assert.ok(metadata.description.length >= 120);
  assert.ok(metadata.page_count > 0 && metadata.author && metadata.publisher);
  assert.ok(covers[metadata.cover_url]?.valid);
  assert.ok(book.themes.length > 0);
  assert.ok(!/matem[aá]ticas|diccionario|franc[eé]s para viajar|cuaderno|colorear|pegatinas/i.test(book.title));
}
const books = applyCarlinEnrichment(selected.map(item => item.book), selected.map(item => ({ book_id: item.book.id, metadata: item.metadata })));
let profiles = 0;
for (const age of [0, 2, 5, 8, 12, 16, 30, 80]) {
  const profile = { ...initialCarlinProfile, recipient: 'self', age, type: 'any', theme: 'any', pace: 'any', difficulty: 'any', budget: 'any' };
  for (const option of subgenreOptions(books, profile)) {
    const recommendations = recommendCarlinBooks(books, { ...profile, subgenre: option.value }, { seed: `check-${age}-${option.value}` });
    assert.ok(recommendations.length > 0);
    for (const { book } of recommendations) {
      assert.ok(ids.has(book.id) && book.description && book.coverUrl && book.pageCount);
      assert.ok(!('stock' in book) && !('confidence' in book) && !('metadataSource' in book));
    }
    profiles++;
  }
}
console.log(`500 fichas completas del stock original; ${profiles} perfiles de edades y géneros válidos.`);
