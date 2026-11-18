import type { Track } from '../types.ts';
import { compareEvents, effectiveEnd, isSpan } from '../lib/years.ts';
import type { ResolvedEvent, ResolvedPhase } from '../lib/chronology.ts';
import type { Scale } from './scale.ts';
import { childrenMap } from '../lib/tracks.ts';

export interface LaneDef {
  id: string;
  track: Track;
  /** 0 for top-level tracks, 1 for children, and so on (any depth). */
  depth: number;
  /** Track ids whose events appear in this lane (includes collapsed children). */
  members: string[];
  hasChildren: boolean;
  collapsed: boolean;
}

export interface Mark {
  key: string;
  /** "cluster" marks stand in for events that did not fit in the lane's row cap. */
  kind: 'event' | 'cluster';
  /** For event marks, the event; for clusters, the first clustered event. */
  eventId: string;
  /** Clustered event ids (cluster marks only). */
  eventIds?: string[];
  laneId: string;
  row: number;
  span: boolean;
  /** Bar (or point) extent in content px. */
  x0: number;
  x1: number;
  /** Right edge of the mark including its label; used for packing. */
  footprintEnd: number;
  /** Bars with uncertain ends: px at each end drawn in the lighter "range" color. */
  fadeIn?: number;
  fadeOut?: number;
  /** Point events with an uncertain date: the error window, in content px. */
  whisker?: [number, number];
  /** Vertical center of the mark, relative to the top of the lanes area. */
  cy: number;
}

export interface LaneLayout {
  lane: LaneDef;
  top: number;
  height: number;
  rows: number;
  marks: Mark[];
  /** Number of events folded into cluster marks. */
  overflow: number;
}

export interface LayoutOptions {
  rowH?: number;
  lanePad?: number;
  minBarPx?: number;
  pointPx?: number;
  charPx?: number;
  maxLabelPx?: number;
  gapPx?: number;
  /** Max sub-rows per lane before events fold into "+N" clusters. */
  maxRows?: number;
  /** Lanes that ignore maxRows. */
  expanded?: Record<string, boolean>;
  /** Extra space at the top of a lane, above its events (e.g. the strip that names its phases). */
  headerPx?: Record<string, number>;
}

export const LAYOUT_DEFAULTS = {
  rowH: 30,
  lanePad: 8,
  minBarPx: 6,
  pointPx: 14,
  charPx: 6.6,
  maxLabelPx: 240,
  gapPx: 8,
  maxRows: 4,
  clusterPx: 44,
};

/**
 * Builds the lane list from tracks: each track in dataset order, followed by
 * its descendants (depth-first) unless collapsed. Hidden tracks get no lane,
 * but their visible descendants still do; a collapsed track absorbs the events
 * of all its visible descendants.
 */
export function buildLanes(tracks: Track[], visible: Record<string, boolean>, collapsed: Record<string, boolean>): LaneDef[] {
  const children = childrenMap(tracks);
  const isVisible = (t: Track) => visible[t.id] !== false;
  const visibleDescendants = (t: Track): Track[] =>
    (children.get(t.id) ?? []).flatMap((k) => [...(isVisible(k) ? [k] : []), ...visibleDescendants(k)]);

  const lanes: LaneDef[] = [];
  const visit = (t: Track, depth: number) => {
    const desc = visibleDescendants(t);
    const isCollapsed = !!collapsed[t.id] && desc.length > 0;
    if (isVisible(t)) {
      lanes.push({
        id: t.id,
        track: t,
        depth,
        members: isCollapsed ? [t.id, ...desc.map((k) => k.id)] : [t.id],
        hasChildren: desc.length > 0,
        collapsed: isCollapsed,
      });
    }
    if (!isCollapsed || !isVisible(t)) for (const k of children.get(t.id) ?? []) visit(k, depth + 1);
  };
  for (const t of children.get(undefined) ?? []) visit(t, 0);
  return lanes;
}

/** Estimated label width. Key events are drawn in bold, which runs about 10% wider. */
export function labelWidth(title: string, o = LAYOUT_DEFAULTS, bold = false): number {
  return Math.min(title.length * o.charPx * (bold ? 1.1 : 1) + 14, o.maxLabelPx);
}

