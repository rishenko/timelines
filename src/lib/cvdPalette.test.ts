import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { confusable, CVD_PALETTE, cvdColors, displayOrder, withCvdColors } from './cvdPalette.ts';
import type { Dataset } from '../types.ts';

const TIMELINES = ['ancient-classical', 'medieval', 'modern-states'];
const load = (t: string): Dataset => JSON.parse(readFileSync(`public/timelines/${t}.json`, 'utf8'));

describe('cvdColors', () => {
  for (const t of TIMELINES) {
    it(`${t}: every row gets a palette colour, never shared with the 3 rows above it`, () => {
      const { tracks } = load(t);
      const colors = cvdColors(tracks);
      const order = displayOrder(tracks).map((k) => CVD_PALETTE.indexOf(colors.get(k.id)!));
      expect(order.length).toBe(tracks.length);
      expect(order.every((i) => i >= 0)).toBe(true);
      order.forEach((c, n) => expect(order.slice(Math.max(0, n - 3), n), `row ${n}`).not.toContain(c));
    });

    it(`${t}: few rows look like the row above them to a colour-blind reader`, () => {
      const order = (({ tracks }) => {
        const colors = cvdColors(tracks);
        return displayOrder(tracks).map((k) => CVD_PALETTE.indexOf(colors.get(k.id)!));
      })(load(t));
      const close = order.filter((c, n) => n > 0 && confusable(c, order[n - 1])).length;
      expect(close / order.length).toBeLessThan(0.1);
    });
  }
});

describe('withCvdColors', () => {
  it('returns the same data when off, and recolours a copy when on', () => {
    const data = load('ancient-classical');
    expect(withCvdColors(data, false)).toBe(data);
    const before = data.tracks.map((t) => t.color);
    const on = withCvdColors(data, true);
    expect(on.tracks.every((t) => CVD_PALETTE.includes(t.color))).toBe(true);
    expect(data.tracks.map((t) => t.color)).toEqual(before);
  });
});
