// Runs every check a PR needs before review, one line each: what CI runs (lint, tests, docs, data, ids) plus the
// proofs CI doesn't (type-check of app and scripts, seams, categories on every timeline). It runs them all even when
// one fails, prints the end of each failing check's output, and exits with 1 if any failed.
//   npm run check:all [-- --base <git revision>] [--skip <name>]... [--only <name>]... [--schema-bump]
// base: origin/main (for the id and categories checks). Names are the first word of each line it prints (tsc, lint,
// test, docs, data, sources, known-rows (needs the extractor's venv), seams, categories:<timeline>, ids). --schema-bump (a PR that raises the schema version): checks
// each timeline with fields:proof (fields:<timeline>) instead of categories:proof, which flags the version line;
// fields:proof lifts both sides to the current schema, so only a change beyond the version number fails.
// Set TIMELINES_LOCAL_DATA to include the private timelines in the tests. CI also checks that public/timelines/ is what data-src/ compiles to; that rewrites files, so it isn't here
// (npm run data:build && npm run importance && git diff --exit-code -- public/timelines docs).
import { spawnSync } from 'node:child_process';
import { SOURCE_TIMELINES } from './lib/timelines.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const base = all('--base')[0] ?? 'origin/main';
const skip = new Set(all('--skip'));
const only = new Set(all('--only'));
const schemaBump = args.includes('--schema-bump');

const steps: [name: string, cmd: string[]][] = [
  ['tsc', ['npx', 'tsc', '-b']],
  ['lint', ['npm', 'run', '--silent', 'lint']],
  ['test', ['npx', 'vitest', 'run', '--reporter=dot']],
  ['docs', ['npm', 'run', '--silent', 'docs:check']],
  ['data', ['npm', 'run', '--silent', 'data:check']],
  ['sources', ['npm', 'run', '--silent', 'sources:check']],
  ['known-rows', ['pipelines/extract/.venv/bin/python', '-I', 'pipelines/extract/known_rows.py']],
  ['seams', ['npm', 'run', '--silent', 'seam-check']],
  ...SOURCE_TIMELINES.map((t): [string, string[]] =>
    schemaBump
      ? [`fields:${t.short}`, ['npm', 'run', '--silent', 'fields:proof', '--', t.short, '--base', base]]
      : [`categories:${t.short}`, ['npm', 'run', '--silent', 'categories:proof', '--', t.short, '--base', base]],
  ),
  ['ids', ['npm', 'run', '--silent', 'data', '--', 'ids', '--check', '--base', base]],
];

const unknown = [...skip, ...only].filter((n) => !steps.some(([s]) => s === n));
if (unknown.length) {
  console.error(`unknown check ${unknown.join(', ')}; the checks are: ${steps.map(([s]) => s).join(', ')}`);
  process.exit(2);
}

let failed = 0;
for (const [name, [cmd, ...rest]] of steps) {
  if (skip.has(name) || (only.size && !only.has(name))) continue;
  const t0 = Date.now();
  const r = spawnSync(cmd, rest, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (r.status === 0) {
    console.log(`ok    ${name} (${secs} s)`);
    continue;
  }
  failed++;
  console.log(`FAIL  ${name} (${secs} s, exit ${r.status ?? r.signal})`);
  const lines = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split('\n').filter((l) => l.trim());
  for (const l of lines.slice(-12)) console.log(`        ${l}`);
}
console.log(failed ? `${failed} check${failed > 1 ? 's' : ''} failed` : 'all checks pass');
process.exit(failed ? 1 : 0);
