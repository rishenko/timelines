/**
 * Piecewise-linear time scale with gap compression.
 *
 * The year axis is divided into segments. "linear" segments are drawn at
 * `tickPx` pixels per `increment` years. Stretches with no anchors (event
 * starts/ends) longer than `gapMinTicks` ticks become fixed-width "gap"
 * segments, so a 1-year increment over 11,000 years stays usable.
 *
 * x() is continuous and strictly increasing across all segments, so a span
 * that crosses a gap is still drawn as one bar; it just passes through the
 * compressed break.
 */

import type { Calendar } from '../types.ts';
import { tickFloor, ticksBetween, YEAR_ZERO_CALENDAR } from '../lib/calendar.ts';

export interface Segment {
  kind: 'linear' | 'gap';
  y0: number;
  y1: number;
  x0: number;
  x1: number;
}

export interface ScaleOptions {
  increment: number;
  /** Pixel width of one tick (one increment). */
  tickPx?: number;
  /** Compress empty stretches into gap breaks. */
  compress?: boolean;
  /** Empty stretches longer than this many ticks are compressed. */
  gapMinTicks?: number;
  /** Pixel width of a gap break. */
  gapPx?: number;
  /** Ticks of padding kept around each anchor. */
  padTicks?: number;
  /** Ticks fall on round displayed years of this calendar. Defaults to one with a year 0. */
  calendar?: Calendar;
}

export interface Scale {
  increment: number;
  tickPx: number;
  segments: Segment[];
  width: number;
  domain: [number, number];
  x(year: number): number;
  yearAt(x: number): number;
  /** Tick years (multiples of the increment) inside linear segments. */
  ticks(): number[];
  gaps(): Segment[];
}

export function buildScale(anchors: number[], opts: ScaleOptions): Scale {
  const inc = opts.increment;
  if (!(inc > 0)) throw new Error('increment must be positive');
  const tickPx = opts.tickPx ?? 80;
  const compress = opts.compress ?? true;
  const gapMinTicks = opts.gapMinTicks ?? 5;
  const gapPx = opts.gapPx ?? 56;
  const pad = opts.padTicks ?? 1;
  const cal = opts.calendar ?? YEAR_ZERO_CALENDAR;

  const pts = anchors.length ? [...anchors].sort((a, b) => a - b) : [0];

  // Tick-aligned covered intervals around each anchor.
  const cells = pts.map((a): [number, number] => {
    const c = tickFloor(a, inc, cal);
    return [c - pad * inc, c + inc + pad * inc];
  });

  // Merge intervals; holes no longer than gapMinTicks stay linear.
  const mergeSlack = compress ? gapMinTicks * inc : Infinity;
  const covered: [number, number][] = [];
  for (const [a, b] of cells) {
    const last = covered[covered.length - 1];
    if (last && a <= last[1] + mergeSlack) last[1] = Math.max(last[1], b);
    else covered.push([a, b]);
  }

  const segments: Segment[] = [];
  let x = 0;
  const pxPerYear = tickPx / inc;
  covered.forEach(([a, b], i) => {
    if (i > 0) {
      const prev = segments[segments.length - 1];
      segments.push({ kind: 'gap', y0: prev.y1, y1: a, x0: x, x1: x + gapPx });
      x += gapPx;
    }
    const w = (b - a) * pxPerYear;
    segments.push({ kind: 'linear', y0: a, y1: b, x0: x, x1: x + w });
    x += w;
  });

  const width = x;
  const domain: [number, number] = [segments[0].y0, segments[segments.length - 1].y1];

  function findBy(key: 'y' | 'x', v: number): Segment {
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const s = segments[mid];
      const end = key === 'y' ? s.y1 : s.x1;
      if (v > end) lo = mid + 1;
      else hi = mid;
    }
    return segments[lo];
  }

  function xOf(year: number): number {
    if (year <= domain[0]) return (year - domain[0]) * pxPerYear;
    if (year >= domain[1]) return width + (year - domain[1]) * pxPerYear;
    const s = findBy('y', year);
    return s.x0 + ((year - s.y0) / (s.y1 - s.y0)) * (s.x1 - s.x0);
  }

  function yearAt(px: number): number {
    if (px <= 0) return domain[0] + px / pxPerYear;
    if (px >= width) return domain[1] + (px - width) / pxPerYear;
    const s = findBy('x', px);
    return s.y0 + ((px - s.x0) / (s.x1 - s.x0)) * (s.y1 - s.y0);
  }

  return {
    increment: inc,
    tickPx,
    segments,
    width,
    domain,
    x: xOf,
    yearAt,
    ticks() {
      const out: number[] = [];
      for (const s of segments) {
        if (s.kind !== 'linear') continue;
        for (const y of ticksBetween(s.y0, s.y1, inc, cal)) {
          if (out[out.length - 1] !== y) out.push(y);
        }
      }
      return out;
    },
    gaps() {
      return segments.filter((s) => s.kind === 'gap');
    },
  };
}
