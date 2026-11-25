import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { FocusRequest } from '../state/focus.ts';
import type { LaneLayout, Mark } from './layout.ts';
import type { Scale } from './scale.ts';
import { roundCenter } from '../lib/subYear.ts';
import { bandStep, createViewportStore } from './viewportStore.ts';

interface Options {
  /** The scrolling element (the whole chart). */
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** The lanes area under the sticky ruler. */
  lanesRef: RefObject<HTMLDivElement | null>;
  scale: Scale;
  lanes: LaneLayout[];
  labelW: number;
  focus: FocusRequest | null;
  selectedId: string | null;
  marksByEvent: Map<string, Mark[]>;
  initialCenterYear: number;
  onCenterYearChange: (year: number) => void;
}

/**
 * The rows to draw, as a vertical stretch of the chart (px from its top): `top` is the scroll position rounded down to
 * a step of half a screen, `height` the screen's height. A height of 0 means not measured yet (or no layout, as in
 * tests): every row is drawn.
 */
export interface RowBand {
  top: number;
  height: number;
}
const NO_BAND: RowBand = { top: 0, height: 0 };
/** How long after a focus request a change of geometry re-runs it instead of re-centering (a smooth scroll takes under a second). */
const FOCUS_SETTLE_MS = 1500;

/**
 * The exact view, outside React (viewportStore.ts), and React's views of it: `view`, the same banded to half a screen,
 * and `rows`, the vertical stretch to draw.
 */
function useBands() {
  /** The exact view, outside React (viewportStore.ts); `view` below is the same, banded to half a screen. */
  const [viewStore] = useState(() => createViewportStore());
  const [view, setViewState] = useState({ left: 0, width: 1200 });
  /**
   * Every move updates the store; React's view changes only when the scroll crosses into another half-screen band or the
   * width changes, so a sideways scroll re-renders the chart a few times per screen, not per frame.
   */
  const setView = useCallback(
    (left: number, width: number) => {
      viewStore.set(left, width);
      const band = Math.floor(left / bandStep(width)) * bandStep(width);
      setViewState((v) => (v.left === band && v.width === width ? v : { left: band, width }));
    },
    [viewStore],
  );
  const [rows, setRowsState] = useState<RowBand>(NO_BAND);
  /** The vertical stretch to draw rows for, in steps of half a screen: it changes a few times per screen scrolled. */
  const setRows = useCallback((el: HTMLElement) => {
    const height = el.clientHeight;
    if (!height) return;
    const step = Math.max(100, Math.round(height / 2));
    const top = Math.floor(el.scrollTop / step) * step;
    setRowsState((r) => (r.top === top && r.height === height ? r : { top, height }));
  }, []);
  return { viewStore, view, setView, rows, setRows };
}

/**
 * The chart's scroll position. Keeps the center year fixed when the scale changes (zoom, compression, filters),
 * scrolls to focus requests (search, links, zoom) and briefly highlights the row they name, keeps a newly selected
 * event on screen, and reports the center year as the reader scrolls.
 * Returns the visible stretch (`view`, content px), the rows' stretch (`rows`), the center year, the row to highlight, and the scroll handler.
 */
