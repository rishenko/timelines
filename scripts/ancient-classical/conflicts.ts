// Conflicts pilot (v2 kind 'conflict'): the Ancient events of pipelines/v2/emitted/conflict-ancient-classical.json (emitted by
// pipelines/v2/emit.py from the harvested candidates) are upserted into the source file with their sources, like disasters.ts.
// Re-runnable: an event with the same uuid is replaced, so a changed rule or override reaches the data.
//   node scripts/ancient-classical/conflicts.ts && npm run data -- build ancient-classical
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const FILE = 'pipelines/v2/emitted/conflict-ancient-classical.json';
const emitted = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { events: [], sources: {} };
const ed = open('data-src/ancient-classical.json', '2026-11-23');
for (const t of emitted.tracks ?? []) if (!ed.data.tracks.some((x: { id: string }) => x.id === t.id)) ed.data.tracks.push(t);
const rows = new Set(ed.data.tracks.map((t: { id: string }) => t.id));
for (const e of emitted.events) {
  const lost = e.tracks.filter((t: string) => !rows.has(t));
  if (lost.length) throw new Error(`${e.uuid}: no row ${lost.join(', ')}`);
  // importance and categories live in their plans (data-src/ancient-classical-importance.json, pipelines/ancient/categories.json)
  const { importance: _i, memberships: _m, ...plain } = e;
  const at = ed.data.events.findIndex((x: { uuid: string }) => x.uuid === e.uuid);
  if (at >= 0) ed.data.events[at] = plain;
  else ed.data.events.push(plain);
}
for (const [rid, edits] of Object.entries(emitted.rowEdits ?? {})) {
  const row = ed.data.tracks.find((t: { id: string }) => t.id === rid);
  if (!row) throw new Error(`conflicts edit a row Ancient lacks: ${rid}`);
  for (const { memberOf } of edits as { memberOf: { row: string } }[]) {
    row.memberOf = row.memberOf ?? [];
    if (!row.memberOf.some((m: { row: string }) => m.row === memberOf.row)) row.memberOf.push(memberOf);
  }
}
// events of this kind that the emitter no longer writes are removed, so a rerun with a changed rule leaves no strays
const keep = new Set(emitted.events.map((e: { uuid: string }) => e.uuid));
ed.data.events = ed.data.events.filter((x: { uuid: string }) => !x.uuid.startsWith('conflict-') || keep.has(x.uuid));
for (const [k, v] of Object.entries(emitted.sources)) ed.data.sources[k] = { ...(ed.data.sources[k] ?? {}), ...(v as object) };
ed.save();

// the importance plan: key conflicts join the "1" list (the plan sets every value; unlisted events are normal)
const PLAN = 'data-src/ancient-classical-importance.json';
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const key = emitted.events.filter((e: { importance?: number }) => e.importance === 1).map((e: { uuid: string }) => e.uuid);
plan['1'] = [...plan['1'].filter((u: string) => !u.startsWith('conflict-')), ...key];
writeFileSync(PLAN, JSON.stringify(plan, null, 2) + '\n');
console.log(`conflicts: ${emitted.events.length} events`);
