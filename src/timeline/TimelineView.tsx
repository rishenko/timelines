import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { AgeStrip } from './AgeStrip.tsx';
import { ageLines, type PlacedAge } from '../lib/eras.ts';
import type { Dataset, Track } from '../types.ts';
import type { FocusRequest } from '../state/focus.ts';
import type { LaneLayout } from './layout.ts';
import { stripStopKey } from './keyboard.ts';
import type { ResolvedMembership } from '../lib/memberOf.ts';
import { eraStart } from '../lib/calendar.ts';
import { type ResolvedEvent, type ResolvedPhase, type ResolvedSpan } from '../lib/chronology.ts';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import { useLabelWidth, usePinchSteps } from './gestures.ts';
import { useViewport } from './useViewport.ts';
import { useRovingFocus } from './useRovingFocus.ts';
import { usePageKeys } from './usePageKeys.ts';
import { Ruler, type EdgeLink } from './Ruler.tsx';
import type { EventCategories } from '../state/categoryFilter.ts';
import { bandStep, centreYear, useViewSelect } from './viewportStore.ts';
import { useRowSettle } from './useRowSettle.ts';
import { formatYear } from '../lib/calendar.ts';
import type { ReignLane } from '../lib/reignLane.ts';
import { useYearCursor } from '../cursor/useYearCursor.ts';
import { useLayers } from '../plugins/useLayers.ts';
import { BUNDLED_LAYERS } from '../plugins/bundled/index.ts';
import { useCommands } from '../commands/CommandsContext.ts';
import { useChartModel } from './useChartModel.ts';
import { LaneRows, type LaneContext } from './LaneRows.tsx';
import { BusyRing, GridLayers } from './ChartOverlays.tsx';

/** Room after the last year, so the last labels aren't cut off. */
const END_PAD = 260;
/** Rows are drawn this far above and below the screen (in screen heights), so they're in place before they scroll in. */
const ROWS_ABOVE = 1;
const ROWS_BELOW = 2.5;
/** A chart at most this many screens tall draws every row: leaving rows out would only add work as it scrolls. */
const DRAW_ALL_SCREENS = 6;
/** How long a thin line's name stays up after a click or tap. */
const PEEK_MS = 2500;

