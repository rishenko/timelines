// Profiling only: merges Ancient, Medieval and Modern States into one dataset, as a stand-in for "one dataset, many views".
// The output goes to public/timelines/combined-profile.json, so a build lists it. Never commit that file.
// Every row and event id gets a per-timeline prefix (a- m- s-). Plain ids such as "china" mean different rows in
// different timelines, so they can't be merged as they are. Seam rows therefore appear twice; that is acceptable
// for load and draw cost. Redirects and `continues` are dropped.
//   node scripts/perf/combine.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { validateStrict } from '../../src/data/strict.ts';

const parts = [
  ['ancient-classical', 'a-'],
  ['medieval', 'm-'],
  ['modern-states', 's-'],
] as const;
const ROW_KEYS = new Set(['parent', 'row']);
const EVENT_KEYS = new Set(['startEvent', 'endEvent', 'to']);
// rewrites id references anywhere in a row or event (memberships, phases, stretches, links)
const prefixRefs = (x: unknown, p: string): unknown => {
  if (Array.isArray(x)) return x.map((y) => prefixRefs(y, p));
  if (!x || typeof x !== 'object') return x;
  return Object.fromEntries(
    Object.entries(x).map(([k, v]) => [
      k,
      typeof v === 'string' && (ROW_KEYS.has(k) || EVENT_KEYS.has(k)) ? p + v : k === 'tracks' && Array.isArray(v) ? v.map((t) => p + t) : prefixRefs(v, p),
    ]),
  );
};
const sets = parts.map(([t, p]) => {
  const d = JSON.parse(readFileSync(`public/timelines/${t}.json`, 'utf8'));
  return {
    d,
    tracks: d.tracks.map((tr: { id: string }) => ({ ...(prefixRefs(tr, p) as object), id: p + tr.id })),
    events: d.events.map((e: { uuid: string }) => ({ ...(prefixRefs(e, p) as object), uuid: p + e.uuid })),
    collapsed: (d.meta.collapsed ?? []).map((id: string) => p + id),
    context: (d.meta.context ?? []).map((c: { id: string }) => ({ ...(prefixRefs(c, p) as object), id: p + c.id })),
  };
});
const merge = (k: string) => Object.assign({}, ...sets.map((s) => s.d[k] ?? {}).reverse());
const a = sets[0].d;
const m = sets[2].d;
const meta = {
  ...m.meta,
  id: 'combined-profile',
  title: 'Combined (profiling only)',
  subtitle: 'Ancient + Medieval + Modern States, merged for profiling',
  range: { start: Math.min(...sets.map((s) => s.d.meta.range.start)), end: Math.max(...sets.map((s) => s.d.meta.range.end)) },
  increments: a.meta.increments,
  defaultIncrement: a.meta.defaultIncrement,
  hideRowsOutOfView: true,
  facets: Object.assign({}, ...sets.map((s) => s.d.meta.facets ?? {}).reverse()),
  // a span that crosses a seam is in both timelines: keep the first copy
  context: sets.flatMap((s) => s.context).filter((c: { name: string }, i: number, all: { name: string }[]) => all.findIndex((x) => x.name === c.name) === i),
  collapsed: sets.flatMap((s) => s.collapsed),
  lines: a.meta.lines,
};
delete meta.continues;
const out = {
  schemaVersion: 11,
  schemaMinor: Math.max(...sets.map((s) => s.d.schemaMinor ?? 0)),
  meta,
  present: m.present,
  tracks: sets.flatMap((s) => s.tracks),
  sources: merge('sources'),
  tags: merge('tags'),
  chronologies: merge('chronologies'),
  events: sets.flatMap((s) => s.events),
};
const problems = validateStrict(out);
console.log(`tracks ${out.tracks.length}, events ${out.events.length}, problems ${problems.length}`);
for (const p of problems.slice(0, 15)) console.log('  ' + p);
writeFileSync('public/timelines/combined-profile.json', JSON.stringify(out));
