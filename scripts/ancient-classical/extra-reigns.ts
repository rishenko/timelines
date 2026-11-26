// Reigns the rulers pass missed, frozen in pipelines/ancient/extra-reigns.json (2026-11-24; a DRAFT fix, see the Workbench known-counts table report):
// Gaozu of Tang (618–626). Applied after reigns.ts; re-runnable.
//   node scripts/ancient-classical/extra-reigns.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-24');
// extra-reigns.json (the reigns the pass missed), hittite-reigns.json (the Hittite great kings from the "List of Hittite kings" tables) and kush-, shang-, han-reigns.json (the dated rows of their list pages; all three from list_rulers.py --freeze)
let n = 0;
for (const f of ['extra-reigns.json', 'hittite-reigns.json', 'kush-reigns.json', 'shang-reigns.json', 'han-reigns.json']) {
  const frozen = JSON.parse(readFileSync(`pipelines/ancient/${f}`, 'utf8'));
  for (const [k, v] of Object.entries(frozen.sources)) ed.data.sources[k] ??= v;
  for (const e of frozen.events) ed.event({ ...e });
  n += frozen.events.length;
}
ed.save();
console.log(`extra-reigns: ${n} reigns`);
