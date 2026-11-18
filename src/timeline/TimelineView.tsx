import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../types.ts';
import { buildScale } from './scale.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes, type Mark } from './layout.ts';
import { formatEventDates } from '../lib/years.ts';
import { eraStart, formatYear, isMajorTick } from '../lib/calendar.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import { safeUrl } from '../lib/urls.ts';

export const LABEL_W = 236;
/** On narrow screens (phones) the row labels take less room, leaving more for the timeline. */
export const LABEL_W_NARROW = 120;
const NARROW_QUERY = '(max-width: 640px)';
function useLabelWidth(): number {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow ? LABEL_W_NARROW : LABEL_W;
}
const END_PAD = 260;
const MARK_H = 22;
const POINT_HALF = 7;

export interface FocusRequest {
  year: number;
  nonce: number;
}

interface Props {
  data: Dataset;
  /** Visible events, re-plotted under the selected chronologies. */
  events: ResolvedEvent[];
  /** All events (resolved), for connections and cluster titles. */
  eventsById: Map<string, ResolvedEvent>;
  /** Track lifespans (resolved), shaded behind each lane. */
  spans: Map<string, ResolvedSpan>;
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
  /** Touch pinch: one zoom step finer (1) or coarser (-1), keeping the center year. */
  onPinchZoom?: (dir: 1 | -1, centerYear: number) => void;
  onEditTrack: (id: string) => void;
  onAddTrack: (parent?: string) => void;
  onMoveTrack: (id: string, dir: -1 | 1) => void;
}

const isApprox = (e: ResolvedEvent) => !!(e.circa || e.startWindow || e.endWindow);

