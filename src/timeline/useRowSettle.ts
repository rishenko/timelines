import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { LaneDef, LaneLayout } from './layout.ts';
import type { Scale } from './scale.ts';
import type { YearWindow } from './rowsInView.ts';
import { useViewSelect, type ViewportStore } from './viewportStore.ts';

/** Hiding rows with nothing in view waits this long after the last scroll, so rows don't come and go mid-scroll. */
const SETTLE_MS = 200;
/** A row counts as in view with something this close to either edge (a share of the view's width), so rows arrive
 * just before their years do and don't flicker at the edges. */
const ROW_MARGIN = 0.25;

interface Args {
  allLanes: LaneDef[];
  scale: Scale;
  labelW: number;
  /** React's (banded) view, and the exact one: the windows and the years in view follow the exact view. */
  view: { left: number; width: number };
  viewStore: ViewportStore;
  hideOutOfView: boolean;
  /** The rows' window (when hiding last settled) and the lanes active then, with the index that answers any window. */
  rowWindow: YearWindow | null;
  setRowWindow: (w: YearWindow) => void;
  activeNow: Set<string> | null;
  activity: (w: YearWindow) => Set<string>;
  stripWindow: YearWindow | null;
  setStripWindow: (f: (p: YearWindow | null) => YearWindow | null) => void;
  setFocusedLane: (id: string | null) => void;
  layout: { lanes: LaneLayout[] };
  scrollerRef: RefObject<HTMLDivElement | null>;
  lanesRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hide rows with nothing in view: the rows are checked against the years in view plus a margin either side, once
 * scrolling settles (at once after a zoom), and the strips' window follows the same way. The first row on screen stays
 * where it was, so the rows don't jump under the reader. Also the busy ring's "rows pending" and its corner, and the
 * years in view on the scroller (for Print and Export). All read the exact view from the store, so a sideways scroll
 * doesn't re-render the chart.
 */
export function useRowSettle(a: Args) {
  const { allLanes, scale, labelW, view, viewStore, hideOutOfView, rowWindow, setRowWindow, activeNow, activity } = a;
  const { stripWindow, setStripWindow, setFocusedLane, layout, scrollerRef, lanesRef } = a;
  const laneIndex = useMemo(() => new Map(allLanes.map((l, i) => [l.id, i])), [allLanes]);
  const anchorRef = useRef<{ index: number; offset: number } | null>(null);
  const lastScaleRef = useRef(scale);
  const settleTimer = useRef(0);
  /** The years the rows would be checked against for a view (the view plus a margin either side): the exact view, from the store. */
  const nextWindowOf = useCallback(
    (v: { left: number; width: number }): YearWindow => ({
      y0: Math.floor(scale.yearAt(Math.max(0, v.left - v.width * ROW_MARGIN))),
      y1: Math.ceil(scale.yearAt(v.left + v.width * (1 + ROW_MARGIN))),
    }),
    [scale],
  );
  /**
   * The rows are about to change: the view has moved to years where another set of rows has something, and the check
   * that hides or shows them is waiting for scrolling to settle. The busy ring shows meanwhile.
   */
  const rowsPending = useViewSelect(viewStore, (v) => {
    const nextWindow = nextWindowOf(v);
    if (!activeNow || !rowWindow || (nextWindow.y0 === rowWindow.y0 && nextWindow.y1 === rowWindow.y1)) return false;
    const next = activity(nextWindow);
    return next.size !== activeNow.size || [...next].some((id) => !activeNow.has(id));
  });
  // the busy ring sits in the chart's top-right corner; when that corner is off screen (a tall Filters panel pushed the
  // chart down), it is pinned to the window's top-right instead, so a click's update is still seen
  const busyStripRef = useRef<HTMLDivElement>(null);
  const [cornerOnScreen, setCornerOnScreen] = useState(true);
  useEffect(() => {
    const el = busyStripRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setCornerOnScreen(entry.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // the strips' window follows the view as scrolling settles (a new window re-lays out the strips, so never per frame)
  const hasStripWindow = stripWindow !== null;
  useEffect(() => {
    let t = 0;
    const arm = () => {
      const w = nextWindowOf(viewStore.get());
      window.clearTimeout(t);
      t = window.setTimeout(() => setStripWindow((p) => (p && p.y0 === w.y0 && p.y1 === w.y1 ? p : w)), hasStripWindow ? SETTLE_MS : 0);
    };
    arm();
    const off = viewStore.subscribe(arm);
    return () => {
      off();
      window.clearTimeout(t);
    };
  }, [viewStore, nextWindowOf, hasStripWindow, setStripWindow]);
  const settleRows = useEffectEvent(() => {
    const w = nextWindowOf(viewStore.get());
    if (rowWindow && rowWindow.y0 === w.y0 && rowWindow.y1 === w.y1) return;
    const el = scrollerRef.current;
    const first = el ? layout.lanes.find((l) => l.top + l.height > el.scrollTop) : undefined;
    anchorRef.current = el && first ? { index: laneIndex.get(first.lane.id) ?? 0, offset: first.top - el.scrollTop } : null;
    const focused = document.activeElement;
    const laneEl = focused && lanesRef.current?.contains(focused) ? focused.closest('[data-lane]') : null;
    setFocusedLane(laneEl?.getAttribute('data-lane') ?? null);
    setRowWindow(w);
  });
  useEffect(() => {
    if (!hideOutOfView) return;
    const first = rowWindow === null;
    const rescaled = lastScaleRef.current !== scale;
    lastScaleRef.current = scale;
    window.clearTimeout(settleTimer.current);
    let frame = 0;
    if (first) settleRows();
    // after a zoom, the rows settle once the new scale has painted (the exact view is already the new one)
    else if (rescaled) frame = requestAnimationFrame(() => (settleTimer.current = window.setTimeout(settleRows, 0)));
    else settleTimer.current = window.setTimeout(settleRows, SETTLE_MS);
    // every move of the view (scroll, resize) re-arms the settle, as a new view did when the view was state
    const off = viewStore.subscribe(() => {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(settleRows, SETTLE_MS);
    });
    return () => {
      off();
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer.current);
    };
  }, [view, viewStore, scale, hideOutOfView, rowWindow]);
  // after the rows change, put the first row that was on screen back where it was; if it is now hidden, the next row
  // still drawn goes where it was, or at the top when it was partly scrolled past
  useLayoutEffect(() => {
    const a = anchorRef.current;
    anchorRef.current = null;
    const el = scrollerRef.current;
    if (!a || !el) return;
    const target = layout.lanes.find((l) => (laneIndex.get(l.lane.id) ?? -1) >= a.index) ?? layout.lanes.at(-1);
    // (a row now drawn thin is shorter than the part of it that was scrolled past: it goes at the top too)
    const same = target && laneIndex.get(target.lane.id) === a.index && target.height > -a.offset;
    if (target) el.scrollTop = Math.max(0, target.top - (same ? a.offset : Math.max(a.offset, 0)));
  }, [layout, laneIndex, scrollerRef]);
  // the years in view (first, last) on the scroller, for Print and Export: written from the exact view as it moves
  useLayoutEffect(() => {
    const write = () => {
      const el = scrollerRef.current;
      const v = viewStore.get();
      if (el) el.dataset.viewYears = `${scale.yearAt(v.left)},${scale.yearAt(Math.min(scale.width, v.left + Math.max(1, v.width - labelW)))}`;
    };
    write();
    return viewStore.subscribe(write);
  }, [viewStore, scale, labelW, scrollerRef]);
  return { rowsPending, busyStripRef, cornerOnScreen };
}
