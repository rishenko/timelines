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

/** Ids of the lanes with anything dated inside the window: an event on one of its rows, a lifespan or a phase. */
export function activeLanes(
  lanes: LaneDef[],
  events: ResolvedEvent[],
  spans: Map<string, ResolvedSpan[]>,
  phases: Map<string, ResolvedPhase[]>,
  present: number,
  w: YearWindow,
): Set<string> {
  const activeRows = new Set<string>();
  for (const e of events) {
    const [a, b] = extent({ ...e, end: effectiveEnd(e, present) });
    if (overlaps(a, b, w)) for (const t of e.tracks) activeRows.add(t);
  }
  for (const [id, list] of spans) if (list.some((s) => overlaps(...extent(s), w))) activeRows.add(id);
  for (const [id, list] of phases) if (list.some((p) => overlaps(...extent(p), w))) activeRows.add(id);
  // a cycle row (draft v11) repeats in every window
  for (const l of lanes) if (l.track.cycle) activeRows.add(l.track.id);
  return new Set(lanes.filter((l) => l.members.some((m) => activeRows.has(m))).map((l) => l.id));
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
