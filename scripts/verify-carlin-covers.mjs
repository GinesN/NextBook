import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const folder = 'work/curation';
const cache = JSON.parse(readFileSync(`${folder}/cache.json`, 'utf8'));
const path = `${folder}/covers.json`;
const checked = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const pending = Object.entries(cache).filter(([, source]) => source?.cover_url?.startsWith('https://static.cegal.es/imagenes/') && source.language === 'spa' && source.description.length >= 120 && !checked[source.cover_url]);
let index = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (index < pending.length) {
    const [isbn, source] = pending[index++];
    try {
      const response = await fetch(source.cover_url, { signal: AbortSignal.timeout(20000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      const type = response.headers.get('content-type') ?? '';
      const gif = bytes.subarray(0, 3).toString() === 'GIF';
      const width = gif ? bytes.readUInt16LE(6) : null;
      const height = gif ? bytes.readUInt16LE(8) : null;
      checked[source.cover_url] = { isbn, valid: response.ok && type.startsWith('image/') && bytes.length > 1500 && (!gif || (width >= 90 && height >= 120)), width, height, bytes: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') };
      writeFileSync(path, JSON.stringify(checked));
    } catch (error) { console.error(`${isbn}: ${error.message}`); }
  }
}));
console.log(JSON.stringify({ checked: Object.keys(checked).length, valid: Object.values(checked).filter(item => item.valid).length }));
