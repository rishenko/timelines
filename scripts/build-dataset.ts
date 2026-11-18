// Compiles a hand-written timeline (data-src/<id>.json) into the app's format (src/timelines/<id>.json).
//
// In the source file, any year may be written for people instead of as a stored integer:
//   "start": "c. 2334 BCE", "end": "2154 BCE", "year": "1651 BCE", "until": "1400 BCE"
// The script converts them with the timeline's own calendar (so "1450 BCE" becomes -1449,
// because BCE/CE has no year 0). A "c." on an event's or lifespan's start sets `circa`.
// Integers pass through unchanged. The result is validated before it's written.
//
// Usage: node scripts/build-dataset.ts data-src/ancient-near-east.json src/timelines/ancient-near-east.json

import { readFileSync, writeFileSync } from 'node:fs';
import { parseDate } from '../src/lib/calendar.ts';
import { validateDataset } from '../src/data/validate.ts';
import type { Calendar } from '../src/types.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/build-dataset.ts in.json out.json');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(input, 'utf8'));
const cal: Calendar = raw.meta.calendar;
const problems: string[] = [];

function year(v: unknown, where: string): { year: number; circa: boolean } {
  if (typeof v === 'number') return { year: v, circa: false };
  const d = typeof v === 'string' ? parseDate(v, cal) : null;
  if (!d) {
    problems.push(`${where}: can't read the year ${JSON.stringify(v)}`);
    return { year: 0, circa: false };
  }
  return d;
}

type Obj = Record<string, unknown>;

function claims(list: unknown, where: string) {
  if (!Array.isArray(list)) return list;
  return list.map((c: Obj, i) => ({ ...c, year: year(c.year, `${where}[${i}]`).year }));
}

/** Converts start/end (+ claims) on an event or a lifespan. */
function dated(o: Obj, where: string): Obj {
  const out: Obj = { ...o };
  const s = year(o.start, `${where} start`);
  out.start = s.year;
  let circa = s.circa;
  if (o.end !== undefined) {
    const e = year(o.end, `${where} end`);
    out.end = e.year;
    circa ||= e.circa;
  }
  if (circa) out.circa = true;
  if (o.startDates) out.startDates = claims(o.startDates, `${where} startDates`);
  if (o.endDates) out.endDates = claims(o.endDates, `${where} endDates`);
  return out;
}

const ds = {
  ...raw,
  // edge links to neighbouring timelines: "at" may be written as a readable year too
  meta: {
    ...raw.meta,
    ...(raw.meta.continues ? { continues: (raw.meta.continues as Obj[]).map((c, i) => ({ ...c, at: year(c.at, `meta.continues[${i}]`).year })) } : {}),
    ...(raw.meta.range ? { range: { start: year(raw.meta.range.start, 'meta.range start').year, end: year(raw.meta.range.end, 'meta.range end').year } } : {}),
  },
  chronologies: raw.chronologies
    ? Object.fromEntries(
        Object.entries(raw.chronologies as Record<string, Obj>).map(([id, c]) => {
          const d = c.derive as Obj | undefined;
          return [id, d && d.until !== undefined ? { ...c, derive: { ...d, until: year(d.until, `chronology ${id}`).year } } : c];
        }),
      )
    : undefined,
  tracks: (raw.tracks as Obj[]).map((t) => (t.span ? { ...t, span: dated(t.span as Obj, `track ${t.id}`) } : t)),
  events: (raw.events as Obj[]).map((e) => dated(e, `event ${e.uuid}`)),
};
if (!ds.chronologies) delete ds.chronologies;

const errors = [...problems, ...validateDataset(ds)];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(output, JSON.stringify(ds, null, 2) + '\n');
console.log(`Wrote ${output}: ${ds.tracks.length} tracks, ${ds.events.length} events, ${Object.keys(ds.sources).length} sources.`);
