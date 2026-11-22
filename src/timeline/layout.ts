import type { Track } from '../types.ts';
import { compareEvents, effectiveEnd, isSpan } from '../lib/years.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
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
  /** Lanes drawn as a thin line with nothing in them (rows with nothing in view, when shown thin). */
  thin?: ReadonlySet<string>;
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
  thinPx: 6,
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
    if (opts.thin?.has(lane.id)) {
      out.push({ lane, top, height: o.thinPx, rows: 0, marks: [], overflow: 0 });
      top += o.thinPx;
      continue;
    }
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
  /**
   * Where the name may stick while scrolling, in years (from, up to but not including to): the whole band, uncertain
   * edges included, except where the band runs into the next or previous phase on the same line; there the two meet at
   * the later phase's start, so their names never overlap.
   */
  nameFrom: number;
  nameTo: number;
  /**
   * Set on a membership (Track.memberOf) laid out as one more strip line: the row it was a membership in. Its `name`
   * is the strip's text ("in Soviet Union, 1922–91").
   */
  member?: string;
}

/**
 * Dated parts of a row (phases, or memberships), each on the first strip line it fits, counting lines from
 * `fromLevel`. Overlap is judged on the best dates, not the uncertainty windows: periods whose uncertain edges merely
 * touch (Egypt's Old Kingdom and First Intermediate Period) share a line; only periods that overlap outright (rival
 * governments) take the next one.
 */
export function placeOnLines<T extends ResolvedPhase>(trackId: string, list: T[], fromLevel = 0): (T & PlacedPhase)[] {
  const all = list.map((p) => ({ ...p, trackId }));
  all.sort((a, b) => a.start - b.start);
  const lineEnds: number[] = [];
  const lastOnLine: PlacedPhase[] = [];
  return all.map((p) => {
    let line = lineEnds.findIndex((end) => end <= p.start);
    if (line < 0) line = lineEnds.length;
    lineEnds[line] = p.end;
    const placed: T & PlacedPhase = {
      ...p,
      level: fromLevel + line,
      nameFrom: Math.min(p.start, p.startWindow?.[0] ?? p.start),
      nameTo: Math.max(p.end, p.endWindow?.[1] ?? p.end) + 1,
    };
    // the band before on this line reaches into this one (through its uncertain end, or by ending in the year this
    // one starts): split the name strip at this phase's start
    const prev = lastOnLine[line];
    if (prev && prev.nameTo > placed.nameFrom) {
      prev.nameTo = Math.max(prev.nameFrom, p.start);
      placed.nameFrom = Math.max(placed.nameFrom, p.start);
    }
    lastOnLine[line] = placed;
    return placed;
  });
}

/**
 * A row's own phases, each on the first name line it fits (see placeOnLines). A folded row shows only its own:
 * gathering its sub-rows' phases onto it mixed unrelated periods (every civilization's dynasties on one strip).
 */
export function placePhases(trackId: string, phases: Map<string, ResolvedPhase[]>): PlacedPhase[] {
  return placeOnLines(trackId, phases.get(trackId) ?? []);
}

/**
 * A row's memberships in other rows (Track.memberOf) as strip lines after its phases' lines: `fromLevel` is the
 * number of phase lines. Each is named by `label` (the union's name and years); memberships that overlap (a row in
 * two unions at once) take a line each, as rival phases do.
 */
export function placeMemberships<M extends ResolvedSpan & { row: string }>(
  trackId: string,
  memberships: M[],
  fromLevel: number,
  label: (m: M) => string,
): PlacedPhase[] {
  return placeOnLines(
    trackId,
    memberships.map((m) => ({ ...m, name: label(m), member: m.row })),
    fromLevel,
  );
}

/**
 * Phase strips: each line of a row's phases (see placePhases) is a thin strip at the top of the lane, under the
 * lifespan's edge. A strip line is tall enough for names when at least one of its phases gets a name at this zoom;
 * otherwise it is drawn thin (zoomed out, the row loses no height to names it can't show). The lines stack in level
 * order; a row's memberships (placeMemberships) stack after its phases' lines the same way.
 */
