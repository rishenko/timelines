// Writes the review list of a timeline's key and minor events, grouped by region, as Markdown
// (scripts/lib/importance.ts). Reads the compiled timeline, so dates are already numbers.
//   node scripts/list-importance.ts public/timelines/ancient-classical.json docs/ancient-classical-key-events.md
// `npm run data -- importance <short>` runs this for the bundled timelines.
import { readFileSync, writeFileSync } from 'node:fs';
import { keyEventsMarkdown } from './lib/importance.ts';
import { SOURCE_TIMELINES } from './lib/timelines.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/list-importance.ts <compiled timeline.json> <out.md>');
  process.exit(1);
}
const d = JSON.parse(readFileSync(input, 'utf8'));
// the plan and npm command are named by the timeline's short name (ancient-classical)
const short = SOURCE_TIMELINES.find((t) => t.id === d.meta.id)?.short ?? d.meta.id;
writeFileSync(output, keyEventsMarkdown(d, short));
console.log('wrote', output);
