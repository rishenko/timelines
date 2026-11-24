/**
 * Cycle rows (Track.cycle, draft schema v11): a period plus a start point. The file never lists the repeats; this
 * works out which ones fall in the years in view and where to draw them.
 *
 * Only what is in view is drawn, and never more than CYCLE_MAX_TICKS ticks. When repeats would sit closer than
 * CYCLE_MIN_TICK_PX apart (the 11-year solar cycle at a deep-time zoom: millions of them), the row draws one density
 * band instead, saying how many repeats it stands for.
 */
import type { TrackCycle } from '../types.ts';
import type { Scale } from '../timeline/scale.ts';

/**
 * Most ticks drawn in one row at a time. The drawn stretch is the viewport and a screen either side, so on a wide
 * screen (3 × 2,560 px) ticks CYCLE_MIN_TICK_PX apart still fit.
 */
export const CYCLE_MAX_TICKS = 1300;
/** Closest two ticks may sit, px; closer than this and the row draws a density band. */
export const CYCLE_MIN_TICK_PX = 6;

export interface CycleTick {
  /** Which repeat: n in anchor + n × period (0 is the one starting at the anchor). */
  n: number;
  /** The year it starts (stored years). */
  year: number;
  /** Content px. */
  x: number;
}

export type CycleDrawing =
  | { kind: 'ticks'; ticks: CycleTick[] }
  /** Too dense to draw: one band from x0 to x1 (content px) standing for `count` repeats. */
  | { kind: 'density'; x0: number; x1: number; count: number };

/** The repeat n of a cycle: the year it starts. */
export const cycleYear = (c: TrackCycle, n: number) => c.anchor + n * c.period;

/**
 * What to draw of a cycle between content px `x0` and `x1` (the part of the chart in view, or near it). Ticks fall
 * on linear stretches of the scale only (a repeat inside a shortened gap isn't drawn). Null when no repeat starts in
 * view (the galactic year, zoomed in to a few million years).
 */
export function cycleDrawing(c: TrackCycle, scale: Scale, x0: number, x1: number): CycleDrawing | null {
  const lo = Math.max(0, Math.min(x0, x1));
  const hi = Math.min(scale.width, Math.max(x0, x1));
  if (!(c.period > 0) || hi <= lo) return null;
  const y0 = scale.yearAt(lo);
  const y1 = scale.yearAt(hi);
  const first = Math.ceil((y0 - c.anchor) / c.period);
  const last = Math.floor((y1 - c.anchor) / c.period);
  const count = last - first + 1;
  if (count <= 0) return null;
  // spacing on the linear stretches: px per year there, times the period
  const pxPerPeriod = (scale.tickPx / scale.increment) * c.period;
  if (count > CYCLE_MAX_TICKS || pxPerPeriod < CYCLE_MIN_TICK_PX) return { kind: 'density', x0: lo, x1: hi, count };
  const gaps = scale.gaps();
  const ticks: CycleTick[] = [];
  for (let n = first; n <= last; n++) {
    const year = cycleYear(c, n);
    if (gaps.some((g) => year > g.y0 && year < g.y1)) continue;
    ticks.push({ n, year, x: scale.x(year) });
  }
  return { kind: 'ticks', ticks };
}

/** Plain-language years for a period: "about 25,772 years", "about 225 million years". */
export function periodText(years: number): string {
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (years >= 1e9) return `about ${fmt(years / 1e9)} billion years`;
  if (years >= 1e6) return `about ${fmt(years / 1e6)} million years`;
  return `about ${fmt(years)} years`;
}
