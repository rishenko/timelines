import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { FocusRequest } from '../state/focus.ts';
import type { LaneLayout, Mark } from './layout.ts';
import type { Scale } from './scale.ts';

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
 * The chart's scroll position. Keeps the center year fixed when the scale changes (zoom, compression, filters),
 * scrolls to focus requests (search, links, zoom) and briefly highlights the row they name, keeps a newly selected
 * event on screen, and reports the center year as the reader scrolls.
 * Returns the visible stretch (`view`, content px), the center year, the row to highlight, and the scroll handler.
 */
export function useViewport(o: Options) {
  const { scrollerRef, lanesRef, scale, labelW } = o;
  const [view, setView] = useState({ left: 0, width: 1200 });
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

  // Keep the center year fixed whenever the scale changes (increment, compression, filters).
  useLayoutEffect(() => {
    centerOn(centerYearRef.current);
    const el = scrollerRef.current;
    if (el) setView({ left: el.scrollLeft, width: el.clientWidth });
  }, [centerOn, scrollerRef]);

  // A focus request (search, links, zoom): scroll to its years and, if it names a row, to that row. Rows it
  // unfolds are already in this render's layout, since the request arrives in the same update.
  /** When the last focus request scrolled; a selection made with it shouldn't re-scroll and cut it short. */
  const focusedAtRef = useRef(-Infinity);
  const [flashLane, setFlashLane] = useState<string | null>(null);
  const scrollToFocus = useEffectEvent((f: FocusRequest) => {
    const el = scrollerRef.current;
    if (!el) return;
    const vw = el.clientWidth - labelW;
    let left = scale.x(f.year) - vw / 2;
    if (f.range) {
      const x0 = scale.x(f.range[0]);
      const x1 = scale.x(f.range[1] + 1);
      left = x1 - x0 <= vw * 0.85 ? (x0 + x1) / 2 - vw / 2 : x0 - vw * 0.08;
    }
    left = Math.max(0, left);
    centerYearRef.current = Math.round(scale.yearAt(left + vw / 2));
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
      setFlashLane(null);
      requestAnimationFrame(() => setFlashLane(id));
    }
    focusedAtRef.current = performance.now();
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, top, behavior: calm ? 'auto' : 'smooth' });
  });
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
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      setView({ left: el.scrollLeft, width: el.clientWidth });
      const y = Math.round(scale.yearAt(el.scrollLeft + (el.clientWidth - labelW) / 2));
      centerYearRef.current = y;
      onCenterYearChange(y);
    });
  };

  useEffect(() => {
    const onResize = () => {
      const el = scrollerRef.current;
      if (el) setView({ left: el.scrollLeft, width: el.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scrollerRef]);

  return { view, centerYearRef, flashLane, onScroll };
}
