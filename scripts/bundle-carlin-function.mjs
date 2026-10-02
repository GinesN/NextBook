import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const shared = readFileSync('supabase/functions/_shared/carlin.ts', 'utf8');
const entry = readFileSync('supabase/functions/carlin-recommend/index.ts', 'utf8').replace(/^import .*from '\.\.\/_shared\/carlin\.ts';\r?\n/m, '');
mkdirSync('work', { recursive: true });
writeFileSync('work/carlin-recommend-index.ts', `${shared}\n${entry}`);
console.log('Función preparada en work/carlin-recommend-index.ts');
