// Quote backfill for section-only locators (pilot, 2026-11-24): appends to an event's Wikipedia locator the sentence or
// infobox field that states its date, from pipelines/ancient/locator-quotes.json (reviewed by hand; checked by
// pipelines/ancient/locator_quotes.py --check). "lead and Arrival" becomes 'lead and Arrival: "In 597, the forty
// missionaries arrived in Kent…"'. Nothing changes a date; an event the plan flags `none` is left as it is.
// Re-runnable: a locator that already carries its quote is left alone.
//   node scripts/ancient-classical/locator-quotes.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

type Plan = { events: Record<string, { source: string; quote?: string; none?: string }> };
const plan: Plan = JSON.parse(readFileSync('pipelines/ancient/locator-quotes.json', 'utf8'));
const ed = open('data-src/ancient-classical.json', '2026-11-24');
let n = 0;
for (const [uuid, p] of Object.entries(plan.events)) {
  if (!p.quote) continue;
  const e = (ed.data.events as { uuid: string; sources: { sourceKey: string; sourceLocation: string }[]; memberships?: { sources: { sourceKey: string; sourceLocation: string }[] }[] }[]).find((x) => x.uuid === uuid);
  if (!e) throw new Error(`locator-quotes: no event ${uuid}`);
  const s = e.sources.find((x) => x.sourceKey === p.source);
  if (!s) throw new Error(`locator-quotes: ${uuid} cites no ${p.source}`);
  if (s.sourceLocation.includes(p.quote)) continue;
  const old = s.sourceLocation;
  s.sourceLocation = `${old}: "${p.quote}"`;
  // a membership citing the same locator follows it (the category's evidence is the same passage)
  for (const m of e.memberships ?? []) for (const r of m.sources) if (r.sourceKey === p.source && r.sourceLocation === old) r.sourceLocation = s.sourceLocation;
  n++;
}
ed.save();
console.log(`locator-quotes: ${n} locators quoted`);
