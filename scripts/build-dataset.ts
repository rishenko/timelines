// Compiles a hand-written timeline (data-src/<id>.json) into the app's format (public/timelines/<id>.json).
// The conversion rules are in scripts/lib/compile.ts. For the bundled timelines use the short form:
//   npm run data -- build ancient-classical   (or npm run data:build)
// Any pair of files:
//   node scripts/build-dataset.ts data-src/ancient-classical.json public/timelines/ancient-classical.json
import { readFileSync, writeFileSync } from 'node:fs';
import { compileSource, compiledText } from './lib/compile.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/build-dataset.ts in.json out.json');
  process.exit(1);
}

const { dataset, errors } = compileSource(JSON.parse(readFileSync(input, 'utf8')));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(output, compiledText(dataset));
const count = (k: string) => (Array.isArray(dataset[k]) ? (dataset[k] as unknown[]).length : Object.keys(dataset[k] as object).length);
console.log(`Wrote ${output}: ${count('tracks')} tracks, ${count('events')} events, ${count('sources')} sources.`);
