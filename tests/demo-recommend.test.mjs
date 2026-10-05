import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bookGenres, bookThemeLabels, createInitialProfile, getAvailableFocus, getAvailableGenres,
  getAvailableInterests, getEligibleBooks, getInterestFollowUp, getQuestionSequence,
  interestOptions, isQuestionAnswered, recommendBooks, scoreBook, updateReaderProfile,
} from '../lib/recommend.ts';

const books = JSON.parse(readFileSync(new URL('../app/data/books.json', import.meta.url), 'utf8'));
const profile = (patch = {}) => ({ ...createInitialProfile(), recipient: 'self', age: 25, genre: 'any', mood: 'any', pace: null, difficulty: 3, budget: null, ...patch });
const ids = items => items.map(item => item.book.book_id);

test('every question starts unanswered, including optional preferences; a fresh restart is blank', () => {
  const empty = createInitialProfile();
  for (const question of ['recipient', 'age', 'genre', 'interests', 'focus', 'intent', 'mood', 'pace', 'difficulty', 'budget']) {
    assert.equal(isQuestionAnswered(empty, question), false, question);
  }
  assert.equal(scoreBook(books[0], empty).match, null);
  for (const question of ['pace', 'difficulty', 'budget']) {
    assert.equal(isQuestionAnswered({ ...empty, [question]: null }, question), true, `${question}: explicitly open`);
  }
  assert.equal(isQuestionAnswered({ ...empty, age: 12 }, 'age'), false);
  assert.equal(isQuestionAnswered({ ...empty, age: 25 }, 'age'), true);
  assert.equal(isQuestionAnswered({ ...empty, budget: 22 }, 'budget'), true);
  assert.equal(isQuestionAnswered({ ...empty, budget: undefined }, 'budget'), false);
  assert.equal(isQuestionAnswered(createInitialProfile(), 'recipient'), false);
});

test('250 distinct books have individual Spanish descriptions and usable editorial metadata', () => {
  assert.equal(books.length, 250);
  assert.equal(new Set(books.map(book => book.book_id)).size, 250);
  assert.equal(new Set(books.map(book => book.description_seed)).size, 250);
  assert.equal(new Set(books.flatMap(bookGenres)).size, 12);
  for (const book of books) {
    assert.ok(book.description_seed.length >= 80);
    assert.match(book.cover_url, /^https:\/\/covers\.openlibrary\.org\/b\/id\/[1-9]\d*-L\.jpg\?default=false$/);
    assert.match(book.cover_work, /^\/works\/OL\d+W$/);
    assert.ok(book.cover_title && book.cover_author, `Missing cover provenance for ${book.title}`);
    assert.ok(!book.description_seed.includes('A well-known'));
    assert.ok(book.themes.split(', ').length >= 3);
    assert.ok([1, 2, 3].includes(book.pace_1_3));
    assert.ok(book.difficulty_1_5 >= 1 && book.difficulty_1_5 <= 5);
    assert.ok(bookGenres(book).includes(book.subgenre));
    assert.ok(bookThemeLabels(book).length >= 3);
  }
});

test('bibliographic classification no longer confuses philosophy with self-help or dystopia with realism', () => {
  const find = title => books.find(book => book.title === title);
  assert.equal(find('1984').subgenre, 'Science fiction');
  assert.equal(find('Verity').subgenre, 'Mystery / Thriller');
  assert.equal(find("A Room of One's Own").subgenre, 'Essay / Philosophy');
  assert.equal(find('Homage to Catalonia').subgenre, 'Memoir / Reportage');
  assert.equal(find('Lovely War').author, 'Julie Berry');
});

test('age, stock and budget stay hard constraints; never fill three by exceeding them', () => {
  for (const age of [12, 13, 16, 25, 100]) for (const budget of [10, 12, 18, 22, null]) {
    const p = profile({ age, budget, genre: 'Fantasy', interests: ['fantasy'] });
    const eligible = getEligibleBooks(books, p);
    const result = recommendBooks(books, p);
    assert.equal(result.length, Math.min(3, eligible.length));
    for (const { book } of result) {
      assert.ok(book.age_min <= age);
      assert.ok(book.demo_stock);
      assert.ok(budget === null || book.demo_price_eur <= budget);
    }
  }
  assert.equal(recommendBooks(books.map(book => ({ ...book, demo_stock: false })), profile()).length, 0);
});

test('all-open preferences create no invented affinity; sparse answers and weak matches stay honest', () => {
  const open = profile({ genre: 'any', interests: ['other'], mood: 'any', intent: 'any', focus: 'any', difficulty: null, pace: null });
  assert.equal(scoreBook(books[0], open).match, null);
  const single = scoreBook(books[0], { ...open, genre: books[0].subgenre });
  assert.ok(single.match < 100);
  const mismatch = scoreBook(books[0], profile({ genre: 'Science fiction', interests: ['future'], focus: 'future-science', intent: 'grow', mood: 'intense', pace: 3, difficulty: 1 }));
  assert.ok(mismatch.match < 48, `no decorative minimum: ${mismatch.match}`);
});

