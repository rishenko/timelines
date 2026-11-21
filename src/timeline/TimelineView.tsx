import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../types.ts';
import type { FocusRequest } from '../state/focus.ts';
import { buildScale } from './scale.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes, placePhases, type Mark } from './layout.ts';
import { eraStart } from '../lib/calendar.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import { rootOf, trackIndex } from '../lib/tracks.ts';
import { useLabelWidth, useLongPress, usePinchSteps } from './gestures.ts';
import { useViewport } from './useViewport.ts';
import { useRovingFocus } from './useRovingFocus.ts';
import { Ruler, type EdgeLink } from './Ruler.tsx';
import { PHASE_H, PhaseBand, SpanBand } from './Bands.tsx';
import { LaneLabel } from './LaneLabel.tsx';
import { ClusterMark, EventMark } from './Marks.tsx';
import { activeLanes, shownLanes, type YearWindow } from './rowsInView.ts';

/** Room after the last year, so the last labels aren't cut off. */
const END_PAD = 260;
/** Hiding rows with nothing in view waits this long after the last scroll, so rows don't come and go mid-scroll. */
const SETTLE_MS = 350;
/** A row counts as in view with something this close to either edge (a share of the view's width), so rows arrive
 * just before their years do and don't flicker at the edges. */
const ROW_MARGIN = 0.25;
/** How long a thin line's name stays up after a click or tap. */
const PEEK_MS = 2500;

