// Converts a v1 or v2 REDACTED data file to schema v3.
// Usage: node scripts/upgrade-dataset.ts in.json out.json
import { readFileSync, writeFileSync } from 'node:fs';
import { upgrade } from '../src/data/migrate.ts';
import { validateDataset } from '../src/data/validate.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/upgrade-dataset.ts in.json out.json');
  process.exit(1);
}
const { data, from } = upgrade(JSON.parse(readFileSync(input, 'utf8')));
if (!from) console.warn('Input is not a v1 or v2 file; writing it unchanged.');
const errors = validateDataset(data);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${output} (from v${from ?? 3}).`);
