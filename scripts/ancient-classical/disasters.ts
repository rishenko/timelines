// Disasters pilot (v2 step 2): the Ancient events of pipelines/v2/emitted/disaster-ancient-classical.json (emitted by
// pipelines/v2/emit.py from the harvested candidates) are upserted into the source file with their sources. Re-runnable:
// an event with the same uuid is replaced, so a changed rule or override reaches the data.
//   node scripts/ancient-classical/disasters.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const emitted = JSON.parse(readFileSync('pipelines/v2/emitted/disaster-ancient-classical.json', 'utf8'));
const ed = open('data-src/ancient-classical.json', '2026-11-23');
const rows = new Set(ed.data.tracks.map((t: { id: string }) => t.id));
for (const e of emitted.events) {
  const lost = e.tracks.filter((t: string) => !rows.has(t));
  if (lost.length) throw new Error(`${e.uuid}: no row ${lost.join(', ')}`);
  const at = ed.data.events.findIndex((x: { uuid: string }) => x.uuid === e.uuid);
  if (at >= 0) ed.data.events[at] = e;
  else ed.data.events.push(e);
}
for (const [k, v] of Object.entries(emitted.sources)) ed.data.sources[k] = { ...(ed.data.sources[k] ?? {}), ...(v as object) };
ed.save();
console.log(`disasters: ${emitted.events.length} events`);
