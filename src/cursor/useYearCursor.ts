import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { createCursorStore, type Cursor } from './cursorStore.ts';

interface Options {
  scrollerRef: RefObject<HTMLDivElement | null>;
  lanesRef: RefObject<HTMLDivElement | null>;
  labelW: number;
  scale: { width: number; yearAt: (x: number) => number };
  /** The layers' slot elements: focus inside them is the cursor's own, never a place to return to. */
  isLayerElement: (el: Element | null) => boolean;
}

/**
 * The year cursor's core (plugin design §4): the year under the pointer (or placed with the keyboard), with the chart's
 * geometry when it was set (where the chart and its time axis are in the window, its sticky header's height, and which
 * stretch of rows is on screen), so drawing it reads no refs. Pointer and scroll keep it current. It lives in a store
 * outside React (cursorStore.ts): a move re-renders nothing in the chart. The cursor bundled layer
 * (plugins/bundled/cursor.ts) draws it and owns its keys; it sets it through `setCursor`.
 */
export function useYearCursor({ scrollerRef, lanesRef, labelW, scale, isLayerElement }: Options) {
  const [cursorStore] = useState(createCursorStore);
  const frame = useRef(0);
  const returnTo = useRef<HTMLElement | null>(null);
  const cursorAt = (year: number, keyboard: boolean): Cursor | null => {
    const el = scrollerRef.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const headH = lanesRef.current?.offsetTop ?? 0;
    return { year, keyboard, left: box.left, axisLeft: box.left + labelW, top: box.top, headH, rowsTop: el.scrollTop, rowsBottom: el.scrollTop + el.clientHeight - headH };
  };
  const onCursorMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch' || cursorStore.get()?.keyboard) return;
    const { clientX } = ev;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const x = clientX - el.getBoundingClientRect().left + el.scrollLeft - labelW;
      cursorStore.set(x < 0 || x > scale.width ? null : cursorAt(Math.round(scale.yearAt(x)), false));
    });
  };
  const onCursorLeave = () => {
    cancelAnimationFrame(frame.current);
    cursorStore.update((c) => (c?.keyboard ? c : null));
  };
  const onCursorScroll = () => cursorStore.update((c) => (c ? cursorAt(c.year, c.keyboard) : c));
  // the layer api's `cursor.set` reads the latest geometry (labels and scroller change between renders)
  const latest = useRef({ cursorAt, isLayerElement });
  useLayoutEffect(() => {
    latest.current = { cursorAt, isLayerElement };
  });
  /**
   * For the layer api: a year in keyboard mode remembers where focus was (unless it's already in a layer, as when the
   * chip steps the cursor); null puts it away and, after keyboard mode, returns focus there.
   */
  const setCursor = useCallback(
    (year: number | null, keyboard = false) => {
      const { cursorAt: at, isLayerElement: inLayer } = latest.current;
      if (year === null) {
        const was = cursorStore.get();
        cursorStore.set(null);
        if (was?.keyboard) returnTo.current?.focus();
        return;
      }
      if (keyboard && !inLayer(document.activeElement)) returnTo.current = document.activeElement as HTMLElement | null;
      cursorStore.set(at(Math.round(year), keyboard));
    },
    [cursorStore],
  );
  return { cursorStore, setCursor, onCursorMove, onCursorLeave, onCursorScroll };
}
