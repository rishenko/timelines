import { Fragment, useState } from 'react';
import type { Calendar, Dataset } from '../types.ts';
import type { PlacedAge } from '../lib/eras.ts';
import { at0, at1 } from '../lib/subYear.ts';
import { hostOf, safeUrl } from '../lib/urls.ts';
import { citationsInWords, spanInWords } from '../lib/table.ts';
import type { Scale, Segment } from './scale.ts';

/** One line of the strip: a 24 px target (WCAG 2.5.8) around a 15 px bar. */
export const AGE_LINE_PX = 24;
const MIN_TARGET_PX = 24;
/** The ↗ link to an age's article: a 24 px target at the start of the age's name. */
const LINK_PX = 24;
/** The bar's name is shifted right by this much when the ↗ link sits before it. */
const LINK_INSET_PX = 18;
/** A line name's width: about 6 px a letter at its 10 px size, plus padding (it's measured by nothing at render). */
const lineNamePx = (name: string) => Math.ceil(name.length * 6 + 12);

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
  /** The age whose details are open (drawn selected), and opening an age's details in the side panel. */
  selectedId?: string | null;
  onOpen?: (id: string) => void;
  /** Shortened gaps: their hatched band runs through the strip as it does through the rows (Kevin, 2026-11-23). */
  gaps?: Segment[];
}

/**
 * Ages (the timeline's context spans of kind age) in a strip under the ruler, one line per `line`: periods across the whole timeline, such as the
 * Islamic Golden Age. Each is a button: its name, a tooltip with its dates and sources, and a click centres the chart on
 * it. An age with a page (`url`) has a ↗ link to it just before its name, when its bar has room for both (two 24 px
 * targets); otherwise the Ages table links it. It stays on screen as the chart scrolls down, like the ruler.
 */
