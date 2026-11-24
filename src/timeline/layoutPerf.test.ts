// Laying out the chart must stay linear in the timeline's size: it runs on every zoom, filter and fold. The bug this
// guards against was every lane scanning every event (lanes × events; fixed in 629a10e). Measured 2026-11-24 on a
// laptop (fastest of 7), Modern States copied 1, 2, 3 and 6 times (617 to 3,702 rows, 6,867 to 41,202 events):
//   now:            15, 29, 48, 105 ms: about 2.4 µs per event, linear
//   lanes × events: 180, 733, 2,275, 13,077 ms: about 12.7× the time for 3× the data
// CI runners took about 3.3× the laptop's time (102–165 ms per layout when the laptop took 50 ms). Two checks:
// 1. a budget per event (20 µs: about 410 ms at 3×, 2.5× the slowest CI run), which grows with the data as a linear
//    layout does, so data growth alone doesn't fail it;
// 2. a ratio that no machine speed changes: 3× the data must take under 7× the time (linear: about 3.2–3.9× under load; the old
//    bug: about 12.7×), so a quadratic layout fails however large the data grows or however fast the runner is.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSelection, resolveEvents } from '../lib/chronology.ts';
import { presentYear } from '../lib/years.ts';
import { bigDataset } from '../test/bigDataset.ts';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes } from './layout.ts';
import { buildScale } from './scale.ts';

/** Per event, at three times Modern States. */
const BUDGET_US_PER_EVENT = 20;
/** Time at 3× the data over time at 1×: linear is about 3; lanes × events is about 9 or more. */
const MAX_RATIO = 7;
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

/** A layout of Modern States copied `copies` times, ready to run. */
function setup(copies: number) {
  const big = bigDataset(modern, copies);
  const present = big.present ?? presentYear(big.events);
  const events = resolveEvents(big, defaultSelection(big));
  const scale = buildScale(anchorsFor(events, present), { increment: 10 });
  const lanes = buildLanes(big.tracks, {}, {});
  return { big, events, run: () => layoutLanes(lanes, events, scale, present) };
}

describe('layout on a large timeline', () => {
  const one = setup(1);
  const three = setup(3);
  const budget = Math.round((BUDGET_US_PER_EVENT * three.events.length) / 1000);

  it('places every row', () => {
    expect(three.run().lanes).toHaveLength(three.big.tracks.length);
  });

  it(`takes under ${BUDGET_US_PER_EVENT} µs per event`, () => {
    expect(fastest(three.run), `budget ${budget} ms for ${three.events.length} events`).toBeLessThan(budget);
  });

  it(`takes under ${MAX_RATIO}× the time for 3× the data (linear, not lanes × events)`, () => {
    one.run(); // warm up both before timing
    three.run();
    const t1 = fastest(one.run);
    const t3 = fastest(three.run);
    expect(t3 / t1, `${t3.toFixed(1)} ms at 3×, ${t1.toFixed(1)} ms at 1×`).toBeLessThan(MAX_RATIO);
  });
});
