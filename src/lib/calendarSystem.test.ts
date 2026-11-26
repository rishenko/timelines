import { afterEach, describe, expect, it } from 'vitest';
import { formatDate, formatEditDate, formatYear, parseDate, parseFullDate, parseYear, tickLabel, YEAR_ZERO_CALENDAR } from './calendar.ts';
import { shortYears } from './memberOf.ts';
import { startAt, SUB_YEAR } from './subYear.ts';
import { registerCalendar, type CalendarSystem } from '../plugins/calendar.ts';
import type { Calendar } from '../types.ts';

// a calendar plugin in miniature (plugin design §6): two ages, the second from stored year 1000
const ages: CalendarSystem = {
  id: 'test-ages',
  format: (y, month, day, { circa }) => `${circa ? 'c. ' : ''}${day ? `day ${day} ` : ''}${month ? `moon ${month} ` : ''}${y < 1000 ? `First Age ${y}` : `Second Age ${y - 1000}`}`,
  parse: (text) => {
    const m = /^(c\. )?(?:moon (\d+) )?(First|Second) Age (\d+)$/.exec(text.trim());
    if (!m) return null;
    const year = Number(m[4]) + (m[3] === 'Second' ? 1000 : 0);
    return m[2] ? { year, month: Number(m[2]), circa: !!m[1] } : { year, circa: !!m[1] };
  },
};
const named = { ...YEAR_ZERO_CALENDAR, system: 'test-ages' } as Calendar;
let off = () => {};
afterEach(() => off());

describe('calendar plugins: lib/calendar.ts hands over to the calendar a timeline names', () => {
  it('names years, dates and ruler ticks with it', () => {
    off = registerCalendar(ages);
    expect(formatYear(1200, named)).toBe('Second Age 200');
    expect(formatYear(40, named, true)).toBe('c. First Age 40');
    expect(formatDate(1200, 3, 9, named)).toBe('day 9 moon 3 Second Age 200');
    expect(formatEditDate(1200, 3, undefined, named)).toBe('moon 3 Second Age 200');
    expect(tickLabel(1100, 100, named)).toBe('Second Age 100');
    // a calendar plugin also takes over from deep time's "66 Ma" form in the editor
    expect(formatEditDate(1200, undefined, undefined, { ...named, beforePresent: { present: 1950 } } as Calendar)).toBe('Second Age 200');
    expect(shortYears({ start: 1922, end: 1991 }, named)).toBe('Second Age 922–Second Age 991');
    expect(shortYears({ start: 990, end: 1010, ongoing: true }, named, true)).toBe('since c. First Age 990');
  });

  it('reads them back with it', () => {
    off = registerCalendar(ages);
    expect(parseDate('Second Age 200', named)).toEqual({ year: 1200, circa: false });
    expect(parseYear('c. First Age 40', named)).toBe(40);
    expect(parseFullDate('moon 3 Second Age 200', named)).toEqual({ year: 1200, month: 3, circa: false });
    expect(parseDate('1200 AE', named)).toBe(null);
  });

  it('without the plugin, the same file falls back to its before/after labels', () => {
    expect(formatYear(1200, named)).toBe('1200 AE');
    expect(parseDate('1200 AE', named)).toEqual({ year: 1200, circa: false });
    off = registerCalendar(ages);
    off();
    expect(formatYear(-5, named)).toBe('5 BE');
    expect(shortYears({ start: 1922, end: 1991 }, named)).toBe('1922–91');
  });
});

it('ruler ticks under a year: a label with a year goes through the calendar whole, the others stay short', () => {
  off = registerCalendar(ages);
  const { month, day } = SUB_YEAR;
  expect(tickLabel(startAt(1200, 1, 1), month, named)).toBe('moon 1 Second Age 200');
  expect(tickLabel(startAt(1200, 3, 1), day, named)).toBe('moon 3 Second Age 200');
  expect(tickLabel(startAt(1200, 3, 9), day, named, true)).toBe('day 9 moon 3 Second Age 200');
  expect(tickLabel(startAt(1200, 4, 1), month, named)).toBe('Apr');
  expect(tickLabel(startAt(1200, 3, 9), day, named)).toBe('9');
});
