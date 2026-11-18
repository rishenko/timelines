// Reports how well a timeline's region order keeps related regions together.
//   node scripts/row-order.ts src/timelines/ancient-near-east.json [--best] [--fix china,americas]
// Prints each pair of regions that share events or links, its distance, and the order's score
// (sum of shared × distance; lower is better). --best also searches every order of the regions for
// the lowest score; --fix keeps the listed regions at the end, in that order, to shrink the search.
// The test in src/data/data.test.ts enforces the limits in src/data/proximity.ts.
import { readFileSync } from 'node:fs';
import { relatedRegions } from '../src/data/proximity.ts';
import type { Dataset } from '../src/types.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: node scripts/row-order.ts <compiled timeline.json> [--best] [--fix a,b]');
  process.exit(1);
}
const ds: Dataset = JSON.parse(readFileSync(file, 'utf8'));
const fixIdx = args.indexOf('--fix');
const fixed = fixIdx >= 0 ? args[fixIdx + 1].split(',') : [];

const regions = ds.tracks.filter((t) => !t.parent).map((t) => t.id);
const pairs = relatedRegions(ds);
const cost = (order: string[]) => {
  const pos = new Map(order.map((r, i) => [r, i]));
  return pairs.reduce((s, p) => s + p.shared * Math.abs(pos.get(p.a)! - pos.get(p.b)!), 0);
};

console.log('order:', regions.join(' > '));
for (const p of pairs) console.log(`  ${String(p.shared).padStart(3)} shared  ${String(p.distance).padStart(2)} apart  ${p.a} — ${p.b}`);
console.log('score:', cost(regions));

if (args.includes('--best')) {
  const free = regions.filter((r) => !fixed.includes(r));
  if (free.length > 10) console.warn(`searching ${free.length}! orders; this may take a while`);
  let best = regions;
  let bestCost = cost(regions);
  // Heap's algorithm over the free regions
  const a = [...free];
  const visit = () => {
    const o = [...a, ...fixed];
    const c = cost(o);
    if (c < bestCost) {
      bestCost = c;
      best = o;
    }
  };
  const c = new Array(a.length).fill(0);
  visit();
  for (let i = 1; i < a.length; ) {
    if (c[i] < i) {
      const j = i % 2 ? c[i] : 0;
      [a[j], a[i]] = [a[i], a[j]];
      visit();
      c[i]++;
      i = 1;
    } else c[i++] = 0;
  }
  console.log('best:', best.join(' > '), 'score', bestCost);
}
