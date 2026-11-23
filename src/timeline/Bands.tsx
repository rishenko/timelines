import type { Calendar, Track } from '../types.ts';
import { spanDates } from '../lib/lifespan.ts';
import { isApprox, type ResolvedSpan } from '../lib/chronology.ts';
import type { Scale } from './scale.ts';
import { certainFrom, certainTo, drawnFrom, drawnTo } from '../lib/subYear.ts';
import { stripLineNamePx, type PhaseCell } from './layout.ts';
import { successionTip } from '../lib/succession.ts';
import { stripStopKey } from './keyboard.ts';
import { hostOf, safeUrl } from '../lib/urls.ts';

/**
 * Where a lifespan or phase sits, in content px: from the earliest possible start to the latest possible end, with
 * the stretches its sources leave uncertain at each end (drawn fading in and out).
 */
function bandBox(scale: Scale, s: ResolvedSpan) {
  const x0 = scale.x(drawnFrom(s));
  const x1 = scale.x(drawnTo(s));
  const c0 = certainFrom(s);
  const c1 = certainTo(s);
  const fadeIn = c0 !== undefined ? scale.x(c0) - x0 : 0;
  const fadeOut = c1 !== undefined ? x1 - scale.x(c1) : 0;
  return { x0, x1, fadeIn, fadeOut };
}

/**
 * A drawn extent cut to the chart: from its start (content px 0) to the end of the ruler (`width`), so nothing a row
 * draws runs on past either end of the ruler into the empty space beside it. The fades lose what was cut, and
 * `continues` says the extent ran on past the chart's end (it ends there in an arrow, like a still-going one).
 */
function clipToChart(b: { x0: number; x1: number; fadeIn: number; fadeOut: number }, width: number) {
  const x0 = Math.max(b.x0, 0);
  const x1 = Math.min(b.x1, width);
  // x1 < x0: wholly outside the chart (not drawn); x1 == x0 is a cell cut to nothing by the next phase, still drawn
  return { x0, x1, fadeIn: Math.max(0, b.fadeIn - (x0 - b.x0)), fadeOut: Math.max(0, b.fadeOut - (b.x1 - x1)), continues: b.x1 > width };
}

