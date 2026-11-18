// ARCHIVED: already applied to data-src/ancient-near-east.json on 2026-11-17. Kept as a template for
// bulk edits (adding regions, sources, tracks and events; reordering rows). Re-running it fails on
// purpose, because the sources and tracks it adds already exist. New scripts should write through
// scripts/lib/source-format.ts instead of their own formatter.
// Reorders the ancient timeline's rows west to east so civilizations that interacted sit together,
// and dissolves "Other powers". Run: node reorder.mjs <data-src/ancient-near-east.json>
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv[2];
const d = JSON.parse(readFileSync(file, 'utf8'));

// Second step: Mitanni into Mesopotamia; Dilmun on the Meluhha event.
d.tracks.find((t) => t.id === 'mitanni').parent = 'mesopotamia';
const ev = d.events.find((e) => e.uuid === 'meluhha-sargon'); if (!ev.tracks.includes('dilmun')) ev.tracks.push('dilmun');
ev.descr = 'Sargon of Akkad mentions ships from Meluhha, Magan and Dilmun. Most scholars identify Meluhha with the Indus Valley.';
const dilmun = d.tracks.find((t) => t.id === 'dilmun');
dilmun.name = 'Dilmun (Persian Gulf)';

const kids = (id) => d.tracks.filter((t) => t.parent === id).map((t) => t.id);
const order = {
  '': ['aegean', 'sea-peoples', 'egypt', 'levant', 'anatolia', 'mesopotamia', 'iran', 'dilmun', 'indus', 'china', 'americas'],
  anatolia: ['hittites', 'urartu'],
  mesopotamia: ['mitanni', 'assyria', 'babylonia', 'akkad', 'sumer'],
  iran: ['elam', 'medes', 'persia', 'mannaea', 'jiroft', 'bmac'],
};
const byId = new Map(d.tracks.map((t) => [t.id, t]));
const out = [];
const visit = (id) => {
  out.push(byId.get(id));
  const want = order[id] ?? kids(id);
  const have = kids(id);
  if (want.length !== have.length || !have.every((k) => want.includes(k)))
    throw new Error(`order for ${id} doesn't match its children: ${have}`);
  want.forEach(visit);
};
const tops = d.tracks.filter((t) => !t.parent).map((t) => t.id);
if (tops.length !== order[''].length || !tops.every((k) => order[''].includes(k))) throw new Error('top-level mismatch: ' + tops);
for (const id of order['']) {
  out.push(byId.get(id));
  (order[id] ?? kids(id)).forEach(visit);
}
if (out.length !== d.tracks.length) throw new Error('lost tracks');
d.tracks = out;

const inline = (v) => JSON.stringify(v, null, 1).replace(/\n\s*/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']');
const fmt = (v, ind = '') => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  const one = inline(v);
  if (ind.length + one.length <= 150) return one;
  const n = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => n + fmt(x, n)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.entries(v).map(([k, x]) => n + JSON.stringify(k) + ': ' + fmt(x, n)).join(',\n') + '\n' + ind + '}';
};
writeFileSync(file, fmt(d) + '\n');
console.log(d.tracks.filter((t) => !t.parent).map((t) => t.id).join(' > '));