export const STRIP_DEFAULTS = {
  /** A strip line with names: 2 px of space above, then a 14 px strip. */
  namedPx: 16,
  /** A strip line without names (zoomed out): 2 px of space, then a 6 px strip. */
  thinPx: 8,
  /** The narrowest room for a name inside its phase (about five capitals, plus padding). */
  minNamePx: 70,
  /** Estimated width of one character of a phase name (10.5 px bold capitals), and the name's padding. */
  charPx: 7,
  namePadPx: 14,
  /** The pointer beside a name placed outside its phase. */
  pointerPx: 12,
  /** Space between two names on a line. */
  gapPx: 4,
};

export interface StripLine {
  /** From the top of the lane, px. */
  top: number;
  height: number;
  /** Whether names are shown on this line (else it is drawn thin). */
  named: boolean;
}

export interface PhaseCell {
  phase: PlacedPhase;
  /** Its strip line. */
  line: StripLine;
  /** Every other phase on a line takes the stronger shade, so neighbours read apart. */
  alt: boolean;
  /** The drawn extent, content px: uncertain edges included, cut where the next phase on its line begins. */
  x0: number;
  x1: number;
  /** px faded in and out at each end (uncertain dates). */
  fadeIn: number;
  fadeOut: number;
  /** Where the phase begins (best date), content px. */
  startX: number;
  /**
   * Where it ends (best date), content px; null when the next phase on the line begins there (its start line marks
   * the change) or when it is still going (drawn as an open, arrowed end instead).
   */
  endX: number | null;
  /**
   * Where its name goes, content px. Inside: the name sticks within this stretch while scrolling. Outside: a phase
   * too short for its name gets it in the blank strip just after its end (or else just before its start), pointing
   * at it; never over another phase, and never over years where the row didn't exist (outside its lifespan).
   * Null: no name at this zoom (the cell's tooltip still names it).
   */
  name: { x0: number; x1: number; outside: false | 'after' | 'before' } | null;
}

export interface PhaseStrips {
  cells: PhaseCell[];
  lines: StripLine[];
  /** Total height of the lines, px: the room at the top of the lane. */
  height: number;
}

/** Estimated width of a phase name drawn in the strip. */
export function stripNameWidth(name: string, o = STRIP_DEFAULTS): number {
  return name.length * o.charPx + o.namePadPx;
}

/**
 * Lays a row's placed phases out as strip lines at a zoom (x maps a year to content px). `lifespan` is the row's
 * lifespan stretches as drawn (a folded row's merged one): a name placed beside its phase stays within the stretch
 * the phase lies in, so it never sits over years where the row didn't exist. Left out, names aren't bounded by it.
 */