export function AgeStrip({ ages, lines, scale, labelW, width, viewLeft, cal, sources, selectedId, onOpen, gaps }: Props) {
  if (!ages.length) return null;
  return (
    <div className="tl-ages" style={{ width, height: lines * AGE_LINE_PX }} role="group" aria-label="Ages">
      <div className="tl-ages-corner" style={{ width: labelW }}>
        Ages
      </div>
      <AgeBars ages={ages} scale={scale} labelW={labelW} viewLeft={viewLeft} cal={cal} sources={sources} selectedId={selectedId} onOpen={onOpen} />
      {/* over the ages' bars (so a bar crossing a gap shows the break), under the sticky corner; clicks pass through */}
      {!!gaps?.length && (
        <div className="tl-gaps tl-ages-gaps" style={{ left: labelW }} aria-hidden="true">
          {gaps.map((g) => (
            <div key={g.y0} className="tl-gap-band" style={{ left: g.x0, width: g.x1 - g.x0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

type BarProps = Omit<Props, 'lines' | 'width'>;

/** A strip or band line, kept across renders: its band and line id (its number changes as empty lines close up). */
const lineKey = (a: PlacedAge) => `${a.band ?? ''}\n${a.era.line ?? ''}\n${a.lineName ?? ''}`;

/**
 * The ages' buttons (and ↗ links), placed by their line: shared by the Ages strip and the rows' age bands. Positions
 * are from the top of their container, `labelW` in from its left edge.
 */
export function AgeBars({ ages, scale, labelW, viewLeft, cal, sources, selectedId, onOpen }: BarProps) {
  // keyboard: each line is one Tab stop (a roving tabindex), and ←/→ and Home/End move between its ages; Enter or Space
  // opens the focused age's details, as a click does. The stop is the age last focused on the line, else the open one,
  // else the first at or after the left edge of the view. Lines are keyed by band and group, since a line's number
  // changes as lines with nothing in view close up.
  const [last, setLast] = useState<Record<string, string>>({});
  const lo = scale.x(scale.domain[0]);
  const drawn = new Map<string, { id: string; x0: number }[]>();
  for (const a of ages) {
    const sw = a.span.startWindow;
    const x0 = scale.x(sw ? Math.min(sw[0], at0(a.span)) : at0(a.span));
    const x1 = scale.x(a.drawEnd ?? at1(a.span, a.span.end));
    if (Math.max(x1, x0 + 1) <= lo || x0 >= scale.width) continue;
    const k = lineKey(a);
    (drawn.get(k) ?? drawn.set(k, []).get(k)!).push({ id: a.era.id, x0 });
  }
  const stop = new Map<string, string>();
  for (const [k, on] of drawn) {
    on.sort((a, b) => a.x0 - b.x0);
    const has = (id: string | null | undefined) => !!id && on.some((a) => a.id === id);
    stop.set(k, has(last[k]) ? last[k] : has(selectedId) ? selectedId! : (on.find((a) => a.x0 >= viewLeft) ?? on[on.length - 1]).id);
  }
  const onKey = (k: string) => (ev: React.KeyboardEvent<HTMLButtonElement>) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    const on = drawn.get(k) ?? [];
    const i = on.findIndex((a) => a.id === ev.currentTarget.dataset.ageId);
    const j = ev.key === 'Home' ? 0 : ev.key === 'End' ? on.length - 1 : Math.max(0, Math.min(on.length - 1, i + (ev.key === 'ArrowRight' ? 1 : -1)));
    if (j === i || !on[j]) return;
    const el = ev.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`button.tl-age[data-age-id="${CSS.escape(on[j].id)}"]`);
    if (!el) return;
    setLast((m) => ({ ...m, [k]: on[j].id }));
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  };
  // clicking an age (or Enter on it) opens its details in the side panel, as an event's do: dates, region, its article
  // and its sources as links. However narrow its bar, every age reaches them this way; it never moves the chart.
  // a named line (a band with two or more): its name at the line's left end, kept on screen; the ages' names and links
  // on that line start after it
  const named = new Map<number, { name: string; x0: number }>();
  for (const a of ages)
    if (a.lineName) {
      const x = scale.x(a.span.startWindow ? Math.min(a.span.startWindow[0], at0(a.span)) : at0(a.span));
      const cur = named.get(a.line);
      if (!cur || x < cur.x0) named.set(a.line, { name: a.lineName, x0: x });
    }
  return (
    <>
      {[...named].map(([line, { name, x0 }]) => {
        const w = lineNamePx(name);
        return (
          <span
            key={`line-${line}`}
            className="tl-age-line-name"
            aria-hidden="true"
            style={{ left: labelW + Math.max(viewLeft, Math.max(scale.x(scale.domain[0]), x0) - w), top: line * AGE_LINE_PX + 4, width: w }}
          >
            {name}
          </span>
        );
      })}
      {ages.map((age) => {
        const { era, span, line, drawEnd, lineName } = age;
        const k = lineKey(age);
        // on a named line, an age's name and link keep clear of the line's name
        const left0 = lineName ? viewLeft + lineNamePx(lineName) : viewLeft;
        // an age may run past the timeline's ends (like a row): the chart cuts it there, with an open edge (lo)
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
        const nameAt = Math.max(0, Math.min(left0 - x0, w - 80));
        const url = safeUrl(era.url);
        const host = url && hostOf(url);
        // the link needs its own 24 px and leaves the bar's button at least 24 px of its own
        const linked = url && w >= LINK_PX + MIN_TARGET_PX;
        const linkAt = Math.max(0, Math.min(nameAt, w - LINK_PX - MIN_TARGET_PX));
        const tip = [
          `${era.name}, ${dates.main}`,
          lineName && `Region: ${lineName}`,
          ...dates.ranges,
          cut && 'Runs on past this timeline',
          from && `from ${from}`,
          url && linked && `↗ opens its article on ${host}`,
          'Click for its article and sources in the panel',
        ];
        return (
          <Fragment key={era.id}>
            <button
              className={`tl-age${selectedId === era.id ? ' selected' : ''}`}
              style={style}
              title={tip.filter(Boolean).join('\n')}
              aria-label={`${era.name}${lineName ? ` (${lineName})` : ''}, ${dates.main}, age: details, article and sources`}
              aria-pressed={selectedId === era.id}
              data-age-id={era.id}
              onClick={() => onOpen?.(era.id)}
              tabIndex={stop.get(k) === era.id ? 0 : -1}
              onKeyDown={onKey(k)}
              onFocus={() => setLast((m) => (m[k] === era.id ? m : { ...m, [k]: era.id }))}
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
                tabIndex={-1}
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
