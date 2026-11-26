/**
 * The chart's exact horizontal view (scroll left and width, content px), held outside React (plugin design, step 1b):
 * TimelineView renders from a view banded to half a screen, so a sideways scroll doesn't re-render it per frame; what
 * must follow every pixel (sticky labels, the cursor's head, the overview strip's outline, the busy ring) reads this store
 * with useViewSelect and re-renders only when its own value changes.
 */
import { useSyncExternalStore } from 'react';

export interface View {
  left: number;
  width: number;
}

/** The year at the centre of the time axis on screen, from the exact view (its width includes the row labels). The page's
 *  keys, the chart's keys on a control with no event, and the tool host all run commands at this year. */
export const centreYear = (v: View, labelW: number, yearAt: (x: number) => number) => yearAt(v.left + (v.width - labelW) / 2);

export interface ViewportStore {
  get(): View;
  set(left: number, width: number): void;
  subscribe(fn: () => void): () => void;
}

export function createViewportStore(initial: View = { left: 0, width: 1200 }): ViewportStore {
  let value = initial;
  const subs = new Set<() => void>();
  let pending = false;
  const notify = () => {
    pending = false;
    for (const fn of [...subs]) fn();
  };
  return {
    get: () => value,
    // the value is exact at once; subscribers hear of it once per task, in a microtask after the set. A scroll's set still
    // notifies before paint, so sticky labels move in the same frame; and a set made during a render's commit (the scroll
    // anchor after a zoom) never makes useSyncExternalStore throw away a deferred render and redo it
    set(left, width) {
      if (value.left === left && value.width === width) return;
      value = { left, width };
      if (!pending) {
        pending = true;
        queueMicrotask(notify);
      }
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** A value derived from the exact view: the component re-renders only when it changes (compare with Object.is). */
export function useViewSelect<T>(store: ViewportStore, select: (v: View) => T): T {
  const get = () => select(store.get());
  return useSyncExternalStore(store.subscribe, get, get);
}

/** The band React's view moves in: half a screen (at least 100 px), as the rows' band does. */
export const bandStep = (width: number) => Math.max(100, Math.round(width / 2));
