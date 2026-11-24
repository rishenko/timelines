// Validation must stay linear in the timeline's size: it runs on every load, on files of any size. The test validates
// a timeline three times the size of Modern States (1,833 rows and 20,484 events on 2026-11-24 data).
// Measured 2026-11-24: about 60 ms on a laptop (fastest of 7); on the CI runners 100–385 ms per validation (the
// average of 3, from 103 runs over three hours, Node 22 and 24: median 226 on Node 22, 172 on Node 24). It grew from
// about 110 ms the night before as Modern States went from 1,511 to 6,828 events (validate.ts unchanged), so the
// budget scales with the event count: 25 µs per event (512 ms today), about 1.3× the slowest CI run. When every
// track's chronology rebuilt the track index (tracks × tracks) it took 1–2 s at the same row count.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bigDataset } from '../test/bigDataset.ts';
import type { Dataset } from '../types.ts';
import { validateDataset } from './validate.ts';

/** Per event: the budget grows with the data, which a linear validation does too. */
const BUDGET_US_PER_EVENT = 25;
const modern = JSON.parse(readFileSync(new URL('../../public/timelines/modern-states.json', import.meta.url), 'utf8')) as Dataset;

/** The fastest of a few runs, so one slow moment on a busy machine doesn't fail the test. */
const fastest = (f: () => unknown, runs = 5) =>
  Math.min(
    ...Array.from({ length: runs }, () => {
      const t = performance.now();
      f();
      return performance.now() - t;
    }),
  );

describe('validation on a large timeline', () => {
  const big = bigDataset(modern, 3);
  const budget = Math.round((BUDGET_US_PER_EVENT * big.events.length) / 1000);

  it('is a valid timeline (the copy keeps every reference intact)', () => {
    expect(big.tracks.length).toBe(modern.tracks.length * 3);
    expect(validateDataset(big)).toEqual([]);
  });

  it(`takes under ${BUDGET_US_PER_EVENT} µs per event`, () => {
    expect(fastest(() => validateDataset(big)), `budget ${budget} ms for ${big.events.length} events`).toBeLessThan(budget);
  });
});
