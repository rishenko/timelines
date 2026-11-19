import type { Calendar } from '../types.ts';
import { formatYear, isMajorTick } from '../lib/calendar.ts';
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
  /** The ticks near the viewport (only those are drawn). */
  ticks: number[];
  /** Ticks where a compressed gap starts: their label would sit on the gap's break, so it is left out. */
  gapStarts: Set<number>;
  gaps: Segment[];
  /** The year the era changes (drawn as a stronger tick). */
  era: number;
  edgeLinks?: EdgeLink[];
}

/** The sticky year ruler: the corner over the row labels, ticks, compressed gaps and links to neighbouring timelines. */
export function Ruler({ scale, cal, labelW, width, increment, keyEventsOnly, ticks, gapStarts, gaps, era, edgeLinks }: Props) {
  return (
    <div className="tl-ruler" style={{ width }}>
      <div className="tl-corner" style={{ width: labelW }}>
        <span>Year</span>
        <small>{increment} yr / tick</small>
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
          {!gapStarts.has(t) && <span>{formatYear(t, cal)}</span>}
        </div>
      ))}
      {gaps.map((g) => (
        <div key={g.y0} className="tl-gap-label" style={{ left: labelW + g.x0, width: g.x1 - g.x0 }}>
          <span title={`${formatYear(g.y0, cal)} – ${formatYear(g.y1, cal)} compressed`}>⋯ {g.y1 - g.y0} yrs ⋯</span>
        </div>
      ))}
      {edgeLinks?.map((l) => (
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
  );
}
