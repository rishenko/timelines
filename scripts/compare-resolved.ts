// Compares two compiled timelines as the app draws them: every row's lifespan stretches, phases and memberships,
// and every event, resolved under each Dating choice (the defaults, then each other option in turn). Prints each
// difference and exits with 1 if there are any. Use it to prove a data change moved only what it meant to.
//   npm run data:compare -- <before.json> <after.json>
// e.g. save the compiled file first: git show main:public/timelines/ancient-classical.json > /tmp/before.json
import { readFileSync } from 'node:fs';
import { chronologyGroups, defaultSelection, resolveEvents, resolveSpan, type ChronologySelection } from '../src/lib/chronology.ts';
import { resolveLifespan } from '../src/lib/lifespan.ts';
import { resolveMemberships } from '../src/lib/memberOf.ts';
import type { Dataset } from '../src/types.ts';

const [beforeFile, afterFile] = process.argv.slice(2);
if (!beforeFile || !afterFile) {
  console.error('usage: npm run data:compare -- <before.json> <after.json>');
  process.exit(2);
}
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as Dataset;
const before = load(beforeFile);
const after = load(afterFile);

/** The defaults, then each other option of each group with the rest at their defaults. */
function selections(ds: Dataset): [string, ChronologySelection][] {
  const def = defaultSelection(ds);
  const out: [string, ChronologySelection][] = [['defaults', def]];
  for (const [g, list] of chronologyGroups(ds)) for (const { id } of list) if (def[g] !== id) out.push([`${g}: ${id}`, { ...def, [g]: id }]);
  return out;
}

// `derived` only says whether a lifespan was typed or worked out; what the app draws is the rest
const drawn = (x: unknown) => JSON.stringify(x, (k, v) => (k === 'derived' ? undefined : v));

/** Everything the app draws for one Dating choice, keyed by row or event. */
function view(ds: Dataset, sel: ChronologySelection) {
  const m = new Map<string, string>();
  const members = resolveMemberships(ds, sel);
  for (const t of ds.tracks) {
    const phases = (t.phases ?? []).map((p) => ({ name: p.name, ...resolveSpan(ds, t.id, p, sel) }));
    m.set(`row ${t.id} lifespan`, drawn(resolveLifespan(ds, t, sel, phases)));
    if (phases.length) m.set(`row ${t.id} phases`, drawn(phases));
    const mo = members.get(t.id);
    if (mo) m.set(`row ${t.id} memberships`, drawn(mo));
    const { span, phases: _p, memberOf: _m, ...rest } = t; // eslint-disable-line @typescript-eslint/no-unused-vars
    m.set(`row ${t.id} other fields`, drawn(rest));
  }
  for (const e of resolveEvents(ds, sel)) m.set(`event ${e.uuid}`, drawn(e));
  return m;
}

const sels = selections(after);
if (drawn(sels.map((s) => s[0])) !== drawn(selections(before).map((s) => s[0]))) console.log('note: the Dating menus differ');
let n = 0;
const seen = new Set<string>();
for (const [name, sel] of sels) {
  const a = view(before, sel);
  const b = view(after, sel);
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (a.get(k) === b.get(k)) continue;
    n++;
    const line = `${k}\n  before: ${a.get(k) ?? '(none)'}\n  after:  ${b.get(k) ?? '(none)'}`;
    if (!seen.has(line)) console.log(`[${name}] ${line}`);
    else console.log(`[${name}] ${k}: same difference as above`);
    seen.add(line);
  }
}
console.log(`${n} difference(s) across ${sels.length} Dating choices, ${after.tracks.length} rows, ${after.events.length} events`);
if (n) process.exitCode = 1;
