// Sets event importance in a timeline source file: 1 = key, 2 = normal (stored as no field), 3 = minor.
//   node scripts/set-importance.ts <data-src file> <1|2|3> <event uuid>...
//   node scripts/set-importance.ts <data-src file> --plan <plan.json>
// A plan file is { "1": [uuids], "3": [uuids] }; every uuid it doesn't list is reset to normal, so the
// plan is the whole truth about importance and can be re-run safely. For the bundled timelines,
// `npm run data -- importance <short>` applies the plan, compiles and refreshes the key-event list in one go.
import { readFileSync } from 'node:fs';
import { readSource, writeSource } from './lib/source-format.ts';
import { applyImportancePlan, importanceCounts, setImportance } from './lib/importance.ts';

const [file, a, ...rest] = process.argv.slice(2);
if (!file || !a) {
  console.error('usage: node scripts/set-importance.ts <file> <1|2|3> <uuid>...  |  <file> --plan <plan.json>');
  process.exit(1);
}
const d = readSource(file);
if (a === '--plan') applyImportancePlan(d.events, JSON.parse(readFileSync(rest[0], 'utf8')));
else for (const id of rest) setImportance(d.events, id, Number(a));
writeSource(file, d);
const { key, normal, minor } = importanceCounts(d.events);
console.log(`${file}: ${key} key, ${normal} normal, ${minor} minor`);
