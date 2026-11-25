import type { Track } from '../types.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { effectiveEnd } from '../lib/years.ts';
import type { LaneDef } from './layout.ts';

/**
 * "Hide rows with nothing in view": which lanes have anything (an event, a lifespan, a phase, with their uncertainty
 * ranges) within a stretch of years, and which lanes to draw. Rows with sub-rows are headers and always stay, so the
 * groups don't move; each counts the rows hidden below it.
 */

/** A stretch of years, inclusive (stored years). */
export interface YearWindow {
  y0: number;
  y1: number;
}

const overlaps = (a0: number, a1: number, w: YearWindow) => a1 >= w.y0 && a0 <= w.y1;

/** The extent of something dated, including the edges of its uncertainty ranges. */
function extent(s: { start: number; end: number; startWindow?: [number, number]; endWindow?: [number, number] }): [number, number] {
  return [Math.min(s.start, s.startWindow?.[0] ?? s.start), Math.max(s.end, s.endWindow?.[1] ?? s.end)];
}

/**
 * Which rows have anything dated in a stretch of years, indexed once per data change so that each window costs a binary
 * search per row instead of a pass over every event (the busy ring asks on every frame of a sideways scroll). Per row,
 * the extents of its events, lifespans and phases are merged into disjoint closed intervals: a window overlaps the union
 * exactly when it overlaps one of them, so the answer is the same as the plain scan's (laneActivity.test.ts runs both on
 * the real timelines). An extent no overlap test can match (a NaN bound) is dropped; an inverted one (start after end)
 * keeps the scan's own test. Rebuilt when the events, lifespans or phases change (a filter that changes the events
 * included); folding rows doesn't rebuild it (laneActivity maps lanes to rows per query).
 */
export function rowActivity(
  events: ResolvedEvent[],
  spans: Map<string, ResolvedSpan[]>,
  phases: Map<string, ResolvedPhase[]>,
  present: number,
): (id: string, w: YearWindow) => boolean {
  const raw = new Map<string, [number, number][]>();
  const add = (id: string, x: [number, number]) => {
    const list = raw.get(id);
    if (list) list.push(x);
    else raw.set(id, [x]);
  };
  for (const e of events) {
    const x = extent({ start: e.start, end: effectiveEnd(e, present), startWindow: e.startWindow, endWindow: e.endWindow });
    for (const t of e.tracks) add(t, x);
  }
  for (const [id, list] of spans) for (const s of list) add(id, extent(s));
  for (const [id, list] of phases) for (const p of list) add(id, extent(p));
  // per row: merged starts and ends (sorted, disjoint), plus any inverted extents
  const merged = new Map<string, { a: Float64Array; b: Float64Array; odd: [number, number][] }>();
  for (const [id, list] of raw) {
    const ok = list.filter(([a, b]) => a <= b).sort((x, y) => x[0] - y[0]);
    const odd = list.filter(([a, b]) => a > b);
    const as: number[] = [];
    const bs: number[] = [];
    for (const [a, b] of ok) {
      if (as.length && a <= bs[bs.length - 1]) bs[bs.length - 1] = Math.max(bs[bs.length - 1], b);
      else {
        as.push(a);
        bs.push(b);
      }
    }
    merged.set(id, { a: Float64Array.from(as), b: Float64Array.from(bs), odd });
  }
  return (id, w) => {
    const m = merged.get(id);
    if (!m) return false;
    // the first interval that ends at or after the window's start; it overlaps if it starts by the window's end
    let lo = 0;
    let hi = m.b.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (m.b[mid] >= w.y0) hi = mid;
      else lo = mid + 1;
    }
    if (lo < m.a.length && m.a[lo] <= w.y1) return true;
    return m.odd.some(([a, b]) => overlaps(a, b, w));
  };
}

/** The lanes with anything in a window, from a row index (rowActivity): a folded lane is active when any of its rows is. */
export function laneActivity(lanes: LaneDef[], rowActive: (id: string, w: YearWindow) => boolean): (w: YearWindow) => Set<string> {
  return (w) => {
    const rows = new Map<string, boolean>();
    const on = (id: string) => {
      let v = rows.get(id);
      if (v === undefined) rows.set(id, (v = rowActive(id, w)));
      return v;
    };
    return new Set(lanes.filter((l) => l.members.some(on)).map((l) => l.id));
  };
}

/** Ids of the lanes with anything dated inside the window: an event on one of its rows, a lifespan or a phase. */
export function activeLanes(
  lanes: LaneDef[],
  events: ResolvedEvent[],
  spans: Map<string, ResolvedSpan[]>,
  phases: Map<string, ResolvedPhase[]>,
  present: number,
  w: YearWindow,
): Set<string> {
  return laneActivity(lanes, rowActivity(events, spans, phases, present))(w);
}

export interface ShownLanes {
  lanes: LaneDef[];
  /** For each header lane with rows below it that have nothing in view: how many (hidden, or shown if revealed). */
  inactiveBelow: Map<string, number>;
  /** Lanes not drawn. */
  hiddenCount: number;
}

/**
 * The lanes to draw: headers (rows with sub-rows), active lanes, lanes in `keep` (the selected event's, the focused
 * one's), and the inactive lanes of headers in `revealed` (the reader asked to see them). Inactive lanes are counted
 * on their nearest header that has a lane.
 */
export function shownLanes(
  lanes: LaneDef[],
  tracksById: Map<string, Track>,
  active: Set<string>,
  keep: ReadonlySet<string>,
  revealed: ReadonlySet<string>,
): ShownLanes {
  const laneIds = new Set(lanes.map((l) => l.id));
  /** The nearest ancestor that has a lane (headers always do, unless filtered out). */
  const headerOf = (id: string) => {
    const seen = new Set<string>();
    for (let t = tracksById.get(tracksById.get(id)?.parent ?? ''); t && !seen.has(t.id); t = tracksById.get(t.parent ?? '')) {
      if (laneIds.has(t.id)) return t.id;
      seen.add(t.id);
    }
    return undefined;
  };
  const shown: LaneDef[] = [];
  const inactiveBelow = new Map<string, number>();
  let hiddenCount = 0;
  for (const l of lanes) {
    if (l.hasChildren || active.has(l.id) || keep.has(l.id)) {
      shown.push(l);
      continue;
    }
    const header = headerOf(l.id);
    if (header) inactiveBelow.set(header, (inactiveBelow.get(header) ?? 0) + 1);
    if (header && revealed.has(header)) shown.push(l);
    else hiddenCount++;
  }
  return { lanes: shown, inactiveBelow, hiddenCount };
}
