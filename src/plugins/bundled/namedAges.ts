import { daysInMonth, MONTH_NAMES } from '../../lib/subYear.ts';
import type { CalendarSystem } from '../calendar.ts';

/** An age and the stored year it begins in (its year 1). */
export interface Age {
  name: string;
  from: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Named ages (plugin design §6, Kevin's first fictional calendar): ages in sequence, each counting its years from 1 ("Age
 * of Lanterns 12"); years before the first age count back from it ("40 before the Age of Tides"). A pure label function
 * of the ages listed here, so it reads no data. Months and days use the core's twelve months ("3 March Age of Glass 9").
 */
export function namedAges(id: string, ages: Age[]): CalendarSystem {
  const sorted = [...ages].sort((a, b) => a.from - b.from);
  const first = sorted[0];
  const names = sorted.map((a) => escape(a.name)).join('|');
  const months = MONTH_NAMES.join('|');
  const re = new RegExp(`^\\s*(c\\.?\\s+|ca\\.?\\s+|circa\\s+)?(?:(\\d{1,2})\\s+)?(?:(${months})\\s+)?(?:(${names})\\s+(\\d+)|(\\d+)\\s+before\\s+the\\s+(${escape(first.name)}))\\s*$`, 'i');
  /** Numbered ticks `step` apart from `start` (its year 1 is at `start`), in [lo, hi]. */
  const counted = (start: number, dir: 1 | -1, step: number, lo: number, hi: number, label: (n: number) => string) => {
    const out: { year: number; label: string; major: boolean }[] = [];
    // the n of the first and last tick in range (n counts away from start: up into an age, back before the first)
    const nAt = (y: number) => (dir === 1 ? y - start + 1 : start - y);
    const [a, b] = dir === 1 ? [nAt(lo), nAt(hi)] : [nAt(hi), nAt(lo)];
    for (let n = Math.max(1, Math.ceil(a / step)) * step; n <= b; n += step) out.push({ year: dir === 1 ? start + n - 1 : start - n, label: label(n), major: n % (step * 10) === 0 });
    return out;
  };
  return {
    id,
    // each age's start is a major tick with its name; its years are counted in round steps from its own year 1. A name
    // is about three ticks wide, so the counted ticks begin three steps in, and stop half a step before the next age.
    ticks(from, to, step) {
      const out: { year: number; label: string; major: boolean }[] = [];
      out.push(...counted(first.from, -1, step, from, Math.min(to, first.from - step / 2), (n) => `${n} before`));
      sorted.forEach((age, i) => {
        if (age.from >= from && age.from <= to) out.push({ year: age.from, label: age.name, major: true });
        const end = sorted[i + 1]?.from ?? Infinity;
        out.push(...counted(age.from, 1, step, Math.max(from, age.from + 3 * step - 1), Math.min(to, end - step / 2), String));
      });
      return out.sort((p, q) => p.year - q.year);
    },
    format(year, month, day, { circa }) {
      const age = sorted.findLast((a) => a.from <= year);
      const when = age ? `${age.name} ${year - age.from + 1}` : `${first.from - year} before the ${first.name}`;
      return `${circa ? 'c. ' : ''}${month ? `${day ? `${day} ` : ''}${MONTH_NAMES[month - 1]} ` : ''}${when}`;
    },
    parse(text) {
      const m = re.exec(text);
      if (!m) return null;
      const age = m[4] && sorted.find((a) => a.name.toLowerCase() === m[4].toLowerCase());
      const n = Number(age ? m[5] : m[6]);
      if (n < 1) return null;
      const year = age ? age.from + n - 1 : first.from - n;
      // a year past the next age's start belongs to that age: read it only as the format writes it
      const next = age && sorted.find((a) => a.from > age.from);
      if (next && year >= next.from) return null;
      const month = m[3] ? MONTH_NAMES.findIndex((x) => x.toLowerCase() === m[3].toLowerCase()) + 1 : undefined;
      const day = m[2] !== undefined && month ? Number(m[2]) : undefined;
      if (m[2] !== undefined && !month) return null;
      if (day && month && day > daysInMonth(year, month)) return null;
      return { year, ...(month ? { month } : {}), ...(day ? { day } : {}), circa: !!m[1] };
    },
  };
}

/** The sample's calendar (docs/examples/named-ages-example.json): the Lantern Coast's three ages. Fictional. */
export const lanternAges = namedAges('lantern-ages', [
  { name: 'Age of Tides', from: 1 },
  { name: 'Age of Lanterns', from: 412 },
  { name: 'Age of Glass', from: 790 },
]);

/** The calendars every page has: a timeline names one in `meta.calendar.system`. */
export const BUNDLED_CALENDARS: CalendarSystem[] = [lanternAges];