/** Positions every event mark in every lane it belongs to, packing overlaps into sub-rows. */
export function layoutLanes(
  lanes: LaneDef[],
  events: ResolvedEvent[],
  scale: Scale,
  present: number,
  opts: LayoutOptions = {},
): { lanes: LaneLayout[]; height: number } {
  const o = { ...LAYOUT_DEFAULTS, ...opts };
  const expanded = opts.expanded ?? {};
  // Key events are placed first, then normal, then minor; each group in date order. When a row is
  // full, the events left over are the least important ones, and only those fold into "+N".
  const rank = (e: ResolvedEvent) => e.importance ?? 2;
  const sorted = [...events].sort((a, b) => rank(a) - rank(b) || compareEvents(a, b));
  const out: LaneLayout[] = [];
  let top = 0;

  for (const lane of lanes) {
    const head = opts.headerPx?.[lane.id] ?? 0;
    const members = new Set(lane.members);
    // Occupied [start, end] footprints per sub-row. Events aren't placed in date order, so a row
    // can have gaps that a later-placed event fills.
    const rowSpans: [number, number][][] = [];
    const marks: Mark[] = [];
    const maxRows = expanded[lane.id] ? Infinity : o.maxRows;
    const overflow: { id: string; x: number }[] = [];
    for (const e of sorted) {
      if (!e.tracks.some((t) => members.has(t))) continue;
      const span = isSpan(e);
      let x0: number;
      let x1: number;
      let footprintStart: number;
      let footprintEnd: number;
      let fadeIn: number | undefined;
      let fadeOut: number | undefined;
      let whisker: [number, number] | undefined;
      const sw = e.startWindow;
      const ew = e.endWindow;
      if (span) {
        const end = effectiveEnd(e, present);
        // an uncertain bar spans its whole window; the uncertain parts are drawn lighter
        x0 = scale.x(Math.min(e.start, sw?.[0] ?? e.start));
        // end year is inclusive: the bar runs to the end of that year
        x1 = Math.max(scale.x(Math.max(end, ew?.[1] ?? end) + 1), x0 + o.minBarPx);
        if (sw || ew) {
          // The darker middle runs from the latest possible start to the earliest possible end.
          // When the ranges overlap (e.g. a 42-year reign with a 120-year chronology spread) there is
          // no certain middle, so it shows the event's own dates under the selected chronology instead.
          let solid0 = sw ? scale.x(sw[1]) : x0;
          let solid1 = ew ? scale.x(ew[0] + 1) : x1;
          if (solid1 <= solid0) {
            solid0 = scale.x(e.start);
            solid1 = scale.x(end + 1);
          }
          if (sw) fadeIn = Math.max(0, solid0 - x0);
          if (ew) fadeOut = Math.max(0, x1 - solid1);
        }
        footprintStart = x0;
        // the label starts where the bar is solid
        footprintEnd = Math.max(x1, x0 + (fadeIn ?? 0) + labelWidth(e.title, o, rank(e) === 1));
      } else {
        // a single-year event sits in the middle of its year
        x0 = x1 = scale.x(e.start + 0.5);
        footprintStart = x0 - o.pointPx / 2;
        footprintEnd = x0 + o.pointPx / 2 + labelWidth(e.title, o, rank(e) === 1);
        if (sw) {
          whisker = [scale.x(sw[0]), scale.x(sw[1] + 1)];
          footprintStart = Math.min(footprintStart, whisker[0]);
          footprintEnd = Math.max(footprintEnd, whisker[1]);
        }
      }
      const fits = (spans: [number, number][]) =>
        spans.every(([s, en]) => en + o.gapPx <= footprintStart || footprintEnd + o.gapPx <= s);
      let row = rowSpans.findIndex(fits);
      if (row === -1 && rowSpans.length >= maxRows) {
        overflow.push({ id: e.uuid, x: x0 });
        continue;
      }
      if (row === -1) {
        row = rowSpans.length;
        rowSpans.push([]);
      }
      rowSpans[row].push([footprintStart, footprintEnd]);
      marks.push({
        key: `${lane.id}:${e.uuid}`,
        kind: 'event',
        eventId: e.uuid,
        laneId: lane.id,
        row,
        span,
        x0,
        x1,
        footprintEnd,
        ...(fadeIn ? { fadeIn } : {}),
        ...(fadeOut ? { fadeOut } : {}),
        ...(whisker ? { whisker } : {}),
        cy: top + head + o.lanePad + row * o.rowH + o.rowH / 2,
      });
    }
    // Fold overflow into cluster badges on an extra row, merging badges that would touch.
    const clusterRow = rowSpans.length;
    let current: Mark | null = null;
    overflow.sort((a, b) => a.x - b.x);
    for (const { id, x } of overflow) {
      if (current && x <= current.footprintEnd + o.gapPx) {
        current.eventIds!.push(id);
        current.footprintEnd = Math.max(current.footprintEnd, x + o.clusterPx);
        continue;
      }
      current = {
        key: `${lane.id}:cluster:${id}`,
        kind: 'cluster',
        eventId: id,
        eventIds: [id],
        laneId: lane.id,
        row: clusterRow,
        span: false,
        x0: x,
        x1: x,
        footprintEnd: x + o.clusterPx,
        cy: top + head + o.lanePad + clusterRow * o.rowH + o.rowH / 2,
      };
      marks.push(current);
    }
    const rows = Math.max(1, rowSpans.length + (overflow.length ? 1 : 0));
    const height = head + rows * o.rowH + o.lanePad * 2;
    out.push({ lane, top, height, rows, marks, overflow: overflow.length });
    top += height;
  }

  return { lanes: out, height: top };
}

export interface PlacedPhase extends ResolvedPhase {
  trackId: string;
  /** Line of the name strip: overlapping phases (rival governments) take the next line down. */
  level: number;
}

/** A lane's phases (its own, plus its sub-rows' when it is collapsed), each on the first name line it fits. */
export function placePhases(members: string[], phases: Map<string, ResolvedPhase[]>): PlacedPhase[] {
  const all = members.flatMap((id) => (phases.get(id) ?? []).map((p) => ({ ...p, trackId: id })));
  all.sort((a, b) => a.start - b.start);
  const lineEnds: number[] = [];
  return all.map((p) => {
    const from = p.startWindow?.[0] ?? p.start;
    let level = lineEnds.findIndex((end) => end <= from);
    if (level < 0) level = lineEnds.length;
    lineEnds[level] = p.endWindow?.[1] ?? p.end;
    return { ...p, level };
  });
}
