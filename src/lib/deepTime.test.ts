// Deep time (calendar.beforePresent, schema v9): years shown as time before a present, short lengths, ticks on round
// ages, the scale ending at the present, proportional "c." and deep-time dates read in search and source files.
import { describe, expect, it } from 'vitest';
import type { Calendar, Dataset } from '../types.ts';
import { eraStart, formatAgo, formatEditDate, formatYear, isMajorTick, parseFullDate, parseYear, tickFloor, ticksBetween } from './calendar.ts';
import { formatSpan, incrementButton, incrementLabel, incrementSpoken } from './subYear.ts';
import { circaFadeAt } from './chronology.ts';
import { buildScale } from '../timeline/scale.ts';
import { compileSource } from '../../scripts/lib/compile.ts';

const BP: Calendar = { before: 'BP', after: 'AP', yearZero: true, beforePresent: { present: 1950, circaShare: 0.01 } };
const AGO0: Calendar = { before: 'BP', after: 'AP', yearZero: true, beforePresent: { present: 0 } };
const BCE: Calendar = { before: 'BCE', after: 'CE', yearZero: false };
/** The stored year of an age before 1950. */
const ago = (n: number) => 1950 - n;

describe('formatting', () => {
  it('years before present in Ga, Ma, ka BP and years BP; Ga and Ma without BP', () => {
    expect(formatYear(ago(4_567_000_000), BP)).toBe('4.567 Ga');
    expect(formatYear(ago(66_000_000), BP)).toBe('66 Ma');
    expect(formatYear(ago(251_902_000), BP, true)).toBe('c. 251.902 Ma');
    expect(formatYear(ago(11_700), BP)).toBe('11.7 ka BP');
    expect(formatYear(ago(9_600), BP)).toBe('9,600 years BP');
    expect(formatYear(1950, BP)).toBe('present');
    expect(formatYear(2000, BP)).toBe('50 years after present');
  });

  it('a present other than 1950 says "ka" and "years ago"', () => {
    expect(formatAgo(11_700, 0)).toBe('11.7 ka');
    expect(formatAgo(1, 0)).toBe('1 year ago');
    expect(formatYear(-66_000_000, AGO0)).toBe('66 Ma');
  });

  it('other calendars are unchanged', () => {
    expect(formatYear(-1499, BCE)).toBe('1500 BCE');
    expect(eraStart(BCE)).toBe(1);
  });

  it('lengths: zoom steps and gaps in Myr/Gyr/kyr; steps under 10,000 years unchanged', () => {
    expect(incrementLabel(100_000_000)).toBe('100 Myr');
    expect(incrementButton(1_000_000_000)).toBe('1 Gyr');
    expect(incrementSpoken(100_000)).toBe('100 thousand years per tick');
    expect(incrementLabel(1000)).toBe('1000 yr');
    expect(incrementButton(250)).toBe('250');
    expect(incrementSpoken(50)).toBe('50 years per tick');
    expect(formatSpan(540_000_000)).toBe('540 Myr');
    expect(formatSpan(4_400_000_000)).toBe('4.4 Gyr');
    expect(formatSpan(11_700)).toBe('11.7 kyr');
    expect(formatSpan(9_600)).toBe('9,600 yrs');
    expect(formatSpan(1)).toBe('1 yr');
  });
});

describe('ruler', () => {
  it('ticks fall on round ages, not round stored years; the present is the era line', () => {
    const inc = 100_000_000;
    expect(tickFloor(ago(150_000_000), inc, BP)).toBe(ago(200_000_000));
    expect(tickFloor(ago(100_000_000), inc, BP)).toBe(ago(100_000_000));
    expect(ticksBetween(ago(250_000_000), 1950, inc, BP).map((t) => formatYear(t, BP))).toEqual(['200 Ma', '100 Ma', 'present']);
    expect(isMajorTick(ago(1_000_000_000), inc, BP)).toBe(true);
    expect(isMajorTick(ago(900_000_000), inc, BP)).toBe(false);
    expect(eraStart(BP)).toBe(1950);
  });

  it('the scale stops at its end: no ticks after the present', () => {
    const inc = 1_000_000;
    const s = buildScale([ago(3_000_000), 1950], { increment: inc, calendar: BP, end: 1950 });
    expect(s.domain[1]).toBe(1950);
    expect(s.ticks().at(-1)).toBe(1950);
    expect(s.ticks().filter((t) => formatYear(t, BP) === 'present')).toHaveLength(1);
    // without `end`, padding runs past it (the old behaviour, still the default)
    expect(buildScale([ago(3_000_000), 1950], { increment: inc, calendar: BP }).domain[1]).toBeGreaterThan(1950);
  });
});

