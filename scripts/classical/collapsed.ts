// The Classical World: the opening layout (2026-11-18). Groups stay expanded and every region inside them that has
// sub-rows opens collapsed, so each region row leads with its key events and readers expand what they want (the same
// overview the ancient timeline opens on; see scripts/additions/groups.ts).
// Re-runnable: it recomputes meta.collapsed from the current rows. Run it after any pass that adds regions.
//   node scripts/classical/collapsed.ts && npm run data:classical
import { open } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');
type Row = { id: string; parent?: string };
const tracks: Row[] = ed.data.tracks;
const hasKids = (id: string) => tracks.some((t) => t.parent === id);

const groups = tracks.filter((t) => !t.parent).map((t) => t.id);
ed.data.meta.collapsed = tracks.filter((t) => t.parent && groups.includes(t.parent) && hasKids(t.id)).map((t) => t.id);
console.log(`collapsed: ${ed.data.meta.collapsed.join(', ')}`);

ed.save();
