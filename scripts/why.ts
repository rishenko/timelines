// Why is this in the timeline? Read-only over the committed files (scripts/lib/why.ts; docs/provenance.md).
//   npm run why -- <uuid>                         one event: dates, sources and cited text, provenance, rulings
//   npm run why -- <row> <year>                   the events on a row in that year, reigns first (row or timeline/row)
//   npm run why -- <row> <words>                  the events on a row whose title or person has those words
//   npm run why -- --open [--region R] [--flag F] [--limit N]   reigns with open flags, counted by kind, then listed
import { existsSync, readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from './lib/timelines.ts';
import { explain, find, flagKind, openFlags, type Timeline } from './lib/why.ts';

const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const timelines: Timeline[] = SOURCE_TIMELINES.filter((t) => existsSync(t.compiled)).map((t) => {
  const prov = `data-src/provenance/${t.id}-reigns.json`;
  return { id: t.id, data: read(t.compiled), prov: existsSync(prov) ? read(prov) : {} };
});
const rulings = read('pipelines/common/rulings.json');
const argv = process.argv.slice(2);
const opt = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };

if (argv.includes('--open')) {
  const flags = openFlags(timelines, opt('--region'), opt('--flag'));
  const kinds = new Map<string, number>();
  for (const f of flags) kinds.set(flagKind(f.flag), (kinds.get(flagKind(f.flag)) ?? 0) + 1);
  console.log(`${flags.length} open flag(s) on ${new Set(flags.map((f) => f.uuid)).size} reign(s)`);
  for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
  const limit = Number(opt('--limit') ?? 50);
  for (const f of flags.slice(0, limit)) console.log(`${f.tl}/${f.row}  ${f.uuid}  ${f.flag}`);
  if (flags.length > limit) console.log(`… and ${flags.length - limit} more (--limit N)`);
} else if (argv.length) {
  const hits = find(timelines, argv);
  if (!hits.length) { console.log(`no event matches ${argv.join(' ')}`); process.exit(1); }
  console.log(hits.map((h) => explain(h, rulings).join('\n')).join('\n\n'));
} else {
  console.log('usage: npm run why -- <uuid> | <row> <year> | <row> <words> | --open [--region R] [--flag F] [--limit N]');
  process.exit(1);
}
