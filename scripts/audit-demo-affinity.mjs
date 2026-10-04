import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { bookGenres, createInitialProfile, getAvailableFocus, getAvailableGenres, getAvailableInterests, getEligibleBooks, recommendBooks } from '../lib/recommend.ts';

const books = JSON.parse(await readFile(new URL('../app/data/books.json', import.meta.url), 'utf8'));
const matches = new Set(); const titles = new Set(); const selections = new Set();
let profiles = 0; let results = 0; let incomplete = 0;
for (const age of [13, 16, 25, 70]) {
  const base = { ...createInitialProfile(), age };
  for (const genre of getAvailableGenres(books, base)) {
    const genreProfile = { ...base, genre: genre.value };
    for (const interest of getAvailableInterests(books, genreProfile)) {
      for (const difficulty of [1, 3, 5]) for (const budget of [12, 18, 22, null]) {
        const p = { ...genreProfile, interests: [interest.id], difficulty, budget,
          mood: ['reflective', 'intense', 'emotional'][difficulty === 1 ? 0 : difficulty === 3 ? 1 : 2],
          pace: difficulty === 1 ? 3 : difficulty === 3 ? 2 : 1, intent: difficulty === 3 ? 'understand' : 'feel' };
        const focus = getAvailableFocus(books, p).options;
        p.focus = interest.id === 'other' ? 'any' : focus[0].id;
        const eligible = getEligibleBooks(books, p);
        const recs = recommendBooks(books, p);
        assert.equal(recs.length, Math.min(3, eligible.length));
        assert.equal(new Set(recs.map(item => item.book.book_id)).size, recs.length);
        for (const rec of recs) {
          assert.ok(rec.book.age_min <= age);
          assert.ok(budget === null || rec.book.demo_price_eur <= budget);
          assert.ok(rec.match === null || rec.match >= 0 && rec.match < 100);
          titles.add(rec.book.book_id); if (rec.match !== null) matches.add(rec.match);
        }
        profiles++; results += recs.length;
        if (recs.length < 3) incomplete++;
        selections.add(recs.map(item => item.book.book_id).join(','));
      }
    }
  }
}
const report = {
  catalog: books.length,
  uniqueDescriptions: new Set(books.map(book => book.description_seed)).size,
  uniqueThemeCombinations: new Set(books.map(book => book.themes)).size,
  genres: [...new Set(books.flatMap(bookGenres))].map(genre => ({ genre, primary: books.filter(book => book.subgenre === genre).length, includingSecondary: books.filter(book => bookGenres(book).includes(genre)).length })),
  profiles, recommendations: results, profilesWithFewerThanThreeEligible: incomplete,
  distinctSelections: selections.size, distinctRecommendedTitles: titles.size,
  affinity: { distinctValues: matches.size, min: Math.min(...matches), max: Math.max(...matches) },
  validation: 'Synthetic profiles check behavior and constraints; they do not measure real reader satisfaction.',
};
await writeFile(new URL('../docs/demo-affinity-audit.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
