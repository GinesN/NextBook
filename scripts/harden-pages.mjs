import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Open Library cover URLs can redirect to Internet Archive's image servers.
const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://static.cegal.es https://covers.openlibrary.org https://archive.org https://*.us.archive.org https://books.google.com https://books.googleusercontent.com; connect-src 'self' https://aesmyvfjcfcjegytsacy.supabase.co https://openlibrary.org https://www.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";
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
const outputDirectory = process.argv[2] ?? 'github-pages-dist';
await harden(outputDirectory);
if (process.argv.includes('--headers')) {
  await writeFile(join(outputDirectory, '_headers'), `/*\n  Content-Security-Policy: ${policy}; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000\n`);
}