export function layoutPhaseStrips(
  placed: PlacedPhase[],
  x: (year: number) => number,
  opts: Partial<typeof STRIP_DEFAULTS> = {},
  lifespan?: readonly ResolvedSpan[],
): PhaseStrips {
  const o = { ...STRIP_DEFAULTS, ...opts };
  /** The drawn extent (uncertain ends included), content px, of the lifespan stretch a phase lies in. */
  const within = (p: PlacedPhase): [number, number] | null => {
    if (!lifespan) return [-Infinity, Infinity];
    const s = lifespan.find((s) => Math.min(s.start, s.startWindow?.[0] ?? s.start) <= p.end && Math.max(s.end, s.endWindow?.[1] ?? s.end) >= p.start);
    return s ? [x(Math.min(s.start, s.startWindow?.[0] ?? s.start)), x(Math.max(s.end, s.endWindow?.[1] ?? s.end) + 1)] : null;
  };
  const levels = placed.length ? Math.max(...placed.map((p) => p.level)) + 1 : 0;
  const byLine: PlacedPhase[][] = Array.from({ length: levels }, () => []);
  for (const p of placed) byLine[p.level].push(p);
  const names = new Map<PlacedPhase, PhaseCell['name']>();
  for (const line of byLine) {
    line.sort((a, b) => a.start - b.start);
    // names inside their phases, where at least a few letters fit (each in its own stretch: see placePhases), from
    // the line that marks the phase's start, so the line never runs through its name
    for (const p of line) {
      const from = x(Math.max(p.nameFrom, p.start));
      if (x(p.nameTo) - from >= o.minNamePx) names.set(p, { x0: from, x1: x(p.nameTo), outside: false });
    }
    // a line with no room for names stays thin; on a line with names, a phase too short for its own gets it in the
    // blank strip beside it, pointing at it: after its end, else before its start (never over another phase or name,
    // which would read as that phase's name). A membership's line is mostly blank strip, so a short membership gets
    // its name beside it even when no name fits inside (the line is thin only when there's no room for any).
    if (!line.some((p) => names.get(p) || p.member !== undefined)) continue;
    const boxes = () => line.flatMap((q) => [[x(q.start), x(q.end + 1)], ...(names.get(q) ? [[names.get(q)!.x0, names.get(q)!.x1]] : [])]);
    const free = (x0: number, x1: number) => boxes().every(([b0, b1]) => b1 <= x0 || b0 >= x1);
    line.forEach((p, i) => {
      if (names.get(p)) return;
      const room = within(p);
      if (!room) return;
      const want = stripNameWidth(p.name, o) + o.pointerPx;
      const enough = Math.min(o.minNamePx, want);
      const end = x(p.end + 1);
      const next = line[i + 1];
      const afterTo = Math.min(end + want, next ? x(next.start) - o.gapPx : Infinity, room[1]);
      if (afterTo - end >= enough && free(end, afterTo)) {
        names.set(p, { x0: end, x1: afterTo, outside: 'after' });
        return;
      }
      const start = x(p.start);
      const prev = line[i - 1];
      const beforeFrom = Math.max(start - want, prev ? x(prev.end + 1) + o.gapPx : -Infinity, room[0]);
      if (start - beforeFrom >= enough && free(beforeFrom, start)) names.set(p, { x0: beforeFrom, x1: start, outside: 'before' });
    });
  }
  const lines: StripLine[] = [];
  let top = 0;
  for (const line of byLine) {
    const named = line.some((p) => names.get(p));
    const height = named ? o.namedPx : o.thinPx;
    lines.push({ top, height, named });
    top += height;
  }
  const cells: PhaseCell[] = [];
  for (const line of byLine)
    line.forEach((p, i) => {
      const next = line[i + 1];
      const prev = line[i - 1];
      let x0 = x(Math.min(p.start, p.startWindow?.[0] ?? p.start));
      let x1 = x(Math.max(p.end, p.endWindow?.[1] ?? p.end) + 1);
      const startX = x(p.start);
      let fadeIn = p.startWindow ? x(p.startWindow[1]) - x0 : 0;
      let fadeOut = p.endWindow ? x1 - x(p.endWindow[0] + 1) : 0;
      // where two phases' bands on a line run into each other (an uncertain end or start, or a shared boundary
      // year), they meet at the later one's start, as their names do; a change is then drawn once, by its start line
      const abuts = !!next && next.start <= p.end + 1;
      if (next && x(next.start) < x1) {
        x1 = Math.max(x(next.start), startX);
        fadeOut = p.endWindow ? Math.min(fadeOut, x1 - x(p.endWindow[0] + 1)) : 0;
      }
      if (prev && x0 < startX && x(Math.max(prev.end, prev.endWindow?.[1] ?? prev.end) + 1) > x0) {
        x0 = startX;
        fadeIn = 0;
      }
      cells.push({
        phase: p,
        line: lines[p.level],
        alt: i % 2 === 1,
        x0,
        x1,
        fadeIn: Math.max(0, fadeIn),
        fadeOut: Math.max(0, fadeOut),
        startX,
        endX: p.ongoing || abuts ? null : Math.min(x(p.end + 1), x1),
        name: names.get(p) ?? null,
      });
    });
  cells.sort((a, b) => a.phase.start - b.phase.start || a.phase.level - b.phase.level);
  return { cells, lines, height: top };
}
