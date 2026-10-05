import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedCarlinOrigin, carlinJson, readCarlinRequest, RequestInputError } from '../supabase/functions/_shared/http.ts';
import { isCarlinResponse } from '../lib/carlin-api.ts';
import { parseCarlinProfile } from '../supabase/functions/_shared/carlin.ts';

const request = body => new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
test('API accepts only an object profile in valid JSON, with a byte limit', async () => {
  assert.deepEqual(await readCarlinRequest(request('{"profile":{"age":30}}')), { profile: { age: 30 } });
  for (const body of ['{', 'null', '[]', '{}', '{"profile":null}', '{"profile":[]}']) {
    await assert.rejects(readCarlinRequest(request(body)), error => error instanceof RequestInputError && error.status === 400);
  }
  await assert.rejects(readCarlinRequest(request(JSON.stringify({ profile: { theme: 'á'.repeat(5000) } }))), error => error.status === 413);
  await assert.rejects(readCarlinRequest(new Request('https://example.test', { method: 'POST', body: '{}' })), error => error.status === 415);
});
test('streaming payloads cannot bypass the byte limit by omitting Content-Length', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(8193)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readCarlinRequest(new Request('https://example.test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  })), error => error.status === 413);
  assert.equal(cancelled, true);
});
test('CORS accepts exact production and local origins and rejects lookalikes', () => {
  for (const origin of ['https://ginesn.github.io', 'https://nextbookesp.pages.dev', 'http://localhost:4319', 'http://127.0.0.1:4319']) assert.equal(allowedCarlinOrigin(origin), origin);
  for (const origin of ['null', 'https://ginesn.github.io.evil.test', 'https://nextbookesp.pages.dev.evil.test', 'https://other-project.pages.dev', 'https://preview.nextbookesp.pages.dev', 'https://evil.test', 'http://localhost.evil.test', 'http://localhost:4319/path', 'http://user@localhost:4319']) assert.equal(allowedCarlinOrigin(origin), null);
  const response = carlinJson({ error: 'Método no permitido.' }, 405, 'https://ginesn.github.io');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
});
test('an unfinished request body is cancelled after its deadline', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  await assert.rejects(readCarlinRequest(new Request('https://example.test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  }), 5), error => error.status === 408);
  assert.equal(cancelled, true);
});
test('malformed answers do not escape age and budget restrictions', () => {
  for (const age of [-1, 101, 30.5, '30', Infinity, NaN]) assert.equal(parseCarlinProfile({ age }).age, null);
  for (const budget of [-1, '20', 999, Infinity]) assert.equal(parseCarlinProfile({ budget }).budget, null);
  assert.equal(parseCarlinProfile({ age: 30, budget: 20 }).age, 30);
});
test('client rejects corrupt API shapes and untrusted cover destinations', () => {
  assert.equal(isCarlinResponse({ kind: 'question', question: 'type', options: [{ value: 'any', label: 'Sorpréndeme' }] }), true);
  assert.equal(isCarlinResponse({ kind: 'question', question: 'unknown', options: [] }), false);
  assert.equal(isCarlinResponse({ kind: 'results', recommendations: null }), false);
  const book = { id: '123', title: 'Libro', author: 'Autor', subgenre: 'Clásicos', themes: [], price: 15 };
  const result = coverUrl => ({ kind: 'results', recommendations: [{ book: { ...book, coverUrl }, explanation: 'Lectura' }] });
  assert.equal(isCarlinResponse(result('https://static.cegal.es/imagenes/978/12.jpg')), true);
  assert.equal(isCarlinResponse(result('javascript:alert(1)')), false);
  assert.equal(isCarlinResponse(result('https://static.cegal.es.evil.test/imagenes/x')), false);
});
