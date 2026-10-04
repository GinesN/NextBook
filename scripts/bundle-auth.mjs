import { build } from 'esbuild';

// Serve the locked SDK with our site instead of executing an unpinned CDN import.
await build({
  entryPoints: ['lib/bookstore-auth.js'],
  outfile: 'public/librerias/auth.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof',
});
