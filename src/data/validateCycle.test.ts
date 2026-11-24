import { describe, expect, it } from 'vitest';
import { validateDataset } from './validate.ts';
import { everyField } from './fixtures/everyField.ts';
import type { Track } from '../types.ts';

// Draft v11: Track.cycle, a period plus a start point (docs/data-format.md, "Cycles").
const base = everyField.tracks.find((t) => t.id === 'great-tide')!.cycle!;
const withCycle = (cycle: unknown) => ({
  ...everyField,
  tracks: everyField.tracks.map((t) => (t.id === 'great-tide' ? ({ ...t, cycle } as Track) : t)),
});

describe('Track.cycle (draft v11)', () => {
  it('accepts a period and an anchor with sources, and the optional fields', () => {
    expect(validateDataset(withCycle(base))).toEqual([]);
    expect(validateDataset(withCycle({ period: 11.1, anchor: 1755, sources: base.sources }))).toEqual([]);
  });

  it('a file without cycles is still valid (additive)', () => {
    expect(validateDataset({ ...everyField, tracks: everyField.tracks.filter((t) => !t.cycle) })).toEqual([]);
  });

  it('refuses a missing or non-positive period', () => {
    for (const period of [0, -5, '11', undefined, Infinity])
      expect(validateDataset(withCycle({ ...base, period }))).toContain('Track "great-tide" cycle: period must be a number of years above 0.');
  });

  it('refuses an anchor that is not a whole year', () => {
    expect(validateDataset(withCycle({ ...base, anchor: 10.5, anchorDates: undefined }))).toContain('Track "great-tide" cycle: anchor must be a whole (stored) year.');
  });

  it('needs at least one known source', () => {
    expect(validateDataset(withCycle({ ...base, sources: [] }))).toContain('Track "great-tide" cycle cites no source.');
    expect(validateDataset(withCycle({ ...base, sources: [{ sourceKey: 'nope', sourceLocation: '' }] }))).toContain(
      'Track "great-tide" cycle cites unknown source "nope".',
    );
  });

  it('checks period claims: a range must hold its figure', () => {
    expect(validateDataset(withCycle({ ...base, periodClaims: [{ years: 19, min: 20, max: 25 }] }))).toContain(
      "Track \"great-tide\" cycle: a period claim's range (20–25) must hold its years (19).",
    );
    expect(validateDataset(withCycle({ ...base, periodClaims: [{ years: 0 }] }))).toContain('Track "great-tide" cycle: a period claim needs years above 0.');
  });

  it('checks the anchor against its date claims', () => {
    const errors = validateDataset(withCycle({ ...base, anchor: 500 }));
    expect(errors.some((e) => e.startsWith('Track "great-tide" cycle anchor: the best estimate (500) lies outside its claims'))).toBe(true);
  });

  it('refuses a cycle that is not an object', () => {
    expect(validateDataset(withCycle('every 19 years'))).toContain('Track "great-tide" cycle must be an object with a period, an anchor and sources.');
  });
});