interface Props {
  data: Dataset;
  /** Visible events, re-plotted under the selected chronologies. */
  events: ResolvedEvent[];
  /** All events (resolved), for connections and cluster titles. */
  eventsById: Map<string, ResolvedEvent>;
  /** Track lifespans (resolved), shaded behind each lane. */
  spans: Map<string, ResolvedSpan>;
  /** Track phases (resolved): named periods drawn on the row's own bar. */
  phases: Map<string, ResolvedPhase[]>;
  visibleTracks: Record<string, boolean>;
  /** Each row's regions as tooltip text for its label ("Regions: Anatolia (Near East) — from Wikipedia: Hittites"). */
  regionTips?: Map<string, string>;
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
  showLinks: boolean;
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
export function TimelineView(props: Props) {
  const { data, events, eventsById, spans, phases, visibleTracks, collapsed, increment, compress, showLinks, present, selectedId, onSelect, editMode } =
    props;
  const cal = data.meta.calendar;
  const trackById = useMemo(() => trackIndex(data.tracks), [data.tracks]);
  const trackNames = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  const labelW = useLabelWidth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // every lane; the ones drawn may be fewer (hideOutOfView), but the ruler is built from all of them so it never moves
  const allLanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
  /** The years the hidden rows were last checked against (when scrolling settled), or null before the first check. */
  const [rowWindow, setRowWindow] = useState<YearWindow | null>(null);
  /** Headers whose rows with nothing in view the reader asked to see. */
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  /** The lane holding keyboard focus when hiding last settled: it stays, so focus isn't lost. */
  const [focusedLane, setFocusedLane] = useState<string | null>(null);
  const hideOutOfView = !!props.hideOutOfView;
  const keep = useMemo(() => {
    const ids = new Set<string>();
    const sel = selectedId ? eventsById.get(selectedId) : undefined;
    const want = new Set([...(sel?.tracks ?? []), ...(props.focus?.trackId ? [props.focus.trackId] : [])]);
    for (const l of allLanes) if (l.members.some((m) => want.has(m))) ids.add(l.id);
    if (focusedLane) ids.add(focusedLane);
    return ids;
  }, [allLanes, selectedId, eventsById, props.focus, focusedLane]);
  const thinRows = !!props.thinRows;
  /** The thin line whose name was asked for with a click or tap (touch screens can't hover); shown for a moment. */
  const [peekLane, setPeekLane] = useState<string | null>(null);
  useEffect(() => {
    if (!peekLane) return;
    const t = window.setTimeout(() => setPeekLane(null), PEEK_MS);
    return () => window.clearTimeout(t);
  }, [peekLane]);
  const shown = useMemo(() => {
    if (!hideOutOfView || !rowWindow)
      return { lanes: allLanes, inactiveBelow: new Map<string, number>(), hiddenCount: 0, thin: new Set<string>() };
    const active = activeLanes(allLanes, events, spans, phases, present, rowWindow);
    const r = shownLanes(allLanes, trackById, active, keep, revealed);
    if (!thinRows) return { ...r, thin: new Set<string>() };
    // thin lines: every lane stays, the ones that would be taken out are drawn thin
    const drawn = new Set(r.lanes.map((l) => l.id));
    return { ...r, lanes: allLanes, thin: new Set(allLanes.filter((l) => !drawn.has(l.id)).map((l) => l.id)) };
  }, [hideOutOfView, thinRows, rowWindow, allLanes, events, spans, phases, present, trackById, keep, revealed]);
  const lanes = shown.lanes;
  // A top-level row with sub-rows is a group: its rows share its colour as a background tint.
  const groupColor = useMemo(() => {
    const parents = new Set(data.tracks.map((t) => t.parent));
    const out = new Map<string, string>();
    for (const t of data.tracks) {
      const root = rootOf(t.id, trackById);
      if (root && parents.has(root.id)) out.set(t.id, root.color);
    }
    return out;
  }, [data.tracks, trackById]);
  const lanePhases = useMemo(() => new Map(lanes.map((l) => [l.id, placePhases(l.id, phases)])), [lanes, phases]);
  // a lane with phases gets a strip at the top for their names, one line per level
  const headerPx = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, list] of lanePhases) if (list.length) out[id] = (Math.max(...list.map((p) => p.level)) + 1) * PHASE_H;
    return out;
  }, [lanePhases]);
  const laneSpans = useMemo(() => {
    // phase edges are kept uncompressed on the ruler too, so a change of government is never folded into a gap;
    // a folded row's hidden sub-rows count as well, so folding and unfolding rows doesn't move the ruler; so do rows
    // hidden for having nothing in view
    const out: ResolvedSpan[] = [];
    for (const l of allLanes)
      for (const id of l.members) {
        const s = spans.get(id);
        if (s) out.push(s);
        out.push(...(phases.get(id) ?? []));
      }
    return out;
  }, [allLanes, spans, phases]);
  const scale = useMemo(
    () => buildScale(anchorsFor(events, present, laneSpans, data.meta.range), { increment, compress, calendar: cal }),
    [events, present, laneSpans, data.meta.range, increment, compress, cal],
  );
  const layout = useMemo(
    () => layoutLanes(lanes, events, scale, present, { expanded, headerPx, thin: shown.thin }),
    [lanes, events, scale, present, expanded, headerPx, shown.thin],
  );
  const marksByEvent = useMemo(() => {
    const m = new Map<string, Mark[]>();
    for (const l of layout.lanes)
      for (const mk of l.marks)
        for (const id of mk.eventIds ?? [mk.eventId]) {
          const list = m.get(id);
          if (list) list.push(mk);
          else m.set(id, [mk]);
        }
    return m;
  }, [layout]);

  // The focused event and everything linked to it (both directions).
  const focusId = hoverId ?? selectedId;
  const related = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    for (const l of eventsById.get(focusId)?.links ?? []) s.add(l.to);
    for (const e of eventsById.values()) if (e.links?.some((l) => l.to === focusId)) s.add(e.uuid);
    return s;
  }, [focusId, eventsById]);

  const { view, centerYearRef, flashLane, onScroll } = useViewport({
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

  // ---- hide rows with nothing in view ----
  // The rows are checked against the years in view plus a margin either side, once scrolling settles (at once
  // after a zoom). The first row on screen stays where it was, so the rows don't jump under the reader.
  const laneIndex = useMemo(() => new Map(allLanes.map((l, i) => [l.id, i])), [allLanes]);
  const anchorRef = useRef<{ index: number; offset: number } | null>(null);
  const lastScaleRef = useRef(scale);
  const settleTimer = useRef(0);
  const settleRows = useEffectEvent(() => {
    const w = {
      y0: Math.floor(scale.yearAt(Math.max(0, view.left - view.width * ROW_MARGIN))),
      y1: Math.ceil(scale.yearAt(view.left + view.width * (1 + ROW_MARGIN))),
    };
    if (rowWindow && rowWindow.y0 === w.y0 && rowWindow.y1 === w.y1) return;
    const el = scrollerRef.current;
    const first = el ? layout.lanes.find((l) => l.top + l.height > el.scrollTop) : undefined;
    anchorRef.current = el && first ? { index: laneIndex.get(first.lane.id) ?? 0, offset: first.top - el.scrollTop } : null;
    const focused = document.activeElement;
    const laneEl = focused && lanesRef.current?.contains(focused) ? focused.closest('[data-lane]') : null;
    setFocusedLane(laneEl?.getAttribute('data-lane') ?? null);
    setRowWindow(w);
  });
  useEffect(() => {
    if (!hideOutOfView) return;
    const now = rowWindow === null || lastScaleRef.current !== scale;
    lastScaleRef.current = scale;
    window.clearTimeout(settleTimer.current);
    if (now) settleRows();
    else settleTimer.current = window.setTimeout(settleRows, SETTLE_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [view, scale, hideOutOfView, rowWindow]);
  // after the rows change, put the first row that was on screen back where it was; if it is now hidden, the next row
  // still drawn goes where it was, or at the top when it was partly scrolled past
  useLayoutEffect(() => {
    const a = anchorRef.current;
    anchorRef.current = null;
    const el = scrollerRef.current;
    if (!a || !el) return;
    const target = layout.lanes.find((l) => (laneIndex.get(l.lane.id) ?? -1) >= a.index) ?? layout.lanes.at(-1);
    // (a row now drawn thin is shorter than the part of it that was scrolled past: it goes at the top too)
    const same = target && laneIndex.get(target.lane.id) === a.index && target.height > -a.offset;
    if (target) el.scrollTop = Math.max(0, target.top - (same ? a.offset : Math.max(a.offset, 0)));
  }, [layout, laneIndex]);
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
  const { rovingKey, onStopFocus, onKeyNav } = useRovingFocus({
    lanes: navLanes,
    expanded,
    inactiveBelow: shown.inactiveBelow,
    selectedId,
    view,
    labelW,
    scrollerRef,
    lanesRef,
    eventsById,
    centerYearRef,
    onSelect,
    onKeyZoom: props.onKeyZoom,
    onShowKeys: props.onShowKeys,
    onSearchKey: props.onSearchKey,
  });

  // Only render what is near the viewport (one screen either side).
  const lo = view.left - view.width;
  const hi = view.left + view.width * 2;
  const inView = (x0: number, x1: number) => x1 >= lo && x0 <= hi;

  const ticks = useMemo(() => scale.ticks(), [scale]);
  const visibleTicks = ticks.filter((t) => inView(scale.x(t), scale.x(t)));
  const gaps = scale.gaps().filter((g) => inView(g.x0, g.x1));
  // a tick at the start of a gap would print its label over the gap break
  const gapStarts = useMemo(() => new Set(scale.gaps().map((g) => g.y0)), [scale]);
  const canvasW = labelW + scale.width + END_PAD;
  const era = eraStart(cal);
  const band = { scale, cal, labelW, inView };

  // Adding an event in edit mode: double-click an empty spot in a lane, or on touch screens hold a finger there.
  const isEmptySpot = (target: EventTarget, lane: Element) =>
    target === lane || (target as HTMLElement).classList.contains('tl-span');
  const createAt = (trackId: string, lane: Element, clientX: number) => {
    const contentX = clientX - lane.getBoundingClientRect().left - labelW;
    props.onCreateAt(trackId, Math.floor(scale.yearAt(contentX)));
  };
  const onLaneDoubleClick = (trackId: string) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (editMode && isEmptySpot(ev.target, ev.currentTarget)) createAt(trackId, ev.currentTarget, ev.clientX);
  };
  const press = useLongPress();
  const onLanePointerDown = (trackId: string) => (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || ev.pointerType !== 'touch' || !isEmptySpot(ev.target, ev.currentTarget)) return;
    const lane = ev.currentTarget;
    const x = ev.clientX;
    press.start(x, ev.clientY, () => createAt(trackId, lane, x));
  };

  return (
    // Clicking empty space deselects; keyboard users close the detail panel with Escape or its Close button.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      id="timeline"
      role="region"
      aria-label={`Timeline: ${data.meta.title}`}
      tabIndex={-1}
      className={`tl-scroller ${related ? 'has-focus' : ''}${editMode ? ' editing' : ''}`}
      ref={scrollerRef}
      onScroll={onScroll}
      {...pinch}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
        // a click anywhere but a thin line puts away a thin line's name
        if (peekLane && !(e.target as HTMLElement).closest?.('.tl-lane.thin')) setPeekLane(null);
      }}
    >
      <div className="tl-canvas" style={{ width: canvasW }}>
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
        />

        {/* arrow-key navigation for the controls inside (delegated here; each control is a button) */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="tl-lanes" ref={lanesRef} style={{ height: layout.height }} onKeyDown={onKeyNav}>
          <div className="tl-grid" style={{ left: labelW }}>
            {visibleTicks.map((t) => (
              <div key={t} className="tl-gridline" style={{ left: scale.x(t) }} />
            ))}
            {gaps.map((g) => (
              <div key={g.y0} className="tl-gap-band" style={{ left: g.x0, width: g.x1 - g.x0 }} />
            ))}
          </div>
          {/* the era line has its own layer, over the rows' backgrounds and spans (which cover the grid), under the marks */}
          {visibleTicks.includes(era) && <div className="tl-era-line" style={{ left: labelW + scale.x(era) }} />}

          <ConnectionLayer
            left={labelW}
            width={scale.width + END_PAD}
            height={layout.height}
            marksByEvent={marksByEvent}
            eventsById={eventsById}
            showLinks={showLinks}
            related={related}
            inView={inView}
          />

          {layout.lanes.map(({ lane, height, marks, top, overflow }) =>
            shown.thin.has(lane.id) ? (
              // a row with nothing in view, drawn as a thin line in its place (its header's +N shows it); hovering the
              // line, or clicking or tapping it, shows its name in the name column. Mouse/touch only: keyboard and
              // screen-reader users reach these rows through the header's +N button.
              // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                key={lane.id}
                className={`tl-lane thin${lane.depth ? ' nested' : ''}${groupColor.has(lane.id) ? ' in-group' : ''}${peekLane === lane.id ? ' peek' : ''}`}
                onClick={() => setPeekLane((p) => (p === lane.id ? null : lane.id))}
                style={{ height, '--track-color': lane.track.color, '--depth': lane.depth, '--group-color': groupColor.get(lane.id) } as React.CSSProperties}
                aria-hidden="true"
                data-lane={lane.id}
              >
                <div className="thin-label" style={{ width: labelW }}>
                  <span className="thin-name">{lane.track.name}</span>
                </div>
              </div>
            ) : (
            // double-click and long-press add an event in edit mode; the edit bar's Add event button does the same
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div
              key={lane.id}
              className={`tl-lane${lane.depth ? ' nested' : ''}${lane.depth > 1 ? ' deep' : ''}${lane.collapsed ? ' collapsed' : ''}${flashLane === lane.id ? ' flash' : ''}${groupColor.has(lane.id) ? (lane.depth ? ' in-group' : ' group-head') : ''}`}
              style={{ height, '--track-color': lane.track.color, '--depth': lane.depth, '--group-color': groupColor.get(lane.id) } as React.CSSProperties}
              onDoubleClick={onLaneDoubleClick(lane.id)}
              onPointerDown={onLanePointerDown(lane.id)}
              onPointerMove={(ev) => press.move(ev.clientX, ev.clientY)}
              onPointerUp={press.cancel}
              onPointerCancel={press.cancel}
              role="group"
              aria-label={lane.track.name}
              data-lane={lane.id}
            >
              {lane.members.map((id) => {
                const s = spans.get(id);
                return s ? <SpanBand key={`span-${id}`} track={trackById.get(id)!} span={s} {...band} /> : null;
              })}
              {lanePhases.get(lane.id)?.map((p, i) => (
                <PhaseBand key={`phase-${p.trackId}-${i}`} phase={p} color={trackById.get(p.trackId)!.color} alt={i % 2 === 1} {...band} />
              ))}
              <LaneLabel
                lane={lane}
                regionTip={props.regionTips?.get(lane.id)}
                labelW={labelW}
                overflow={overflow}
                expanded={!!expanded[lane.id]}
                editMode={editMode}
                rovingKey={rovingKey}
                onStopFocus={onStopFocus}
                onToggleExpanded={() => setExpanded((x) => ({ ...x, [lane.id]: !x[lane.id] }))}
                onToggleCollapsed={() => props.onToggleCollapsed(lane.id)}
                onEditTrack={() => props.onEditTrack(lane.id)}
                onMoveTrack={(dir) => props.onMoveTrack(lane.id, dir)}
                onAddSubTrack={() => props.onAddTrack(lane.id)}
                inactiveBelow={shown.inactiveBelow.get(lane.id)}
                revealed={revealed.has(lane.id)}
                onToggleRevealed={() =>
                  setRevealed((r) => {
                    const next = new Set(r);
                    if (!next.delete(lane.id)) next.add(lane.id);
                    return next;
                  })
                }
              />
              {marks
                .filter((m) => m.key === rovingKey || inView(Math.min(m.x0, m.whisker?.[0] ?? m.x0), m.footprintEnd))
                .map((m) =>
                  m.kind === 'cluster' ? (
                    <ClusterMark
                      key={m.key}
                      mark={m}
                      laneTop={top}
                      labelW={labelW}
                      cal={cal}
                      isTabStop={m.key === rovingKey}
                      onStopFocus={onStopFocus}
                      events={m.eventIds!.map((id) => eventsById.get(id)!)}
                      related={m.eventIds!.some((id) => related?.has(id))}
                      onClick={(mid) => {
                        if (!props.onZoomIn(mid)) setExpanded((x) => ({ ...x, [lane.id]: true }));
                      }}
                    />
                  ) : (
                    <EventMark
                      key={m.key}
                      mark={m}
                      event={eventsById.get(m.eventId)!}
                      laneTop={top}
                      labelW={labelW}
                      cal={cal}
                      isTabStop={m.key === rovingKey}
                      onStopFocus={onStopFocus}
                      trackNames={trackNames}
                      selected={selectedId === m.eventId}
                      related={!!related?.has(m.eventId)}
                      showEdited={editMode}
                      viewLeft={view.left}
                      onHover={setHoverId}
                      onSelect={onSelect}
                    />
                  ),
                )}
            </div>
            ),
          )}
          {editMode && (
            <div className="tl-add-lane">
              <button style={{ width: labelW }} onClick={() => props.onAddTrack()}>
                + Add a track
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
