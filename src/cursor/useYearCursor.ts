import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { createCursorStore, type Cursor } from './cursorStore.ts';
import { registerCursorCommands, type CursorActions } from './cursorCommands.ts';
import type { CommandRegistry } from '../commands/registry.ts';

interface Options {
  scrollerRef: RefObject<HTMLDivElement | null>;
  lanesRef: RefObject<HTMLDivElement | null>;
  labelW: number;
  scale: { width: number; yearAt: (x: number) => number };
  /** The zoom step in years: ←/→ move the cursor one step. */
  increment: number;
  commands: CommandRegistry;
}

/**
 * The year cursor: the year under the pointer (or placed with Y), with the chart's geometry when it was set (where the
 * chart is in the window, its sticky header's height, and which stretch of rows is on screen), so drawing it reads no
 * refs. Pointer and scroll keep it current. It lives in a store outside React (cursorStore.ts): a move re-renders only
 * the cursor's layers, never the chart. Its keys are commands in the registry (cursorCommands.ts).
 */
export function useYearCursor({ scrollerRef, lanesRef, labelW, scale, increment, commands }: Options) {
  const [cursorStore] = useState(createCursorStore);
  const frame = useRef(0);
  const returnTo = useRef<HTMLElement | null>(null);
  const cursorAt = (year: number, keyboard: boolean): Cursor | null => {
    const el = scrollerRef.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const headH = lanesRef.current?.offsetTop ?? 0;
    return { year, keyboard, left: box.left, top: box.top, headH, rowsTop: el.scrollTop, rowsBottom: el.scrollTop + el.clientHeight - headH };
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
  // the commands read the latest actions when they run (the zoom step and geometry change between renders)
  const actions = useRef<CursorActions>(null!);
  useLayoutEffect(() => {
    actions.current = {
      place(year) {
        returnTo.current = document.activeElement as HTMLElement | null;
        cursorStore.set(cursorAt(Math.round(year), true));
      },
      step: (dir, fine) =>
        cursorStore.update((c) => (c ? cursorAt(c.year + dir * Math.max(1, Math.round(fine ? increment / 10 : increment)), true) : c)),
      close() {
        cursorStore.set(null);
        returnTo.current?.focus();
      },
    };
  });
  useEffect(() => registerCursorCommands(commands, () => actions.current), [commands]);
  /** The chip's keys go through the registry (scope `cursor`). */
  const onChipKey = useCallback(
    (ev: KeyboardEvent) => {
      if (commands.dispatch(ev, 'cursor')) ev.preventDefault();
    },
    [commands],
  );
  return { cursorStore, onCursorMove, onCursorLeave, onCursorScroll, onChipKey };
}
