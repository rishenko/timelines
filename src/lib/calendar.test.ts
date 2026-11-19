import { describe, expect, it } from 'vitest';
import {
  BCE_CE,
  YEAR_ZERO_CALENDAR as BE_AE,
  eraStart,
  formatYear,
  fromStored,
  isMajorTick,
  parseDate,
  parseYear,
  tickFloor,
  ticksBetween,
  toStored,
} from './calendar.ts';
import { yearsBetween } from './years.ts';
import { buildScale } from '../timeline/scale.ts';

describe('calendar with a year 0', () => {
  it('formats and parses', () => {
    expect(formatYear(-5500, BE_AE)).toBe('5500 BE');
    expect(formatYear(0, BE_AE)).toBe('0 AE');
    expect(parseYear('4560AE', BE_AE)).toBe(4560);
    expect(parseYear('500 be', BE_AE)).toBe(-500);
    expect(parseYear('-12', BE_AE)).toBe(-12);
    expect(parseYear('abc', BE_AE)).toBeNull();
  });
  it('ticks on multiples of the increment', () => {
    expect(ticksBetween(-25, 25, 10, BE_AE)).toEqual([-20, -10, 0, 10, 20]);
    expect(eraStart(BE_AE)).toBe(0);
  });
});

describe('BCE/CE (no year 0)', () => {
  it('stores 1 BCE as 0 and 1450 BCE as -1449', () => {
    expect(toStored(1, 'before', BCE_CE)).toBe(0);
    expect(toStored(1450, 'before', BCE_CE)).toBe(-1449);
    expect(toStored(1, 'after', BCE_CE)).toBe(1);
    expect(fromStored(0, BCE_CE)).toEqual({ year: 1, era: 'before' });
    expect(fromStored(-1449, BCE_CE)).toEqual({ year: 1450, era: 'before' });
  });

  it('round-trips every year from 4000 BCE to 100 CE', () => {
    for (let y = -3999; y <= 100; y++) {
      const { year, era } = fromStored(y, BCE_CE);
      expect(toStored(year, era, BCE_CE)).toBe(y);
      expect(parseYear(formatYear(y, BCE_CE), BCE_CE)).toBe(y);
    }
  });

  it('has no year 0: 1 BCE is followed by 1 CE, one year apart', () => {
    expect(formatYear(0, BCE_CE)).toBe('1 BCE');
    expect(formatYear(1, BCE_CE)).toBe('1 CE');
    expect(yearsBetween(parseYear('1 BCE', BCE_CE)!, parseYear('1 CE', BCE_CE)!)).toBe(1);
    // the reign of Hammurabi (middle chronology): 1792–1750 BCE is 42 years
    expect(yearsBetween(parseYear('1792 BCE', BCE_CE)!, parseYear('1750 BCE', BCE_CE)!)).toBe(42);
    expect(parseYear('0 BCE', BCE_CE)).toBeNull();
  });

  it('parses aliases and circa', () => {
    expect(parseDate('c. 2334 BC', BCE_CE)).toEqual({ year: -2333, circa: true });
    expect(parseDate('ca 2334 bce', BCE_CE)).toEqual({ year: -2333, circa: true });
    expect(parseDate('539 BCE', BCE_CE)).toEqual({ year: -538, circa: false });
    expect(parseDate('AD 5', BCE_CE)).toBeNull();
    expect(parseDate('5 AD', BCE_CE)).toEqual({ year: 5, circa: false });
    expect(parseYear('-1450', BCE_CE)).toBe(-1449);
  });

  it('puts ruler ticks on round displayed years', () => {
    const ticks = ticksBetween(parseYear('1600 BCE', BCE_CE)!, parseYear('1300 BCE', BCE_CE)!, 100, BCE_CE);
    expect(ticks.map((t) => formatYear(t, BCE_CE))).toEqual(['1600 BCE', '1500 BCE', '1400 BCE', '1300 BCE']);
    expect(isMajorTick(parseYear('2000 BCE', BCE_CE)!, 100, BCE_CE)).toBe(true);
    expect(isMajorTick(parseYear('1900 BCE', BCE_CE)!, 100, BCE_CE)).toBe(false);
  });

  it('crosses the BCE/CE boundary with 1 CE as the era tick', () => {
    const ticks = ticksBetween(parseYear('300 BCE', BCE_CE)!, parseYear('300 CE', BCE_CE)!, 100, BCE_CE);
    expect(ticks.map((t) => formatYear(t, BCE_CE))).toEqual([
      '300 BCE', '200 BCE', '100 BCE', '1 CE', '100 CE', '200 CE', '300 CE',
    ]);
    expect(eraStart(BCE_CE)).toBe(1);
    for (const inc of [1, 10, 50, 100, 500, 1000]) {
      const ts = ticksBetween(-3000, 3000, inc, BCE_CE);
      for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
      for (const t of ts) expect(tickFloor(t, inc, BCE_CE)).toBe(t);
    }
  });

  it('builds a scale whose ticks are round BCE years at every increment', () => {
    for (const inc of [10, 50, 100, 500]) {
      const s = buildScale([-3499, -2333, -1594, -538], { increment: inc, calendar: BCE_CE });
      // every tick is a round year, except 1 CE, which marks the era boundary
      for (const t of s.ticks()) if (t !== eraStart(BCE_CE)) expect(fromStored(t, BCE_CE).year % inc).toBe(0);
    }
  });
});
