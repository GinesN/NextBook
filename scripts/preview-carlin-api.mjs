import { createServer } from 'node:http';
import { readCarlinCatalog } from './carlin-source.mjs';
import { nextCarlinResponse, parseCarlinProfile } from '../supabase/functions/_shared/carlin.ts';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Uso: node scripts/preview-carlin-api.mjs <catalogo.jsonl>');
const { books } = readCarlinCatalog(inputPath);

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
  if (request.method !== 'POST') { response.statusCode = 405; response.end('{}'); return; }
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 2048) throw new Error('Solicitud demasiado grande');
    }
    const input = JSON.parse(body);
    response.end(JSON.stringify(nextCarlinResponse(books, parseCarlinProfile(input?.profile))));
  } catch {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: 'Solicitud inválida.' }));
  }
});

server.listen(54322, '127.0.0.1', () => console.log(`Vista previa local de Carlin lista en 127.0.0.1:54322 (${books.length} fichas).`));