export function TimelineView(props: Props) {
  const {
    data,
    events,
    eventsById,
    spans,
    visibleTracks,
    collapsed,
    increment,
    compress,
    showLinks,
    present,
    selectedId,
    onSelect,
    editMode,
  } = props;
  const cal = data.meta.calendar;
  const labelW = useLabelWidth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ left: 0, width: 1200 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const centerYearRef = useRef(props.initialCenterYear);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const lanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
  // A top-level row with sub-rows is a group: its rows share its colour as a background tint.
  const groupColor = useMemo(() => {
    const byId = new Map(data.tracks.map((t) => [t.id, t]));
    const parents = new Set(data.tracks.map((t) => t.parent));
    const out = new Map<string, string>();
    for (const t of data.tracks) {
      let root = t;
      for (let n = 0; root.parent && byId.has(root.parent) && n < data.tracks.length; n++) root = byId.get(root.parent)!;
      if (parents.has(root.id)) out.set(t.id, root.color);
    }
    return out;
  }, [data.tracks]);
  const laneSpans = useMemo(() => {
    const out: ResolvedSpan[] = [];
    for (const l of lanes) for (const id of l.members) {
      const s = spans.get(id);
      if (s) out.push(s);
    }
    return out;
  }, [lanes, spans]);
  const scale = useMemo(
    () => buildScale(anchorsFor(events, present, laneSpans), { increment, compress, calendar: cal }),
    [events, present, laneSpans, increment, compress, cal],
  );
  const layout = useMemo(
    () => layoutLanes(lanes, events, scale, present, { expanded }),
    [lanes, events, scale, present, expanded],
  );

  const marksByEvent = useMemo(() => {
    const m = new Map<string, Mark[]>();
    for (const l of layout.lanes) for (const mk of l.marks)
        for (const id of mk.eventIds ?? [mk.eventId]) m.set(id, [...(m.get(id) ?? []), mk]);
    return m;
  }, [layout]);

  const marksByEventRef = useRef(marksByEvent);
  marksByEventRef.current = marksByEvent;

  // The focused event and everything linked to it (both directions).
  const focusId = hoverId ?? selectedId;
  const related = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    for (const l of eventsById.get(focusId)?.links ?? []) s.add(l.to);
    for (const e of eventsById.values()) if (e.links?.some((l) => l.to === focusId)) s.add(e.uuid);
    return s;
  }, [focusId, eventsById]);

  const visibleWidth = () => (scrollerRef.current?.clientWidth ?? 1200) - labelW;

  const centerOn = useCallback(
    (year: number, smooth = false) => {
      const el = scrollerRef.current;
      if (!el) return;
      const left = scale.x(year) - (el.clientWidth - labelW) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'instant' });
      centerYearRef.current = year;
    },
    [scale, labelW],
  );

  // Keep the center year fixed whenever the scale changes (increment, compression, filters).
  useLayoutEffect(() => {
    centerOn(centerYearRef.current);
    const el = scrollerRef.current;
    if (el) setView({ left: el.scrollLeft, width: el.clientWidth });
  }, [centerOn]);

  useEffect(() => {
    if (props.focus) centerOn(props.focus.year, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focus]);

  // After a selection (which may open the side panel and narrow the view), make sure the event is on screen.
  useEffect(() => {
    if (!selectedId) return;
    const marks = marksByEventRef.current.get(selectedId);
    if (!marks?.length) return;
    const frame = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const x = marks[0].x0;
      const left = el.scrollLeft;
      const right = left + el.clientWidth - labelW;
      if (x < left + 20 || x > right - 60) centerOn(scale.yearAt(x), true);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const { onCenterYearChange } = props;
  const rafRef = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      setView({ left: el.scrollLeft, width: el.clientWidth });
      const y = Math.round(scale.yearAt(el.scrollLeft + visibleWidth() / 2));
      centerYearRef.current = y;
      onCenterYearChange(y);
    });
  };

  useEffect(() => {
    const onResize = () => {
      const el = scrollerRef.current;
      if (el) setView({ left: el.scrollLeft, width: el.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Two-finger pinch steps through the zoom levels (the page itself doesn't zoom: see touch-action in CSS).
  // Each time the fingers spread to 1.6x (or close to 0.62x), the zoom moves one step and the gesture restarts.
  const pinchRef = useRef<number | null>(null);
  const fingerGap = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e: React.TouchEvent) => {
    pinchRef.current = e.touches.length === 2 ? fingerGap(e.touches) : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchRef.current === null || !props.onPinchZoom) return;
    const ratio = fingerGap(e.touches) / pinchRef.current;
    if (ratio > 1.6 || ratio < 0.62) {
      props.onPinchZoom(ratio > 1 ? 1 : -1, centerYearRef.current);
      pinchRef.current = fingerGap(e.touches);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

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
  const LONG_PRESS_MS = 550;
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelPress = () => {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };
  const onLanePointerDown = (trackId: string) => (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || ev.pointerType !== 'touch' || !isEmptySpot(ev.target, ev.currentTarget)) return;
    cancelPress();
    const lane = ev.currentTarget;
    const x = ev.clientX;
    pressRef.current = { x, y: ev.clientY, timer: window.setTimeout(() => (cancelPress(), createAt(trackId, lane, x)), LONG_PRESS_MS) };
  };
  const onLanePointerMove = (ev: React.PointerEvent) => {
    // a finger that moves is panning, not pressing
    const p = pressRef.current;
    if (p && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > 10) cancelPress();
  };

  /** Shaded lifespan band, fading across uncertain ends. */
  const spanBand = (trackId: string, s: ResolvedSpan) => {
    const x0 = scale.x(Math.min(s.start, s.startWindow?.[0] ?? s.start));
    const x1 = scale.x(Math.max(s.end, s.endWindow?.[1] ?? s.end) + 1);
    if (!inView(x0, x1)) return null;
    const fadeIn = s.startWindow ? scale.x(s.startWindow[1]) - x0 : 0;
    const fadeOut = s.endWindow ? x1 - scale.x(s.endWindow[0] + 1) : 0;
    const track = data.tracks.find((t) => t.id === trackId)!;
    const approx = !!(s.startWindow || s.endWindow || track.span?.circa);
    return (
      <div
        key={`span-${trackId}`}
        className="tl-span"
        style={
          {
            left: labelW + x0,
            width: x1 - x0,
            '--track-color': track.color,
            '--fade-in': `${Math.max(0, fadeIn)}px`,
            '--fade-out': `${Math.max(0, fadeOut)}px`,
          } as React.CSSProperties
        }
        title={`${track.name}: ${formatYear(s.start, cal, approx)} – ${formatYear(s.end, cal, approx)}`}
      />
    );
  };

  return (
    <div
      className={`tl-scroller ${related ? 'has-focus' : ''}${editMode ? ' editing' : ''}`}
      ref={scrollerRef}
      onScroll={onScroll}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div className="tl-canvas" style={{ width: canvasW }}>
        <div className="tl-ruler" style={{ width: canvasW }}>
          <div className="tl-corner" style={{ width: labelW }}>
            <span>Year</span>
            <small>{increment} yr / tick</small>
          </div>
          {visibleTicks.map((t) => (
            <div
              key={t}
              className={`tl-tick ${t === era ? 'era' : ''} ${isMajorTick(t, increment, cal) ? 'major' : ''}`}
              style={{ left: labelW + scale.x(t) }}
            >
              {!gapStarts.has(t) && <span>{formatYear(t, cal)}</span>}
            </div>
          ))}
          {gaps.map((g) => (
            <div key={g.y0} className="tl-gap-label" style={{ left: labelW + g.x0, width: g.x1 - g.x0 }}>
              <span title={`${formatYear(g.y0, cal)} – ${formatYear(g.y1, cal)} compressed`}>⋯ {g.y1 - g.y0} yrs ⋯</span>
            </div>
          ))}
        </div>

        <div className="tl-lanes" style={{ height: layout.height }}>
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

          {layout.lanes.map(({ lane, height, marks, top, overflow }) => {
            const image = safeUrl(lane.track.image);
            return (
              <div
                key={lane.id}
                className={`tl-lane${lane.depth ? ' nested' : ''}${lane.depth > 1 ? ' deep' : ''}${lane.collapsed ? ' collapsed' : ''}${groupColor.has(lane.id) ? (lane.depth ? ' in-group' : ' group-head') : ''}`}
                style={{ height, '--track-color': lane.track.color, '--depth': lane.depth, '--group-color': groupColor.get(lane.id) } as React.CSSProperties}
                onDoubleClick={onLaneDoubleClick(lane.id)}
                onPointerDown={onLanePointerDown(lane.id)}
                onPointerMove={onLanePointerMove}
                onPointerUp={cancelPress}
                onPointerCancel={cancelPress}
              >
                {lane.members.map((id) => {
                  const s = spans.get(id);
                  return s ? spanBand(id, s) : null;
                })}
                <div className="tl-lane-label" style={{ width: labelW }}>
                  <span className="chip" />
                  {image && <img src={image} alt="" className="logo" />}
                  <span className="name" title={lane.track.name}>
                    {lane.track.name}
                  </span>
                  {editMode && (
                    <span className="lane-edit">
                      <button className="icon small" title={`Edit ${lane.track.name}`} onClick={() => props.onEditTrack(lane.id)}>
                        ✎
                      </button>
                      <button className="icon small" title="Move up" onClick={() => props.onMoveTrack(lane.id, -1)}>
                        ↑
                      </button>
                      <button className="icon small" title="Move down" onClick={() => props.onMoveTrack(lane.id, 1)}>
                        ↓
                      </button>
                      <button className="icon small" title={`Add a sub-track under ${lane.track.name}`} onClick={() => props.onAddTrack(lane.id)}>
                        +
                      </button>
                    </span>
                  )}
                  {(overflow > 0 || expanded[lane.id]) && (
                    <button
                      className="collapse"
                      title={expanded[lane.id] ? 'Limit rows (fold crowded events into +N badges)' : `Show all rows (${overflow} events folded)`}
                      onClick={() => setExpanded((x) => ({ ...x, [lane.id]: !x[lane.id] }))}
                    >
                      {expanded[lane.id] ? '⇡' : '⇣'}
                    </button>
                  )}
                  {lane.hasChildren && (
                    <button
                      className="collapse"
                      title={lane.collapsed ? 'Expand sub-tracks' : 'Collapse sub-tracks into this lane'}
                      onClick={() => props.onToggleCollapsed(lane.id)}
                    >
                      {lane.collapsed ? '▸' : '▾'}
                    </button>
                  )}
                </div>
                {marks
                  .filter((m) => inView(Math.min(m.x0, m.whisker?.[0] ?? m.x0), m.footprintEnd))
                  .map((m) => {
                    if (m.kind === 'cluster') {
                      const ids = m.eventIds!;
                      const evs = ids.map((id) => eventsById.get(id)!);
                      const titles = evs.map((e) => `${formatYear(e.start, cal, isApprox(e))} · ${e.title}`);
                      const years = evs.map((e) => e.start);
                      const mid = (Math.min(...years) + Math.max(...years)) / 2;
                      return (
                        <button
                          key={m.key}
                          className={`tl-mark cluster ${ids.some((id) => related?.has(id)) ? 'related' : ''}`}
                          style={{ left: labelW + m.x0 - POINT_HALF, top: m.cy - top - MARK_H / 2 }}
                          title={`${ids.length} more events (click to zoom in):\n${titles.join('\n')}`}
                          onClick={() => {
                            if (!props.onZoomIn(mid)) setExpanded((x) => ({ ...x, [lane.id]: true }));
                          }}
                        >
                          +{ids.length}
                        </button>
                      );
                    }
                    const e = eventsById.get(m.eventId)!;
                    const uncertain = !!(m.fadeIn || m.fadeOut || m.whisker);
                    const cls = [
                      'tl-mark',
                      m.span ? 'span' : 'point',
                      uncertain ? 'uncertain' : '',
                      e.tracks.length > 1 ? 'multi' : '',
                      e.importance === 1 ? 'key' : '',
                      selectedId === e.uuid ? 'selected' : '',
                      related?.has(e.uuid) ? 'related' : '',
                      editMode && e.edited ? 'edited' : '',
                    ].join(' ');
                    const left = m.span ? m.x0 : m.x0 - POINT_HALF;
                    return (
                      <button
                        key={m.key}
                        className={cls}
                        style={{
                          left: labelW + left,
                          // cy is relative to the lanes area; marks are positioned within their lane
                          top: m.cy - top - MARK_H / 2,
                          width: m.footprintEnd - left,
                          '--bar-w': `${m.x1 - m.x0}px`,
                          '--fade-in': `${m.fadeIn ?? 0}px`,
                          '--fade-out': `${m.fadeOut ?? 0}px`,
                        } as React.CSSProperties}
                        title={`${e.title}\n${formatEventDates(e, cal, isApprox(e))}`}
                        onMouseEnter={() => setHoverId(e.uuid)}
                        onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(e.uuid)}
                        onBlur={() => setHoverId(null)}
                        onClick={() => onSelect(e.uuid)}
                      >
                        {m.whisker && (
                          <span
                            className="whisker"
                            style={{ left: m.whisker[0] - left, width: m.whisker[1] - m.whisker[0] }}
                          />
                        )}
                        {m.span ? <span className="bar" /> : <span className="diamond" />}
                        <span
                          className="label"
                          style={
                            m.span
                              ? // keep a long bar's title readable when the bar starts off-screen to the left
                                { left: Math.max(m.fadeIn ?? 0, Math.min(view.left - m.x0, m.x1 - m.x0 - 120)) }
                              : undefined
                          }
                        >
                          {e.title}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
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
