// Egypt and Nubia moved from the Ancient Near East to Africa (2026-11-22, the author's call: "Egypt belongs in
// Africa"). The row `egypt` and all its sub-rows (Nubia's included) keep their ids, chronology and order among
// themselves; only `egypt`'s parent changes, and it becomes Africa's first region, before North Africa, the Horn and
// sub-Saharan Africa. Neither group has a chronology of its own, so no dates change.
// Re-runnable: a second run finds Egypt already in place and changes nothing.
//   node scripts/ancient-classical/egypt-in-africa.ts && npm run data -- build ancient-classical
import { readSource, writeSource } from '../lib/source-format.ts';
import { orderRows, type Row } from '../lib/rows.ts';

const FILE = 'data-src/ancient-classical.json';
const AFRICA_ORDER = ['egypt', 'north-africa', 'horn', 'sub-saharan'];

const d = readSource(FILE);
const tracks: Row[] = d.tracks;
const egypt = tracks.find((t) => t.id === 'egypt');
if (!egypt) throw new Error('no row "egypt"');
egypt.parent = 'africa';
d.tracks = orderRows(tracks, new Map([['africa', AFRICA_ORDER]]));
writeSource(FILE, d);
console.log('africa:', AFRICA_ORDER.join(' > '));
