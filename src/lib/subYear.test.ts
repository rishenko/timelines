import { describe, expect, it } from 'vitest';
import {
  at0,
  at1,
  centerParam,
  dayOf,
  durationText,
  endAt,
  gapLength,
  incrementLabel,
  incrementYears,
  isMajorSubYearTick,
  roundCenter,
  startAt,
  SUB_YEAR,
  subYearFloor,
  subYearNext,
} from './subYear.ts';
import { BCE_CE, formatDate, parseFullDate, tickLabel, ticksBetween } from './calendar.ts';
import { formatEventDates, isSpan } from './years.ts';
import type { TimelineEvent } from '../types.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { validateDataset } from '../data/validate.ts';

const ev = (o: Partial<TimelineEvent>): TimelineEvent => ({ uuid: 'e', title: 'E', descr: '', start: 1916, tracks: ['t'], sources: [], ...o });

describe('positions of dates', () => {
  it('places a year-only date exactly where whole years always were', () => {
    expect(startAt(1916)).toBe(1916);
    expect(endAt(1916)).toBe(1917);
    expect(startAt(-1449)).toBe(-1449);
    expect(endAt(-1449)).toBe(-1448);
    expect(at0({ start: 5 })).toBe(5);
    expect(at1({ start: 5, end: 9 })).toBe(10);
    expect(at1({ start: 5 })).toBe(6);
  });

  it('spans a month or a day', () => {
    // 1916 is a leap year: July 1 is day 183 (0-based 182)
    expect(startAt(1916, 7, 1)).toBeCloseTo(1916 + 182 / 366, 12);
    expect(endAt(1916, 7, 1)).toBeCloseTo(1916 + 183 / 366, 12);
    expect(startAt(1916, 7)).toBe(startAt(1916, 7, 1));
    expect(endAt(1916, 7)).toBe(startAt(1916, 8, 1));
    expect(endAt(1916, 12)).toBe(1917);
    expect(endAt(1916, 12, 31)).toBe(1917);
    expect(endAt(1915, 2, 28)).toBe(startAt(1915, 3, 1));
    expect(endAt(1916, 2, 28)).toBe(startAt(1916, 2, 29));
  });

  it('reads a position back as its day, also before year 0', () => {
    for (const [y, m, d] of [
      [1916, 7, 1],
      [1916, 12, 31],
      [1900, 3, 1],
      [2000, 2, 29],
      [-43, 3, 15],
      [3080, 12, 2],
    ])
      expect(dayOf(startAt(y, m, d))).toEqual({ year: y, month: m, day: d });
  });
});

describe('zoom steps below a year', () => {
  it('names them in the data and keeps them as fractions of a year', () => {
    expect(incrementYears('month')).toBe(1 / 12);
    expect(incrementYears(50)).toBe(50);
    expect(incrementLabel(SUB_YEAR.week)).toBe('1 week');
    expect(incrementLabel(SUB_YEAR.quarter)).toBe('3 months');
    expect(incrementLabel(500)).toBe('500 yr');
  });

  it('puts week ticks on the 1st, 8th, 15th and 22nd of each month', () => {
    const ticks = ticksBetween(startAt(1916, 6, 20), startAt(1916, 7, 20), SUB_YEAR.week, BCE_CE).map(dayOf);
    expect(ticks.map((t) => `${t.month}/${t.day}`)).toEqual(['6/22', '7/1', '7/8', '7/15']);
  });

  it('puts quarter ticks on Jan, Apr, Jul and Oct 1, and steps across years', () => {
    expect(dayOf(subYearFloor(startAt(1916, 5, 10), 'quarter'))).toEqual({ year: 1916, month: 4, day: 1 });
    expect(subYearNext(startAt(1916, 10, 1), 'quarter')).toBe(1917);
    expect(subYearNext(startAt(1916, 12, 31), 'day')).toBe(1917);
  });

  it('labels ticks by the zoom', () => {
    const w = SUB_YEAR.week;
    expect(tickLabel(startAt(1916, 7, 1), w, BCE_CE)).toBe('Jul 1916 CE');
    expect(tickLabel(startAt(1916, 7, 8), w, BCE_CE)).toBe('8');
    expect(tickLabel(1916, SUB_YEAR.month, BCE_CE)).toBe('1916 CE');
    expect(tickLabel(startAt(1916, 4), SUB_YEAR.month, BCE_CE)).toBe('Apr');
    expect(tickLabel(1916, 10, BCE_CE)).toBe('1916 CE');
    expect(isMajorSubYearTick(startAt(1916, 7, 1), 'day')).toBe(true);
    expect(isMajorSubYearTick(startAt(1916, 7, 1), 'month')).toBe(false);
  });

  it('keeps the center to the day below a year, to the year above', () => {
    expect(roundCenter(1916.4, 10)).toBe(1916);
    expect(dayOf(roundCenter(startAt(1916, 7, 1) + 0.001, SUB_YEAR.day))).toEqual({ year: 1916, month: 7, day: 1 });
    expect(centerParam(-1594)).toBe('-1594');
    expect(centerParam(startAt(1916, 7, 1))).toBe('1916-07-01');
  });

  it('measures compressed gaps', () => {
    expect(gapLength(-3000, -2800)).toBe('200 yrs');
    expect(gapLength(startAt(1916, 3), startAt(1916, 7))).toBe('4 months');
    expect(gapLength(startAt(1916, 7, 1), startAt(1916, 7, 13))).toBe('12 days');
  });
});

