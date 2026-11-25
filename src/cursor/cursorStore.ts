/**
 * The year cursor's state, held outside React (plugin design, step 1): the chart doesn't re-render when the pointer moves;
 * only the cursor's own layers read it (useCursor). `set` and `update` notify synchronously; the pointer handler already
 * coalesces moves to one per frame.
 */
import { useSyncExternalStore } from 'react';

/** The year under the pointer (or placed with Y), with the chart's geometry when it was set, so drawing it reads no refs. */
export interface Cursor {
  year: number;
  keyboard: boolean;
  /** Where the chart is in the window, its sticky header's height, and which stretch of rows is on screen. */
  left: number;
  top: number;
  headH: number;
  rowsTop: number;
  rowsBottom: number;
}

export interface CursorStore {
  get(): Cursor | null;
  set(c: Cursor | null): void;
  update(fn: (c: Cursor | null) => Cursor | null): void;
  subscribe(fn: () => void): () => void;
}

export function createCursorStore(): CursorStore {
  let value: Cursor | null = null;
  const subs = new Set<() => void>();
  const set = (c: Cursor | null) => {
    if (c === value) return;
    value = c;
    for (const fn of [...subs]) fn();
  };
  return {
    get: () => value,
    set,
    update: (fn) => set(fn(value)),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** The cursor, for a component that draws it: re-renders only that component when it moves. */
export function useCursor(store: CursorStore): Cursor | null {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
