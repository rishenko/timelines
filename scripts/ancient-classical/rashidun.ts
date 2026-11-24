// The Rashidun Caliphate as an Ancient row (2026-11-24; a DRAFT for Kevin's call on a new row). The Medieval timeline's
// "Caliphate" row starts at Uthman (644): Abu Bakr (632–634) and Umar (634–644) fall before its window and the Ancient
// timeline had only the "Early Islam" row (not a polity, so the rulers pass finds no head of state there). This adds the
// row (632–661, from the article's infobox) and its two reigns, frozen from pipelines/extract/rulers.py run on the row
// into pipelines/ancient/rashidun-reigns.json. known-counts.json counts the four caliphs across this row and Medieval's.
// Re-runnable.
//   node scripts/ancient-classical/rashidun.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { C, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-24');
ed.wikipedia('wp-rashidun-caliphate', 'Rashidun Caliphate', 'Rashidun_Caliphate');

ed.track(
  {
    id: 'rashidun-caliphate',
    name: 'Rashidun Caliphate',
    color: '#3f8a63',
    parent: 'arabia',
    span: {
      start: '632 CE',
      end: '661 CE',
      startDates: [C('632 CE', 'wp-rashidun-caliphate', "infobox year_start ('632', Succession to Muhammad)")],
      endDates: [C('661 CE', 'wp-rashidun-caliphate', "infobox year_end ('661', Assassination of Ali)")],
    },
  },
  { after: 'early-islam' },
);

const frozen = JSON.parse(readFileSync('pipelines/ancient/rashidun-reigns.json', 'utf8'));
for (const [k, v] of Object.entries(frozen.sources)) ed.data.sources[k] ??= v;
for (const e of frozen.events) ed.event({ ...e });
ed.save();
console.log(`rashidun: row + ${frozen.events.length} reigns`);
