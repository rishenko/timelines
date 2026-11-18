// Puts a timeline's top-level regions in a new order, moving each region with all its rows.
//   node scripts/reorder-regions.ts data-src/ancient-near-east.json europe,sea-peoples,aegean,...
// The list must name every top-level region exactly once. Check the result with `npm run row-order`
// and the proximity test before committing.
import { readSource, writeSource } from './lib/source-format.ts';

const [file, list] = process.argv.slice(2);
if (!file || !list) {
  console.error('usage: node scripts/reorder-regions.ts <data-src file> <region,region,...>');
  process.exit(1);
}
const d = readSource(file);
const order = list.split(',');
const tops: string[] = d.tracks.filter((t: { parent?: string }) => !t.parent).map((t: { id: string }) => t.id);
const missing = tops.filter((t) => !order.includes(t));
const unknown = order.filter((t) => !tops.includes(t));
if (missing.length || unknown.length || order.length !== tops.length)
  throw new Error(`order must list every region once. missing: ${missing.join(',') || '-'}; unknown: ${unknown.join(',') || '-'}`);

const regionOf = (t: { id: string; parent?: string }): string => {
  let cur = t;
  while (cur.parent) cur = d.tracks.find((x: { id: string }) => x.id === cur.parent);
  return cur.id;
};
// stable: rows keep their order within each region
d.tracks = order.flatMap((r) => d.tracks.filter((t: { id: string }) => regionOf(t) === r));
writeSource(file, d);
console.log('regions:', order.join(' > '));
