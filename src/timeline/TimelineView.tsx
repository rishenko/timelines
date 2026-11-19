import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildGrid, labelStopKey, move, relocate, type Move } from './keyboard.ts';
import type { Dataset } from '../types.ts';
import type { FocusRequest } from '../state/focus.ts';
import { buildScale } from './scale.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes, placePhases, type Mark, type PlacedPhase } from './layout.ts';
import { formatEventDates } from '../lib/years.ts';
import { eraStart, formatYear, isMajorTick } from '../lib/calendar.ts';
import { isApprox, type ResolvedEvent, type ResolvedPhase, type ResolvedSpan } from '../lib/chronology.ts';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import { safeUrl } from '../lib/urls.ts';
import { rootOf, trackIndex } from '../lib/tracks.ts';
import { useLabelWidth, useLongPress, usePinchSteps } from './gestures.ts';

const END_PAD = 260;
const MARK_H = 22;
const POINT_HALF = 7;
/** Height of one line of phase names at the top of a lane. */
const PHASE_H = 16;
/** The narrowest room for a phase's name (about five capitals); narrower phases show no name until zoomed in. */
const PHASE_NAME_MIN_W = 64;

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
  edgeLinks?: { side: 'before' | 'after'; year: number; label: string; title: string; href: string }[];
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

const KEY_MOVES: Record<string, Move> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'home',
  End: 'end',
  PageUp: 'page-left',
  PageDown: 'page-right',
};