export interface TimelineViewProps {
  data: Dataset;
  /** Events on the period lane: their own line(s) directly under each row's phases. */
  periodLane?: ReadonlySet<string>;
  /** Events on the reign lane: their row's first event lines, above the period lane (`.ruled`: those that answer "who ruled"). */
  reignLane?: ReignLane;
  /** The timeline's ages (context spans of kind age), placed on their lines: a strip under the ruler, and each row's on its band. */
  ages?: PlacedAge[];
  /** The age whose details are open in the side panel, and opening an age's details (a click or Enter on it). */
  selectedAgeId?: string | null;
  onOpenAge?: (id: string) => void;
  /** The phase or membership whose details are open (its PlacedPhase.ref), and opening one (Enter on its strip cell). */
  selectedPhaseRef?: string | null;
  onOpenPhase?: (ref: string) => void;
  /** Each event's categories (its main kind draws a glyph; both are in its accessible name). */
  categories?: Map<string, EventCategories>;
  /** Visible events, re-plotted under the selected chronologies. */
  events: ResolvedEvent[];
  /** All events (resolved), for connections and cluster titles. */
  eventsById: Map<string, ResolvedEvent>;
  /** Track lifespans (resolved), shaded behind each lane. */
  /** Each row's lifespan stretches (typed, or worked out from its phases). */
  spans: Map<string, ResolvedSpan[]>;
  /** Track phases (resolved): named periods drawn on the row's own bar. */
  phases: Map<string, ResolvedPhase[]>;
  /** Each row's dated memberships in other rows (Track.memberOf): one more strip line each, after its phases. */
  memberOf?: Map<string, ResolvedMembership[]>;
  /**
   * Every row of the timeline, when `data` holds only some of them (a comparison): memberships name and colour their
   * union, and a union's tooltip its members, from these, so a union outside the set still reads "in NATO".
   */
  allTracks?: Track[];
  visibleTracks: Record<string, boolean>;
  /** Each row's regions as tooltip text for its label ("Regions: Anatolia (Near East) — from Wikipedia: Hittites"). */
  regionTips?: Map<string, string>;
  /** Short tags after row names (in a comparison set: each row's broad region). */
  rowTags?: Map<string, string>;
  /** An update is still being drawn (a filter, region, comparison or dating change): the busy ring shows if it takes long. */
  busy?: boolean;
  /** Comparison sets: the rows in the set, and adding or removing a row (a compare button on each label). */
  compareRows?: Set<string>;
  onToggleCompare?: (trackId: string) => void;
  collapsed: Record<string, boolean>;
  /** Hide rows with nothing in or near the view (headers stay and count them). */
  hideOutOfView?: boolean;
  /** ...drawing them as thin lines in their place instead of taking them out. */
  thinRows?: boolean;
  /** After hiding settles on a new count: how many rows are hidden, and the year at the center. */
  onRowsHidden?: (count: number, centerYear: number) => void;
  /** The ruler's "N rows hidden" note was clicked: turn hiding off. */
  onShowAllRows?: () => void;
  onToggleCollapsed: (trackId: string) => void;
  increment: number;
  compress: boolean;
  present: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  editMode: boolean;
  onCreateAt: (trackId: string, year: number) => void;
  focus: FocusRequest | null;
  initialCenterYear: number;
  onCenterYearChange: (year: number) => void;
  /** Zoom one increment finer, centered on a year. Returns false if already at the finest increment. */
  onZoomIn: (year: number) => boolean;
  /** Links to neighbouring timelines (from meta.continues), drawn on the ruler at the year where the two meet. */
  edgeLinks?: EdgeLink[];
  /** Touch pinch: one zoom step finer (1) or coarser (-1), keeping the center year. */
  onPinchZoom?: (dir: 1 | -1, centerYear: number) => void;
  onEditTrack: (id: string) => void;
  onAddTrack: (parent?: string) => void;
  onMoveTrack: (id: string, dir: -1 | 1) => void;
  /** Only key events are drawn (the coarsest zoom); noted under the ruler's scale. */
  keyEventsOnly?: boolean;
  /** Keyboard + / −: one zoom step finer (1) or coarser (-1), centered on a year (the focused event's). */
  onKeyZoom?: (dir: 1 | -1, year: number) => void;
  /** Keyboard ?: show the list of keys (the Legend). */
  onShowKeys?: () => void;
  /** "/" in the chart: move to the search box. */
  onSearchKey?: () => void;
}

/**
 * The chart: a sticky ruler over one lane per visible row, each with its lifespan, phases, label and event marks,
 * and connection arrows over them. Only what is near the viewport is rendered. Scrolling lives in useViewport,
 * keyboard control in useRovingFocus, row packing in ./layout.ts.
 */
