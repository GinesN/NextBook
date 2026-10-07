import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';

const profile = { recipient:'self',age:30,type:'Ficción/creativo',subgenre:'Thriller y misterio',theme:'any',pace:'any',difficulty:'any',length:'any',budget:20 };
const writes = [];
const tasks = [];
let failWrite = false;
let handler;
class Query {
  constructor(table) { this.table = table; this.slug = ''; this.offset = 0; }
  select() { return this; }
  eq(key,value) { if (key === 'slug' || key === 'bookstore_slug') this.slug = value; return this; }
  order() { return this; }
  range(from) { this.offset = from; return this; }
  abortSignal() { return this; }
  maybeSingle() { return this; }
  // eslint-disable-next-line unicorn/no-thenable -- Matches the awaitable Supabase query builder in this API integration test.
  then(resolve,reject) {
    try {
      const known = ['carlin-la-reina','otra-libreria'].includes(this.slug);
      const data = this.table === 'bookstores' ? known ? {slug:this.slug} : null : !known || this.offset ? []
        : this.table === 'bookstore_catalog' ? [0,1,2].map(index => ({
          book_id:`book-${index}`,group_key:`group-${index}`,title:`${this.slug} ${index}`,author:`Autor ${index}`,
          genre:'Ficción',subgenre:'Thriller y misterio',book_type:'Ficción/creativo',audience:'Adulto/General',themes:['misterio'],
          tone:'Intrigante',pace:'Rápido',difficulty:'Media',price:14,stock:1,confidence:.8,
        })) : [0,1,2].map(index => ({book_id:`book-${index}`,metadata:{curated:true,themes:['misterio'],description:'Sinopsis de prueba',description_language:'es',cover_url:'https://static.cegal.es/imagenes/prueba.jpg'}}));
      return Promise.resolve({data,error:null}).then(resolve,reject);
    } catch (error) { return Promise.reject(error).then(resolve,reject); }
  }
}
before(async () => {
  globalThis.__nextbookStatisticsTestClient = () => ({
    from:table => new Query(table),
    rpc:(name,args) => ({ abortSignal:() => {
      writes.push({name,args});
      return Promise.resolve({error:failWrite ? {code:'test-write-error'} : null});
    } }),
  });
  globalThis.Deno = { env:{get:key => ({SUPABASE_URL:'https://backend.test',SUPABASE_SERVICE_ROLE_KEY:'server-test-key'})[key]},serve:value => { handler = value; } };
  globalThis.EdgeRuntime = {waitUntil:task => tasks.push(task)};
  const result = await build({
    entryPoints:['supabase/functions/carlin-recommend/index.ts'],bundle:true,write:false,platform:'node',format:'esm',
    plugins:[{name:'local-supabase-test',setup(builder) {
      builder.onResolve({filter:/^npm:@supabase\/supabase-js/},() => ({path:'supabase-test',namespace:'test'}));
      builder.onLoad({filter:/.*/,namespace:'test'},() => ({contents:'export const createClient = globalThis.__nextbookStatisticsTestClient;',loader:'js'}));
    }}],
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
});
const request = body => handler(new Request('https://backend.test/functions/v1/carlin-recommend', {
  method:'POST',headers:{'Content-Type':'application/json',Origin:'https://nextbookesp.pages.dev'},body:JSON.stringify(body),
}));

test('the recommendation API records only terminal results using the server-selected books', async () => {
  writes.length = 0;
  const runId = randomUUID();
  const question = await request({profile:{recipient:'self',age:30},bookstoreSlug:'carlin-la-reina',runId});
  assert.equal(question.status,200);
  assert.equal((await question.json()).kind,'question');
  assert.equal(writes.length,0);
  const result = await request({profile,selection:{seed:runId},bookstoreSlug:'carlin-la-reina',runId,bookIds:['forged-id']});
  assert.equal(result.status,200);
  const data = await result.json();
  assert.equal(data.kind,'results');
  assert.equal(data.recommendations.length,3);
  assert.deepEqual(writes[0],{name:'record_bookstore_completion',args:{p_bookstore_slug:'carlin-la-reina',p_run_id:runId,p_book_ids:data.recommendations.map(item=>item.book.id)}});
  await request({profile,selection:{seed:runId},bookstoreSlug:'carlin-la-reina',runId});
  assert.equal(writes[1].args.p_run_id,runId);
});

test('catalog caches remain isolated per registered bookstore', async () => {
  const response = await request({profile,bookstoreSlug:'otra-libreria',runId:randomUUID()});
  assert.equal(response.status,200);
  assert.ok((await response.json()).recommendations.every(item=>item.book.title.startsWith('otra-libreria')));
  assert.equal(writes.at(-1).args.p_bookstore_slug,'otra-libreria');
  const unknown = await request({profile,bookstoreSlug:'no-activada',runId:randomUUID()});
  assert.equal(unknown.status,404);
});

test('old clients remain functional; invalid IDs cannot generate statistics', async () => {
  const count = writes.length;
  const response = await request({profile});
  assert.equal(response.status,200);
  assert.equal(writes.length,count);
  for (const runId of [null,'bad-id']) assert.equal((await request({profile,runId})).status,400);
  assert.equal(writes.length,count);
});

test('statistics run in the background; failed writes retry without blocking or changing recommendations', async () => {
  await Promise.all(tasks.splice(0));
  const before = writes.length;
  failWrite = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await request({profile,runId:randomUUID()});
    assert.equal(response.status,200);
    assert.equal((await response.json()).recommendations.length,3);
    await Promise.all(tasks.splice(0));
    assert.equal(writes.length,before+2);
    assert.equal(writes.at(-1).args.p_run_id,writes.at(-2).args.p_run_id);
  } finally { failWrite = false; console.error = originalError; }
});
