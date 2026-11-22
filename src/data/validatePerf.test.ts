// Validation must stay linear in the timeline's size: it runs on every load, on files of any size. A timeline three
// times the size of Modern States (about 1,800 rows and 4,400 events) validates in a few milliseconds on a laptop; the
// budget is far above that, for slow CI machines, and far below the 1–2 s it took when every track's chronology
// rebuilt the track index (tracks × tracks).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bigDataset } from '../test/bigDataset.ts';
import type { Dataset } from '../types.ts';
import { validateDataset } from './validate.ts';

const BUDGET_MS = 250;
const modern = JSON.parse(readFileSync(new URL('../../public/timelines/modern-states.json', import.meta.url), 'utf8')) as Dataset;

/** The fastest of a few runs, so one slow moment on a busy machine doesn't fail the test. */
const fastest = (f: () => unknown, runs = 3) =>
  Math.min(
    ...Array.from({ length: runs }, () => {
      const t = performance.now();
      f();
      return performance.now() - t;
    }),
  );

describe('validation on a large timeline', () => {
  const big = bigDataset(modern, 3);

  it('is a valid timeline (the copy keeps every reference intact)', () => {
    expect(big.tracks.length).toBe(modern.tracks.length * 3);
    expect(validateDataset(big)).toEqual([]);
  });

  it(`takes under ${BUDGET_MS} ms`, () => {
    expect(fastest(() => validateDataset(big))).toBeLessThan(BUDGET_MS);
  });
});
