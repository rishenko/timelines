import { useMemo, useRef, useSyncExternalStore, type RefObject } from 'react';
import type { ViewportStore } from './viewportStore.ts';
import type { Calendar } from '../types.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';
import { formatYear } from '../lib/calendar.ts';
import type { Scale } from './scale.ts';
import './overview.css';

/**
 * The overview strip (Kevin, 2026-11-23: the "onion skin" version): a thin map of the whole timeline above the chart,
 * events counted by where they start, with the stretch in view outlined and everything outside it dimmed. It maps the
 * chart's own pixels, so shortened gaps stay short (and are marked) and the outline is always the same share of the
 * strip as the screen is of the chart. A click or drag moves the chart there. From the keyboard the outline is a slider
 * (one Tab stop): ←/→ move a quarter of a screen, Page Up/Down a screen, Home/End to either end. Its name says which
 * years are in view, of which span.
 */
export function OverviewStrip({
  scale,
  cal,
  events,
  labelW,
  viewStore,
  scrollerRef,
}: {
  scale: Scale;
  cal: Calendar;
  events: ResolvedEvent[];
  labelW: number;
  /** The chart's exact view (viewportStore.ts; `left` is the left edge of the events area): the outline follows it. */
  viewStore: ViewportStore;
  scrollerRef: RefObject<HTMLDivElement | null>;
}) {
  // the strip re-renders as the view moves (its bars are memoised); the chart doesn't
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get, viewStore.get);
  // the track keeps 6 px clear at each end, so the outline's focus ring isn't cut off by the window's edge
  const track = Math.max(0, view.width - labelW - 12);
  const shown = Math.max(1, view.width - labelW);
  const [y0, y1] = scale.domain;
  // content px ⇄ strip px
  const toStrip = (x: number) => (track * x) / Math.max(1, scale.width);
  const fromStrip = (s: number) => Math.min(1, Math.max(0, s / Math.max(1, track))) * scale.width;
  const a = toStrip(view.left);
  const b = toStrip(Math.min(scale.width, view.left + shown));
  // the outline is at least 6 px wide and stays inside the track: at the end of a narrow strip it would otherwise stick
  // out past the window and make the page scroll sideways (WCAG 1.4.10, seen at 320 px)
  const outlineW = Math.max(6, b - a);
  const outlineLeft = Math.max(0, Math.min(a, track - outlineW));
  // events by where they start: one bar per 3 px of strip, heights on a square-root scale so sparse stretches show
  const bars = useMemo(() => {
    const n = Math.max(1, Math.floor(track / 3));
    const counts = new Array<number>(n).fill(0);
    for (const e of events) {
      const s = (scale.x(e.start) / Math.max(1, scale.width)) * n;
      counts[Math.min(n - 1, Math.max(0, Math.floor(s)))]++;
    }
    const max = Math.sqrt(Math.max(1, ...counts));
    return counts.map((c) => Math.sqrt(c) / max);
  }, [events, scale, track]);
  const gaps = scale.gaps().map((g) => [toStrip(g.x0), toStrip(g.x1)] as const);

  const scrollTo = (x: number, smooth = false) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(scale.width - shown, x)), behavior: smooth ? 'smooth' : 'instant' });
  };
  // dragging: where in the outline the pointer took hold, so the outline doesn't jump under it
  const grab = useRef<number | null>(null);
  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const s = ev.clientX - r.left;
    // on the outline: keep the offset; elsewhere: centre the view there
    grab.current = s >= a && s <= b ? s - a : (b - a) / 2;
    scrollTo(fromStrip(s - grab.current));
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current === null) return;
    const r = ev.currentTarget.getBoundingClientRect();
    scrollTo(fromStrip(ev.clientX - r.left - grab.current));
  };
  const onPointerUp = () => {
    grab.current = null;
  };
  const onKeyDown = (ev: React.KeyboardEvent) => {
    const step = { ArrowLeft: -shown / 4, ArrowRight: shown / 4, PageUp: -shown, PageDown: shown } as Record<string, number>;
    if (ev.key in step) scrollTo(view.left + step[ev.key], true);
    else if (ev.key === 'Home') scrollTo(0, true);
    else if (ev.key === 'End') scrollTo(scale.width, true);
    else return;
    ev.preventDefault();
  };

  const from = formatYear(Math.round(scale.yearAt(view.left)), cal);
  const to = formatYear(Math.round(scale.yearAt(Math.min(scale.width, view.left + shown))), cal);
  const all = `${formatYear(y0, cal)} – ${formatYear(y1, cal)}`;
  const pct = Math.round((view.left / Math.max(1, scale.width - shown)) * 100);
  if (!track) return null;
  return (
    <div className="tl-overview" style={{ '--label-w': `${labelW}px` } as React.CSSProperties}>
      <div className="tl-overview-label" aria-hidden="true" title={`Viewing ${from} – ${to}, of ${all}`}>
        <span>{from} –</span>
        <span>{to}</span>
      </div>
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the slider inside is the keyboard control */}
      <div className="tl-overview-track" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <svg width={track} height="100%" viewBox={`0 0 ${track} 20`} preserveAspectRatio="none" aria-hidden="true">
          {bars.map((h, i) => (h ? <rect key={i} x={i * 3} y={20 - h * 18} width={2} height={h * 18} className="bar" /> : null))}
          {gaps.map(([g0, g1], i) => (
            <rect key={`g${i}`} x={g0} y={0} width={Math.max(1, g1 - g0)} height={20} className="gap" />
          ))}
        </svg>
        {/* the onion skin: everything outside the view is dimmed, so the outlined stretch stands out (Kevin's pick) */}
        <div className="tl-overview-shade" style={{ left: 0, width: Math.max(0, a) }} aria-hidden="true" />
        <div className="tl-overview-shade" style={{ left: b, width: Math.max(0, track - b) }} aria-hidden="true" />
        <div
          className="tl-overview-view"
          role="slider"
          tabIndex={0}
          aria-label="Years in view"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`Viewing ${from} – ${to}, of ${all}`}
          title={`Viewing ${from} – ${to}, of ${all}. Drag, or use the arrow keys, Page Up/Down, Home and End.`}
          style={{ left: outlineLeft, width: outlineW }}
          onKeyDown={onKeyDown}
        />
        <span className="tl-overview-end start" aria-hidden="true">
          {formatYear(y0, cal)}
        </span>
        <span className="tl-overview-end end" aria-hidden="true">
          {formatYear(y1, cal)}
        </span>
      </div>
    </div>
  );
}
