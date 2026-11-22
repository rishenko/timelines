// Laying out the chart must stay linear in the timeline's size: it runs on every zoom, filter and fold. On a timeline
// three times the size of Modern States (about 1,800 rows and 4,400 events) a layout takes a few milliseconds on a
// laptop; the budget is far above that, for slow CI machines, and below the 300–400 ms it took when every lane
// scanned every event (lanes × events).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSelection, resolveEvents } from '../lib/chronology.ts';
import { presentYear } from '../lib/years.ts';
import { bigDataset } from '../test/bigDataset.ts';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes } from './layout.ts';
import { buildScale } from './scale.ts';

const BUDGET_MS = 150;
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
