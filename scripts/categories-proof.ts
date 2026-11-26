// Proves a timeline changed only in its event categories (pipelines/common/event_categories.py): with the `category`
// facet and every event's category memberships taken out, its source and compiled files must equal their versions
// at a git revision. Prints what the categories did (memberships before → after, events whose categories changed) and
// exits with 1 if anything else changed. Use it after a generator rerun that adds or reviews categories. It also runs the
// classifier's known negatives (pipelines/common/known_negatives.py: events it once got wrong) and fails on any.
//   npm run categories:proof -- <timeline> [--base <git revision>]      (base: origin/main)
// <timeline> is a short name from scripts/lib/timelines.ts (medieval, modern-states, …).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { venvPython } from './lib/platform.ts';
import { SOURCE_TIMELINES } from './lib/timelines.ts';

const args = process.argv.slice(2);
const short = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--base');
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
const t = SOURCE_TIMELINES.find((x) => x.short === short);
if (!t) {
  console.error(`usage: npm run categories:proof -- <${SOURCE_TIMELINES.map((x) => x.short).join('|')}> [--base <rev>]`);
  process.exit(2);
}

type Json = Record<string, any>;
/** The file without its categories, plus each event's category values (in order, main first). */
function split(ds: Json): { rest: string; cats: Map<string, string> } {
  const cats = new Map<string, string>();
  const facets = ds.meta?.facets;
  if (facets) {
    delete facets.category;
    if (!Object.keys(facets).length) delete ds.meta.facets;
  }
  for (const e of ds.events ?? []) {
    const ms: Json[] = e.memberships ?? [];
    const mine = ms.filter((m) => m.facet === 'category');
    const others = ms.filter((m) => m.facet !== 'category');
    if (mine.length) cats.set(e.uuid, mine.map((m) => m.value).join(' + '));
    if (others.length) e.memberships = others;
    else delete e.memberships;
  }
  return { rest: JSON.stringify(ds), cats };
}

let failed = false;
// a timeline that is new in this branch has no earlier version to compare with: nothing to prove
try {
  execFileSync('git', ['cat-file', '-e', `${base}:${t.source}`], { stdio: 'ignore' });
} catch {
  console.log(`${t.source}: new since ${base}, so there is no earlier version to compare`);
  process.exit(0);
}
for (const file of [t.source, t.compiled]) {
  const before = split(JSON.parse(execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 28 })));
  const after = split(JSON.parse(readFileSync(file, 'utf8')));
  const changed = [...new Set([...before.cats.keys(), ...after.cats.keys()])].filter((k) => before.cats.get(k) !== after.cats.get(k));
  const count = (m: Map<string, string>) => [...m.values()].reduce((n, v) => n + v.split(' + ').length, 0);
  const same = before.rest === after.rest;
  failed ||= !same;
  console.log(
    `${file}: ${same ? 'only categories changed' : 'OTHER CHANGES besides categories'}; ` +
      `memberships ${count(before.cats)} → ${count(after.cats)}, ${after.cats.size} events with a category, ${changed.length} changed since ${base}`,
  );
}
// the classifier's known negatives (needs pipelines/.venv; with the Wikipedia dump it checks every case)
const py = venvPython('pipelines/.venv');
if (existsSync(py)) {
  try {
    process.stdout.write(execFileSync(py, ['-X', 'utf8', '-I', 'pipelines/common/known_negatives.py'], { encoding: 'utf8' }));
  } catch (err: any) {
    process.stdout.write(err.stdout ?? '');
    failed = true;
  }
} else console.log(`known negatives: skipped (no ${py}; see pipelines/README.md)`);
process.exit(failed ? 1 : 0);
