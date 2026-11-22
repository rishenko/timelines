// Checks that the docs name what the code has (CI runs it):
// - every field of the interfaces in src/types.ts (the file format) is named in docs/data-format.md, as `field` or as
//   a key in an example ("field":);
// - every npm script in package.json is named in docs/development.md, as `npm run <script>` or `<script>` (npm's own
//   pre/post hooks are left out: they run by themselves).
//   npm run docs:check
// Prints one line per gap and exits with 1 if there are any. What it can't see (a feature the README doesn't list, a
// "planned" that has shipped) is the pull request template's checklist.
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const types = read('src/types.ts');
const format = read('docs/data-format.md');
const development = read('docs/development.md');
const scripts = Object.keys((JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts);

const gaps: string[] = [];
let iface = '';
for (const line of types.split('\n')) {
  const start = line.match(/^export interface (\w+)/);
  if (start) iface = start[1];
  else if (line.startsWith('}')) iface = '';
  else {
    const field = iface && line.match(/^ {2}(\w+)\??:/);
    if (field && !format.includes(`\`${field[1]}\``) && !format.includes(`"${field[1]}":`))
      gaps.push(`src/types.ts ${iface}.${field[1]}: not in docs/data-format.md`);
  }
}
const hooks = new Set(scripts.filter((s) => /^(pre|post)/.test(s) && scripts.includes(s.replace(/^(pre|post)/, ''))));
for (const s of scripts)
  if (!hooks.has(s) && !development.includes(`npm run ${s}`) && !development.includes(`\`${s}\``) && !new RegExp(`npm ${s}\\b`).test(development))
    gaps.push(`package.json npm run ${s}: not in docs/development.md`);

for (const g of gaps) console.log(g);
console.log(gaps.length ? `docs check: ${gaps.length} gaps` : 'docs check: ok');
process.exit(gaps.length ? 1 : 0);
