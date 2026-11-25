// Writes data-src/row-identity.json: what each row id shared by two timelines means (R4, ontology review).
//   node scripts/row-identity.ts            write the file
//   node scripts/row-identity.ts --check    fail if the file is out of date, a shared id has no verdict, or a hand entry is stale
// Reads data-src/<timeline>.json (rows and their ids.wikidata) and pipelines/common/row-identity-hand.json. No dump needed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify, render, TIMELINES, type Hand, type Row } from './lib/row-identity.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT = 'data-src/row-identity.json';
const rows: Record<string, Row[]> = Object.fromEntries(TIMELINES.map((t) => [t, JSON.parse(readFileSync(join(ROOT, 'data-src', `${t}.json`), 'utf8')).tracks as Row[]]));
const hand: Hand = JSON.parse(readFileSync(join(ROOT, 'pipelines/common/row-identity-hand.json'), 'utf8')).entries ?? {};
const { entries, problems } = classify(rows, hand);
for (const p of problems) console.log(`PROBLEM ${p}`);
const text = render(entries);
if (process.argv.includes('--check')) {
  const have = existsSync(join(ROOT, OUT)) ? readFileSync(join(ROOT, OUT), 'utf8') : '';
  if (have !== text) problems.push(`${OUT} is out of date: run node scripts/row-identity.ts`);
  console.log(problems.length ? `row identity: ${problems.length} problem(s)` : `row identity: ok (${entries.length} shared ids)`);
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) process.exit(1);
writeFileSync(join(ROOT, OUT), text);
console.log(`row identity: ${entries.length} shared ids written to ${OUT}`);
