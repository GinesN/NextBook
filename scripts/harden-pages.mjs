import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://static.cegal.es https://covers.openlibrary.org https://books.google.com https://books.googleusercontent.com; connect-src 'self' https://aesmyvfjcfcjegytsacy.supabase.co https://openlibrary.org https://www.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";
const tags = `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`;

async function harden(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await harden(path);
    else if (item.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      if (!html.includes('<head>') || html.includes('http-equiv="Content-Security-Policy"')) throw new Error(`Unexpected page security markup: ${path}`);
      await writeFile(path, html.replace('<head>', `<head>\n${tags}`));
    }
  }
}
await harden('github-pages-dist');