export function TimelineView(props: Props) {
  const {
    data,
    events,
    eventsById,
    spans,
    phases,
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
  const trackNames = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  const labelW = useLabelWidth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ left: 0, width: 1200 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const centerYearRef = useRef(props.initialCenterYear);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const lanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
  // A top-level row with sub-rows is a group: its rows share its colour as a background tint.
  const groupColor = useMemo(() => {
    const byId = trackIndex(data.tracks);
    const parents = new Set(data.tracks.map((t) => t.parent));
    const out = new Map<string, string>();
    for (const t of data.tracks) {
      const root = rootOf(t.id, byId);
      if (root && parents.has(root.id)) out.set(t.id, root.color);
    }
    return out;
  }, [data.tracks]);
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
    for (const l of lanes) for (const id of l.members) {
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

  // A focus request (search, links, zoom): scroll to its years and, if it names a row, to that row. Rows it
  // unfolds are already in this render's layout, since the request arrives in the same update.
  const lanesRef = useRef<HTMLDivElement>(null);
  /** When the last focus request scrolled; a selection made with it shouldn't re-scroll and cut it short. */
  const focusedAtRef = useRef(-Infinity);
  const [flashLane, setFlashLane] = useState<string | null>(null);
  useEffect(() => {
    const f = props.focus;
    const el = scrollerRef.current;
    if (!f || !el) return;
    const vw = el.clientWidth - labelW;
    let left = scale.x(f.year) - vw / 2;
    if (f.range) {
      const x0 = scale.x(f.range[0]);
      const x1 = scale.x(f.range[1] + 1);
      left = x1 - x0 <= vw * 0.85 ? (x0 + x1) / 2 - vw / 2 : x0 - vw * 0.08;
    }
    left = Math.max(0, left);
    centerYearRef.current = Math.round(scale.yearAt(left + vw / 2));
    let top = el.scrollTop;
    const lane = f.trackId
      ? layout.lanes.find((l) => l.lane.id === f.trackId) ?? layout.lanes.find((l) => l.lane.members.includes(f.trackId!))
      : undefined;
    if (lane && lanesRef.current) {
      const rulerH = lanesRef.current.offsetTop;
      const laneTop = rulerH + lane.top;
      const viewTop = el.scrollTop + rulerH;
      const viewBottom = el.scrollTop + el.clientHeight;
      // only move if the row isn't fully on screen; then put it a third of the way down
      if (laneTop < viewTop || laneTop + lane.height > viewBottom)
        top = Math.max(0, laneTop - rulerH - (el.clientHeight - rulerH) / 3);
      // off then on, so picking the same row again replays the highlight
      const id = lane.lane.id;
      setFlashLane(null);
      requestAnimationFrame(() => setFlashLane(id));
    }
    focusedAtRef.current = performance.now();
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, top, behavior: calm ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focus]);
  useEffect(() => {
    if (!flashLane) return;
    const t = setTimeout(() => setFlashLane(null), 1800);
    return () => clearTimeout(t);
  }, [flashLane]);

  // After a selection (which may open the side panel and narrow the view), make sure the event is on screen.
  useEffect(() => {
    if (!selectedId || performance.now() - focusedAtRef.current < 200) return;
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

  // Two-finger pinch steps through the zoom levels, keeping the center year.
  const { onPinchZoom } = props;
  const pinch = usePinchSteps(onPinchZoom && ((dir) => onPinchZoom(dir, centerYearRef.current)));

  // Only render what is near the viewport (one screen either side).
  // ---- keyboard: the chart is one Tab stop; arrows move between its controls (rules in ./keyboard.ts) ----
  const grid = useMemo(
    () =>
      buildGrid(layout.lanes, (l) => [
        ...(l.overflow > 0 || expanded[l.lane.id] ? [labelStopKey(l.lane.id, 'overflow')] : []),
        ...(l.lane.hasChildren ? [labelStopKey(l.lane.id, 'fold')] : []),
      ]),
    [layout, expanded],
  );
  /** The control that holds the chart's one Tab stop, with what it held (to find it again after a zoom or fold). */
  const [active, setActive] = useState<{ key: string; laneId: string; eventIds: string[] } | null>(null);
  const focusPending = useRef(false);
  const stopInfo = (key: string) => {
    for (const l of grid) {
      const st = l.stops.find((x) => x.key === key);
      if (st) return { key, laneId: l.laneId, eventIds: st.eventIds };
    }
    return null;
  };
  const rovingKey = useMemo(() => {
    const stops = grid.flatMap((l) => l.stops);
    if (active && stops.some((st) => st.key === active.key)) return active.key;
    const again = active && relocate(grid, active.laneId, active.eventIds);
    if (again) return again;
    const sel = selectedId ? stops.find((st) => !st.label && st.eventIds.includes(selectedId)) : undefined;
    if (sel) return sel.key;
    // else the first event at or after the left edge of the view, top to bottom
    return (stops.find((st) => !st.label && st.x >= view.left) ?? stops.find((st) => !st.label) ?? stops[0])?.key ?? null;
  }, [grid, active, selectedId, view.left]);
  const goTo = (key: string) => {
    setActive(stopInfo(key));
    focusPending.current = true;
  };
  const onStopFocus = (key: string) => {
    if (active?.key !== key) setActive(stopInfo(key));
  };
  // after a key moved focus: focus the control and keep it in sight, clear of the sticky labels and ruler
  useEffect(() => {
    if (!focusPending.current || !rovingKey) return;
    focusPending.current = false;
    const el = lanesRef.current?.querySelector<HTMLElement>(`[data-stop="${CSS.escape(rovingKey)}"]`);
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const left = box.left + labelW;
    const top = box.top + (lanesRef.current?.offsetTop ?? 0);
    if (!el.closest('.tl-lane-label') && (r.left < left || r.left > box.right - 40))
      scroller.scrollLeft += r.left - (left + (box.width - labelW) / 3);
    if (r.top < top || r.bottom > box.bottom) scroller.scrollTop += r.top - (top + 40);
  });
  const onKeyNav = (ev: React.KeyboardEvent) => {
    const key = (ev.target as HTMLElement).closest('[data-stop]')?.getAttribute('data-stop');
    if (!key || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const m = KEY_MOVES[ev.key];
    if (m) {
      ev.preventDefault();
      const to = move(grid, key, m, view.width - labelW);
      if (to) goTo(to);
    } else if (ev.key === '+' || ev.key === '=' || ev.key === '-' || ev.key === '_') {
      ev.preventDefault();
      const info = stopInfo(key);
      const e = info?.eventIds.map((id) => eventsById.get(id)).find(Boolean);
      props.onKeyZoom?.(ev.key === '+' || ev.key === '=' ? 1 : -1, e ? e.start : centerYearRef.current);
      setActive(info);
      focusPending.current = true;
    } else if (ev.key === 'Escape' && selectedId) {
      ev.preventDefault();
      onSelect(null);
    } else if (ev.key === '?') {
      ev.preventDefault();
      props.onShowKeys?.();
    }
  };

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
  const press = useLongPress();
  const onLanePointerDown = (trackId: string) => (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || ev.pointerType !== 'touch' || !isEmptySpot(ev.target, ev.currentTarget)) return;
    const lane = ev.currentTarget;
    const x = ev.clientX;
    press.start(x, ev.clientY, () => createAt(trackId, lane, x));
  };

  /** Shaded lifespan band, fading across uncertain ends. */
  const spanBand = (trackId: string, s: ResolvedSpan) => {
    const x0 = scale.x(Math.min(s.start, s.startWindow?.[0] ?? s.start));
    const x1 = scale.x(Math.max(s.end, s.endWindow?.[1] ?? s.end) + 1);
    if (!inView(x0, x1)) return null;
    const fadeIn = s.startWindow ? scale.x(s.startWindow[1]) - x0 : 0;
    const fadeOut = s.endWindow ? x1 - scale.x(s.endWindow[0] + 1) : 0;
    const track = data.tracks.find((t) => t.id === trackId)!;
    const approx = isApprox(s, track.span?.circa);
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

  /**
   * A phase on its row's bar: a tinted fill (alternating strength, so neighbours read apart, fading across uncertain
   * edges), a line where it begins, and its name in the strip at the top of the lane, kept in view while scrolling.
   */
  const phaseBand = (p: PlacedPhase, i: number) => {
    const x0 = scale.x(Math.min(p.start, p.startWindow?.[0] ?? p.start));
    const x1 = scale.x(Math.max(p.end, p.endWindow?.[1] ?? p.end) + 1);
    if (!inView(x0, x1)) return null;
    const track = data.tracks.find((t) => t.id === p.trackId)!;
    const fadeIn = p.startWindow ? scale.x(p.startWindow[1]) - x0 : 0;
    const fadeOut = p.endWindow ? x1 - scale.x(p.endWindow[0] + 1) : 0;
    const approx = isApprox(p);
    const dates = `${formatYear(p.start, cal, approx)} – ${formatYear(p.end, cal, approx)}`;
    return (
      <div
        key={`phase-${p.trackId}-${i}`}
        className={`tl-phase${i % 2 ? ' alt' : ''}`}
        style={
          {
            left: labelW + x0,
            width: x1 - x0,
            '--track-color': track.color,
            '--fade-in': `${Math.max(0, fadeIn)}px`,
            '--fade-out': `${Math.max(0, fadeOut)}px`,
          } as React.CSSProperties
        }
      >
        <div className="tl-phase-fill" />
        <div className="tl-phase-edge" style={{ left: scale.x(p.start) - x0 }} />
        {/* a name only where a few letters fit: "O…" over a cluster of edges can't be read; zoom in to see it */}
        {x1 - x0 - 6 >= PHASE_NAME_MIN_W && (
          <span
            className="tl-phase-name"
            style={{ marginTop: p.level * PHASE_H, left: labelW, maxWidth: x1 - x0 - 6 }}
            title={`${p.name}: ${dates}`}
          >
            {p.name}
          </span>
        )}
      </div>
    );
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
        <div className="tl-ruler" style={{ width: canvasW }}>
          <div className="tl-corner" style={{ width: labelW }}>
            <span>Year</span>
            <small>{increment} yr / tick</small>
            {props.keyEventsOnly && (
              <small className="key-only" title="At the widest zoom only key events are drawn; zoom in to see them all">
                Key events only
              </small>
            )}
          </div>
          {visibleTicks.map((t) => (
            <div
              key={t}
              className={`tl-tick ${t === era ? 'era' : ''} ${isMajorTick(t, increment, cal) ? 'major' : ''}`}
              aria-hidden="true"
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
          {props.edgeLinks?.map((l) => (
            <a
              key={l.side + l.href}
              className={`tl-edge-link ${l.side}`}
              href={l.href}
              style={{ left: labelW + scale.x(l.year) + 4 }}
              title={l.title}
            >
              {l.side === 'before' ? `← ${l.label}` : `${l.label} →`}
            </a>
          ))}
        </div>

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

          {layout.lanes.map(({ lane, height, marks, top, overflow }) => {
            const image = safeUrl(lane.track.image);
            return (
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
                  return s ? spanBand(id, s) : null;
                })}
                {lanePhases.get(lane.id)?.map(phaseBand)}
                <div className="tl-lane-label" style={{ width: labelW }}>
                  <span className="chip" />
                  {image && <img src={image} alt="" className="logo" />}
                  <span className="name" title={lane.track.name}>
                    {lane.track.name}
                  </span>
                  {editMode && (
                    <span className="lane-edit">
                      <button className="icon small" aria-label={`Edit ${lane.track.name}`} title={`Edit ${lane.track.name}`} onClick={() => props.onEditTrack(lane.id)}>
                        ✎
                      </button>
                      <button className="icon small" aria-label={`Move ${lane.track.name} up`} title="Move up" onClick={() => props.onMoveTrack(lane.id, -1)}>
                        ↑
                      </button>
                      <button className="icon small" aria-label={`Move ${lane.track.name} down`} title="Move down" onClick={() => props.onMoveTrack(lane.id, 1)}>
                        ↓
                      </button>
                      <button className="icon small" aria-label={`Add a sub-track under ${lane.track.name}`} title={`Add a sub-track under ${lane.track.name}`} onClick={() => props.onAddTrack(lane.id)}>
                        +
                      </button>
                    </span>
                  )}
                  {(overflow > 0 || expanded[lane.id]) && (
                    <button
                      className="collapse"
                      aria-label={`All events in ${lane.track.name}${expanded[lane.id] ? '' : ` (${overflow} folded)`}`}
                      aria-expanded={!!expanded[lane.id]}
                      data-stop={labelStopKey(lane.id, 'overflow')}
                      tabIndex={rovingKey === labelStopKey(lane.id, 'overflow') ? 0 : -1}
                      onFocus={() => onStopFocus(labelStopKey(lane.id, 'overflow'))}
                      title={expanded[lane.id] ? 'Limit rows (fold crowded events into +N badges)' : `Show all rows (${overflow} events folded)`}
                      onClick={() => setExpanded((x) => ({ ...x, [lane.id]: !x[lane.id] }))}
                    >
                      {expanded[lane.id] ? '⇡' : '⇣'}
                    </button>
                  )}
                  {lane.hasChildren && (
                    <button
                      className="collapse"
                      aria-label={`Sub-rows of ${lane.track.name}`}
                      aria-expanded={!lane.collapsed}
                      data-stop={labelStopKey(lane.id, 'fold')}
                      tabIndex={rovingKey === labelStopKey(lane.id, 'fold') ? 0 : -1}
                      onFocus={() => onStopFocus(labelStopKey(lane.id, 'fold'))}
                      title={lane.collapsed ? 'Expand sub-tracks' : 'Collapse sub-tracks into this lane'}
                      onClick={() => props.onToggleCollapsed(lane.id)}
                    >
                      {lane.collapsed ? '▸' : '▾'}
                    </button>
                  )}
                </div>
                {marks
                  .filter((m) => m.key === rovingKey || inView(Math.min(m.x0, m.whisker?.[0] ?? m.x0), m.footprintEnd))
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
                          aria-label={`${ids.length} more events, ${formatYear(Math.min(...years), cal)} to ${formatYear(Math.max(...years), cal)}; zoom in`}
                          data-stop={m.key}
                          tabIndex={m.key === rovingKey ? 0 : -1}
                          onFocus={() => onStopFocus(m.key)}
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
                        aria-label={[
                          e.title,
                          formatEventDates(e, cal, isApprox(e)),
                          e.tracks.map((t) => trackNames.get(t) ?? t).join(' and '),
                          e.importance === 1 ? 'key event' : '',
                          uncertain ? 'uncertain date' : '',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                        aria-pressed={selectedId === e.uuid}
                        data-event-id={e.uuid}
                        onMouseEnter={() => setHoverId(e.uuid)}
                        onMouseLeave={() => setHoverId(null)}
                        data-stop={m.key}
                        tabIndex={m.key === rovingKey ? 0 : -1}
                        onFocus={() => {
                          setHoverId(e.uuid);
                          onStopFocus(m.key);
                        }}
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
