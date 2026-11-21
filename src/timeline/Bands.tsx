import type { Calendar, Track } from '../types.ts';
import { spanDates } from '../lib/lifespan.ts';
import { isApprox, type ResolvedSpan } from '../lib/chronology.ts';
import type { Scale } from './scale.ts';
import type { PhaseCell } from './layout.ts';
import { successionTip } from '../lib/succession.ts';

/**
 * Where a lifespan or phase sits, in content px: from the earliest possible start to the latest possible end, with
 * the stretches its sources leave uncertain at each end (drawn fading in and out).
 */
function bandBox(scale: Scale, s: ResolvedSpan) {
  const x0 = scale.x(Math.min(s.start, s.startWindow?.[0] ?? s.start));
  const x1 = scale.x(Math.max(s.end, s.endWindow?.[1] ?? s.end) + 1);
  const fadeIn = s.startWindow ? scale.x(s.startWindow[1]) - x0 : 0;
  const fadeOut = s.endWindow ? x1 - scale.x(s.endWindow[0] + 1) : 0;
  return { x0, x1, fadeIn, fadeOut };
}

const bandStyle = (labelW: number, b: ReturnType<typeof bandBox>, color: string) =>
  ({
    left: labelW + b.x0,
    width: b.x1 - b.x0,
    '--track-color': color,
    '--fade-in': `${Math.max(0, b.fadeIn)}px`,
    '--fade-out': `${Math.max(0, b.fadeOut)}px`,
  }) as React.CSSProperties;

interface Common {
  scale: Scale;
  cal: Calendar;
  labelW: number;
  /** Whether content px x0..x1 is near the viewport (only those bands are drawn). */
  inView: (x0: number, x1: number) => boolean;
  /** An event's title by uuid: tooltips name the events that began and ended a lifespan or phase. */
  eventTitle?: (id: string) => string | undefined;
}

const noTitle = () => undefined;

/**
 * One stretch of a row's lifespan: a soft band across the lane, fading across uncertain ends; the only thing that
 * colours a row's background. A lifespan with gaps is several bands. An ongoing one runs to the present and ends in an
 * arrow on its top edge (kept at the right of the view while its end is off screen), unless a phase's strip already
 * on screen shows it is still going (`cue: false`).
 */
export function SpanBand({
  track,
  span,
  scale,
  cal,
  labelW,
  inView,
  cue = true,
  title,
  eventTitle = noTitle,
}: Common & { track: Track; span: ResolvedSpan; cue?: boolean; title?: string }) {
  const b = bandBox(scale, span);
  if (!inView(b.x0, b.x1)) return null;
  const approx = isApprox(span);
  return (
    <div
      className="tl-span"
      style={bandStyle(labelW, b, track.color)}
      title={`${title ?? track.name}: ${spanDates(span, cal, approx)}${span.derived && !title ? ' (from its phases)' : ''}${title ? '' : successionTip(span, eventTitle)}`}
    >
      {span.ongoing && cue && (
        <div className="tl-ongoing-run">
          <span className="tl-ongoing span-cue" />
        </div>
      )}
    </div>
  );
}

/**
 * A phase in its row's strip (see layoutPhaseStrips): a tinted cell (alternating shades on its line, fading across
 * uncertain edges), a line where it begins and another where it ends (unless the next phase begins there), an arrow
 * instead of an end when it is still going, and its name where it fits. Display only: hovering it shows its name and
 * dates, and clicks go through to the row.
 */
export function PhaseStripCell({
  cell: c,
  color,
  cal,
  labelW,
  inView,
  eventTitle = noTitle,
}: Omit<Common, 'scale'> & { cell: PhaseCell; color: string }) {
  const p = c.phase;
  if (!inView(c.x0, c.x1)) return null;
  const tip = `${p.name}: ${spanDates(p, cal, isApprox(p))}${successionTip(p, eventTitle)}`;
  return (
    <div
      className={`tl-phase${c.alt ? ' alt' : ''}${c.line.named ? '' : ' thin'}${c.name?.outside ? ' has-outside' : ''}`}
      style={
        {
          left: labelW + c.x0,
          width: c.x1 - c.x0,
          top: c.line.top,
          height: c.line.height,
          '--track-color': color,
          '--fade-in': `${c.fadeIn}px`,
          '--fade-out': `${c.fadeOut}px`,
        } as React.CSSProperties
      }
    >
      <div className="tl-phase-fill" title={tip} />
      {c.startX >= c.x0 && <div className="tl-phase-edge" style={{ left: c.startX - c.x0 }} />}
      {c.endX !== null && <div className="tl-phase-edge end" style={{ left: c.endX - c.x0 }} />}
      {p.ongoing && (
        <div className="tl-ongoing-run">
          <span className="tl-ongoing" />
        </div>
      )}
      {c.name && (
        <div className={`tl-phase-names${c.name.outside ? ` outside ${c.name.outside}` : ''}`} style={{ left: c.name.x0 - c.x0, width: c.name.x1 - c.name.x0 }}>
          {/* (a still-going phase's name keeps clear of its arrow at the right of the view) */}
          <span
            className="tl-phase-name"
            style={{ left: labelW, maxWidth: c.name.x1 - c.name.x0, marginRight: p.ongoing && !c.name.outside ? 12 : 0 }}
            title={tip}
          >
            {p.name}
          </span>
        </div>
      )}
    </div>
  );
}
