// Disasters pilot (v2 step 2): the Ancient events of pipelines/v2/emitted/disaster-ancient-classical.json (emitted by
// pipelines/v2/emit.py from the harvested candidates) are upserted into the source file with their sources. Re-runnable:
// an event with the same uuid is replaced, so a changed rule or override reaches the data.
//   node scripts/ancient-classical/disasters.ts && npm run data -- build ancient-classical
import { readFileSync, writeFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const emitted = JSON.parse(readFileSync('pipelines/v2/emitted/disaster-ancient-classical.json', 'utf8'));
const ed = open('data-src/ancient-classical.json', '2026-11-23');
const rows = new Set(ed.data.tracks.map((t: { id: string }) => t.id));
for (const e of emitted.events) {
  const lost = e.tracks.filter((t: string) => !rows.has(t));
  if (lost.length) throw new Error(`${e.uuid}: no row ${lost.join(', ')}`);
  // importance and categories live in their plans (data-src/ancient-classical-importance.json, pipelines/ancient/categories.json),
  // which the build applies; the source file holds neither
  const { importance: _i, memberships: _m, ...plain } = e;
  const at = ed.data.events.findIndex((x: { uuid: string }) => x.uuid === e.uuid);
  if (at >= 0) ed.data.events[at] = plain;
  else ed.data.events.push(plain);
}
for (const [k, v] of Object.entries(emitted.sources)) ed.data.sources[k] = { ...(ed.data.sources[k] ?? {}), ...(v as object) };
if (Object.values(emitted.sources).some((s: any) => s.tags?.includes('catalogue'))) ed.data.tags.catalogue = { name: 'Official catalogue' };
ed.save();

// the importance plan: key disasters join the "1" list (the plan sets every value; unlisted events are normal)
const PLAN = 'data-src/ancient-classical-importance.json';
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const key = emitted.events.filter((e: { importance?: number }) => e.importance === 1).map((e: { uuid: string }) => e.uuid);
plan['1'] = [...plan['1'].filter((u: string) => !u.startsWith('disaster-')), ...key];
writeFileSync(PLAN, JSON.stringify(plan, null, 2) + '\n');
console.log(`disasters: ${emitted.events.length} events`);
