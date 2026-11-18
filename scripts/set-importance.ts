// Sets event importance in a timeline source file: 1 = key, 2 = normal (stored as no field), 3 = minor.
//   node scripts/set-importance.ts <data-src file> <1|2|3> <event uuid>...
//   node scripts/set-importance.ts <data-src file> --plan <plan.json>
// A plan file is { "1": [uuids], "3": [uuids] }; every uuid it doesn't list is reset to normal, so the
// plan is the whole truth about importance and can be re-run safely.
// Then run `npm run data:ancient` (or the build script) to compile.
import { readFileSync } from 'node:fs';
import { readSource, writeSource } from './lib/source-format.ts';

const [file, a, ...rest] = process.argv.slice(2);
if (!file || !a) {
  console.error('usage: node scripts/set-importance.ts <file> <1|2|3> <uuid>...  |  <file> --plan <plan.json>');
  process.exit(1);
}
const d = readSource(file);
const byId = new Map<string, { uuid: string; importance?: number }>(d.events.map((e: { uuid: string }) => [e.uuid, e]));

const set = (uuid: string, level: number) => {
  const e = byId.get(uuid);
  if (!e) throw new Error(`unknown event "${uuid}"`);
  if (level === 2) delete e.importance;
  else e.importance = level;
};

if (a === '--plan') {
  const plan: Record<string, string[]> = JSON.parse(readFileSync(rest[0], 'utf8'));
  for (const e of byId.values()) delete e.importance;
  // keys other than "1", "2", "3" (such as "_rubric") are notes
  for (const [level, ids] of Object.entries(plan)) if (['1', '2', '3'].includes(level)) for (const id of ids) set(id, Number(level));
} else {
  const level = Number(a);
  if (![1, 2, 3].includes(level)) throw new Error('importance must be 1, 2 or 3');
  for (const id of rest) set(id, level);
}
writeSource(file, d);
const count = (n: number) => [...byId.values()].filter((e) => (e.importance ?? 2) === n).length;
console.log(`${file}: ${count(1)} key, ${count(2)} normal, ${count(3)} minor`);
