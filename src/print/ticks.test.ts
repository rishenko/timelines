import { describe, expect, it } from 'vitest';
import { printTicks, tickStep } from './ticks.ts';
import { formatYear } from '../lib/calendar.ts';
import type { Calendar } from '../types.ts';

const bce: Calendar = { before: 'BCE', after: 'CE', yearZero: false };
const withZero: Calendar = { before: 'BL', after: 'L', yearZero: true };

describe('print ruler', () => {
  it('a calendar with a year 0 ticks at 0 and on round years', () => {
    const t = printTicks(-150, 150, withZero);
    expect(t).toContain(0);
    expect(t).toContain(100);
    expect(t.map((y) => formatYear(y, withZero))).toContain('100 L');
  });

  it('BCE/CE ticks fall on round displayed years, 1 CE marking the era', () => {
    const shown = printTicks(-1499, 501, bce).map((y) => formatYear(y, bce));
    expect(shown).toContain('1500 BCE');
    expect(shown).toContain('500 CE');
  });

  it('a span of billions of years gets at most 12 ticks', () => {
    expect(tickStep(4.5e9)).toBe(5e8);
    expect(printTicks(-4.5e9, 0, bce).length).toBeLessThanOrEqual(12);
  });

  it('a span that is not a number of years gives step 1, never an endless search', () => {
    expect(tickStep(NaN)).toBe(1);
    expect(tickStep(Infinity)).toBe(1);
    expect(tickStep(0)).toBe(1);
  });

  it('keeps the familiar steps', () => {
    expect(tickStep(300)).toBe(25);
    expect(tickStep(3000)).toBe(250);
  });
});
