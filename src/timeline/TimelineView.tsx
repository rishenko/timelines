import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../types.ts';
import { buildScale } from './scale.ts';
import { anchorsFor } from './anchors.ts';
import { buildLanes, layoutLanes, type Mark } from './layout.ts';
import { formatEventDates } from '../lib/years.ts';
import { eraStart, formatYear, isMajorTick } from '../lib/calendar.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';
import { MAX_DEPTH } from '../data/validate.ts';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import { safeUrl } from '../lib/urls.ts';

export const LABEL_W = 220;
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ left: 0, width: 1200 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const centerYearRef = useRef(props.initialCenterYear);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const lanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
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

  const visibleWidth = () => (scrollerRef.current?.clientWidth ?? 1200) - LABEL_W;

  const centerOn = useCallback(
    (year: number, smooth = false) => {
      const el = scrollerRef.current;
      if (!el) return;
      const left = scale.x(year) - visibleWidth() / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'instant' });
      centerYearRef.current = year;
    },
    [scale],
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
      const right = left + el.clientWidth - LABEL_W;
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

  // Only render what is near the viewport (one screen either side).
  const lo = view.left - view.width;
  const hi = view.left + view.width * 2;
  const inView = (x0: number, x1: number) => x1 >= lo && x0 <= hi;

  const ticks = useMemo(() => scale.ticks(), [scale]);
  const visibleTicks = ticks.filter((t) => inView(scale.x(t), scale.x(t)));
  const gaps = scale.gaps().filter((g) => inView(g.x0, g.x1));
  // a tick at the start of a gap would print its label over the gap break
  const gapStarts = useMemo(() => new Set(scale.gaps().map((g) => g.y0)), [scale]);
  const canvasW = LABEL_W + scale.width + END_PAD;
  const era = eraStart(cal);

  const onLaneDoubleClick = (trackId: string) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || (ev.target !== ev.currentTarget && !(ev.target as HTMLElement).classList.contains('tl-span'))) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const contentX = ev.clientX - rect.left - LABEL_W;
    props.onCreateAt(trackId, Math.floor(scale.yearAt(contentX)));
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
            left: LABEL_W + x0,
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
      className={`tl-scroller ${related ? 'has-focus' : ''}`}
      ref={scrollerRef}
      onScroll={onScroll}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div className="tl-canvas" style={{ width: canvasW }}>
        <div className="tl-ruler" style={{ width: canvasW }}>
          <div className="tl-corner" style={{ width: LABEL_W }}>
            <span>Year</span>
            <small>{increment} yr / tick</small>
          </div>
          {visibleTicks.map((t) => (
            <div
              key={t}
              className={`tl-tick ${t === era ? 'era' : ''} ${isMajorTick(t, increment, cal) ? 'major' : ''}`}
              style={{ left: LABEL_W + scale.x(t) }}
            >
              {!gapStarts.has(t) && <span>{formatYear(t, cal)}</span>}
            </div>
          ))}
          {gaps.map((g) => (
            <div key={g.y0} className="tl-gap-label" style={{ left: LABEL_W + g.x0, width: g.x1 - g.x0 }}>
              <span title={`${formatYear(g.y0, cal)} – ${formatYear(g.y1, cal)} compressed`}>⋯ {g.y1 - g.y0} yrs ⋯</span>
            </div>
          ))}
        </div>

        <div className="tl-lanes" style={{ height: layout.height }}>
          <div className="tl-grid" style={{ left: LABEL_W }}>
            {visibleTicks.map((t) => (
              <div key={t} className={`tl-gridline ${t === era ? 'era' : ''}`} style={{ left: scale.x(t) }} />
            ))}
            {gaps.map((g) => (
              <div key={g.y0} className="tl-gap-band" style={{ left: g.x0, width: g.x1 - g.x0 }} />
            ))}
          </div>

          <ConnectionLayer
            left={LABEL_W}
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
                className={`tl-lane depth-${lane.depth} ${lane.collapsed ? 'collapsed' : ''}`}
                style={{ height, '--track-color': lane.track.color } as React.CSSProperties}
                onDoubleClick={onLaneDoubleClick(lane.id)}
              >
                {lane.members.map((id) => {
                  const s = spans.get(id);
                  return s ? spanBand(id, s) : null;
                })}
                <div className="tl-lane-label" style={{ width: LABEL_W }}>
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
                      {lane.depth < MAX_DEPTH && (
                        <button
                          className="icon small"
                          title={`Add a sub-track under ${lane.track.name}`}
                          onClick={() => props.onAddTrack(lane.id)}
                        >
                          +
                        </button>
                      )}
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
                          style={{ left: LABEL_W + m.x0 - POINT_HALF, top: m.cy - top - MARK_H / 2 }}
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
                          left: LABEL_W + left,
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
              <button style={{ width: LABEL_W }} onClick={() => props.onAddTrack()}>
                + Add a track
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
