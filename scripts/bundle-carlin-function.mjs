import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const shared = readFileSync('supabase/functions/_shared/carlin.ts', 'utf8');
const http = readFileSync('supabase/functions/_shared/http.ts', 'utf8');
const statistics = readFileSync('supabase/functions/_shared/statistics.ts', 'utf8').replace(/^import .*from '\.\/http\.ts';\r?\n/gm, '');
const entry = readFileSync('supabase/functions/carlin-recommend/index.ts', 'utf8').replace(/^import .*from '\.\.\/_shared\/(?:carlin|http|statistics)\.ts';\r?\n/gm, '');
mkdirSync('work', { recursive: true });
writeFileSync('work/carlin-recommend-index.ts', `${shared}\n${http}\n${statistics}\n${entry}`);
console.log('Función preparada en work/carlin-recommend-index.ts');
