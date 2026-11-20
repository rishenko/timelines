// Reports how well a timeline's row order keeps related rows together: the top-level rows by default, or
// the children of one row with --parent (e.g. the regions inside a group).
//   node scripts/row-order.ts public/timelines/ancient-classical.json [--parent <id>]
//   node scripts/row-order.ts <file> [--parent <id>] --try a,b,c,... [--try d,e,f,...]   # score candidate orders
//   node scripts/row-order.ts <file> [--parent <id>] --best [--fix a,b]                   # every order (≤ ~10 rows)
//   node scripts/row-order.ts <file> [--parent <id>] --search [--fix a,b] [--keep a<b,c<d] # local search, any size
// Each --try order must list every sibling; it is scored and checked against the proximity limits.
// Prints each pair that shares events or links, its distance, and the order's score (sum of shared ×
// distance; lower is better). --fix keeps the listed rows at the end, in that order. --keep adds ordering
// constraints (a above b) for --search, e.g. to keep a west-to-east reading. The test in
// src/data/data.test.ts enforces the limits in src/data/proximity.ts for groups and the regions inside them.
import { readFileSync } from 'node:fs';
import { relatedSiblings, allowedDistance } from '../src/data/proximity.ts';
import type { Dataset } from '../src/types.ts';

const args = process.argv.slice(2);
const opt = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const file = args.find((a, i) => !a.startsWith('--') && !/^--(parent|try|fix|keep)$/.test(args[i - 1] ?? ''));
if (!file) {
  console.error('usage: node scripts/row-order.ts <compiled timeline.json> [--parent id] [--try a,b] [--best|--search] [--fix a,b] [--keep a<b]');
  process.exit(1);
}
const ds: Dataset = JSON.parse(readFileSync(file, 'utf8'));
const parent = opt('--parent');
const fixed = opt('--fix')?.split(',') ?? [];
const keep = (opt('--keep')?.split(',') ?? []).map((c) => c.split('<') as [string, string]);

const rows = ds.tracks.filter((t) => t.parent === parent).map((t) => t.id);
if (!rows.length) throw new Error(`no rows under ${parent ?? 'the top level'}`);
const pairs = relatedSiblings(ds, parent);
const cost = (order: string[]) => {
  const pos = new Map(order.map((r, i) => [r, i]));
  return pairs.reduce((s, p) => s + p.shared * Math.abs(pos.get(p.a)! - pos.get(p.b)!), 0);
};
const tooFar = (order: string[]) => {
  const pos = new Map(order.map((r, i) => [r, i]));
  return pairs
    .filter((p) => Math.abs(pos.get(p.a)! - pos.get(p.b)!) > allowedDistance(p.shared))
    .map((p) => `${p.a}–${p.b} (${p.shared} shared, ${Math.abs(pos.get(p.a)! - pos.get(p.b)!)} apart)`);
};
const broken = (order: string[]) => keep.filter(([a, b]) => order.indexOf(a) > order.indexOf(b)).length;

console.log(`${parent ?? 'top level'}:`, rows.join(' > '));
for (const p of pairs) console.log(`  ${String(p.shared).padStart(3)} shared  ${String(p.distance).padStart(2)} apart  ${p.a} — ${p.b}`);
console.log('score:', cost(rows), tooFar(rows).length ? `too far: ${tooFar(rows).join('; ')}` : 'passes');

args.forEach((a, i) => {
  if (a !== '--try') return;
  const order = args[i + 1].split(',');
  const missing = rows.filter((r) => !order.includes(r));
  if (missing.length || order.length !== rows.length) {
    console.log(`try ${args[i + 1]}: must list every row once (missing: ${missing.join(',') || '-'})`);
    return;
  }
  const far = tooFar(order);
  console.log(`try ${order.join(' > ')}\n    score ${cost(order)}, ${far.length ? `too far: ${far.join('; ')}` : 'passes'}`);
});

const free = rows.filter((r) => !fixed.includes(r));

if (args.includes('--best')) {
  if (free.length > 10) console.warn(`searching ${free.length}! orders; this may take a while (try --search)`);
  let best = rows;
  let bestCost = cost(rows);
  // Heap's algorithm over the free rows
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

if (args.includes('--search')) {
  // Random restarts of a move-one-row hill climb. Ranks orders by (proximity violations + broken --keep
  // constraints, then score), so it finds a passing order when one exists without trying every order.
  const rank = (o: string[]) => {
    const full = [...o, ...fixed];
    return [tooFar(full).length + broken(full), cost(full)] as const;
  };
  const better = (x: readonly [number, number], y: readonly [number, number]) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  let best = [...free];
  let bestRank = rank(best);
  for (let run = 0; run < 200; run++) {
    let cur = run === 0 ? [...free] : [...free].sort(() => Math.random() - 0.5);
    let curRank = rank(cur);
    for (let improved = true; improved; ) {
      improved = false;
      for (let i = 0; i < cur.length; i++)
        for (let j = 0; j < cur.length; j++) {
          if (i === j) continue;
          const n = [...cur];
          n.splice(j, 0, ...n.splice(i, 1));
          const r = rank(n);
          if (better(r, curRank)) [cur, curRank, improved] = [n, r, true];
        }
    }
    if (better(curRank, bestRank)) [best, bestRank] = [cur, curRank];
  }
  const full = [...best, ...fixed];
  const far = tooFar(full);
  console.log(`search: ${full.join(',')}\n    score ${bestRank[1]}, ${far.length ? `too far: ${far.join('; ')}` : 'passes'}${broken(full) ? `, breaks ${broken(full)} --keep constraint(s)` : ''}`);
}