export function TimelineView(props: TimelineViewProps) {
  const {
    cal, anyRow, trackNames, expanded, setExpanded, allLanes, rowWindow, setRowWindow, stripWindow, setStripWindow,
    revealed, setRevealed, setFocusedLane, keep, hideOutOfView, activity, activeNow, shown, groupColor, agesShown, unionTips,
    scale, laneLifespans, laneStrips, layout, marksByEvent, related,
  } = useChartModel(props);
  const { data, events, eventsById, spans, phases, increment, selectedId, onSelect, editMode } = props;
  const labelW = useLabelWidth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  /** The thin line whose name was asked for with a click or tap (touch screens can't hover); shown for a moment. */
  const [peekLane, setPeekLane] = useState<string | null>(null);
  useEffect(() => {
    if (!peekLane) return;
    const t = window.setTimeout(() => setPeekLane(null), PEEK_MS);
    return () => window.clearTimeout(t);
  }, [peekLane]);

  const { view, viewStore, rows, centerYearRef, flashLane, onScroll } = useViewport({
    scrollerRef,
    lanesRef,
    scale,
    lanes: layout.lanes,
    labelW,
    focus: props.focus,
    selectedId,
    marksByEvent,
    initialCenterYear: props.initialCenterYear,
    onCenterYearChange: props.onCenterYearChange,
  });

  // Two-finger pinch steps through the zoom levels, keeping the center year.
  const { onPinchZoom } = props;
  const pinch = usePinchSteps(onPinchZoom && ((dir) => onPinchZoom(dir, centerYearRef.current)));

  // ---- hide rows with nothing in view, the busy ring, the years in view (useRowSettle.ts) ----
  const { rowsPending, busyStripRef, cornerOnScreen } = useRowSettle({
    allLanes, scale, labelW, view, viewStore, hideOutOfView, rowWindow, setRowWindow, activeNow, activity,
    stripWindow, setStripWindow, setFocusedLane, layout, scrollerRef, lanesRef,
  });
  // say how many rows are hidden when the count changes (not on opening)
  const { onRowsHidden } = props;
  const announcedRef = useRef<number | null>(null);
  const announce = useEffectEvent((n: number) => {
    if (announcedRef.current !== null && announcedRef.current !== n) onRowsHidden?.(n, centerYearRef.current);
    announcedRef.current = n;
  });
  useEffect(() => {
    if (hideOutOfView && rowWindow) announce(shown.hiddenCount);
    else announcedRef.current = null;
  }, [hideOutOfView, rowWindow, shown.hiddenCount]);

  // thin lines hold nothing to reach with the keyboard
  const navLanes = useMemo(() => layout.lanes.filter((l) => !shown.thin.has(l.lane.id)), [layout, shown.thin]);
  // a row's phase strip lines are grid lines above its events: each drawn cell is a stop (only with a side panel to open)
  // a strip cell opens its details in the side panel: an age's in the age panel, a phase's or membership's in the phase panel
  const { onOpenAge, onOpenPhase } = props;
  const openStrip = useMemo(
    () => (onOpenPhase || onOpenAge ? (ref: string) => (ref.startsWith('age:') ? onOpenAge?.(ref.slice(4)) : onOpenPhase?.(ref)) : undefined),
    [onOpenAge, onOpenPhase],
  );
  const stripStops = useMemo(() => {
    const out = new Map<string, { key: string; x: number }[][]>();
    if (!openStrip) return out;
    for (const [id, st] of laneStrips) {
      const lines = st.lines.map(() => [] as { key: string; x: number }[]);
      for (const c of st.cells) {
        const i = st.lines.indexOf(c.line);
        if (!c.phase.ref || i < 0 || Math.min(c.x1, scale.width) < Math.max(c.x0, 0)) continue;
        lines[i].push({ key: stripStopKey(c.phase.ref), x: Math.max(c.x0, 0) });
      }
      out.set(id, lines);
    }
    return out;
  }, [laneStrips, scale, openStrip]);
  const stripLines = useCallback((l: LaneLayout) => stripStops.get(l.lane.id) ?? [], [stripStops]);
  const commands = useCommands();
  const [overlayRef, underRef, rulerRef, headerRef] = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const slots = { overlay: overlayRef, under: underRef, ruler: rulerRef, header: headerRef };
  const isLayerElement = (el: Element | null) => Object.values(slots).some((r) => !!el && !!r.current?.contains(el));
  const { cursorStore, setCursor, onCursorMove, onCursorLeave, onCursorScroll } = useYearCursor({ scrollerRef, lanesRef, labelW, scale, isLayerElement });
  // the chart's keys anywhere on the page: at the year under the pointer, else the view's centre
  usePageKeys(commands, () => cursorStore.get()?.year ?? centreYear(viewStore.get(), labelW, scale.yearAt));
  const { rovingKey, onStopFocus, onKeyNav } = useRovingFocus({
    lanes: navLanes,
    expanded,
    inactiveBelow: shown.inactiveBelow,
    compare: !!props.onToggleCompare && !editMode,
    selectedId,
    view,
    viewStore,
    labelW,
    scrollerRef,
    lanesRef,
    eventsById,
    centreYear: () => centreYear(viewStore.get(), labelW, scale.yearAt),
    onSelect,
    onKeyZoom: props.onKeyZoom,
    onShowKeys: props.onShowKeys,
    onSearchKey: props.onSearchKey,
    commands,
    stripLines,
  });

  // On a chart more than six screens tall, only render rows near the viewport (a screen above, two and a half below),
  // plus the rows that must stay: the one holding the chart's Tab stop (so Tab and the arrow keys always reach it), the
  // selected event's, a focus request's and the one being highlighted. The rows left out are replaced by empty space
  // of the same height.
  const pinnedLanes = useMemo(() => {
    const ids = new Set(keep);
    if (flashLane) ids.add(flashLane);
    if (rovingKey) {
      const id = rovingKey.startsWith('label:')
        ? rovingKey.slice('label:'.length, rovingKey.lastIndexOf(':'))
        : rovingKey.startsWith('strip:')
          ? [...stripStops].find(([, lines]) => lines.some((line) => line.some((s) => s.key === rovingKey)))?.[0]
          : layout.lanes.find((l) => l.marks.some((m) => m.key === rovingKey))?.lane.id;
      if (id) ids.add(id);
    }
    return ids;
  }, [keep, flashLane, rovingKey, layout, stripStops]);
  const drawnLanes = useMemo(() => {
    const y0 = rows.top - rows.height * ROWS_ABOVE;
    const y1 = rows.top + rows.height * (1 + ROWS_BELOW);
    const windowed = rows.height > 0 && layout.height > rows.height * DRAW_ALL_SCREENS;
    const out: { l: (typeof layout.lanes)[number]; index: number; skipped: number }[] = [];
    let bottom = 0;
    layout.lanes.forEach((l, index) => {
      if (windowed && !(l.top + l.height > y0 && l.top < y1) && !pinnedLanes.has(l.lane.id)) return;
      out.push({ l, index, skipped: l.top - bottom });
      bottom = l.top + l.height;
    });
    return { lanes: out, skippedBelow: layout.height - bottom };
  }, [layout, rows, pinnedLanes]);

  // a lifespan's "continues" cue is left out where its row's strip already shows one in view: per drawn lane, from the
  // exact view (the chart re-renders only when that set changes)
  const stripCueKey = useViewSelect(viewStore, (v) =>
    drawnLanes.lanes
      .filter(({ l }) =>
        laneStrips.get(l.lane.id)?.cells.some((c) => (c.phase.ongoing || c.x1 > scale.width) && c.x0 < v.left + v.width - labelW && Math.min(c.x1, scale.width) > v.left),
      )
      .map(({ l }) => l.lane.id)
      .join('\n'),
  );
  const stripCues = useMemo(() => new Set(stripCueKey.split('\n')), [stripCueKey]);

  // Only render what is near the viewport. view.left is banded: the exact view lies within [left, left + width + one
  // band step], and the chart re-renders at each band, so half a screen either side of that stays drawn.
  const lo = view.left - view.width / 2;
  const hi = view.left + bandStep(view.width) + view.width * 1.5;
  const inView = (x0: number, x1: number) => x1 >= lo && x0 <= hi;

  const ticks = useMemo(() => scale.ticks(), [scale]);
  const visibleTicks = ticks.filter((t) => inView(scale.x(t), scale.x(t)));
  const gaps = scale.gaps().filter((g) => inView(g.x0, g.x1));
  // a tick at the start of a gap would print its label over the gap break
  const gapStarts = useMemo(() => new Set(scale.gaps().map((g) => g.y0)), [scale]);
  const canvasW = labelW + scale.width + END_PAD;
  const era = eraStart(cal);
  const eventTitles = useMemo(() => new Map(data.events.map((e) => [e.uuid, e.title])), [data.events]);
  const eventTitle = useCallback((id: string) => eventTitles.get(id), [eventTitles]);
  const band = { scale, cal, labelW, inView, eventTitle };

  const laneCtx: LaneContext = {
    props, labelW, scale, cal, anyRow, trackNames, groupColor, laneLifespans, laneStrips, unionTips, related, shown, expanded, setExpanded,
    revealed, setRevealed, band, inView, stripCues, flashLane, peekLane, setPeekLane, rovingKey, onStopFocus, openStrip, viewStore,
  };

  // the rows on screen at the cursor's geometry (else the scroller's), as the layers' `api.rows.inView()` gives them
  const rowsInView = () => {
    const c = cursorStore.get();
    const el = scrollerRef.current;
    const top = c ? c.rowsTop : (el?.scrollTop ?? 0);
    const bottom = c ? c.rowsBottom : top + (el?.clientHeight ?? 0);
    return layout.lanes
      .filter((l) => l.top + l.height > top && l.top < bottom && !shown.thin.has(l.lane.id))
      .map(({ lane }) => ({ id: lane.id, name: lane.track.name, color: lane.track.color, depth: lane.depth, members: lane.members, memberNames: new Map(lane.members.map((m) => [m, anyRow.get(m)?.name ?? m])) }));
  };
  const formatCursorYear = useCallback((y: number) => formatYear(y, cal), [cal]);
  const reignLane = props.reignLane ?? new Set<string>();
  // the reigns that ruled: those whose verdict answers "who ruled" (E1)
  const timeline = { events, spans, phases, ages: props.ages ?? [], reignLane, ruledReigns: props.reignLane?.ruled ?? new Set<string>() };
  useLayers(BUNDLED_LAYERS, slots, { scale, labelW, scrollerRef, viewStore, rowsInView, timeline, cursorStore, setCursor, commands, formatYear: formatCursorYear }, [scale, labelW, layout.lanes, shown.thin, anyRow, phases, events, spans, props.ages, props.reignLane, cal]);
  const chart = (
    // Clicking empty space deselects; keyboard users close the detail panel with Escape or its Close button.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      id="timeline"
      role="region"
      aria-label={`Timeline: ${data.meta.title}`}
      tabIndex={-1}
      className={`tl-scroller ${related ? 'has-focus' : ''}${editMode ? ' editing' : ''}`}
      aria-busy={rowsPending || !!props.busy}
      ref={scrollerRef}
      onScroll={() => {
        onScroll();
        onCursorScroll();
      }}
      onPointerMove={onCursorMove}
      onPointerLeave={onCursorLeave}
      {...pinch}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
        // a click anywhere but a thin line puts away a thin line's name
        if (peekLane && !(e.target as HTMLElement).closest?.('.tl-lane.thin')) setPeekLane(null);
      }}
    >
      <div className="tl-canvas" style={{ width: canvasW }}>
        {/* the busy ring, pinned to the chart's top-right corner however far it is scrolled */}
        <BusyRing stripRef={busyStripRef} width={view.width} rowsPending={rowsPending} busy={props.busy} cornerOnScreen={cornerOnScreen} />
        <Ruler
          scale={scale}
          cal={cal}
          labelW={labelW}
          width={canvasW}
          increment={increment}
          keyEventsOnly={props.keyEventsOnly}
          hiddenRows={hideOutOfView && rowWindow ? shown.hiddenCount : undefined}
          onShowAllRows={props.onShowAllRows}
          ticks={visibleTicks}
          gapStarts={gapStarts}
          gaps={gaps}
          era={era}
          edgeLinks={props.edgeLinks}
          viewStore={viewStore}
        />
        {props.ages && (
          <AgeStrip
            ages={agesShown.strip}
            lines={ageLines(agesShown.strip)}
            scale={scale}
            labelW={labelW}
            width={canvasW}
            viewStore={viewStore}
            cal={cal}
            sources={props.data.sources}
            selectedId={props.selectedAgeId}
            onOpen={props.onOpenAge}
            gaps={gaps}
          />
        )}

        {/* arrow-key navigation for the controls inside (delegated here; each control is a button) */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="tl-lanes" ref={lanesRef} style={{ height: layout.height }} onKeyDown={onKeyNav}>
          <div ref={underRef} className="tl-layer-overlay" style={{ left: labelW, height: layout.height }} />
          <GridLayers labelW={labelW} scale={scale} ticks={visibleTicks} gaps={gaps} era={era} />

          <div ref={overlayRef} className="tl-layer-overlay" style={{ left: labelW, height: layout.height }} />
          <ConnectionLayer
            left={labelW}
            width={scale.width + END_PAD}
            height={layout.height}
            marksByEvent={marksByEvent}
            eventsById={eventsById}
            selectedId={selectedId}
            related={related}
            inView={inView}
          />

          <LaneRows ctx={laneCtx} drawn={drawnLanes} />
        </div>
      </div>
      <div ref={rulerRef} className="tl-layer-slot" />
    </div>
  );
  return (
    // the chart's column: the overview strip (a map of the whole timeline, the view outlined), the year cursor's band,
    // then the chart
    <div className="tl-wrap">
      <div ref={headerRef} className="tl-layer-slot" />
      {chart}
    </div>
  );
}
