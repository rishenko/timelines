import { Fragment } from 'react';
import type { Calendar, Dataset } from '../types.ts';
import type { PlacedAge } from '../lib/eras.ts';
import { at0, at1 } from '../lib/subYear.ts';
import { hostOf, safeUrl } from '../lib/urls.ts';
import { citationsInWords, spanInWords } from '../lib/table.ts';
import type { Scale } from './scale.ts';

/** One line of the strip: a 24 px target (WCAG 2.5.8) around a 15 px bar. */
export const AGE_LINE_PX = 24;
const MIN_TARGET_PX = 24;
/** The ↗ link to an age's article: a 24 px target at the start of the age's name. */
const LINK_PX = 24;
/** The bar's name is shifted right by this much when the ↗ link sits before it. */
const LINK_INSET_PX = 18;

interface Props {
  ages: PlacedAge[];
  lines: number;
  scale: Scale;
  labelW: number;
  width: number;
  /** Left edge of the view in content px: an age crossing it keeps its name on screen. */
  viewLeft: number;
  cal: Calendar;
  sources: Dataset['sources'];
  /** Centre the chart on this year (the zoom stays). */
  onSelect: (year: number) => void;
}

/**
 * Ages (meta.eras) in a strip under the ruler, one line per group: periods across the whole timeline, such as the
 * Islamic Golden Age. Each is a button: its name, a tooltip with its dates and sources, and a click centres the chart on
 * it. An age with a page (`url`) has a ↗ link to it just before its name, when its bar has room for both (two 24 px
 * targets); otherwise the Ages table links it. It stays on screen as the chart scrolls down, like the ruler.
 */
export function AgeStrip({ ages, lines, scale, labelW, width, viewLeft, cal, sources, onSelect }: Props) {
  if (!ages.length) return null;
  return (
    <div className="tl-ages" style={{ width, height: lines * AGE_LINE_PX }} role="group" aria-label="Ages">
      <div className="tl-ages-corner" style={{ width: labelW }}>
        Ages
      </div>
      <AgeBars ages={ages} scale={scale} labelW={labelW} viewLeft={viewLeft} cal={cal} sources={sources} onSelect={onSelect} />
    </div>
  );
}

type BarProps = Omit<Props, 'lines' | 'width'>;

/**
 * The ages' buttons (and ↗ links), placed by their line: shared by the Ages strip and the rows' age bands. Positions
 * are from the top of their container, `labelW` in from its left edge.
 */
export function AgeBars({ ages, scale, labelW, viewLeft, cal, sources, onSelect }: BarProps) {
  return (
    <>
      {ages.map(({ era, span, line, drawEnd }) => {
        // an age may run past the timeline's ends (like a row): the chart cuts it there, with an open edge
        const lo = scale.x(scale.domain[0]);
        // with date claims it spans its whole uncertain range; the uncertain ends are drawn lighter and hatched
        const sw = span.startWindow;
        const ew = span.endWindow;
        const raw0 = scale.x(sw ? Math.min(sw[0], at0(span)) : at0(span));
        // an age that shares its end year with the next on its line stops where that one starts
        const end = drawEnd ?? at1(span, span.end);
        const raw1 = scale.x(ew ? Math.max(ew[1] + 1, end) : end);
        if (raw1 <= lo || raw0 >= scale.width) return null;
        const x0 = Math.max(raw0, lo);
        const x1 = Math.max(Math.min(raw1, scale.width), x0 + 6);
        const cut = `${raw0 < lo ? ' cut-start' : ''}${raw1 > scale.width ? ' cut-end' : ''}`;
        const fadeIn = sw ? Math.max(0, scale.x(sw[1]) - Math.max(raw0, lo)) : 0;
        const fadeOut = ew ? Math.max(0, Math.min(raw1, scale.width) - scale.x(ew[0] + 1)) : 0;
        const dates = spanInWords(span, cal, sources);
        const from = citationsInWords(era.sources, sources);
        // the button is the target (at least 24 px each way); the bar inside it is drawn to the age's own width
        const w = x1 - x0;
        const target = Math.max(w, MIN_TARGET_PX);
        const left = labelW + x0 - (target - w) / 2;
        const style = { left, width: target, top: line * AGE_LINE_PX } as React.CSSProperties;
        const bar = { left: (target - w) / 2, width: w } as React.CSSProperties & Record<string, string | number>;
        if (era.color) bar['--age-color'] = era.color;
        if (fadeIn) bar['--fade-in'] = `${Math.min(fadeIn, w)}px`;
        if (fadeOut) bar['--fade-out'] = `${Math.min(fadeOut, w)}px`;
        // the name stays readable while the age starts off to the left
        const nameAt = Math.max(0, Math.min(viewLeft - x0, w - 80));
        const url = safeUrl(era.url);
        const host = url && hostOf(url);
        // the link needs its own 24 px and leaves the bar's button at least 24 px of its own
        const linked = url && w >= LINK_PX + MIN_TARGET_PX;
        const linkAt = Math.max(0, Math.min(nameAt, w - LINK_PX - MIN_TARGET_PX));
        const tip = [
          `${era.name}, ${dates.main}`,
          ...dates.ranges,
          cut && 'Runs on past this timeline',
          from && `from ${from}`,
          url && (linked ? `↗ opens its article on ${host}` : `Its article on ${host}: zoom in, or see the Ages table`),
        ];
        return (
          <Fragment key={era.id}>
            <button
              className="tl-age"
              style={style}
              title={tip.filter(Boolean).join('\n')}
              aria-label={`${era.name}, ${dates.main}, age; centre the chart on it`}
              onClick={() => onSelect((span.start + span.end) / 2)}
            >
              <span className={`bar${era.color ? ' colored' : ''}${fadeIn || fadeOut ? ' uncertain' : ''}${cut}`} style={bar}>
                <span className="name" style={{ left: linked ? linkAt : nameAt, paddingLeft: linked ? LINK_INSET_PX + 5 : undefined }}>
                  {era.name}
                </span>
              </span>
            </button>
            {linked && (
              <a
                className="tl-age-link"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ left: left + (target - w) / 2 + linkAt, top: line * AGE_LINE_PX, width: LINK_PX }}
                title={`${era.name}: ${host} (opens in a new tab)`}
                aria-label={`${era.name}: article on ${host} (opens in a new tab)`}
              >
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
