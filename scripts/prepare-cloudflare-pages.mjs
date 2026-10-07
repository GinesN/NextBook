import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';

const root = 'cloudflare-pages-dist';
const bookstores = JSON.parse(await readFile(new URL('../lib/bookstores.json', import.meta.url), 'utf8'));
for (const store of bookstores) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(store.slug) || typeof store.name !== 'string') throw new Error('Invalid bookstore configuration.');
}
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const siteOrigin = process.env.NEXTBOOK_SITE_ORIGIN ?? 'https://nextbookesp.pages.dev';
const siteUrl = new URL(siteOrigin);
if (siteUrl.protocol !== 'https:' || siteUrl.origin !== siteOrigin || !siteUrl.hostname.endsWith('.pages.dev')) {
  throw new Error('NEXTBOOK_SITE_ORIGIN must be the exact HTTPS origin of the Pages project.');
}
const legacyOrigin = 'https://ginesn.github.io';

function siteLink(value, pagePath) {
  if (value.startsWith('#')) return value;
  const url = new URL(value, `${legacyOrigin}/NextBook/${pagePath}`);
  if (url.origin !== legacyOrigin) return value;
  let path = url.pathname.replace(/^\/NextBook(?=\/|$)/, '') || '/';
  if (path === '/' || path === '/index.html') {
    const store = bookstores.find(item => item.slug === url.searchParams.get('libreria'));
    if (store) {
      path = `/${store.slug}/`;
      url.searchParams.delete('libreria');
    } else path = '/demo/';
  } else if (path === '/presentacion/' || path === '/presentacion/index.html') path = '/';
  return `${path}${url.search}${url.hash}`;
}

async function prepare(directory, relative = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    const pagePath = `${relative}${item.name}`;
    if (item.isDirectory()) await prepare(path, `${pagePath}/`);
    else if (item.name.endsWith('.html')) {
      let html = await readFile(path, 'utf8');
      html = html.replace(/\b(src|href)="([^"]+)"/g, (_, attribute, value) => `${attribute}="${siteLink(value, pagePath)}"`);
      html = html.replace(/content="(https:\/\/ginesn\.github\.io\/NextBook\/[^" ]*)"/g,
        (_, value) => `content="${siteOrigin}${siteLink(value, pagePath)}"`);
      // Canonical URLs must use the production hostname, rather than a preview hostname.
      html = html.replace(/(<link rel="canonical" href=")([^" ]+)(")/g,
        (_, before, value, after) => `${before}${new URL(value, siteOrigin).href}${after}`);
      if (pagePath === 'presentacion/index.html') html = html.replace('<html lang="es">', '<html lang="es" data-demo-path="/demo/">');
      if (pagePath === 'informacion/index.html') {
        html = html.replace('GitHub Pages sirve la web', 'Cloudflare Pages sirve la web');
        html = html.replace('<p class="provider-links">', '<p class="provider-links"><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare</a>');
        html = html.replace('Actualizado el 4 de octubre de 2026', 'Actualizado el 5 de octubre de 2026');
      }
      if (html.includes('ginesn.github.io') || html.includes('/NextBook/')) throw new Error(`Legacy URL remains in ${pagePath}`);
      await writeFile(path, html);
    }
  }
}
await prepare(root);
const quiz = await readFile(join(root, 'index.html'), 'utf8');
await mkdir(join(root, 'demo'), { recursive: true });
await writeFile(join(root, 'demo/index.html'), quiz);
for (const store of bookstores) {
  await mkdir(join(root, store.slug), { recursive: true });
  await writeFile(join(root, store.slug, 'index.html'), quiz
    .replaceAll(`${siteOrigin}/demo/`, `${siteOrigin}/${store.slug}/`)
    .replace('<title>NextBook — Encuentra tu próxima gran lectura</title>', `<title>${escapeHtml(store.name)} · NextBook</title>`));
}
await writeFile(join(root, 'index.html'), await readFile(join(root, 'presentacion/index.html')));

const qrOptions = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#17352fff', light: '#ffffffff' } };
await QRCode.toFile(join(root, 'presentacion/qr-demo.png'), `${siteOrigin}/demo/`, { ...qrOptions, width: 512 });
for (const store of bookstores) {
  await mkdir(join(root, 'librerias', store.slug), { recursive: true });
  await QRCode.toFile(join(root, 'librerias', store.slug, 'qr.svg'), `${siteOrigin}/${store.slug}/`, { ...qrOptions, type: 'svg' });
}
await writeFile(join(root, '_redirects'), '/presentacion / 301\n/presentacion/ / 301\n');
console.log(`Cloudflare routes, metadata, privacy information and QR codes prepared for ${siteOrigin}.`);
