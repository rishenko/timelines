import { memo } from 'react';
import type { Calendar } from '../types.ts';
import { formatEventDates } from '../lib/years.ts';
import { formatDate, formatYear } from '../lib/calendar.ts';
import { isApprox, type ResolvedEvent } from '../lib/chronology.ts';
import type { Mark } from './layout.ts';

const MARK_H = 22;
const POINT_HALF = 7;

interface Common {
  mark: Mark;
  /** The lane's top, in px from the top of the lanes area (marks are positioned within their lane). */
  laneTop: number;
  labelW: number;
  cal: Calendar;
  /** This mark holds the chart's one Tab stop (see useRovingFocus). */
  isTabStop: boolean;
  onStopFocus: (key: string) => void;
}

/** A "+N" badge for events that didn't fit in a crowded lane. Clicking zooms in on them (or shows the lane in full). */
export function ClusterMark({
  mark: m,
  laneTop,
  labelW,
  cal,
  isTabStop,
  onStopFocus,
  events,
  related,
  onClick,
}: Common & { events: ResolvedEvent[]; related: boolean; onClick: (midYear: number) => void }) {
  const titles = events.map((e) => `${formatDate(e.start, e.startMonth, e.startDay, cal, isApprox(e))} · ${e.title}`);
  const years = events.map((e) => e.start);
  const mid = (Math.min(...years) + Math.max(...years)) / 2;
  return (
    <button
      className={`tl-mark cluster ${related ? 'related' : ''}`}
      style={{ left: labelW + m.x0 - POINT_HALF, top: m.cy - laneTop - MARK_H / 2 }}
      title={`${events.length} more events (click to zoom in):\n${titles.join('\n')}`}
      aria-label={`${events.length} more events, ${formatYear(Math.min(...years), cal)} to ${formatYear(Math.max(...years), cal)}; zoom in`}
      data-stop={m.key}
      tabIndex={isTabStop ? 0 : -1}
      onFocus={() => onStopFocus(m.key)}
      onClick={() => onClick(mid)}
    >
      +{events.length}
    </button>
  );
}

interface EventMarkProps extends Common {
  event: ResolvedEvent;
  /** The event's rows, by name, for its accessible name. */
  trackNames: Map<string, string>;
  selected: boolean;
  related: boolean;
  /** Edit mode marks events the reader has changed. */
  showEdited: boolean;
  /** Left edge of the viewport in content px: a long bar keeps its title on screen when it starts off to the left.
   * Values outside the bar draw the same as its nearest end. */
  viewLeft: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/** One event: a bar (with a date range) or a diamond (a single year), with its title beside it. Memoised: scrolling
 * re-renders the chart every frame, and most marks don't change. */
export const EventMark = memo(function EventMark(p: EventMarkProps) {
  const { mark: m, event: e, laneTop, labelW, cal } = p;
  const uncertain = !!(m.fadeIn || m.fadeOut || m.whisker);
  const dates = formatEventDates(e, cal, isApprox(e));
  const cls = [
    'tl-mark',
    m.span ? 'span' : 'point',
    uncertain ? 'uncertain' : '',
    e.tracks.length > 1 ? 'multi' : '',
    e.importance === 1 ? 'key' : '',
    p.selected ? 'selected' : '',
    p.related ? 'related' : '',
    p.showEdited && e.edited ? 'edited' : '',
  ].join(' ');
  const left = m.span ? m.x0 : m.x0 - POINT_HALF;
  return (
    <button
      className={cls}
      style={
        {
          left: labelW + left,
          // cy is relative to the lanes area; marks are positioned within their lane
          top: m.cy - laneTop - MARK_H / 2,
          width: m.footprintEnd - left,
          '--bar-w': `${m.x1 - m.x0}px`,
          '--fade-in': `${m.fadeIn ?? 0}px`,
          '--fade-out': `${m.fadeOut ?? 0}px`,
        } as React.CSSProperties
      }
      title={`${e.title}\n${dates}`}
      aria-label={[
        e.title,
        dates,
        e.tracks.map((t) => p.trackNames.get(t) ?? t).join(' and '),
        e.importance === 1 ? 'key event' : '',
        uncertain ? 'uncertain date' : '',
      ]
        .filter(Boolean)
        .join(', ')}
      aria-pressed={p.selected}
      data-event-id={e.uuid}
      onMouseEnter={() => p.onHover(e.uuid)}
      onMouseLeave={() => p.onHover(null)}
      data-stop={m.key}
      tabIndex={p.isTabStop ? 0 : -1}
      onFocus={() => {
        p.onHover(e.uuid);
        p.onStopFocus(m.key);
      }}
      onBlur={() => p.onHover(null)}
      onClick={() => p.onSelect(e.uuid)}
    >
      {m.whisker && <span className="whisker" style={{ left: m.whisker[0] - left, width: m.whisker[1] - m.whisker[0] }} />}
      {m.span ? <span className="bar" /> : <span className="diamond" />}
      <span
        className="label"
        style={
          m.span
            ? // keep a long bar's title readable when the bar starts off-screen to the left
              { left: Math.max(m.fadeIn ?? 0, Math.min(p.viewLeft - m.x0, m.x1 - m.x0 - 120)) }
            : undefined
        }
      >
        {e.title}
      </span>
    </button>
  );
});
