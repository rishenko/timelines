import type { Calendar, Track } from '../types.ts';
import { formatYear } from '../lib/calendar.ts';
import { isApprox, type ResolvedSpan } from '../lib/chronology.ts';
import type { Scale } from './scale.ts';
import type { PlacedPhase } from './layout.ts';

/** Height of one line of phase names at the top of a lane. */
export const PHASE_H = 16;
/** The narrowest room for a phase's name (about five capitals); narrower phases show no name until zoomed in. */
const PHASE_NAME_MIN_W = 64;

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
}

/** A row's lifespan: a soft band across the lane, fading across uncertain ends. */
export function SpanBand({ track, span, scale, cal, labelW, inView }: Common & { track: Track; span: ResolvedSpan }) {
  const b = bandBox(scale, span);
  if (!inView(b.x0, b.x1)) return null;
  const approx = isApprox(span);
  return (
    <div
      className="tl-span"
      style={bandStyle(labelW, b, track.color)}
      title={`${track.name}: ${formatYear(span.start, cal, approx)} – ${formatYear(span.end, cal, approx)}`}
    />
  );
}

/**
 * A phase on its row's bar: a tinted fill (alternating strength, so neighbours read apart, fading across uncertain
 * edges), a line where it begins, and its name in the strip at the top of the lane, kept in view while scrolling.
 */
export function PhaseBand({
  phase: p,
  color,
  alt,
  scale,
  cal,
  labelW,
  inView,
}: Common & { phase: PlacedPhase; color: string; alt: boolean }) {
  const b = bandBox(scale, p);
  if (!inView(b.x0, b.x1)) return null;
  const approx = isApprox(p);
  const dates = `${formatYear(p.start, cal, approx)} – ${formatYear(p.end, cal, approx)}`;
  // the name sticks within its own stretch of the band, which stops where the next phase on its line starts
  const n0 = scale.x(p.nameFrom) - b.x0;
  const w = scale.x(p.nameTo) - b.x0 - n0;
  return (
    <div className={`tl-phase${alt ? ' alt' : ''}`} style={bandStyle(labelW, b, color)}>
      <div className="tl-phase-fill" />
      <div className="tl-phase-edge" style={{ left: scale.x(p.start) - b.x0 }} />
      {/* a name only where a few letters fit: "O…" over a cluster of edges can't be read; zoom in to see it */}
      {w - 6 >= PHASE_NAME_MIN_W && (
        <div className="tl-phase-names" style={{ left: n0, width: w }}>
          <span
            className="tl-phase-name"
            style={{ marginTop: p.level * PHASE_H, left: labelW, maxWidth: w - 6 }}
            title={`${p.name}: ${dates}`}
          >
            {p.name}
          </span>
        </div>
      )}
    </div>
  );
}