export function useViewport(o: Options) {
  const { scrollerRef, lanesRef, scale, labelW } = o;
  const { viewStore, view, setView, rows, setRows } = useBands();
  const centerYearRef = useRef(o.initialCenterYear);

  const centerOn = useCallback(
    (year: number, smooth = false) => {
      const el = scrollerRef.current;
      if (!el) return;
      const left = scale.x(year) - (el.clientWidth - labelW) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'instant' });
      centerYearRef.current = year;
    },
    [scale, labelW, scrollerRef],
  );

  // A focus request (search, links, zoom): scroll to its years and, if it names a row, to that row. Rows it
  // unfolds are already in this render's layout, since the request arrives in the same update.
  /** When the last focus request scrolled; a selection made with it shouldn't re-scroll and cut it short. */
  const focusedAtRef = useRef(-Infinity);
  const focusedRef = useRef<FocusRequest | null>(null);
  const [flashLane, setFlashLane] = useState<string | null>(null);
  const scrollToFocus = useEffectEvent((f: FocusRequest, tries = 0, flash = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    focusedRef.current = f;
    // a request made with a zoom change can arrive before the (deferred) redraw widens the chart; scrolling then
    // would stop at the old width's end, so wait for the new width (a few frames at most)
    // (scrollWidth lags the canvas's new width in the browser; it is 0 where nothing is laid out, as in tests)
    if (el.scrollWidth > 0 && el.scrollWidth + 1 < labelW + scale.width && tries < 30) {
      requestAnimationFrame(() => scrollToFocus(f, tries + 1, flash));
      return;
    }
    const vw = el.clientWidth - labelW;
    let left = scale.x(f.year) - vw / 2;
    if (f.range) {
      const x0 = scale.x(f.range[0]);
      const x1 = scale.x(f.range[1] + 1);
      left = x1 - x0 <= vw * 0.85 ? (x0 + x1) / 2 - vw / 2 : x0 - vw * 0.08;
    }
    left = Math.max(0, left);
    centerYearRef.current = roundCenter(scale.yearAt(left + vw / 2), scale.increment);
    let top = el.scrollTop;
    const lane = f.trackId
      ? o.lanes.find((l) => l.lane.id === f.trackId) ?? o.lanes.find((l) => l.lane.members.includes(f.trackId!))
      : undefined;
    if (lane && lanesRef.current) {
      const rulerH = lanesRef.current.offsetTop;
      const laneTop = rulerH + lane.top;
      const viewTop = el.scrollTop + rulerH;
      const viewBottom = el.scrollTop + el.clientHeight;
      // only move if the row isn't fully on screen; then put it a third of the way down
      if (laneTop < viewTop || laneTop + lane.height > viewBottom)
        top = Math.max(0, laneTop - rulerH - (el.clientHeight - rulerH) / 3);
      // off then on, so picking the same row again replays the highlight
      const id = lane.lane.id;
      if (flash) {
        setFlashLane(null);
        requestAnimationFrame(() => setFlashLane(id));
      }
    }
    if (flash) focusedAtRef.current = performance.now(); // a re-run for new geometry keeps the original time, so the settle window does not extend itself
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, top, behavior: calm ? 'auto' : 'smooth' });
  });
  // Keep the center year fixed whenever the scale changes (increment, compression, filters). While a focus request is
  // still scrolling (search, links), a change of geometry that arrives with it (the label column widening because the rows
  // it unfolded sit deeper) makes the request run again instead: re-centering on the center year the scroll handler had
  // recorded from the first frame would put the chart back where it started and cancel the scroll to the row.
  useLayoutEffect(() => {
    // (a zoom or filter change within the window also re-runs the request, so the chart returns to the requested place; the window is short)
    if (focusedRef.current && performance.now() - focusedAtRef.current < FOCUS_SETTLE_MS) scrollToFocus(focusedRef.current, 0, false);
    else centerOn(centerYearRef.current);
    const el = scrollerRef.current;
    if (el) {
      setView(el.scrollLeft, el.clientWidth);
      setRows(el);
    }
  }, [centerOn, scrollerRef, setView, setRows]);
  useEffect(() => {
    if (o.focus) scrollToFocus(o.focus);
  }, [o.focus]);
  useEffect(() => {
    if (!flashLane) return;
    const t = setTimeout(() => setFlashLane(null), 1800);
    return () => clearTimeout(t);
  }, [flashLane]);

  // After a selection (which may open the side panel and narrow the view), make sure the event is on screen.
  const revealSelected = useEffectEvent((id: string): number | undefined => {
    if (performance.now() - focusedAtRef.current < 200) return;
    const marks = o.marksByEvent.get(id);
    if (!marks?.length) return;
    return requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const x = marks[0].x0;
      const left = el.scrollLeft;
      const right = left + el.clientWidth - labelW;
      if (x < left + 20 || x > right - 60) centerOn(scale.yearAt(x), true);
    });
  });
  useEffect(() => {
    if (!o.selectedId) return;
    const frame = revealSelected(o.selectedId);
    if (frame !== undefined) return () => cancelAnimationFrame(frame);
  }, [o.selectedId]);

  const { onCenterYearChange } = o;
  const rafRef = useRef(0);
  const onScroll = () => {
    // the exact view at once (its subscribers hear of it in this frame's rAF); React's banded view and the rest below
    const now = scrollerRef.current;
    if (now) viewStore.set(now.scrollLeft, now.clientWidth);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      setView(el.scrollLeft, el.clientWidth);
      setRows(el);
      const y = roundCenter(scale.yearAt(el.scrollLeft + (el.clientWidth - labelW) / 2), scale.increment);
      centerYearRef.current = y;
      onCenterYearChange(y);
    });
  };

  useEffect(() => {
    const onResize = () => {
      const el = scrollerRef.current;
      if (el) {
        setView(el.scrollLeft, el.clientWidth);
        setRows(el);
      }
    };
    window.addEventListener('resize', onResize);
    // the chart also changes width without the window doing so: a side panel opening beside it, or the toolbar
    // wrapping. Without this, the view kept its old width (the overview strip's outline ran under the panel).
    const el = scrollerRef.current;
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (el) ro?.observe(el);
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [scrollerRef, setView, setRows]);

  return { view, viewStore, rows, centerYearRef, flashLane, onScroll };
}
