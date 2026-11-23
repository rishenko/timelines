import { describe, expect, it } from 'vitest';
import { agesInView, ageLines, groupLabel, placeAges, splitAges } from './eras.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { ContextSpan, Dataset } from '../types.ts';

const cite = [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }];
type Age = ContextSpan & { row?: string };
/** A timeline with these ages: on the timeline, or (`row`) on that row, which is added when the timeline lacks it. */
const withEras = (eras: Age[]): Dataset => {
  const d = plainTimeline();
  for (const { row, ...span } of eras) {
    if (!row) d.meta.context = [...(d.meta.context ?? []), span];
    else {
      let t = d.tracks.find((x) => x.id === row);
      if (!t) d.tracks.push((t = { id: row, name: row, color: '#888888' }));
      t.context = [...(t.context ?? []), span];
    }
  }
  return d;
};
const era = (id: string, start: number, end: number, line?: string, more: Partial<Age> = {}): Age => ({
  id,
  kind: 'age',
  name: id,
  start,
  end,
  sources: cite,
  ...(line ? { line } : {}),
  ...more,
});

describe('ages (context spans of kind age)', () => {
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

  it('places a row’s ages on its band, with lines numbered per row; the strip keeps the timeline’s', () => {
    const ages = placeAges(
      withEras([
        era('world', 0, 90, 'world'),
        era('nile-1', 0, 40, 'nile', { row: 'africa' }),
        era('nile-2', 40, 90, 'nile', { row: 'africa' }),
        era('aegean', 0, 60, 'aegean', { row: 'europe' }),
        era('alps', 0, 60, 'alps', { row: 'europe' }),
      ]),
      {},
    );
    const { strip, bands } = splitAges(ages);
    expect(strip.map((a) => [a.era.id, a.line])).toEqual([['world', 0]]);
    expect(bands.get('africa')!.map((a) => [a.era.id, a.line])).toEqual([
      ['nile-1', 0],
      ['nile-2', 0],
    ]);
    expect(bands.get('europe')!.map((a) => [a.era.id, a.line])).toEqual([
      ['aegean', 0],
      ['alps', 1],
    ]);
    // the shared boundary year is handled within each row's line
    expect(bands.get('africa')![0].drawEnd).toBe(40);
  });

  it('closes up each row’s band separately when lines leave the years in view', () => {
    const ages = placeAges(withEras([era('a', 0, 10, 'one', { row: 'r' }), era('b', 50, 60, 'two', { row: 'r' }), era('w', 0, 10)]), {});
    const shown = agesInView(ages, { y0: 45, y1: 70 });
    expect(shown.map((a) => [a.era.id, a.band, a.line])).toEqual([['b', 'r', 0]]);
  });

  it('names the lines of a band with two or more (from the line id), and leaves one-line bands and the strip unnamed', () => {
    const ages = placeAges(
      withEras([
        era('w', 0, 90, 'world'),
        era('nile', 0, 40, 'ages-nile-valley', { row: 'africa' }),
        era('aegean', 0, 60, 'ages-aegean', { row: 'europe' }),
        era('alps', 0, 60, 'ages-central-europe', { row: 'europe' }),
      ]),
      {},
    );
    expect(ages.map((a) => [a.era.id, a.lineName])).toEqual([
      ['w', undefined],
      ['nile', undefined],
      ['aegean', 'Aegean'],
      ['alps', 'Central Europe'],
    ]);
    expect(groupLabel(undefined)).toBeUndefined();
  });

  it('takes a line’s name from meta.lines when it has one', () => {
    const d = withEras([era('aegean', 0, 60, 'ages-aegean', { row: 'europe' }), era('alps', 0, 60, 'ages-central-europe', { row: 'europe' })]);
    d.meta.lines = { 'ages-aegean': { name: 'Aegean and Mediterranean' } };
    expect(placeAges(d, {}).map((a) => a.lineName)).toEqual(['Aegean and Mediterranean', 'Central Europe']);
  });

  it('names a one-line band’s line when meta.lines names it, and not otherwise', () => {
    const d = withEras([era('old', 0, 40, 'ages-nile-valley', { row: 'africa' }), era('han', 0, 40, 'ages-china', { row: 'east-asia' })]);
    d.meta.lines = { 'ages-nile-valley': { name: 'Nile Valley' } };
    expect(placeAges(d, {}).map((a) => [a.era.id, a.lineName])).toEqual([
      ['old', 'Nile Valley'],
      ['han', undefined],
    ]);
  });
});
