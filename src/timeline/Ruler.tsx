import type { Calendar } from '../types.ts';
import { formatYear, isMajorTick, tickLabel } from '../lib/calendar.ts';
import { formatSpan, gapLength, incrementLabel } from '../lib/subYear.ts';
import { beforePresent } from '../lib/beforePresent.ts';
import type { Scale, Segment } from './scale.ts';

/** A link to a neighbouring timeline (meta.continues), drawn on the ruler at the year where the two meet. */
export interface EdgeLink {
  side: 'before' | 'after';
  year: number;
  label: string;
  title: string;
  href: string;
}

interface Props {
  scale: Scale;
  cal: Calendar;
  labelW: number;
  /** Width of the whole canvas (labels, years and end padding). */
  width: number;
  increment: number;
  keyEventsOnly?: boolean;
  /** Rows hidden for having nothing in view, while that option is on (undefined: off); the note turns it off. */
  hiddenRows?: number;
  onShowAllRows?: () => void;
  /** The ticks near the viewport (only those are drawn). */
  ticks: number[];
  /** Ticks where a compressed gap starts: their label would sit on the gap's break, so it is left out. */
  gapStarts: Set<number>;
  gaps: Segment[];
  /** The year the era changes (drawn as a stronger tick). */
  era: number;
  edgeLinks?: EdgeLink[];
  /** How far the chart is scrolled sideways (content px): the row-label corner covers the years from here. */
  viewLeft: number;
}

/** The sticky year ruler: the corner over the row labels, ticks, compressed gaps and links to neighbouring timelines. */
/** The corner note's text: "No rows hidden", "1 row hidden", "12 rows hidden". */
const hiddenLabel = (n: number) => (n === 0 ? 'No rows hidden' : `${n} ${n === 1 ? 'row' : 'rows'} hidden`);

export function Ruler({ scale, cal, labelW, width, increment, keyEventsOnly, hiddenRows, onShowAllRows, ticks, gapStarts, gaps, era, edgeLinks, viewLeft }: Props) {
  // below a year, the tick after a compressed gap gives its whole date: the month or year may have changed in the gap
  const gapEnds = increment < 1 ? new Set(gaps.map((g) => g.y1)) : undefined;
  // at week and day zoom that whole date is wider than a tick: the next tick's label is left out to make room
  const crowded = new Set(increment < 1 / 13 ? ticks.filter((_, i) => i > 0 && gapEnds!.has(ticks[i - 1])) : []);
  return (
    <div className="tl-ruler" style={{ width }}>
      <div className="tl-corner" style={{ width: labelW }}>
        <div className="corner-head">
          <span>Year</span>
          {/* a reminder that rows are being hidden (Filters), so it isn't forgotten; clicking shows every row */}
          {hiddenRows !== undefined && (
            <button
              className="rows-hidden"
              onClick={onShowAllRows}
              title="Rows with nothing in view are hidden (Filters). Click to show every row."
              // the name starts with the visible text, so speech input can say what it sees (WCAG 2.5.3)
              aria-label={`${hiddenLabel(hiddenRows)}: nothing in view. Show every row`}
            >
              {hiddenLabel(hiddenRows)}
            </button>
          )}
        </div>
        <small>{incrementLabel(increment)} / tick</small>
        {keyEventsOnly && (
          <small className="key-only" title="At the widest zoom only key events are drawn; zoom in to see them all">
            Key events only
          </small>
        )}
      </div>
      {ticks.map((t) => (
        <div
          key={t}
          className={`tl-tick ${t === era ? 'era' : ''} ${isMajorTick(t, increment, cal) ? 'major' : ''}`}
          aria-hidden="true"
          style={{ left: labelW + scale.x(t) }}
        >
          {!gapStarts.has(t) && !crowded.has(t) && <span>{tickLabel(t, increment, cal, gapEnds?.has(t))}</span>}
        </div>
      ))}
      {gaps.map((g) => (
        <div key={g.y0} className="tl-gap-label" style={{ left: labelW + g.x0, width: g.x1 - g.x0 }}>
          <span title={`${increment < 1 ? `${tickLabel(g.y0, increment, cal, true)} – ${tickLabel(g.y1, increment, cal, true)}` : `${formatYear(g.y0, cal)} – ${formatYear(g.y1, cal)}`} compressed`}>
            {/* whole years exactly as before ("N yrs" as two text nodes, which the browser shapes differently from one) */}
            {/* deep time: short lengths ("540 Myr") */}
            {beforePresent(cal) ? formatSpan(g.y1 - g.y0) : Number.isInteger(g.y1 - g.y0) ? <>{g.y1 - g.y0} yrs</> : gapLength(g.y0, g.y1)}
          </span>
        </div>
      ))}
      {/* a link scrolled under the sticky corner is left out: only a sliver of it would show beside the corner, a
          target too small to tap and too close to the corner's button (WCAG 2.5.8) */}
      {edgeLinks?.map((l) => ({ l, left: labelW + scale.x(l.year) + 4 })).filter(({ left }) => left >= viewLeft + labelW).map(({ l, left }) => (
        <a
          key={l.side + l.href}
          className={`tl-edge-link ${l.side}`}
          href={l.href}
          style={{ left }}
          title={l.title}
        >
          {l.side === 'before' ? `← ${l.label}` : `${l.label} →`}
        </a>
      ))}
    </div>
  );
}
