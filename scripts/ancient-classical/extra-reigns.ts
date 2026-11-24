// Reigns the rulers pass missed, frozen in pipelines/ancient/extra-reigns.json (2026-11-24; a DRAFT fix, see the Workbench known-counts table report):
// Gaozu of Tang (618–626). Applied after reigns.ts; re-runnable.
//   node scripts/ancient-classical/extra-reigns.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-24');
const frozen = JSON.parse(readFileSync('pipelines/ancient/extra-reigns.json', 'utf8'));
for (const [k, v] of Object.entries(frozen.sources)) ed.data.sources[k] ??= v;
for (const e of frozen.events) ed.event({ ...e });
ed.save();
console.log(`extra-reigns: ${frozen.events.length} reigns`);
