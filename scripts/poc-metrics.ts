// Counts how much a POC's test files make an author type, so POCs compare like for like (docs/poc/README.md).
//
//   npm run poc:metrics                     (reads data-src/poc-*.json; prints one table)
//
// Per file: rows, lifespans, phases, date values typed (every start/end, claim year, and any other year a POC adds,
// such as membership or succession dates), repeated dates (a row's lifespan edge that equals one of its own phase
// edges, i.e. typed twice), repeated phases (the same name and years on more than one row), and phases that copy
// another row (a phase named like another row, e.g. a union copied onto each member: Egypt's "United Arab Republic").
// Fields a POC adds are counted generically: any key ending in "start"/"end"/"year"/"from"/"to" whose
// value is a year.
import { readdirSync, readFileSync } from 'node:fs';

type Json = Record<string, any>;
const files = readdirSync('data-src').filter((f) => /^poc-.*\.json$/.test(f)).sort();
const yearLike = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && /^(c\.\s*)?-?\d+(\s*(BCE|CE|BC|AD))?$/.test(v.trim()));
const DATE_KEY = /(start|end|year|from|to|until)$/i;

function countDates(x: unknown): number {
  if (Array.isArray(x)) return x.reduce((n: number, v) => n + countDates(v), 0);
  if (!x || typeof x !== 'object') return 0;
  let n = 0;
  for (const [k, v] of Object.entries(x as Json)) {
    if (DATE_KEY.test(k) && yearLike(v)) n++;
    else n += countDates(v);
  }
  return n;
}

const rows: string[][] = [['file', 'rows', 'lifespans', 'phases', 'date values', 'repeated dates', 'repeated phases', 'phases copying a row', 'events', 'event-row links']];
for (const f of files) {
  const d: Json = JSON.parse(readFileSync(`data-src/${f}`, 'utf8'));
  const tracks: Json[] = d.tracks ?? [];
  const phases = tracks.flatMap((t) => (t.phases ?? []).map((p: Json) => ({ ...p, row: t.id })));
  let repeatedDates = 0;
  for (const t of tracks) {
    if (!t.span || !t.phases?.length) continue;
    const edges = new Set(t.phases.flatMap((p: Json) => [String(p.start), String(p.end)]));
    if (edges.has(String(t.span.start))) repeatedDates++;
    if (edges.has(String(t.span.end))) repeatedDates++;
  }
  const seen = new Map<string, Set<string>>();
  for (const p of phases) {
    const k = `${p.name}|${p.start}|${p.end}`;
    seen.set(k, (seen.get(k) ?? new Set()).add(p.row));
  }
  const repeatedPhases = [...seen.values()].filter((s) => s.size > 1).reduce((n, s) => n + s.size - 1, 0);
  const rowNames = new Map(tracks.map((t) => [t.name.toLowerCase(), t.id]));
  const copies = phases.filter((p) => {
    const other = rowNames.get(String(p.name).toLowerCase().replace(/\s*\(.*\)$/, ''));
    return other !== undefined && other !== p.row;
  }).length;
  const events: Json[] = d.events ?? [];
  rows.push([
    f,
    String(tracks.length),
    String(tracks.filter((t) => t.span).length),
    String(phases.length),
    String(countDates(tracks) + countDates(events)),
    String(repeatedDates),
    String(repeatedPhases),
    String(copies),
    String(events.length),
    String(events.reduce((n, e) => n + (e.tracks?.length ?? 0), 0)),
  ]);
}
const w = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
for (const r of rows) console.log(r.map((c, i) => c.padEnd(w[i])).join('  '));
