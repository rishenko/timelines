// Puts rows in a new order, moving each with all its sub-rows: the top-level rows by default, or the
// children of one row with --parent (e.g. the regions inside a group).
//   node scripts/reorder-regions.ts data-src/ancient-near-east.json europe-med,africa,near-east,...
//   node scripts/reorder-regions.ts data-src/ancient-near-east.json --parent near-east egypt,levant,...
// The list must name every sibling exactly once. Everything else keeps its order. Check the result with
// `npm run row-order` and the proximity test before committing.
import { readSource, writeSource } from './lib/source-format.ts';
import { orderRows, type Row } from './lib/rows.ts';
const args = process.argv.slice(2);
const parentIdx = args.indexOf('--parent');
const parentId = parentIdx >= 0 ? args[parentIdx + 1] : undefined;
const [file, list] = args.filter((_, i) => parentIdx < 0 || (i !== parentIdx && i !== parentIdx + 1));
if (!file || !list) {
  console.error('usage: node scripts/reorder-regions.ts <data-src file> [--parent id] <row,row,...>');
  process.exit(1);
}
const d = readSource(file);
const tracks: Row[] = d.tracks;
const order = list.split(',');
const siblings = tracks.filter((t) => t.parent === parentId).map((t) => t.id);
const missing = siblings.filter((t) => !order.includes(t));
const unknown = order.filter((t) => !siblings.includes(t));
if (missing.length || unknown.length || order.length !== siblings.length)
  throw new Error(`order must list every row under ${parentId ?? 'the top level'} once. missing: ${missing.join(',') || '-'}; unknown: ${unknown.join(',') || '-'}`);

// Only the reordered siblings change order; every other set of siblings keeps its current order.
d.tracks = orderRows(tracks, new Map([[parentId, order]]));
writeSource(file, d);
console.log(`${parentId ?? 'top level'}:`, order.join(' > '));
