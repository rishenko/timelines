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
  return {
    id,
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
