// Groups the ancient timeline's regions into larger areas (2026-11-17, the author's request). Africa
// comes first (the author's choice; it also scores best), then Europe & Mediterranean and eastward. Each
// group has its own hue: group rows are tinted with it to keep the areas visually separate. Each group is an ordinary row; its regions become its sub-rows, so a whole area collapses into
// one row that still shows its key events. Re-runnable: it sets the groups, their members and the order
// every time. Run it last, after every other additions script.
//   node scripts/additions/groups.ts && npm run importance:ancient
// Egypt sits in the Ancient Near East, the usual scholarly grouping, beside its strongest partners (the
// Levant and Mesopotamia). The Americas stay a single top-level row: a group holding one region would only
// repeat the name.
import { open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');
type Row = { id: string; name: string; color: string; parent?: string };
const tracks: Row[] = ed.data.tracks;

/** Top-level order, and each group's regions in order (west to east, checked by the proximity test). */
const groups: { id: string; name: string; color: string; regions: string[] }[] = [
  { id: 'africa', name: 'Africa', color: '#b8862a', regions: ['north-africa', 'sub-saharan'] },
  { id: 'europe-med', name: 'Europe & Mediterranean', color: '#3f6aa8', regions: ['europe', 'west-med', 'sea-peoples', 'aegean'] },
  { id: 'near-east', name: 'Ancient Near East', color: '#a8483a', regions: ['egypt', 'levant', 'anatolia', 'mesopotamia', 'iran', 'dilmun'] },
  { id: 'steppe-south-asia', name: 'Steppe & South Asia', color: '#7a8a2a', regions: ['steppe', 'indus'] },
  { id: 'east-asia', name: 'East & Southeast Asia', color: '#6a4a9a', regions: ['se-asia', 'china', 'korea-japan'] },
  { id: 'austronesia', name: 'Island Southeast Asia & Oceania', color: '#2a8a8a', regions: ['island-sea', 'oceania'] },
];
const topOrder = [...groups.map((g) => g.id), 'americas'];

for (const g of groups) {
  const existing = tracks.find((t) => t.id === g.id);
  if (existing) Object.assign(existing, { name: g.name, color: g.color });
  else tracks.push({ id: g.id, name: g.name, color: g.color });
  for (const r of g.regions) {
    const t = tracks.find((x) => x.id === r);
    if (!t) throw new Error(`no region "${r}"`);
    if (t.parent !== undefined && t.parent !== g.id) throw new Error(`region "${r}" already sits under "${t.parent}"`);
    t.parent = g.id;
  }
}
const tops = tracks.filter((t) => t.parent === undefined).map((t) => t.id);
const stray = tops.filter((t) => !topOrder.includes(t));
if (stray.length) throw new Error(`top-level rows not placed in a group: ${stray.join(', ')}`);

// Rebuild the row list depth-first in the order above; rows inside each region keep their order.
const order = new Map<string | undefined, string[]>([[undefined, topOrder], ...groups.map((g) => [g.id, g.regions] as [string, string[]])]);
const kids = (id: string | undefined) => {
  const ks = tracks.filter((t) => t.parent === id);
  const o = order.get(id);
  return o ? o.map((x) => ks.find((k) => k.id === x)!) : ks;
};
const out: Row[] = [];
const visit = (t: Row) => {
  out.push(t);
  for (const k of kids(t.id)) visit(k);
};
for (const t of kids(undefined)) visit(t);
if (out.length !== tracks.length) throw new Error(`lost rows while ordering (${tracks.length} → ${out.length})`);
ed.data.tracks = out;

// Open on an overview: groups expanded, every region inside them collapsed, so each region row leads with
// its key events. Readers expand what they want.
const collapsed: string[] = ed.data.meta.collapsed;
for (const g of groups)
  for (const r of g.regions) if (tracks.some((t) => t.parent === r) && !collapsed.includes(r)) collapsed.push(r);

ed.save();
