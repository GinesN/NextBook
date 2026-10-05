import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const origin = process.argv[2] ?? 'https://nextbookesp.pages.dev';
if (origin !== 'https://nextbookesp.pages.dev') throw new Error('Unexpected production origin');
const directory = 'github-pages-dist';
const routes = [
  ['index.html', '/demo/'],
  ['presentacion/index.html', '/'],
  ['librerias/index.html', '/librerias/'],
  ['librerias/carlin-la-reina/index.html', '/librerias/'],
  ['informacion/index.html', '/informacion/'],
];

for (const [file, path] of routes) {
  const target = `${origin}${path}`;
  await writeFile(join(directory, file), `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NextBook — Nueva dirección</title>
  <link rel="canonical" href="${target}">
  <link rel="icon" href="/NextBook/favicon.svg?v=20261005-book" type="image/svg+xml">
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2e9;color:#17352f;font-family:system-ui,sans-serif}main{text-align:center;padding:2rem;max-width:32rem}h1{font-family:Georgia,serif;font-size:2.5rem}a{display:inline-block;margin-top:1rem;padding:1rem 1.5rem;border-radius:.3rem;background:#17352f;color:#fff;text-decoration:none}</style>
  <script src="/NextBook/legacy-redirect.js" defer></script>
</head>
<body data-nextbook-path="${path}"><main><h1>NextBook.</h1><p>Nos hemos mudado. Te llevamos a nuestra nueva dirección.</p><a href="${target}">Continuar en NextBook</a></main></body>
</html>
`);
}

await writeFile(join(directory, 'legacy-redirect.js'), `const destination = new URL(document.body.dataset.nextbookPath, '${origin}');
if (destination.pathname === '/demo/' && new URLSearchParams(window.location.search).get('libreria') === 'carlin-la-reina') destination.pathname = '/carlin-la-reina/';
if (destination.pathname === '/informacion/') destination.hash = window.location.hash;
window.location.replace(destination.href);
`);
console.log('Five legacy pages now redirect to the corresponding Cloudflare routes.');
