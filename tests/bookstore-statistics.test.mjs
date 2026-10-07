import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { addDays, chartSeries, completeDailySeries, isBookstoreStatistics, sortedBooks, statisticsCsv, statisticsDateRange, todayInTimezone } from '../lib/bookstore-statistics.js';
import { parseBookstoreSlug, parseQuizRunId } from '../supabase/functions/_shared/statistics.ts';

const carlinUser = '11111111-1111-4111-8111-111111111111';
const otherUser = '22222222-2222-4222-8222-222222222222';
const outsider = '33333333-3333-4333-8333-333333333333';
const store = 'carlin-la-reina';
let db;
before(async () => {
  db = await PGlite.create();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    insert into auth.users values ('${carlinUser}'), ('${otherUser}'), ('${outsider}');
  `);
  for (const file of ['20261001000000_bookstore_catalog.sql', '20261004010000_bookstore_memberships.sql', '20261007010000_bookstore_statistics.sql']) {
    try { await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')); }
    catch (error) { throw new Error(`${file}: ${error.message} (${error.code}, position ${error.position})`); }
  }
  await db.exec(`
    insert into public.bookstores (slug,name,questionnaire_path,qr_path,tracking_since) values ('otra-libreria','Otra librería','/otra-libreria/','/librerias/otra-libreria/qr.svg','2026-01-01');
    update public.bookstores set tracking_since = '2026-01-01';
    insert into public.bookstore_memberships values ('${carlinUser}','${store}','Carlin La Reina'), ('${otherUser}','otra-libreria','Otra librería');
    insert into public.bookstore_catalog (bookstore_slug,book_id,group_key,title,author,active) values
      ('${store}','isbn-a','a','Libro A','Autor A',true), ('${store}','isbn-b','b','Libro B','Autor B',true),
      ('${store}','isbn-c','c','Libro C','Autor C',true), ('otra-libreria','isbn-a','a','Otro libro','Otro autor',true);
  `);
});
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('reset role; delete from public.bookstore_quiz_runs;');
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
});
async function role(name, user, action) {
  await db.exec(`set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  try { return await action(); }
  finally { await db.exec('reset role'); }
}
const record = (ids, run = randomUUID(), slug = store) => db.query('select public.record_bookstore_completion($1,$2,$3::jsonb) recorded', [slug, run, JSON.stringify(ids)]);
async function stats(slug = store, start = '2026-01-01', end = '2026-12-31') {
  return (await db.query('select public.bookstore_statistics($1,$2::date,$3::date) statistics', [slug,start,end])).rows[0].statistics;
}

test('one final result records one completion and each position; retries never double-count', async () => {
  const run = randomUUID();
  await role('service_role', null, async () => {
    assert.equal((await record(['isbn-a','isbn-b','isbn-c'], run)).rows[0].recorded, true);
    assert.equal((await record(['isbn-b'], run)).rows[0].recorded, false);
  });
  await role('authenticated', carlinUser, async () => {
    const value = await stats();
    assert.equal(value.totalCompleted, 1);
    assert.equal(value.periodCompleted, 1);
    assert.equal(value.totalRecommendations, 3);
    assert.equal(value.uniqueBooks, 3);
    assert.deepEqual(value.books.find(book => book.id === 'isbn-a'), { id: 'isbn-a', title: 'Libro A', author: 'Autor A', count: 1, firstCount: 1 });
    assert.equal(value.books.find(book => book.id === 'isbn-b').firstCount, 0);
    assert.equal(isBookstoreStatistics(value), true);
  });
});

test('failed writes roll back the completion and accept a corrected retry', async () => {
  const run = randomUUID();
  await assert.rejects(record(['missing-book'], run), error => error.code === '22023');
  assert.equal((await db.query('select count(*)::integer n from public.bookstore_quiz_runs')).rows[0].n, 0);
  assert.equal((await record(['isbn-a'], run)).rows[0].recorded, true);
  await assert.rejects(record(['isbn-a','isbn-a']), error => error.code === '23505');
  await assert.rejects(record(['isbn-a','isbn-b','isbn-c','isbn-a']), error => error.code === '22023');
  await assert.rejects(db.query('select public.record_bookstore_completion($1,$2,null)', [store,randomUUID()]), error => error.code === '22023');
  assert.equal((await db.query('select count(*)::integer n from public.bookstore_quiz_runs')).rows[0].n, 1);
});

test('empty selections count as completed questionnaires with no book appearances', async () => {
  await record([]);
  await role('authenticated', carlinUser, async () => {
    const value = await stats();
    assert.equal(value.periodCompleted, 1);
    assert.equal(value.totalRecommendations, 0);
    assert.deepEqual(value.books, []);
  });
});

test('store permissions protect configuration, aggregates, raw events, and write RPCs', async () => {
  await record(['isbn-a']);
  await record(['isbn-a'], randomUUID(), 'otra-libreria');
  for (const [user, slug] of [[carlinUser,store], [otherUser,'otra-libreria'], [outsider,null]]) {
    await role('authenticated', user, async () => {
      const visible = await db.query('select slug from public.bookstores order by slug');
      assert.deepEqual(visible.rows.map(row => row.slug), slug ? [slug] : []);
      for (const table of ['bookstore_quiz_runs','bookstore_recommendation_events']) {
        await assert.rejects(db.query(`select * from public.${table}`), error => error.code === '42501');
        await assert.rejects(db.query(`delete from public.${table}`), error => error.code === '42501');
      }
      await assert.rejects(record(['isbn-a']), error => error.code === '42501');
      await assert.rejects(stats(slug === store ? 'otra-libreria' : store), error => error.code === '42501');
      if (slug) assert.equal((await stats(slug)).periodCompleted, 1);
    });
  }
  await role('anon', null, async () => {
    await assert.rejects(db.query('select * from public.bookstores'), error => error.code === '42501');
    await assert.rejects(stats(), error => error.code === '42501');
    await assert.rejects(record(['isbn-a']), error => error.code === '42501');
  });
});

test('one account can select multiple assigned stores while their history remains separate', async () => {
  await db.query('insert into public.bookstore_memberships values ($1,$2,$3)', [carlinUser,'otra-libreria','Otra librería']);
  try {
    await record(['isbn-a','isbn-b']);
    await record(['isbn-a'], randomUUID(), 'otra-libreria');
    await role('authenticated', carlinUser, async () => {
      assert.equal((await db.query('select slug from public.bookstores')).rows.length, 2);
      assert.equal((await stats()).totalRecommendations, 2);
      assert.equal((await stats('otra-libreria')).books[0].title, 'Otro libro');
    });
  } finally { await db.query('delete from public.bookstore_memberships where user_id=$1 and bookstore_slug=$2', [carlinUser,'otra-libreria']); }
});

test('date filters use inclusive Madrid dates and the correct DST boundaries', async () => {
  const moments = ['2026-09-30T21:59:59Z', '2026-09-30T22:00:00Z', '2026-10-01T21:59:59Z', '2026-10-01T22:00:00Z',
    '2026-10-24T22:00:00Z', '2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z'];
  for (const moment of moments) {
    const run = randomUUID();
    await record(['isbn-a'], run);
    await db.query('update public.bookstore_quiz_runs set completed_at=$1 where run_id=$2', [moment,run]);
  }
  await role('authenticated', carlinUser, async () => {
    const first = await stats(store,'2026-10-01','2026-10-01');
    assert.equal(first.totalCompleted, 7);
    assert.equal(first.periodCompleted, 2);
    assert.deepEqual(first.daily, [{ date: '2026-10-01', count: 2 }]);
    assert.equal((await stats(store,'2026-10-25','2026-10-25')).periodCompleted, 2);
    assert.equal((await stats(store,'2025-01-01','2025-01-31')).periodCompleted, 0);
    await assert.rejects(stats(store,'2026-10-02','2026-10-01'), error => error.code === '22023');
  });
});

test('snapshots survive later catalog edits or removal', async () => {
  await db.transaction(async transaction => {
    await transaction.query('select public.record_bookstore_completion($1,$2,$3::jsonb)', [store,randomUUID(),'["isbn-a"]']);
    await transaction.query('delete from public.bookstore_catalog where bookstore_slug=$1 and book_id=$2', [store,'isbn-a']);
    const rows = await transaction.query('select title from public.bookstore_recommendation_events');
    assert.equal(rows.rows[0].title, 'Libro A');
    await transaction.rollback();
  });
});

test('client date presets and series stay correct across Madrid midnight and leap days', () => {
  const now = new Date('2026-10-06T22:30:00Z');
  assert.equal(todayInTimezone('Europe/Madrid', now), '2026-10-07');
  assert.deepEqual(statisticsDateRange('7days','Europe/Madrid',null,null,now), { start: '2026-10-01', end: '2026-10-07' });
  assert.equal(addDays('2028-02-28',1), '2028-02-29');
  assert.throws(() => statisticsDateRange('custom','Europe/Madrid','2026-02-30','2026-03-01',now));
  assert.throws(() => statisticsDateRange('custom','Europe/Madrid','2026-10-01','2026-10-08',now));
  assert.deepEqual(completeDailySeries({ startDate:'2026-10-01',endDate:'2026-10-03',daily:[{date:'2026-10-02',count:2}] }),
    [{date:'2026-10-01',count:0},{date:'2026-10-02',count:2},{date:'2026-10-03',count:0}]);
  const series = chartSeries({startDate:'2026-01-01',endDate:'2026-10-07',daily:[{date:'2026-10-01',count:3}]});
  assert.equal(series.unit,'month');
  assert.equal(series.points.length,10);
  assert.equal(series.points.at(-1).count,3);
});

test('CSV exports all books and zero days, escapes quotes, and neutralizes spreadsheet formulas', () => {
  const value = { bookstoreSlug:store,bookstoreName:'Carlin La Reina',startDate:'2026-10-01',endDate:'2026-10-02',
    totalCompleted:4,periodCompleted:2,totalRecommendations:3,uniqueBooks:2,
    daily:[{date:'2026-10-02',count:2}],books:[{id:'isbn-a',title:'=HYPERLINK("evil")',author:' @formula',count:2,firstCount:0},
      {id:'isbn-b',title:'Libro B',author:'Autor B',count:1,firstCount:1}] };
  const csv = statisticsCsv(value);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"\' @formula"'));
  assert.ok(csv.includes('"2026-10-01";"0"'));
  assert.equal(sortedBooks(value,'first')[0].id,'isbn-b');
});

test('tracking identifiers reject malformed input while preserving older clients', () => {
  assert.equal(parseBookstoreSlug(undefined), store);
  assert.equal(parseBookstoreSlug('otra-libreria'), 'otra-libreria');
  assert.equal(parseQuizRunId(undefined), null);
  const id = randomUUID();
  assert.equal(parseQuizRunId(id.toUpperCase()), id);
  for (const value of [null,'',{},'../carlin','Carlin','x'.repeat(81)]) assert.throws(() => parseBookstoreSlug(value));
  for (const value of [null,'',{},'same-run','11111111-1111-1111-1111-111111111111']) assert.throws(() => parseQuizRunId(value));
});
