// Compiles a hand-written timeline (data-src/<id>.json) into the app's format (public/timelines/<id>.json).
//
// In the source file, any year may be written for people instead of as a stored integer:
//   "start": "c. 2334 BCE", "end": "2154 BCE", "year": "1651 BCE", "until": "1400 BCE"
// They are converted with the timeline's own calendar (so "1450 BCE" becomes -1449, because BCE/CE has no
// year 0). A "c." on an event's, lifespan stretch's, phase's or era's start sets `circa`. Integers pass through unchanged. The result
// is validated. Used by scripts/build-dataset.ts and by the test that the shipped files are up to date.
import { parseFullDate } from '../../src/lib/calendar.ts';
import { validateDataset } from '../../src/data/validate.ts';
import { migrate } from '../../src/data/migrate.ts';
import type { Calendar } from '../../src/types.ts';

type Obj = Record<string, unknown>;

/** The compiled dataset (as plain JSON) and every problem found; write it only when `errors` is empty. */
export function compileSource(raw: Obj & { meta: Obj & { calendar: Calendar } }): { dataset: Obj; errors: string[] } {
  // a source file of an older version compiles to the current one (src/data/migrate.ts)
  raw = migrate(raw);
  const cal = raw.meta.calendar;
  const problems: string[] = [];

  const year = (v: unknown, where: string): { year: number; month?: number; day?: number; circa: boolean } => {
    if (typeof v === 'number') return { year: v, circa: false };
    const d = typeof v === 'string' ? parseFullDate(v, cal) : null;
    if (!d) {
      problems.push(`${where}: can't read the year ${JSON.stringify(v)}`);
      return { year: 0, circa: false };
    }
    return d;
  };

  const claims = (list: unknown, where: string) =>
    Array.isArray(list)
      ? list.map((c: Obj, i) => {
          const d = year(c.year, `${where}[${i}]`);
          return { ...c, year: d.year, ...(d.month ? { month: d.month } : {}), ...(d.day ? { day: d.day } : {}) };
        })
      : list;

  /** Converts start/end (+ claims) on an event or a lifespan. */
  const dated = (o: Obj, where: string): Obj => {
    const out: Obj = { ...o };
    const s = year(o.start, `${where} start`);
    out.start = s.year;
    if (s.month) out.startMonth = s.month;
    if (s.day) out.startDay = s.day;
    let circa = s.circa;
    if (o.end !== undefined) {
      const e = year(o.end, `${where} end`);
      out.end = e.year;
      if (e.month) out.endMonth = e.month;
      if (e.day) out.endDay = e.day;
      circa ||= e.circa;
    }
    if (circa) out.circa = true;
    if (o.startDates) out.startDates = claims(o.startDates, `${where} startDates`);
    if (o.endDates) out.endDates = claims(o.endDates, `${where} endDates`);
    return out;
  };

  const m = raw.meta;
  const range = m.range as Obj | undefined;
  const dataset: Obj = {
    ...raw,
    meta: {
      ...m,
      // edge links to neighbouring timelines: "at" may be written as a readable year too
      ...(m.continues ? { continues: (m.continues as Obj[]).map((c, i) => ({ ...c, at: year(c.at, `meta.continues[${i}]`).year })) } : {}),
      ...(range ? { range: { start: year(range.start, 'meta.range start').year, end: year(range.end, 'meta.range end').year } } : {}),
      // eras are dated like phases
      ...(Array.isArray(m.eras) ? { eras: (m.eras as Obj[]).map((e) => dated(e, `era ${e.id}`)) } : {}),
    },
    chronologies: raw.chronologies
      ? Object.fromEntries(
          Object.entries(raw.chronologies as Record<string, Obj>).map(([id, c]) => {
            const d = c.derive as Obj | undefined;
            return [id, d && d.until !== undefined ? { ...c, derive: { ...d, until: year(d.until, `chronology ${id}`).year } } : c];
          }),
        )
      : undefined,
    tracks: (raw.tracks as Obj[]).map((t) => ({
      ...t,
      // a lifespan is one stretch or a list of them; an ongoing stretch or phase has no end to convert
      ...(t.span
        ? {
            span: Array.isArray(t.span)
              ? (t.span as Obj[]).map((s, i) => dated(s, `track ${t.id} stretch ${i + 1}`))
              : dated(t.span as Obj, `track ${t.id}`),
          }
        : {}),
      ...(Array.isArray(t.phases) ? { phases: (t.phases as Obj[]).map((p) => dated(p, `track ${t.id} phase ${p.name}`)) } : {}),
      // a membership in another row is dated like a phase
      ...(Array.isArray(t.memberOf) ? { memberOf: (t.memberOf as Obj[]).map((m) => dated(m, `track ${t.id} membership in ${m.row}`)) } : {}),
    })),
    events: (raw.events as Obj[]).map((e) => dated(e, `event ${e.uuid}`)),
  };
  if (!dataset.chronologies) delete dataset.chronologies;
  return { dataset, errors: [...problems, ...validateDataset(dataset)] };
}

/** The compiled file's text, exactly as build-dataset.ts writes it. */
export const compiledText = (dataset: unknown) => JSON.stringify(dataset, null, 2) + '\n';
