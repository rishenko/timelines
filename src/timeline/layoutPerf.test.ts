// Laying out the chart must stay linear in the timeline's size: it runs on every zoom, filter and fold. The test lays
// out a timeline three times the size of Modern States (1,833 rows and about 20,400 events on 2026-11-24 data).
// Measured 2026-11-24: about 50 ms on a laptop (fastest of 7), and 102–165 ms per layout on the CI runners (the
// average of 3, from 22 runs, Node 22 and 24); one runner took 172 ms for its fastest of 3. When every lane scanned
// every event (lanes × events), a layout took 300–400 ms on a laptop, about 1 s on CI. The budget sits between the
// two: about 1.8× the slowest CI run, and a third of the quadratic case. Re-measure it when the data grows a lot.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSelection, resolveEvents } from '../lib/chronology.ts';
import { presentYear } from '../lib/years.ts';
import { bigDataset } from '../test/bigDataset.ts';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes } from './layout.ts';
import { buildScale } from './scale.ts';

const BUDGET_MS = 300;
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

describe('layout on a large timeline', () => {
  const big = bigDataset(modern, 3);
  const present = big.present ?? presentYear(big.events);
  const events = resolveEvents(big, defaultSelection(big));
  const scale = buildScale(anchorsFor(events, present), { increment: 10 });
  const lanes = buildLanes(big.tracks, {}, {});

  it('places every row', () => {
    expect(layoutLanes(lanes, events, scale, present).lanes).toHaveLength(big.tracks.length);
  });

  it(`takes under ${BUDGET_MS} ms per layout`, () => {
    expect(fastest(() => layoutLanes(lanes, events, scale, present))).toBeLessThan(BUDGET_MS);
  });
});
