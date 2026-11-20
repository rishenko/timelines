// APPLIED 2026-11-20. Wrote the combined timeline's importance and row-link plans (data-src/ancient-classical-
// importance.json, data-src/ancient-classical-row-links.json) from what data-src/ancient-classical.json already
// holds, after the Ancient and Classical plans were retired. Applying them to that file changes nothing (checked by
// `npm run data -- run-all ancient-classical --check`).
//   node scripts/archive/2026-11-20-combined-plans.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { readSource, formatSource } from '../lib/source-format.ts';
import { titleFromUrl, type RowLinkPlan } from '../lib/row-links.ts';

const data = readSource('data-src/ancient-classical.json');
const oldRubric = JSON.parse(readFileSync('archive/data-src/ancient-importance.json', 'utf8'))._rubric as string;

const at = (n: number) => data.events.filter((e: { importance?: number }) => e.importance === n).map((e: { uuid: string }) => e.uuid);
const importance = { _rubric: oldRubric, '1': at(1), '3': at(3) };

const links: RowLinkPlan = {};
for (const t of data.tracks) {
  const page = t.url ? titleFromUrl(t.url) : null;
  if (t.url && !page) throw new Error(`${t.id}: url is not a Wikipedia article (${t.url})`);
  if (!page && t.ids?.wikidata) throw new Error(`${t.id}: a Wikidata id without an article`);
  links[t.id] = page ? { page, ...(t.ids?.wikidata ? { wikidata: t.ids.wikidata } : {}) } : null;
}

writeFileSync('data-src/ancient-classical-importance.json', formatSource(importance) + '\n');
writeFileSync('data-src/ancient-classical-row-links.json', formatSource(links) + '\n');
console.log(`importance: ${importance['1'].length} key, ${importance['3'].length} minor; row links: ${Object.keys(links).length} rows`);
