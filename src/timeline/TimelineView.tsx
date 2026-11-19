import { useMemo, useRef, useState } from 'react';
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

/** Room after the last year, so the last labels aren't cut off. */
const END_PAD = 260;

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
  collapsed: Record<string, boolean>;
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

  const lanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
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
    // a folded row's hidden sub-rows count as well, so folding and unfolding rows doesn't move the ruler
    const out: ResolvedSpan[] = [];
    for (const l of lanes)
      for (const id of l.members) {
        const s = spans.get(id);
        if (s) out.push(s);
        out.push(...(phases.get(id) ?? []));
      }
    return out;
  }, [lanes, spans, phases]);
  const scale = useMemo(
    () => buildScale(anchorsFor(events, present, laneSpans, data.meta.range), { increment, compress, calendar: cal }),
    [events, present, laneSpans, data.meta.range, increment, compress, cal],
  );
  const layout = useMemo(
    () => layoutLanes(lanes, events, scale, present, { expanded, headerPx }),
    [lanes, events, scale, present, expanded, headerPx],
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

  const { rovingKey, onStopFocus, onKeyNav } = useRovingFocus({
    lanes: layout.lanes,
    expanded,
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
              <div key={t} className={`tl-gridline ${t === era ? 'era' : ''}`} style={{ left: scale.x(t) }} />
            ))}
            {gaps.map((g) => (
              <div key={g.y0} className="tl-gap-band" style={{ left: g.x0, width: g.x1 - g.x0 }} />
            ))}
          </div>

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

          {layout.lanes.map(({ lane, height, marks, top, overflow }) => (
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
          ))}
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
