import { writeFileSync } from 'node:fs';
import { readCarlinCatalog } from './carlin-source.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Uso: node scripts/export-carlin-csv.mjs <catalogo.jsonl> <salida.csv>');
const { books } = readCarlinCatalog(inputPath);
const columns = ['bookstore_slug', 'book_id', 'group_key', 'title', 'author', 'genre', 'subgenre', 'book_type', 'audience', 'themes', 'tone', 'pace', 'difficulty', 'price', 'stock', 'confidence', 'active'];
const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};
const arrayLiteral = (values) => `{${values.map((value) => `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')}}`;
const rows = books.map((book) => [
  'carlin-la-reina', book.id, book.group, book.title, book.author, book.genre,
  book.subgenre, book.type, book.audience, arrayLiteral(book.themes), book.tone,
  book.pace, book.difficulty, book.price, book.stock, book.confidence, true,
]);
writeFileSync(outputPath, [columns.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n'), 'utf8');
console.log(`CSV preparado con ${books.length} fichas.`);
