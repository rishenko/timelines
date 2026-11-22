import { describe, expect, it } from 'vitest';
import { MAX_CHART_PX, tooWideSteps } from './width.ts';
import { SUB_YEAR } from '../lib/subYear.ts';
import { BCE_CE } from '../lib/calendar.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';

const ev = (start: number, end?: number): ResolvedEvent => ({ uuid: `e${start}`, title: 'E', descr: '', start, end, tracks: ['t'], sources: [] });
const steps = [SUB_YEAR.day, SUB_YEAR.week, SUB_YEAR.month, 1, 10];

describe('zoom steps too wide to draw', () => {
  it('disables day zoom over centuries of event bars, keeps the coarser steps', () => {
    // a 500-year bar kept whole at day zoom: 500 × 365 days × 80 px is far past the limit
    const wide = tooWideSteps(steps, [ev(1000, 1500)], 1500, [], { compress: true, calendar: BCE_CE });
    expect(wide.has(SUB_YEAR.day)).toBe(true);
    expect(wide.has(SUB_YEAR.month)).toBe(false);
    expect(wide.has(1)).toBe(false);
    expect(MAX_CHART_PX).toBe(10_000_000);
  });
  it('allows every step for a few years of dated events', () => {
    expect(tooWideSteps(steps, [ev(1914, 1918), ev(1939, 1945)], 1945, [], { compress: true, calendar: BCE_CE }).size).toBe(0);
  });
});
