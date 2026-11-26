import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent, type TouchList as ReactTouchList } from 'react';

/** Width of the row-label column. On narrow screens (phones) the labels take less room, leaving more for the timeline. */
export const LABEL_W = 236;
export const LABEL_W_NARROW = 120;
const NARROW_QUERY = '(max-width: 640px)';

/** The label column's width for the current screen; follows the window across the 640 px breakpoint. */
export function useLabelWidth(): number {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow ? LABEL_W_NARROW : LABEL_W;
}

/** Where a pinch zooms: the year between the fingers, and where it sits on the time axis (a share of its width from the left). */
export interface PinchAnchor {
  year: number;
  at: number;
}

/**
 * The year under `clientX` in a chart's scroller, and its place on the time axis, so a zoom keeps it under the fingers.
 * Undefined over the row labels (or with no scroller): the zoom keeps the view's centre then.
 */
export function pinchAnchor(el: HTMLElement | null, labelW: number, yearAt: (x: number) => number, clientX: number): PinchAnchor | undefined {
  if (!el) return undefined;
  const x = clientX - el.getBoundingClientRect().left - labelW;
  const vw = el.clientWidth - labelW;
  if (x < 0 || vw <= 0) return undefined;
  return { year: yearAt(el.scrollLeft + x), at: Math.min(1, x / vw) };
}

/**
 * Two-finger pinch steps through the zoom levels (the page itself doesn't zoom: see touch-action in CSS).
 * Each time the fingers spread to 1.6x (or close to 0.62x), `onStep` is called with 1 (finer) or -1 (coarser) and the
 * fingers' midpoint (clientX), and the gesture restarts from the new finger gap. Returns touch handlers for the scrolling element.
 */
export function usePinchSteps(onStep: ((dir: 1 | -1, midX: number) => void) | undefined) {
  const startGap = useRef<number | null>(null);
  const fingerGap = (t: ReactTouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  return {
    onTouchStart: (e: ReactTouchEvent) => {
      startGap.current = e.touches.length === 2 ? fingerGap(e.touches) : null;
    },
    onTouchMove: (e: ReactTouchEvent) => {
      if (e.touches.length !== 2 || startGap.current === null || !onStep) return;
      const ratio = fingerGap(e.touches) / startGap.current;
      if (ratio > 1.6 || ratio < 0.62) {
        onStep(ratio > 1 ? 1 : -1, (e.touches[0].clientX + e.touches[1].clientX) / 2);
        startGap.current = fingerGap(e.touches);
      }
    },
    onTouchEnd: (e: ReactTouchEvent) => {
      if (e.touches.length < 2) startGap.current = null;
    },
  };
}

const LONG_PRESS_MS = 550;
/** A finger that moves farther than this is panning, not pressing. */
const LONG_PRESS_SLOP = 10;

/**
 * A long press with one finger (the touch form of double-click). `start` arms it at a point; `move` cancels it if
 * the finger drifts; `cancel` disarms it (pointer up or cancel). `fire` runs after the finger has stayed put.
 */
export function useLongPress() {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  const start = (x: number, y: number, fire: () => void) => {
    cancel();
    press.current = { x, y, timer: window.setTimeout(() => (cancel(), fire()), LONG_PRESS_MS) };
  };
  const move = (x: number, y: number) => {
    const p = press.current;
    if (p && Math.hypot(x - p.x, y - p.y) > LONG_PRESS_SLOP) cancel();
  };
  return { start, move, cancel };
}