describe('reading and writing dates', () => {
  it('reads dates with months and days, and years as before', () => {
    expect(parseFullDate('28 June 1914', BCE_CE)).toEqual({ year: 1914, month: 6, day: 28, circa: false });
    expect(parseFullDate('June 1914', BCE_CE)).toEqual({ year: 1914, month: 6, circa: false });
    expect(parseFullDate('c. Sept 1916', BCE_CE)).toEqual({ year: 1916, month: 9, circa: true });
    expect(parseFullDate('15 March 44 BCE', BCE_CE)).toEqual({ year: -43, month: 3, day: 15, circa: false });
    expect(parseFullDate('1914-06-28', BCE_CE)).toEqual({ year: 1914, month: 6, day: 28, circa: false });
    expect(parseFullDate('c. 2334 BCE', BCE_CE)).toEqual({ year: -2333, circa: true });
    expect(parseFullDate('29 February 1915', BCE_CE)).toBeNull();
    expect(parseFullDate('Smarch 1915', BCE_CE)).toBeNull();
  });

  it('writes dates and durations', () => {
    expect(formatDate(1914, 6, 28, BCE_CE)).toBe('28 June 1914 CE');
    expect(formatDate(1918, 2, undefined, BCE_CE)).toBe('February 1918 CE');
    expect(formatDate(1914, undefined, undefined, BCE_CE, true)).toBe('c. 1914 CE');
    expect(durationText({ start: 1916, startMonth: 7, startDay: 1, end: 1916, endMonth: 11, endDay: 18 })).toBe('141 days');
    expect(durationText({ start: 1918, startMonth: 2, end: 1918, endMonth: 5 })).toBe('4 months');
    expect(durationText({ start: 1918, startMonth: 2, end: 1920, endMonth: 4 })).toBe('2 yrs');
    expect(durationText({ start: 1792, end: 1750 + 84 })).toBe('42 yrs');
  });

  it('formats event dates as before for whole years', () => {
    expect(formatEventDates(ev({ start: 1914, end: 1918 }), BCE_CE)).toBe('1914 CE – 1918 CE (4 yrs)');
    expect(formatEventDates(ev({ start: 1914 }), BCE_CE)).toBe('1914 CE');
    expect(formatEventDates(ev({ start: 1916, startMonth: 7, startDay: 1, end: 1916, endMonth: 11, endDay: 18 }), BCE_CE)).toBe(
      '1 July 1916 CE – 18 November 1916 CE (141 days)',
    );
  });

  it('counts a stretch within one year as a span, and a single date as a point', () => {
    expect(isSpan(ev({ start: 1916, end: 1916 }))).toBe(false);
    expect(isSpan(ev({ start: 1916, end: 1917 }))).toBe(true);
    expect(isSpan(ev({ start: 1916, startMonth: 7, startDay: 1, end: 1916, endMonth: 11, endDay: 18 }))).toBe(true);
    expect(isSpan(ev({ start: 1916, startMonth: 7, startDay: 1, end: 1916, endMonth: 7, endDay: 1 }))).toBe(false);
  });
});

describe('validating months and days', () => {
  const ds = () => {
    const d = plainTimeline();
    d.meta.increments = ['day', 'month', 1, 10, 50, 100];
    return d;
  };
  it('accepts named zoom steps below a year, and nothing else', () => {
    expect(validateDataset(ds())).toEqual([]);
    const d = ds();
    d.meta.increments = ['fortnight' as never, 1];
    d.meta.defaultIncrement = 1;
    expect(validateDataset(d).join()).toMatch(/quarter, month, week or day/);
  });
  it('rejects days that do not exist, days without months, and ends before starts', () => {
    const d = ds();
    d.events[0] = { ...d.events[0], start: 10, startMonth: 2, startDay: 30 };
    d.events[1] = { ...d.events[1], start: 10, startDay: 3 };
    d.events[2] = { ...d.events[2], start: 10, startMonth: 7, startDay: 4, end: 10, endMonth: 7, endDay: 2 };
    const errors = validateDataset(d).join('\n');
    expect(errors).toMatch(/30 February doesn't exist/);
    expect(errors).toMatch(/has a day but no month/);
    expect(errors).toMatch(/ends before it starts/);
  });
  it('needs an edge given to the day to name an event within a day of it', () => {
    const d = ds();
    const e = d.events[0];
    d.events[0] = { ...e, start: 70, startMonth: 3, startDay: 3, end: undefined, ongoing: undefined };
    const phase = d.tracks[0].phases![1];
    d.tracks[0].phases![1] = { ...phase, start: 70, startMonth: 3, startDay: 3, startEvent: e.uuid };
    expect(validateDataset(d).filter((x) => x.includes('startEvent'))).toEqual([]);
    d.tracks[0].phases![1] = { ...phase, start: 70, startMonth: 8, startDay: 18, startEvent: e.uuid };
    expect(validateDataset(d).join()).toMatch(/within a day of the edge/);
  });
});
