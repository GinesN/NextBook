import test from 'node:test';
import assert from 'node:assert/strict';
import { curatedClassification, canonicalCuratedTitle } from '../scripts/carlin-curation-tags.mjs';
const book = { audience: 'Adulto/General' };
const source = { title: 'Rey blanco', author: 'Juan Gómez-Jurado', categories: 'Thriller y suspense', description: 'Una investigación peligrosa con un misterioso adversario. Una parte importante de la novela.', page_count: 480 };
test('no convierte partes de palabras en animales, arte o ciencia', () => {
  const tags = curatedClassification(book, source);
  assert.equal(tags.subgenre, 'Thriller y misterio');
  assert.ok(!tags.themes.includes('animales'));
  assert.ok(!tags.themes.includes('arte'));
  assert.ok(!tags.themes.includes('magia'));
  assert.ok(tags.themes.includes('investigación'));
});
test('corrige obras conocidas sin confundir título y materias', () => {
  assert.equal(curatedClassification(book, { ...source, title: 'La casa de Bernarda Alba', categories: 'Biografías y estudios literarios' }).subgenre, 'Teatro');
  assert.equal(curatedClassification(book, { ...source, title: '1984 (edición definitiva)', categories: 'Ficción contemporánea' }).subgenre, 'Ciencia ficción / distopía');
  assert.equal(curatedClassification(book, { ...source, title: 'Harry Potter y el misterio del príncipe' }).subgenre, 'Fantasía');
  assert.equal(curatedClassification(book, { ...source, title: 'La montaña parlante', author: 'Tea Stilton', categories: 'Ficción infantil y juvenil' }).audience, 'Infantil/Juvenil 9-14');
});
test('deduplica ediciones conservando números de la saga', () => {
  assert.equal(canonicalCuratedTitle('Harry Potter y el cáliz de fuego (edición ilustrada) 4'), canonicalCuratedTitle('Harry Potter y el cáliz de fuego (edición aniversario) 4'));
  assert.notEqual(canonicalCuratedTitle('Unicornia 5'), canonicalCuratedTitle('Unicornia 6'));
  assert.equal(canonicalCuratedTitle('El Principito (edición con comentarios)'), 'el principito');
});
