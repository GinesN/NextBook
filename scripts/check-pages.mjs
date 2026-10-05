import { access, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(process.argv[2] ?? 'github-pages-dist');
const basePath = process.argv[3] ?? '/NextBook/';
const siteOrigin = process.env.NEXTBOOK_SITE_ORIGIN ?? 'https://pages.test';
let pages = 0;
async function check(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await check(path);
    else if (item.name.endsWith('.html')) {
      pages++;
      const html = await readFile(path, 'utf8');
      assert.match(html, /http-equiv="Content-Security-Policy"/, path);
      assert.match(html, /<meta name="referrer" content="no-referrer">/, path);
      const pageUrl = new URL(path.slice(root.length + 1).replaceAll('\\', '/'), `${siteOrigin}${basePath}`);
      for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const url = new URL(match[1], pageUrl);
        if (url.origin !== pageUrl.origin) continue;
        assert.ok(url.pathname.startsWith(basePath), `Link escapes site base: ${match[1]}`);
        let target = resolve(root, decodeURIComponent(url.pathname.slice(basePath.length)));
        if (url.pathname.endsWith('/')) target = join(target, 'index.html');
        assert.ok(target === root || target.startsWith(`${root}\\`) || target.startsWith(`${root}/`), `Link escapes output directory: ${match[1]}`);
        await access(target);
      }
    }
  }
}
await check(root);
assert.equal(pages, basePath === '/' ? 7 : 5);
console.log(`${pages} pages: security policies and internal links verified.`);
