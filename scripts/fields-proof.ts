// Proves a timeline changed only in the fields you name. Compares its source and compiled files with their versions at
// a git revision, field by field, with rows, the timeline's context spans and events keyed by id and sources by key, so a
// moved or added item reads as itself. Both sides are lifted to the current schema first (src/data/migrate.ts), so a
// version change alone shows nothing. A row, context span or event whose place in its list changed is reported as `<list> order`. Each change is
// allowed when its path matches an --allow pattern (`*` matches one id or field); the script prints each allowed
// pattern with its count and every other change on its own line, and exits with 1 if there are any. Use it beside
// data:compare, which checks what the app draws but not group parents, era fields or row order.
//   npm run fields:proof -- <timeline> [--base <git revision>] [--allow <pattern>,...] [--list]
// e.g. npm run fields:proof -- medieval --allow 'tracks.*.parent,tracks.near-east.name,tracks order'
// <timeline> is a short name from scripts/lib/timelines.ts; base defaults to origin/main; --list prints the allowed
// changes too.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from './lib/timelines.ts';
import { migrate } from '../src/data/migrate.ts';

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Lists of objects keyed by a field, so their items are compared by id; the path names the list. */
const KEYED: Record<string, string> = { tracks: 'id', events: 'uuid', 'meta.context': 'id' };

export interface Change {
  path: string;
  before: unknown;
  after: unknown;
}

/** The ids in `a` that are not in a longest common subsequence of `a` and `b` (those that moved). */
function moved(a: string[], b: string[]): string[] {
  const inB = new Set(b);
  const inA = new Set(a);
  const x = a.filter((k) => inB.has(k));
  const y = b.filter((k) => inA.has(k));
  const L = Array.from({ length: x.length + 1 }, () => new Uint16Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const keep = new Set<string>();
  for (let i = 0, j = 0; i < x.length && j < y.length; )
    if (x[i] === y[j]) (keep.add(x[i]), i++, j++);
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  return x.filter((k) => !keep.has(k));
}

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/** Every difference between two timeline files, as paths such as `tracks.egypt.parent` or `tracks order`. */
export function fieldChanges(a: Json, b: Json, path = ''): Change[] {
  const out: Change[] = [];
  const key = KEYED[path];
  if (key && Array.isArray(a) && Array.isArray(b)) {
    const ia = new Map(a.map((x: Json) => [String(x[key]), x]));
    const ib = new Map(b.map((x: Json) => [String(x[key]), x]));
    for (const [k, x] of ia) {
      if (!ib.has(k)) out.push({ path: `${path}.${k}`, before: x, after: undefined });
      else out.push(...fieldChanges(x, ib.get(k), `${path}.${k}`));
    }
    for (const [k, x] of ib) if (!ia.has(k)) out.push({ path: `${path}.${k}`, before: undefined, after: x });
    for (const k of moved([...ia.keys()], [...ib.keys()])) out.push({ path: `${path} order`, before: k, after: k });
    return out;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      out.push(...fieldChanges(a[k], b[k], path ? `${path}.${k}` : k));
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, before: a, after: b });
  return out;
}

/** A pattern such as `tracks.*.parent` as a regular expression over a change's path (`*` is one id or field). */
export function allowPattern(p: string): RegExp {
  const esc = p.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+');
  return new RegExp(`^${esc}$`);
}

const line = (c: Change) => (c.path.endsWith(' order') ? `  ${c.path}: ${String(c.after)} moved` : `  ${c.path}: ${show(c.before)} → ${show(c.after)}`);

const show = (v: unknown) => {
  if (v === undefined) return '(none)';
  const s = JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
};

function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const short = args.find((a, i) => !a.startsWith('--') && !['--base', '--allow'].includes(args[i - 1]));
  const base = opt('--base') ?? 'origin/main';
  const allow = (opt('--allow') ?? '').split(',').filter((p) => p.trim()).map((p) => ({ p: p.trim(), re: allowPattern(p) }));
  const t = SOURCE_TIMELINES.find((x) => x.short === short);
  if (!t) {
    console.error(`usage: npm run fields:proof -- <${SOURCE_TIMELINES.map((x) => x.short).join('|')}> [--base <rev>] [--allow <pattern>,...] [--list]`);
    process.exit(2);
  }
  let failed = false;
  for (const file of [t.source, t.compiled]) {
    const before = migrate(JSON.parse(execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 28 })));
    const after = migrate(JSON.parse(readFileSync(file, 'utf8')));
    const changes = fieldChanges(before, after);
    const counts = new Map(allow.map((a) => [a.p, 0]));
    const other: Change[] = [];
    const ok: Change[] = [];
    for (const c of changes) {
      const a = allow.find((x) => x.re.test(c.path));
      if (a) (counts.set(a.p, counts.get(a.p)! + 1), ok.push(c));
      else other.push(c);
    }
    failed ||= other.length > 0;
    const allowed = [...counts].map(([p, n]) => `${p} ×${n}`).join(', ') || 'none allowed';
    console.log(`${file}: ${other.length ? `${other.length} OTHER CHANGES` : 'only allowed changes'} since ${base} (${allowed})`);
    for (const c of other) console.log(line(c));
    if (args.includes('--list')) for (const c of ok) console.log(line(c));
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
