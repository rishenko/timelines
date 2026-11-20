import type { LaneLayout } from './layout.ts';

/**
 * Keyboard navigation in the chart (accessibility part c; docs/feature-audit.md item 23c). The whole timeline is one
 * Tab stop: one control in it is focusable at a time (a "roving" focus) and the arrow keys move between controls.
 *
 * The controls form a grid: one line per lane, holding the lane label's controls ("label stops", at the left: the
 * row's name when it links to a page, and the fold buttons) and then
 * its events and "+N" clusters in time order. Left and Right walk a lane; Up and Down move to the nearest control in
 * the next lane that has any; Home and End go to a lane's first and last event; Page Up and Page Down jump about a
 * screen's width in time. Pure functions over the layout, so the rules are testable without a browser.
 */

export interface Stop {
  key: string;
  /** Horizontal position (canvas px); label stops sit left of everything. */
  x: number;
  label: boolean;
  /** For an event mark, its event; for a cluster, the events folded into it. */
  eventIds: string[];
}

export interface StopLane {
  laneId: string;
  stops: Stop[];
}

export type Move = 'left' | 'right' | 'up' | 'down' | 'home' | 'end' | 'page-left' | 'page-right';

/** Keys of a lane label's controls (its name when it is a link, then the fold buttons), in the order shown. */
export const labelStopKey = (laneId: string, which: 'link' | 'overflow' | 'fold') => `label:${laneId}:${which}`;

/** The navigation grid: each lane's label stops, then its marks sorted by time (left edge), top to bottom. */
export function buildGrid(lanes: LaneLayout[], labelStops: (lane: LaneLayout) => string[]): StopLane[] {
  return lanes.map((l) => ({
    laneId: l.lane.id,
    stops: [
      ...labelStops(l).map((key) => ({ key, x: -Infinity, label: true, eventIds: [] })),
      ...[...l.marks]
        .sort((a, b) => a.x0 - b.x0 || a.cy - b.cy)
        .map((m) => ({ key: m.key, x: m.x0, label: false, eventIds: m.kind === 'cluster' ? (m.eventIds ?? []) : [m.eventId] })),
    ],
  }));
}

function locate(grid: StopLane[], key: string): { lane: number; index: number } | undefined {
  for (let lane = 0; lane < grid.length; lane++) {
    const index = grid[lane].stops.findIndex((s) => s.key === key);
    if (index >= 0) return { lane, index };
  }
  return undefined;
}

/** The stop in a lane nearest to x (marks only; a lane with no marks gives its first label stop). */
function nearest(stops: Stop[], x: number): Stop | undefined {
  const marks = stops.filter((s) => !s.label);
  if (!marks.length) return stops[0];
  return marks.reduce((best, s) => (Math.abs(s.x - x) < Math.abs(best.x - x) ? s : best));
}

/** Where a key press moves focus from `key`; undefined when there is nowhere to go (the edge of the grid). */
export function move(grid: StopLane[], key: string, m: Move, pageWidth = 800): string | undefined {
  const at = locate(grid, key);
  if (!at) return undefined;
  const stops = grid[at.lane].stops;
  const here = stops[at.index];
  switch (m) {
    case 'left':
      return stops[at.index - 1]?.key;
    case 'right':
      return stops[at.index + 1]?.key;
    case 'home':
      return (stops.find((s) => !s.label) ?? stops[0])?.key;
    case 'end':
      return stops.at(-1)?.key;
    case 'page-left':
    case 'page-right': {
      if (here.label) return undefined;
      const target = here.x + (m === 'page-right' ? pageWidth : -pageWidth);
      const t = nearest(stops, target);
      return t && t.key !== key ? t.key : undefined;
    }
    case 'up':
    case 'down': {
      const step = m === 'down' ? 1 : -1;
      for (let lane = at.lane + step; lane >= 0 && lane < grid.length; lane += step) {
        const next = grid[lane].stops;
        if (!next.length) continue;
        // from a fold button to the next lane's fold button (or its first event); from an event to the nearest one
        if (here.label) return (next.find((s) => s.label) ?? next[0]).key;
        return nearest(next, here.x)?.key;
      }
      return undefined;
    }
  }
}

/**
 * After the layout changes (zoom, folding), the focused key may be gone: an event folded into a "+N" cluster, or a
 * cluster split into events. Finds the stop that now holds the same event(s) in the same lane, else in any lane.
 */
export function relocate(grid: StopLane[], laneId: string, eventIds: string[]): string | undefined {
  if (!eventIds.length) return undefined;
  const holds = (s: Stop) => s.eventIds.some((id) => eventIds.includes(id));
  const lane = grid.find((l) => l.laneId === laneId);
  return (lane?.stops.find(holds) ?? grid.flatMap((l) => l.stops).find(holds))?.key;
}
