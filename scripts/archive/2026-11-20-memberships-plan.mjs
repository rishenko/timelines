// One-off (applied 2026-11-20): builds data-src/ancient-classical-memberships.json, the pilot category memberships
// for the hybrid-groups prototype, from Kevin's ticks in the vault review note and the candidates' evidence
// (Wikipedia categories, their parents, first sentences and infoboxes of each row's article; fetched 2026-11-20).
// Kept as a template for the full run over every row.
//   node scripts/archive/2026-11-20-memberships-plan.mjs <candidates.json> <review note.md> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
const [candFile, noteFile, outFile] = process.argv.slice(2);
const C = JSON.parse(readFileSync(candFile, 'utf8'));
const src = JSON.parse(readFileSync('data-src/ancient-classical.json', 'utf8'));
const T = new Map(src.tracks.map((t) => [t.id, t]));
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Kevin's ticks: "## Row name" sections, "**Facet**" headings, "- [x] Value — …" lines
const ticked = {}; let row = null, facet = null;
const byName = new Map(Object.entries(C).map(([id, o]) => [o.name, id]));
for (const line of readFileSync(noteFile, 'utf8').split('\n')) {
  const h = line.match(/^## (.+)$/); if (h) { row = byName.get(h[1].trim()) ?? null; facet = null; continue; }
  const f = line.match(/^\*\*(Geography|People|Civilization)\*\*$/); if (f) { facet = f[1].toLowerCase(); continue; }
  const t = line.match(/^- \[x\] (.+?) — /); if (t && row && facet) ((ticked[row] ??= {})[facet] ??= []).push(t[1]);
}

const GEO = ['Mediterranean', 'Mesopotamia', 'Anatolia', 'Levant', 'Nile', 'North Africa', 'Aegean', 'Iberia', 'Caucasus'];
const BROADER = { Aegean: ['mediterranean'], Nile: ['north-africa'] };
const facets = {
  geography: { name: 'Region', values: Object.fromEntries(GEO.map((g) => [slug(g), { name: g, ...(BROADER[g] ? { broader: BROADER[g] } : {}) }])) },
  people: { name: 'People', values: {} },
  civilization: { name: 'Civilization', values: {} },
};
// the source for a row's article: the existing one with its address, else a new Wikipedia source
const byUrl = new Map(Object.entries(src.sources).map(([k, s]) => [s.url, k]));
const newSources = {};
const sourceFor = (rowId) => {
  const t = T.get(rowId); if (!t.url) return null;
  if (byUrl.has(t.url)) {
    const k = byUrl.get(t.url);
    // a source this plan added on an earlier run is still the plan's own: keep it in the plan
    if (k.startsWith('wp-row-')) newSources[k] = src.sources[k];
    return k;
  }
  const key = `wp-row-${rowId}`;
  newSources[key] = { name: `Wikipedia: ${C[rowId].article}`, url: t.url, tags: ['wikipedia'], accessed: '2026-11-20' };
  byUrl.set(t.url, key);
  return key;
};
// where in the article: a category, a category's parent, the first sentence, an infobox field
const where = (e) => {
  let m;
  if ((m = e.match(/^category “(.+?)” ⊂ “(.+?)”$/))) return `category "${m[1]}" (in "${m[2]}")`;
  if ((m = e.match(/^category “(.+?)”$/))) return `category "${m[1]}"`;
  // the first sentence is cited, not quoted: a shortened quote can leave out the very word that places the row
  if (e.startsWith('first sentence')) return 'first sentence';
  if ((m = e.match(/^infobox (\w+): “(.+?)”/))) return `infobox ${m[1]}: "${m[2]}"`;
  return null; // PeriodO: support only, not cited
};
const rank = (loc) => (loc.startsWith('category "') && !loc.includes('(in "') ? 0 : loc.startsWith('first') || loc.startsWith('infobox') ? 1 : 2);
const rows = {};
for (const [rowId, facetsTicked] of Object.entries(ticked)) {
  const key = sourceFor(rowId); if (!key) continue;
  for (const [f, values] of Object.entries(facetsTicked)) for (const v of values) {
    const locs = [...new Set((C[rowId].evidence[f]?.[v] ?? []).map(where).filter(Boolean))].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
    if (!locs.length) continue;
    const id = slug(v);
    if (f !== 'geography') facets[f].values[id] ??= { name: v };
    (rows[rowId] ??= []).push({ facet: f, value: id, sources: locs.map((l) => ({ sourceKey: key, sourceLocation: l })) });
  }
}
writeFileSync(outFile, JSON.stringify({ facets, sources: newSources, rows }, null, 2) + '\n');
const n = Object.values(rows).flat();
console.log(`rows ${Object.keys(rows).length}; memberships ${n.length} (geography ${n.filter((m) => m.facet === 'geography').length}, people ${n.filter((m) => m.facet === 'people').length}, civilization ${n.filter((m) => m.facet === 'civilization').length}); new sources ${Object.keys(newSources).length}; people values ${Object.keys(facets.people.values).length}, civilization values ${Object.keys(facets.civilization.values).length}`);
