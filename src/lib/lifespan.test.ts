import { describe, expect, it } from 'vitest';
import type { Dataset, Track } from '../types.ts';
import { defaultSelection, resolveSpan, type ResolvedSpan } from './chronology.ts';
import { mergeStretches, rawLifespan, resolveLifespan, spanDates, spanStretches, stretchHull } from './lifespan.ts';
import { validateDataset } from '../data/validate.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { spanInWords } from './table.ts';
import { removeSource, upsertSource } from '../state/edits.ts';

const part = (start: number, end: number, o: Partial<ResolvedSpan> = {}): ResolvedSpan => ({ start, end, ...o });

describe('mergeStretches (a lifespan worked out from phases)', () => {
  it('leaves a gap between phases blank', () => {
    expect(mergeStretches([part(1569, 1795), part(1807, 1815), part(1815, 1915), part(1918, 1939)])).toEqual([
      { start: 1569, end: 1795, derived: true },
      { start: 1807, end: 1915, derived: true },
      { start: 1918, end: 1939, derived: true },
    ]);
  });

  it('merges phases that overlap, touch, or are a year apart, in any order', () => {
    expect(mergeStretches([part(1850, 1866), part(1848, 1849), part(1815, 1848), part(1939, 1990), part(1947, 1989)])).toEqual([
      { start: 1815, end: 1866, derived: true },
      { start: 1939, end: 1990, derived: true },
    ]);
    // two years apart is a gap
    expect(mergeStretches([part(0, 10), part(12, 20)])).toHaveLength(2);
  });

  it('counts uncertainty ranges: a start that may be earlier closes a gap, and the ranges carry over', () => {
    const merged = mergeStretches([part(962, 1813), part(1815, 1848, { startWindow: [1813, 1815] })]);
    expect(merged).toEqual([{ start: 962, end: 1848, derived: true }]);
    const edges = mergeStretches([part(-1749, -1399, { circa: true, startWindow: [-1760, -1749] }), part(-1419, -1069, { endWindow: [-1069, -1039] })]);
    expect(edges).toEqual([{ start: -1749, end: -1069, startWindow: [-1760, -1749], endWindow: [-1069, -1039], circa: true, derived: true }]);
  });

  it('is ongoing when its latest phase is', () => {
    expect(mergeStretches([part(1958, 2026, { ongoing: true }), part(1946, 1958)])).toEqual([{ start: 1946, end: 2026, ongoing: true, derived: true }]);
  });
});

describe('resolveLifespan', () => {
  const ds = (tracks: Track[], present = 2026): Dataset => ({ ...plainTimeline(), present, tracks, chronologies: {} });

  it('works the lifespan out from the phases when none is typed', () => {
    const t: Track = { id: 'p', name: 'P', color: '#000', phases: [{ name: 'A', start: 0, end: 10 }, { name: 'B', start: 20, ongoing: true }] };
    const d = ds([t]);
    expect(resolveLifespan(d, t, defaultSelection(d))).toEqual([
      { start: 0, end: 10, derived: true },
      { start: 20, end: 2026, ongoing: true, derived: true },
    ]);
  });

  it('uses a typed lifespan as it is: one stretch through the gap, or several in date order', () => {
    const phases = [{ name: 'A', start: 0, end: 10 }, { name: 'B', start: 50, end: 60 }];
    const one: Track = { id: 'b', name: 'B', color: '#000', span: { start: 0, end: 60 }, phases };
    const many: Track = { id: 'm', name: 'M', color: '#000', span: [{ start: 40, ongoing: true }, { start: -5, end: 12 }], phases };
    const d = ds([one, many]);
    expect(resolveLifespan(d, one, {}).map((s) => [s.start, s.end])).toEqual([[0, 60]]);
    expect(resolveLifespan(d, many, {}).map((s) => [s.start, s.end, !!s.ongoing])).toEqual([[-5, 12, false], [40, 2026, true]]);
    expect(resolveLifespan(d, { id: 'x', name: 'X', color: '#000' }, {})).toEqual([]);
  });

  it('helpers: stretches, raw extent, hull and words', () => {
    expect(spanStretches(undefined)).toEqual([]);
    expect(spanStretches({ start: 1, end: 2 })).toEqual([{ start: 1, end: 2 }]);
    const t: Track = { id: 'p', name: 'P', color: '#000', phases: [{ name: 'A', start: 5, end: 10 }, { name: 'B', start: 20, ongoing: true }] };
    expect(rawLifespan(t, 100)).toEqual({ start: 5, end: 100 });
    expect(rawLifespan({ ...t, span: [{ start: 0, end: 12 }, { start: 15, end: 30 }] }, 100)).toEqual({ start: 0, end: 30 });
    expect(stretchHull([part(5, 9), part(1, 3)])).toEqual({ start: 1, end: 9 });
    const cal = { before: 'BCE', after: 'CE', yearZero: false };
    expect(spanDates({ start: 1991, end: 2026, ongoing: true }, cal, false)).toBe('1991 CE – ongoing');
    expect(spanDates({ start: 1918, end: 1940 }, cal, false)).toBe('1918 CE – 1940 CE');
  });
});

