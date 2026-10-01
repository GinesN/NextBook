import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readCarlinCatalog(inputPath) {
  const lines = readFileSync(resolve(inputPath), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const seenIds = new Set();
  const books = [];
  let skipped = 0;

  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    const id = String(item.BOOK_ID ?? '').trim();
    const title = String(item.TITULO ?? '').trim();
    if (!id || !title) { skipped += 1; continue; }
    if (seenIds.has(id)) throw new Error(`BOOK_ID duplicado en la línea ${index + 1}: ${id}`);
    seenIds.add(id);

    const rawPrice = Number(item.PRECIO);
    const author = String(item.AUTOR ?? '').trim();
    const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const isMisclassifiedPotter = String(item.SUBGENERO) === 'Thriller y misterio'
      && normalizedTitle.includes('HARRY POTTER') && normalizedTitle.includes('MISTERIO DEL PRINCIPE');
    books.push({
      id,
      group: String(item.BOOK_GROUP_KEY ?? '').trim() || id,
      title,
      author: author === 'No identificado en inventario' ? '' : author,
      genre: String(item.GENERO ?? '').trim(),
      subgenre: isMisclassifiedPotter ? 'Fantasía' : String(item.SUBGENERO ?? '').trim(),
      type: String(item.TIPO ?? '').trim(),
      audience: String(item.PUBLICO ?? '').trim(),
      themes: isMisclassifiedPotter ? ['magia', 'aventura', 'mundos imaginarios'] : String(item.TEMAS ?? '').split(',').map((theme) => theme.trim()).filter(Boolean),
      tone: String(item.TONO ?? '').trim(),
      pace: String(item.RITMO ?? '').trim(),
      difficulty: String(item.DIFICULTAD ?? '').trim(),
      price: Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice * 100) / 100 : null,
      stock: Math.max(0, Math.trunc(Number(item.STOCK) || 0)),
      confidence: Number(item.SCORE_CONFIANZA) || 0,
    });
  }
  return { books, skipped };
}
