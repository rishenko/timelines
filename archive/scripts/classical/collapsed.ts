// The Classical World: the opening layout (2026-11-18). Groups stay expanded and every region inside them that has
// sub-rows opens collapsed, so each region row leads with its key events and readers expand what they want (the same
// overview the ancient timeline opens on; see scripts/additions/groups.ts).
// Re-runnable: it recomputes meta.collapsed from the current rows. Run it after any pass that adds regions.
//   node scripts/classical/collapsed.ts && npm run data:classical
import { open } from '../lib/dataset-edit.ts';
import { regionsWithSubRows } from '../lib/rows.ts';

const ed = open('data-src/classical.json', '2026-11-18');
ed.data.meta.collapsed = regionsWithSubRows(ed.data.tracks);
console.log(`collapsed: ${ed.data.meta.collapsed.join(', ')}`);

ed.save();
