// Reigns of the rulers of the Ancient rows (2026-11-23; the rulers pass, reviewed by the author: "a, yes").
// pipelines/extract/reigns_freeze.py froze the reviewed bulk run into pipelines/ancient/reigns.json: the reign events
// (ids `reign-<slug>`, category `reign`), the sources they cite and, per reign, why it is still to check. This script
// upserts them and writes the review list to data-src/provenance/ancient-classical-reigns.json. Reigns of importance 3
// (the 25-year rule in rulers.py) are added to the "3" list of the importance plan; the plan sets every value, so the
// frozen importance only decides that list. The author's pinned reigns are existing events and stay as they are.
// Re-runnable: events and sources are replaced, never duplicated.
//   node scripts/ancient-classical/reigns.ts && npm run data -- build ancient-classical
import { readFileSync, writeFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const FROZEN = 'pipelines/ancient/reigns.json';
const PLAN = 'data-src/ancient-classical-importance.json';
const PROVENANCE = 'data-src/provenance/ancient-classical-reigns.json';

const claims = JSON.parse(readFileSync(FROZEN, 'utf8'));
const ed = open('data-src/ancient-classical.json', '2026-11-23');

const rows = new Set(ed.data.tracks.map((t: { id: string }) => t.id));
const lost = [...new Set<string>(claims.events.flatMap((e: { tracks: string[] }) => e.tracks).filter((t: string) => !rows.has(t)))];
if (lost.length) throw new Error(`${FROZEN}: reigns on rows the timeline lacks: ${lost.slice(0, 10).join(', ')}`);

for (const [k, v] of Object.entries<{ url?: string }>(claims.sources)) {
  const have = ed.data.sources[k];
  if (have && have.url !== v.url) throw new Error(`${FROZEN}: source ${k} differs from the timeline's`);
  if (!have) ed.data.sources[k] = v;
}
for (const e of claims.events) ed.event({ ...e });
// A reign the freeze left out by hand ("not imported, wrong row", reigns-excluded.json) is removed if an earlier run put it in the base file,
// so a wrong reign leaves Ancient the way it leaves Modern and Medieval (their files are regenerated; this one is hand-kept).
const wrong = new Set<string>(Object.entries<{ row: string; toCheck?: string[] }>(claims.skipped ?? {})
  .filter(([, r]) => r.toCheck?.some((t) => t.startsWith('not imported, wrong row')))
  .map(([k, r]) => `${k}-${r.row}`));
const before = ed.data.events.length;
ed.data.events = ed.data.events.filter((e: { uuid: string }) => !wrong.has(e.uuid));
for (const u of wrong) if (!ed.data.events.some((e: { uuid: string }) => e.uuid === u)) ed.data.redirects = { ...(ed.data.redirects ?? {}), [u]: null }; // removed on purpose (the ids check)
if (before !== ed.data.events.length) console.log(`removed ${before - ed.data.events.length} excluded reign(s) from the base file`);
ed.save();

// the importance plan: reigns of importance 3 join the minor list
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
for (const k of Object.keys(plan)) if (Array.isArray(plan[k])) plan[k] = plan[k].filter((u: string) => !wrong.has(u)); // an excluded reign leaves the plan too
const minor = new Set<string>(plan['3']);
for (const e of claims.events) if (e.importance === 3) minor.add(e.uuid);
plan['3'] = [...plan['3'], ...[...minor].filter((u) => !plan['3'].includes(u))];
writeFileSync(PLAN, JSON.stringify(plan, null, 2) + '\n');
// the categories plan names events too (scripts/lib/categories.ts refuses an id the timeline lacks)
const CATS = 'data-src/ancient-classical-categories.json';
const cats = JSON.parse(readFileSync(CATS, 'utf8'));
let dropped = 0;
for (const u of wrong) if (u in cats.events) (delete cats.events[u], dropped++);
if (dropped) writeFileSync(CATS, JSON.stringify(cats, null, 2) + '\n');

// the record of what is left to check, one line per reign
const review = { ...(claims.skipped ?? {}), ...claims.review } as Record<string, unknown>; // skipped: century-only, not imported
const lines = Object.keys(review).sort().map((u) => `  ${JSON.stringify(u)}: ${JSON.stringify(review[u])}`);
writeFileSync(PROVENANCE, '{\n' + lines.join(',\n') + '\n}\n');
console.log(`${claims.events.length} reigns, ${Object.values(review).filter((r: any) => r.toCheck?.length).length} to check`);
