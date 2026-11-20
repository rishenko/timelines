// APPLIED 2026-11-20. Turned the generated combined timeline (public/timelines/ancient-classical.json, then built by
// the retired `npm run data -- combine` from the Ancient and Classical files) into the readable source file
// data-src/ancient-classical.json, so the combined timeline is edited directly from now on. Years are written for
// people again ("c. 1595 BCE"); a `circa` that compile.ts would put back in the same place is dropped in favour of
// the "c." on the start. The script refuses to write unless compiling the result gives the input file byte for byte.
//   node scripts/archive/2026-11-20-combined-to-source.ts
import { readFileSync } from 'node:fs';
import { formatYear } from '../../src/lib/calendar.ts';
import { compileSource, compiledText } from '../lib/compile.ts';
import { writeSource } from '../lib/source-format.ts';

type Obj = Record<string, unknown>;
const IN = 'public/timelines/ancient-classical.json';
const OUT = 'data-src/ancient-classical.json';

const text = readFileSync(IN, 'utf8');
const data = JSON.parse(text);
const cal = data.meta.calendar;
const y = (v: unknown, circa = false) => (typeof v === 'number' ? formatYear(v, cal, circa) : v);
const claims = (list: unknown) => (Array.isArray(list) ? list.map((c: Obj) => ({ ...c, year: y(c.year) })) : list);

/** start/end/claims as readable years; keeps the key order so compile.ts rebuilds the same object. */
function readable(o: Obj): Obj {
  const keys = Object.keys(o);
  const circaLast = o.circa === true && keys[keys.length - 1] === 'circa';
  const out: Obj = {};
  for (const k of keys) {
    if (k === 'circa' && circaLast) continue;
    if (k === 'start') out.start = y(o.start, o.circa === true);
    else if (k === 'end') out.end = y(o.end);
    else if (k === 'startDates' || k === 'endDates') out[k] = claims(o[k]);
    else out[k] = o[k];
  }
  return out;
}

const m = data.meta;
const source = {
  ...data,
  meta: {
    ...m,
    ...(m.continues ? { continues: m.continues.map((c: Obj) => ({ ...c, at: y(c.at) })) } : {}),
    ...(m.range ? { range: { start: y(m.range.start), end: y(m.range.end) } } : {}),
  },
  ...(data.chronologies
    ? {
        chronologies: Object.fromEntries(
          Object.entries(data.chronologies as Record<string, Obj>).map(([id, c]) => {
            const d = c.derive as Obj | undefined;
            return [id, d && d.until !== undefined ? { ...c, derive: { ...d, until: y(d.until) } } : c];
          }),
        ),
      }
    : {}),
  tracks: data.tracks.map((t: Obj) => ({
    ...t,
    ...(t.span ? { span: readable(t.span as Obj) } : {}),
    ...(Array.isArray(t.phases) ? { phases: (t.phases as Obj[]).map(readable) } : {}),
  })),
  events: data.events.map(readable),
};

const { dataset, errors } = compileSource(source);
if (errors.length) throw new Error(errors.join('\n'));
if (compiledText(dataset) !== text.replace(/\r\n/g, '\n')) throw new Error('round trip differs; nothing written');
writeSource(OUT, source);
console.log(`wrote ${OUT}; it compiles to ${IN} exactly`);