describe('validating lifespans and ongoing', () => {
  const base = () => {
    const d = plainTimeline();
    d.present = 300;
    return { d, quay: d.tracks.find((t) => t.id === 'quay')! };
  };

  it('accepts a single object, a list of stretches, and ongoing spans and phases', () => {
    const { d, quay } = base();
    quay.span = [{ start: -40, end: 179 }, { start: 180, ongoing: true }];
    quay.phases![2] = { name: 'Third Council', start: 180, ongoing: true };
    expect(validateDataset(d)).toEqual([]);
    quay.span = { start: -50, ongoing: true, startDates: [{ year: -50, source: { sourceKey: 'ledger', sourceLocation: 'p. 1' } }] };
    expect(validateDataset(d)).toEqual([]);
  });

  it('refuses a typed lifespan that leaves out a phase, naming the row and phase', () => {
    const { d, quay } = base();
    quay.span = { start: 0, end: 200 };
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/Track "quay" lifespan doesn't contain its phase "First Council" \(40 BL – 59 L\)/);
    expect(errs).toMatch(/phase "Third Council"/);
    // a phase in a stretch's gap
    quay.span = [{ start: -40, end: 59 }, { start: 180, end: 260 }];
    expect(validateDataset(d).join('\n')).toMatch(/doesn't contain its phase "Second Council"/);
    // an ongoing phase needs an ongoing lifespan (or one reaching the present)
    quay.span = { start: -40, end: 260 };
    quay.phases![2] = { name: 'Third Council', start: 180, ongoing: true };
    expect(validateDataset(d).join('\n')).toMatch(/doesn't contain its phase "Third Council" \(180 L – ongoing\)/);
  });

  it('checks stretches: order, overlaps, end or ongoing', () => {
    const { d, quay } = base();
    quay.phases = undefined;
    quay.span = [{ start: 50, end: 60 }, { start: 0, end: 50 }];
    expect(validateDataset(d).join('\n')).toMatch(/lifespan stretch 2 starts \(0 L\) before stretch 1 ends \(60 L\)/);
    quay.span = [{ start: 0, ongoing: true }, { start: 50, end: 60 }];
    expect(validateDataset(d).join('\n')).toMatch(/stretch 1 is ongoing, so it must be the last/);
    quay.span = [];
    expect(validateDataset(d).join('\n')).toMatch(/lifespan is an empty list/);
    quay.span = { start: 0, end: 10, ongoing: true };
    expect(validateDataset(d).join('\n')).toMatch(/lifespan has both an end and ongoing/);
    quay.span = { start: 0 };
    expect(validateDataset(d).join('\n')).toMatch(/lifespan needs an integer end \(or ongoing: true\)/);
    quay.span = { start: 0, ongoing: true, endDates: [{ year: 5 }] };
    expect(validateDataset(d).join('\n')).toMatch(/lifespan is ongoing, so it can't have end date claims/);
  });
});

describe('citing that a lifespan or phase is still going (ongoingSources)', () => {
  const ledger = { sourceKey: 'ledger', sourceLocation: 'p. 40' };
  const logbook = { sourceKey: 'logbook', sourceLocation: '' };
  const base = () => {
    const d = plainTimeline();
    d.present = 300;
    const quay = d.tracks.find((t) => t.id === 'quay')!;
    quay.phases![2] = { name: 'Third Council', start: 180, ongoing: true, ongoingSources: [ledger] };
    return { d, quay };
  };

  it('accepts sources on an ongoing phase or stretch', () => {
    const { d, quay } = base();
    expect(validateDataset(d)).toEqual([]);
    quay.span = { start: -40, ongoing: true, ongoingSources: [ledger, logbook] };
    expect(validateDataset(d)).toEqual([]);
  });

  it('refuses them on a phase that ends, as a non-list, with an unknown source or no location', () => {
    const { d, quay } = base();
    quay.phases![1] = { name: 'Second Council', start: 60, end: 179, ongoingSources: [ledger] };
    expect(validateDataset(d).join('\n')).toMatch(/phase "Second Council" has ongoingSources but isn't ongoing/);
    quay.phases![1] = { name: 'Second Council', start: 60, end: 179 };
    quay.phases![2].ongoingSources = { sourceKey: 'ledger' } as never;
    expect(validateDataset(d).join('\n')).toMatch(/ongoingSources must be a list/);
    quay.phases![2].ongoingSources = [{ sourceKey: 'annals', sourceLocation: '' }];
    expect(validateDataset(d).join('\n')).toMatch(/ongoingSources cites unknown source "annals"/);
    quay.phases![2].ongoingSources = [{ sourceKey: 'ledger' } as never];
    expect(validateDataset(d).join('\n')).toMatch(/needs a sourceLocation/);
  });

  it('carries them to the resolved span and to a lifespan worked out from phases', () => {
    const { d, quay } = base();
    expect(resolveSpan(d, 'quay', quay.phases![2], {}).ongoingSources).toEqual([ledger]);
    expect(resolveLifespan(d, quay, {})).toEqual([{ start: -40, end: 300, ongoing: true, derived: true, ongoingSources: [ledger] }]);
    // only the stretch that ends latest (the ongoing one) keeps them
    expect(mergeStretches([part(0, 300, { ongoing: true, ongoingSources: [ledger] }), part(0, 10)])[0].ongoingSources).toEqual([ledger]);
    expect(mergeStretches([part(0, 10), part(20, 300, { ongoing: true, ongoingSources: [ledger] })])[0].ongoingSources).toBeUndefined();
  });

  it('says them in words, as the table view shows them', () => {
    const { d, quay } = base();
    const w = spanInWords(resolveSpan(d, 'quay', quay.phases![2], {}), d.meta.calendar, d.sources);
    expect(w.main).toBe('180 L – ongoing');
    expect(w.ranges).toEqual(['still going per The Harbor Ledger (p. 40)']);
    const both = spanInWords({ start: 0, end: 300, ongoing: true, ongoingSources: [ledger, logbook] }, d.meta.calendar, d.sources);
    expect(both.ranges).toEqual(["still going per The Harbor Ledger (p. 40) and A Pilot's Logbook"]);
  });

  it('follows a renamed source and drops a removed one', () => {
    const { d } = base();
    const renamed = upsertSource(d, 'harbor-ledger', d.sources.ledger, 'ledger');
    expect(validateDataset(renamed)).toEqual([]);
    expect(renamed.tracks[0].phases![2].ongoingSources).toEqual([{ sourceKey: 'harbor-ledger', sourceLocation: 'p. 40' }]);
    const removed = removeSource(d, 'ledger');
    expect(removed.tracks[0].phases![2].ongoingSources).toBeUndefined();
    expect(validateDataset(removed).filter((e) => /ongoing/.test(e))).toEqual([]);
  });
});

describe('stretches of phases given in months and days', () => {
  const part = (o: Partial<ResolvedSpan>): ResolvedSpan => ({ start: 0, end: 0, ...o });
  it('joins year-only phases a year apart, as always', () => {
    expect(mergeStretches([part({ start: 1900, end: 1922 }), part({ start: 1923, end: 1930 })])).toHaveLength(1);
    expect(mergeStretches([part({ start: 1900, end: 1922 }), part({ start: 1924, end: 1930 })])).toHaveLength(2);
  });
  it('keeps a gap of weeks within one year when the dates give days', () => {
    const a = part({ start: 398, startMonth: 1, startDay: 1, end: 398, endMonth: 7, endDay: 4 });
    expect(mergeStretches([a, part({ start: 398, startMonth: 8, startDay: 18, end: 398, endMonth: 12, endDay: 2 })])).toHaveLength(2);
    // the next day continues it
    expect(mergeStretches([a, part({ start: 398, startMonth: 7, startDay: 5, end: 399 })])).toHaveLength(1);
  });
  it('joins months that follow each other, and not across an empty month', () => {
    const a = part({ start: 1918, startMonth: 2, end: 1918, endMonth: 3 });
    expect(mergeStretches([a, part({ start: 1918, startMonth: 4, end: 1918, endMonth: 6 })])).toHaveLength(1);
    expect(mergeStretches([a, part({ start: 1918, startMonth: 5, end: 1918, endMonth: 6 })])).toHaveLength(2);
  });
});