describe('reading dates', () => {
  it('Ga, Ma and ka (with or without BP), c., and a ± margin in the same unit', () => {
    expect(parseYear('66 Ma', BP)).toBe(ago(66_000_000));
    expect(parseYear('4.567 Ga', BP)).toBe(ago(4_567_000_000));
    expect(parseYear('11.7 ka BP', BP)).toBe(ago(11_700));
    expect(parseYear('11.7 ka', BP)).toBe(ago(11_700));
    expect(parseFullDate('c. 2.6 Ma', BP)).toEqual({ year: ago(2_600_000), circa: true });
    expect(parseFullDate('251.902 ± 0.024 Ma', BP)).toEqual({ year: ago(251_902_000), circa: false, margin: 24_000 });
    expect(parseFullDate('251.902 +/- 0.024 Ma', BP)?.margin).toBe(24_000);
  });

  it('the editors\' exact text reads back as the same year, whatever its digits', () => {
    for (const y of [ago(4_567_891_234), ago(251_902_137), ago(66_000_000), ago(11_701), ago(9_600), 1950, 2001, ago(1)]) {
      const text = formatEditDate(y, undefined, undefined, BP, true);
      expect(parseFullDate(text, BP), text).toEqual({ year: y, circa: true });
    }
    expect(formatEditDate(ago(251_902_137), undefined, undefined, BP)).toBe('251.902137 Ma');
    expect(formatEditDate(ago(9_600), undefined, undefined, BP)).toBe('9,600 years BP');
    expect(parseYear('4.5678912345 Ga', BP)).toBe(ago(4_567_891_235)); // digits past a year are rounded
  });

  it('only on a before-present calendar; stored years still read there', () => {
    expect(parseYear('66 Ma', BCE)).toBeNull();
    expect(parseYear('-500', BP)).toBe(-500);
  });

  it('source files: a claim year with ± sets its margin; a ± on start is a problem', () => {
    const src = {
      schemaVersion: 9,
      meta: { id: 'dt', title: 'Deep', calendar: BP, increments: [1_000_000], defaultIncrement: 1_000_000 },
      sources: { ics: { name: 'ICS chart' } },
      tracks: [{ id: 'earth', name: 'Earth', color: '#336699' }],
      events: [
        {
          uuid: 'pt',
          title: 'End-Permian extinction',
          start: '251.902 Ma',
          tracks: ['earth'],
          sources: [{ sourceKey: 'ics' }],
          startDates: [{ year: '251.902 ± 0.024 Ma', source: { sourceKey: 'ics' } }],
        },
        { uuid: 'bad', title: 'Bad', start: '66 ± 1 Ma', tracks: ['earth'], sources: [{ sourceKey: 'ics' }] },
      ],
    };
    const { dataset, errors } = compileSource(src as never);
    const ev = (dataset as unknown as Dataset).events[0];
    expect(ev.start).toBe(ago(251_902_000));
    expect(ev.startDates?.[0]).toMatchObject({ year: ago(251_902_000), margin: 24_000 });
    expect(errors.join('\n')).toMatch(/event bad start: a ± belongs in a date claim|bad.*± belongs in a date claim/);
  });
});

describe('proportional circa', () => {
  const ds = (cal: Calendar, circaFade?: number) => ({ meta: { calendar: cal, ...(circaFade !== undefined ? { circaFade } : {}) } }) as unknown as Dataset;
  it('fades by circaShare of the age; floor meta.circaFade; never past the present', () => {
    expect(circaFadeAt(ds(BP), ago(66_000_000))).toBeCloseTo(660_000);
    expect(circaFadeAt(ds(BP), ago(11_700))).toBeCloseTo(117);
    expect(circaFadeAt(ds(BP, 50), ago(1_000))).toBe(50);
    const half = { ...BP, beforePresent: { present: 1950, circaShare: 0.5 } };
    expect(ago(1000) + circaFadeAt(ds(half), ago(1000))).toBeLessThanOrEqual(1950);
  });
  it('without circaShare, meta.circaFade years as before', () => {
    expect(circaFadeAt(ds(BCE, 5), -1000)).toBe(5);
    expect(circaFadeAt(ds(AGO0, 5), -66_000_000)).toBe(5);
  });
});