const bandStyle = (labelW: number, b: Omit<ReturnType<typeof bandBox>, 'continues'>, color: string) =>
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
  members,
  eventTitle = noTitle,
}: Common & { track: Track; span: ResolvedSpan; cue?: boolean; title?: string; members?: string }) {
  const b = clipToChart(bandBox(scale, span), scale.width);
  if (b.x1 < b.x0 || !inView(b.x0, b.x1)) return null;
  const approx = isApprox(span);
  return (
    <div
      className="tl-span"
      style={bandStyle(labelW, b, track.color)}
      title={`${title ?? track.name}: ${spanDates(span, cal, approx)}${span.derived && !title ? ' (from its phases)' : ''}${title ? '' : successionTip(span, eventTitle)}${members ? `\n${members}` : ''}`}
    >
      {(span.ongoing || b.continues) && cue && (
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
 * instead of an end when it is still going (or runs on past the end of the chart, where it is cut: clipToChart), and
 * its name where it fits. Hovering it shows its name and dates, and clicks go through to the row. From the keyboard it
 * is a stop in the chart's grid (useRovingFocus: its strip line is a grid line above the row's events): Enter or Space
 * opens its details in the side panel (`onOpen`, with its PlacedPhase.ref).
 * A membership in another row (PlacedPhase.member) is drawn the same way on its own line, in the union's colour, as a
 * dashed outline rather than a filled cell, with its name ("in Soviet Union, 1922–91") in ordinary type.
 */
export function PhaseStripCell({
  cell: c,
  color,
  cal,
  labelW,
  inView,
  eventTitle = noTitle,
  memberName,
  unionName,
  scale,
  isTabStop = false,
  selected = false,
  onOpen,
  onStopFocus,
  viewLeft = 0,
}: Common & {
  /** The chart's visible left edge, content px: a named age line's names start right of its line name, never under it. */
  viewLeft?: number;
  cell: PhaseCell;
  color: string;
  memberName?: string;
  unionName?: string;
  /** It holds the chart's one Tab stop (drawn even when out of view, so Tab and the arrow keys reach it). */
  isTabStop?: boolean;
  /** Its details are open in the side panel. */
  selected?: boolean;
  onOpen?: (ref: string) => void;
  onStopFocus?: (key: string) => void;
}) {
  const p = c.phase;
  const b = clipToChart(c, scale.width);
  if (b.x1 < b.x0 || (!inView(b.x0, b.x1) && !isTabStop)) return null;
  const arrow = p.ongoing || b.continues;
  // a name beside or inside the phase keeps to the chart too; too little of it left, and the tooltip names the phase
  const name = c.name && {
    ...c.name,
    x0: Math.max(c.name.x0, 0, p.lineName && !c.name.outside ? viewLeft + stripLineNamePx(p.lineName) : 0),
    x1: Math.min(c.name.x1, scale.width),
  };
  const showName = name && name.x1 - name.x0 >= 24 ? name : null;
  const member = p.member !== undefined;
  // a context cell (an age) that shows no name, or is under 10 px, draws no edges and no alternate fill, so a run of
  // them reads as one plain stripe (its tooltip and the side panel still name each); phases are drawn as before
  const plain = !!p.kind && (b.x1 - b.x0 < 10 || !showName);
  // an age's article: a ↗ link just before its name (as on the age bars, #77). The mouse reaches it here; the keyboard
  // reaches the same link in the age's side panel (Enter on the cell), so the link itself isn't a stop
  const url = p.kind && showName && !showName.outside ? safeUrl(p.url) : undefined;
  const tip = `${member ? `${memberName ?? ''} in ${unionName ?? p.member}` : p.name}: ${spanDates(p, cal, isApprox(p))}${successionTip(p, eventTitle)}${p.lineName ? `\nRegion: ${p.lineName}` : ''}`;
  const key = p.ref && onOpen ? stripStopKey(p.ref) : undefined;
  const keys = key
    ? {
        role: 'button',
        tabIndex: isTabStop ? 0 : -1,
        'data-stop': key,
        'data-phase-ref': p.ref,
        'aria-label': p.kind
          ? `${p.name}${p.lineName ? ` (${p.lineName})` : ''}, ${spanDates(p, cal, isApprox(p))}, ${p.kind}: details, article and sources`
          : member
            ? // starts with the strip's visible text, verbatim (WCAG 2.5.3 Label in Name), then which row it belongs to
              `${p.name}, ${memberName ?? ''}, membership: details and sources`
            : `${p.name}, ${spanDates(p, cal, isApprox(p))}, phase: details and sources`,
        // an age opens with a click too, as its bar did (Kevin: every age reachable at any width); phases open by keyboard
        ...(p.kind ? { onClick: (ev: React.MouseEvent) => (ev.stopPropagation(), onOpen!(p.ref!)) } : {}),
        'aria-pressed': selected,
        onFocus: () => onStopFocus?.(key),
        onKeyDown: (ev: React.KeyboardEvent) => {
          if ((ev.key === 'Enter' || ev.key === ' ') && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            ev.preventDefault();
            onOpen!(p.ref!);
          }
        },
      }
    : {};
  const names = showName && (
        <div className={`tl-phase-names${showName.outside ? ` outside ${showName.outside}` : ''}`} style={{ left: showName.x0 - b.x0, width: showName.x1 - showName.x0 }}>
          {/* (a still-going phase's name keeps clear of its arrow at the right of the view) */}
          <span
            className="tl-phase-name"
            // (a named age line's names stick just right of its line name, which holds the chart's left edge)
            style={{
              left: p.lineName && !showName.outside ? `calc(${labelW}px + var(--strip-line-inset, ${stripLineNamePx(p.lineName)}px))` : labelW,
              maxWidth: showName.x1 - showName.x0,
              marginRight: arrow && !showName.outside ? 12 : 0,
            }}
            title={tip}
          >
            {url && (
              <a
                className="tl-strip-link"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                title={`${p.name}: ${hostOf(url)} (opens in a new tab)`}
                aria-label={`${p.name}: article on ${hostOf(url)} (opens in a new tab)`}
                onClick={(ev) => ev.stopPropagation()}
              >
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {member ? <MemberName name={p.name} /> : p.name}
          </span>
        </div>
  );
  const cell = (
    <div
      {...keys}
      className={`tl-phase${member ? ' member' : c.alt && !plain ? ' alt' : ''}${c.line.named ? '' : ' thin'}${showName?.outside ? ' has-outside' : ''}${selected ? ' selected' : ''}`}
      data-kind={p.kind}
      style={
        {
          left: labelW + b.x0,
          width: b.x1 - b.x0,
          top: c.line.top,
          height: c.line.height,
          '--track-color': color,
          '--fade-in': `${b.fadeIn}px`,
          '--fade-out': `${b.fadeOut}px`,
        } as React.CSSProperties
      }
    >
      <div className="tl-phase-fill" title={tip} />
      {!plain && c.startX >= b.x0 && c.startX <= b.x1 && <div className="tl-phase-edge" style={{ left: c.startX - b.x0 }} />}
      {!plain && c.endX !== null && c.endX >= b.x0 && c.endX <= b.x1 && <div className="tl-phase-edge end" style={{ left: c.endX - b.x0 }} />}
      {arrow && (
        <div className="tl-ongoing-run">
          <span className="tl-ongoing" />
        </div>
      )}
      {showName && !p.kind && names}
    </div>
  );
  if (!p.kind || !showName) return cell;
  // an age's name (and its ↗ link) is drawn beside its cell, not inside it, so the link isn't nested in the cell's
  // button; it covers the same box and lets clicks through to the cell
  return (
    <>
      {cell}
      <div
        className="tl-phase tl-age-names"
        data-kind={p.kind}
        aria-hidden={url ? undefined : true}
        style={{ left: labelW + b.x0, width: b.x1 - b.x0, top: c.line.top, height: c.line.height, '--track-color': color } as React.CSSProperties}
      >
        {names}
      </div>
    </>
  );
}

/**
 * A membership's name, "in Soviet Union, 1922–91": when it doesn't fit, the union's name is cut short ("in Federated
 * Comm…, 3055–67") and the years stay.
 */
function MemberName({ name }: { name: string }) {
  const at = name.lastIndexOf(', ');
  if (at < 0) return <span className="union">{name}</span>;
  return (
    <>
      <span className="union">{name.slice(0, at + 1)}</span>
      <span className="years">{name.slice(at + 1)}</span>
    </>
  );
}