test('synthetic popularity, gift rating and cheaper price do not raise affinity', () => {
  const p = profile({ recipient: 'gift', intent: 'connect', interests: ['family'] });
  const original = scoreBook(books[0], p);
  const altered = scoreBook({ ...books[0], popularity_1_100: 0, gift_score_1_5: 0, demo_price_eur: 0.1 }, p);
  assert.equal(original.match, altered.match);
  assert.equal(original.score, altered.score);
});

test('genre, topics, focus, mood, intent, pace and effort all affect fit', () => {
  const book = books.find(book => book.title === '1984');
  const p = profile({ genre: 'Science fiction', interests: ['future'], focus: 'future-control', intent: 'understand', mood: 'intense', pace: 2, difficulty: 3 });
  const good = scoreBook(book, p);
  const incompatible = { genre: 'Romance / Contemporary', interests: ['relationships'], focus: 'future-end', intent: 'feel', mood: 'humorous', pace: 3, difficulty: 1 };
  for (const [key, value] of Object.entries(incompatible)) {
    assert.ok(scoreBook(book, { ...p, [key]: value }).score < good.score, key);
  }
});

test('topics are order-independent and adaptive refinement uses all selected topics', () => {
  const a = profile({ interests: ['fantasy', 'relationships'] });
  const b = { ...a, interests: [...a.interests].reverse() };
  assert.deepEqual(ids(recommendBooks(books, a)), ids(recommendBooks(books, b)));
  const followUp = getInterestFollowUp(a.interests);
  assert.deepEqual(followUp, getInterestFollowUp(b.interests));
  assert.ok(followUp.options.some(option => option.id === 'fant-magic'));
  assert.ok(followUp.options.some(option => option.id === 'rel-love'));
});

test('available choices respect age and chosen genre; discovery skips unnecessary refinement', () => {
  const teen = profile({ age: 13 });
  assert.ok(!getAvailableGenres(books, teen).some(genre => genre.value === 'Horror'));
  const fantasy = profile({ genre: 'Fantasy', interests: ['fantasy'] });
  assert.ok(getAvailableInterests(books, fantasy).some(interest => interest.id === 'fantasy'));
  assert.ok(getQuestionSequence(books, fantasy).includes('focus'));
  assert.ok(!getQuestionSequence(books, profile({ interests: ['other'] })).includes('focus'));
  assert.ok(getAvailableFocus(books, fantasy).options.every(option => option.id === 'any' || option.tokens.length > 0));
});

test('changing earlier answers clears dependent choices without erasing unrelated preferences', () => {
  const p = profile({ intent: 'escape', genre: 'Fantasy', interests: ['fantasy'], focus: 'fant-magic', mood: 'emotional', pace: 2 });
  assert.equal(updateReaderProfile(p, 'recipient', 'gift', books).intent, '');
  const changedGenre = updateReaderProfile(p, 'genre', 'Horror', books);
  assert.deepEqual(changedGenre.interests, []);
  assert.equal(changedGenre.focus, '');
  assert.equal(changedGenre.mood, 'emotional');
  assert.equal(changedGenre.pace, 2);
  const younger = updateReaderProfile(p, 'age', 13, books);
  assert.equal(younger.genre, '');
  assert.deepEqual(younger.interests, []);
  assert.equal(younger.focus, '');
});

test('novelty changes only selection, stays near the strongest candidates and preserves scores', () => {
  const p = profile({ genre: 'Literary / Classic', interests: ['family'], difficulty: 3, mood: 'emotional' });
  const first = recommendBooks(books, p);
  const next = recommendBooks(books, p, { seenIds: ids(first) });
  assert.notDeepEqual(ids(first), ids(next));
  assert.equal(new Set(next.map(item => item.book.author)).size, 3);
  assert.ok(next[0].score >= first[0].score - 5);
  for (const item of next) assert.equal(item.match, scoreBook(item.book, p).match);
});

test('different interests give distinct selections and a broad range of affinity values', () => {
  const selections = new Set();
  const matches = new Set();
  for (const interest of interestOptions.filter(interest => interest.id !== 'other')) {
    for (const difficulty of [1, 3, 5]) for (const mood of ['reflective', 'intense', 'inspiring']) {
      const p = profile({ interests: [interest.id], mood, pace: 2, difficulty });
      const result = recommendBooks(books, p);
      selections.add(ids(result).join(','));
      result.forEach(item => matches.add(item.match));
    }
  }
  assert.ok(selections.size >= 10);
  assert.ok(matches.size >= 5);
});
