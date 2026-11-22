import { describe, expect, it } from 'vitest';
import { agesInView, ageLines, placeAges } from './eras.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, Era } from '../types.ts';

const cite = [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }];
const withEras = (eras: Era[]): Dataset => {
  const d = plainTimeline();
  d.meta.eras = eras;
  return d;
};
const era = (id: string, start: number, end: number, group?: string, more: Partial<Era> = {}): Era => ({
  id,
  name: id,
  start,
  end,
  sources: cite,
  ...(group ? { group } : {}),
  ...more,
});

describe('ages (meta.eras)', () => {
  it('gives each group one line, in the order groups first appear; ages in a group share it', () => {
    const ages = placeAges(withEras([era('salt', 0, 50, 'trade'), era('storm', 10, 30, 'weather'), era('silver', 51, 90, 'trade'), era('calm', 0, 5)]), {});
    expect(ages.map((a) => [a.era.id, a.line])).toEqual([
      ['salt', 0],
      ['storm', 1],
      ['silver', 0],
      ['calm', 2],
    ]);
    expect(ageLines(ages)).toBe(3);
  });

  it('draws an age that shares its end year with the next on its line to that one’s start, and no other', () => {
    const ages = placeAges(withEras([era('old', 0, 50, 'nile'), era('middle', 50, 90, 'nile'), era('gap', 92, 99, 'nile'), era('other', 90, 95, 'trade')]), {});
    expect(ages.map((a) => [a.era.id, a.drawEnd])).toEqual([
      ['old', 50],
      ['middle', undefined],
      ['gap', undefined],
      ['other', undefined],
    ]);
  });

  it('dates each age under the reader’s Dating choice, with its uncertain ends', () => {
    const [a] = placeAges(withEras([era('salt', 0, 50, undefined, { startDates: [{ year: -10, source: cite[0] }, { year: 5, source: cite[0] }] })]), {});
    expect(a.span.start).toBe(0);
    expect(a.span.startWindow).toEqual([-10, 5]);
  });

  it('leaves out the lines with no age in the years in view, and closes up the rest', () => {
    const ages = placeAges(withEras([era('salt', 0, 50, 'trade'), era('storm', 100, 130, 'weather'), era('silver', 200, 260, 'mines')]), {});
    const shown = agesInView(ages, { y0: 190, y1: 300 });
    expect(shown.map((a) => [a.era.id, a.line])).toEqual([['silver', 0]]);
    expect(agesInView(ages, null)).toBe(ages);
  });
});
