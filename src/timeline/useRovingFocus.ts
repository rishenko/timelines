import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { buildGrid, labelStopKey, move, relocate, type Move } from './keyboard.ts';
import type { LaneLayout } from './layout.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';
import { safeUrl } from '../lib/urls.ts';

const KEY_MOVES: Record<string, Move> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'home',
  End: 'end',
  PageUp: 'page-left',
  PageDown: 'page-right',
};

interface Options {
  lanes: LaneLayout[];
  /** Lanes showing all their events: their show-all button stays a stop even with nothing folded. */
  expanded: Record<string, boolean>;
  /** Header lanes with rows below them that have nothing in view: their show/hide button is a stop. */
  inactiveBelow?: Map<string, number>;
  selectedId: string | null;
  /** The visible stretch of the chart, content px. */
  view: { left: number; width: number };
  labelW: number;
  scrollerRef: RefObject<HTMLDivElement | null>;
  lanesRef: RefObject<HTMLDivElement | null>;
  eventsById: Map<string, ResolvedEvent>;
  centerYearRef: RefObject<number>;
  onSelect: (id: string | null) => void;
  onKeyZoom?: (dir: 1 | -1, year: number) => void;
  onShowKeys?: () => void;
}

/**
 * Keyboard control of the chart (rules in ./keyboard.ts): the chart is one Tab stop (a roving tabindex), and arrow
 * keys, Home/End and Page Up/Down move between its controls; + and − zoom on the focused event, Escape deselects,
 * ? shows the keys. After a zoom or fold the stop is found again by what it held.
 * Returns the key of the control that holds the Tab stop, its focus handler, and the keydown handler for the lanes.
 */
export function useRovingFocus(o: Options) {
  const { lanes, expanded, selectedId, view, labelW, scrollerRef, lanesRef } = o;
  const grid = useMemo(
    () =>
      buildGrid(lanes, (l) => [
        ...(safeUrl(l.lane.track.url) ? [labelStopKey(l.lane.id, 'link')] : []),
        ...(l.overflow > 0 || expanded[l.lane.id] ? [labelStopKey(l.lane.id, 'overflow')] : []),
        ...(l.lane.hasChildren ? [labelStopKey(l.lane.id, 'fold')] : []),
        ...(o.inactiveBelow?.get(l.lane.id) ? [labelStopKey(l.lane.id, 'hidden')] : []),
      ]),
    [lanes, expanded, o.inactiveBelow],
  );
  /** The control that holds the chart's one Tab stop, with what it held (to find it again after a zoom or fold). */
  const [active, setActive] = useState<{ key: string; laneId: string; eventIds: string[] } | null>(null);
  const focusPending = useRef(false);
  const stopInfo = (key: string) => {
    for (const l of grid) {
      const st = l.stops.find((x) => x.key === key);
      if (st) return { key, laneId: l.laneId, eventIds: st.eventIds };
    }
    return null;
  };
  const rovingKey = useMemo(() => {
    const stops = grid.flatMap((l) => l.stops);
    if (active && stops.some((st) => st.key === active.key)) return active.key;
    const again = active && relocate(grid, active.laneId, active.eventIds);
    if (again) return again;
    const sel = selectedId ? stops.find((st) => !st.label && st.eventIds.includes(selectedId)) : undefined;
    if (sel) return sel.key;
    // else the first event at or after the left edge of the view, top to bottom
    return (stops.find((st) => !st.label && st.x >= view.left) ?? stops.find((st) => !st.label) ?? stops[0])?.key ?? null;
  }, [grid, active, selectedId, view.left]);
  const goTo = (key: string) => {
    setActive(stopInfo(key));
    focusPending.current = true;
  };
  const onStopFocus = (key: string) => {
    if (active?.key !== key) setActive(stopInfo(key));
  };
  // after a key moved focus: focus the control and keep it in sight, clear of the sticky labels and ruler
  useEffect(() => {
    if (!focusPending.current || !rovingKey) return;
    focusPending.current = false;
    const el = lanesRef.current?.querySelector<HTMLElement>(`[data-stop="${CSS.escape(rovingKey)}"]`);
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const left = box.left + labelW;
    const top = box.top + (lanesRef.current?.offsetTop ?? 0);
    if (!el.closest('.tl-lane-label') && (r.left < left || r.left > box.right - 40))
      scroller.scrollLeft += r.left - (left + (box.width - labelW) / 3);
    if (r.top < top || r.bottom > box.bottom) scroller.scrollTop += r.top - (top + 40);
  });
  const onKeyNav = (ev: React.KeyboardEvent) => {
    const key = (ev.target as HTMLElement).closest('[data-stop]')?.getAttribute('data-stop');
    if (!key || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const m = KEY_MOVES[ev.key];
    if (m) {
      ev.preventDefault();
      const to = move(grid, key, m, view.width - labelW);
      if (to) goTo(to);
    } else if (ev.key === '+' || ev.key === '=' || ev.key === '-' || ev.key === '_') {
      ev.preventDefault();
      const info = stopInfo(key);
      const e = info?.eventIds.map((id) => o.eventsById.get(id)).find(Boolean);
      o.onKeyZoom?.(ev.key === '+' || ev.key === '=' ? 1 : -1, e ? e.start : o.centerYearRef.current);
      setActive(info);
      focusPending.current = true;
    } else if (ev.key === 'Escape' && selectedId) {
      ev.preventDefault();
      o.onSelect(null);
    } else if (ev.key === '?') {
      ev.preventDefault();
      o.onShowKeys?.();
    }
  };
  return { rovingKey, onStopFocus, onKeyNav };
}
