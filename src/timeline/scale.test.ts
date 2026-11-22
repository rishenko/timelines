import { describe, expect, it } from 'vitest';
import { buildScale } from './scale.ts';

const INCREMENTS = [1, 10, 50, 100];
import data from '../../public/timelines/ancient-classical.json';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { presentYear } from '../lib/years.ts';

const ds = data as unknown as Dataset;

describe('buildScale', () => {
  it('is linear with no gaps when anchors are close', () => {
    const s = buildScale([0, 10, 20], { increment: 10, tickPx: 100 });
    expect(s.gaps()).toHaveLength(0);
    expect(s.x(10) - s.x(0)).toBeCloseTo(100);
    expect(s.yearAt(s.x(13))).toBeCloseTo(13);
  });

  it('compresses long empty stretches into fixed-width gaps', () => {
    const s = buildScale([0, 1000], { increment: 10, tickPx: 80, gapPx: 50 });
    const gaps = s.gaps();
    expect(gaps).toHaveLength(1);
    expect(gaps[0].x1 - gaps[0].x0).toBe(50);
    // far smaller than the uncompressed 100 ticks * 80px
    expect(s.width).toBeLessThan(1000);
  });

  it('does not compress when compress=false', () => {
    const s = buildScale([0, 1000], { increment: 10, tickPx: 80, compress: false });
    expect(s.gaps()).toHaveLength(0);
    expect(s.x(1000) - s.x(0)).toBeCloseTo(8000);
  });

  it('handles BE (negative) years and the year-0 boundary', () => {
    const s = buildScale([-55, -1, 0, 3], { increment: 1, tickPx: 10 });
    expect(s.x(-1)).toBeLessThan(s.x(0));
    expect(s.ticks()).toContain(0);
    expect(s.ticks().every((t) => Number.isInteger(t))).toBe(true);
  });

  for (const inc of INCREMENTS) {
    it(`builds a monotonic scale over the real dataset at ${inc} yr`, () => {
      const anchors = anchorsFor(ds.events, presentYear(ds.events));
      const s = buildScale(anchors, { increment: inc });
      // strictly increasing x over sampled years, including across gaps
      const [lo, hi] = s.domain;
      let prev = -Infinity;
      for (let y = lo; y <= hi; y += Math.max(1, Math.floor((hi - lo) / 5000))) {
        const x = s.x(y);
        expect(x).toBeGreaterThan(prev);
        prev = x;
      }
      // every tick is a multiple of the increment and lies in a linear segment
      for (const t of s.ticks()) expect(Math.abs(t % inc)).toBe(0);
      expect(s.width).toBeLessThan(200_000);
      // round trip
      for (const a of anchors) expect(s.yearAt(s.x(a))).toBeCloseTo(a, 6);
    });
  }
});

describe('kept stretches below a year (days and months)', () => {
  it('never compresses the inside of a kept stretch, however long', () => {
    const day = 1 / 365.2425;
    const somme: [number, number] = [1916 + 182 / 366, 1916 + 323 / 366];
    const without = buildScale([somme[0], somme[1]], { increment: day });
    const withKeep = buildScale([somme[0], somme[1]], { increment: day, keep: [somme] });
    expect(without.gaps().length).toBe(1);
    expect(withKeep.gaps()).toEqual([]);
    expect(withKeep.x(somme[1]) - withKeep.x(somme[0])).toBeCloseTo((somme[1] - somme[0]) * (80 / day), 6);
  });
});
