import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { ViewportStore } from './viewportStore.ts';
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
  /** React's view (banded to half a screen) and the exact one (viewportStore.ts), which places the default Tab stop. */
  view: { left: number; width: number };
  viewStore: ViewportStore;
  labelW: number;
  scrollerRef: RefObject<HTMLDivElement | null>;
  lanesRef: RefObject<HTMLDivElement | null>;
  eventsById: Map<string, ResolvedEvent>;
  centerYearRef: RefObject<number>;
  onSelect: (id: string | null) => void;
  onKeyZoom?: (dir: 1 | -1, year: number) => void;
  onShowKeys?: () => void;
  /** "/": move to the search box. Only in the chart, so it never takes a key typed elsewhere (WCAG 2.1.4). */
  onSearchKey?: () => void;
  /** Y: place the year cursor at the focused event's year, else the view's centre. */
  onCursorKey?: (year: number) => void;
  /** Each label has a compare button (comparison sets). */
  compare?: boolean;
  /** A lane's phase strip lines, each its cells' stop keys and left edges (content px): grid lines above its events. */
  stripLines?: (lane: LaneLayout) => { key: string; x: number }[][];
}

/**
 * Keyboard control of the chart (rules in ./keyboard.ts): the chart is one Tab stop (a roving tabindex), and arrow
 * keys, Home/End and Page Up/Down move between its controls; + and − zoom on the focused event, Escape deselects,
 * ? shows the keys, / moves to the search box. After a zoom or fold the stop is found again by what it held.
 * Returns the key of the control that holds the Tab stop, its focus handler, and the keydown handler for the lanes.
 */
export function useRovingFocus(o: Options) {
  const { lanes, expanded, selectedId, view, labelW, scrollerRef, lanesRef } = o;
  const grid = useMemo(
    () =>
      buildGrid(lanes, (l) => [
        ...(safeUrl(l.lane.track.url) ? [labelStopKey(l.lane.id, 'link')] : []),
        ...(o.compare ? [labelStopKey(l.lane.id, 'compare')] : []),
        ...(l.overflow > 0 || expanded[l.lane.id] ? [labelStopKey(l.lane.id, 'overflow')] : []),
        ...(l.lane.hasChildren ? [labelStopKey(l.lane.id, 'fold')] : []),
        ...(o.inactiveBelow?.get(l.lane.id) ? [labelStopKey(l.lane.id, 'hidden')] : []),
      ], o.stripLines),
    [lanes, expanded, o.inactiveBelow, o.compare, o.stripLines],
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
  /** The default Tab stop for a left edge: the first event at or after it, top to bottom (never a phase strip cell: Tab
   * lands on events, as before strip cells could be reached). */
  // indexed once per grid: each lane's event stops (sorted by x, as buildGrid sorts them) and its last x, so a left edge is
  // answered by a pass over the lanes and a binary search in one, not a pass over every stop (it runs on every scroll frame)
  const stopIndex = useMemo(() => {
    const stops = grid.flatMap((l) => l.stops);
    const event = (st: (typeof stops)[number]) => !st.label && !st.strip;
    const lanes = grid.map((l) => l.stops.filter(event)).filter((evs) => evs.length);
    const fallback = (stops.find(event) ?? stops.find((st) => !st.strip) ?? stops[0])?.key ?? null;
    return { lanes, last: lanes.map((evs) => evs[evs.length - 1].x), fallback };
  }, [grid]);
  const defaultStopAt = useCallback(
    (left: number) => {
      const { lanes, last, fallback } = stopIndex;
      const i = last.findIndex((x) => x >= left);
      if (i < 0) return fallback;
      const evs = lanes[i];
      let lo = 0;
      let hi = evs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (evs[mid].x >= left) hi = mid;
        else lo = mid + 1;
      }
      return evs[lo].key;
    },
    [stopIndex],
  );
  const [rovingKey, usesDefault] = useMemo((): [string | null, boolean] => {
    const stops = grid.flatMap((l) => l.stops);
    if (active && stops.some((st) => st.key === active.key)) return [active.key, false];
    const again = active && relocate(grid, active.laneId, active.eventIds);
    if (again) return [again, false];
    const sel = selectedId ? stops.find((st) => !st.label && st.eventIds.includes(selectedId)) : undefined;
    if (sel) return [sel.key, false];
    // else the default for the view's left edge: React's view is banded, so the exact stop is placed below
    return [defaultStopAt(view.left), true];
  }, [grid, active, selectedId, view.left, defaultStopAt]);
  // The default Tab stop follows the exact left edge without re-rendering the chart: after each render and each move of
  // the view, the tabindex="0" goes to the first event at or after the exact left (the one React chose from the banded
  // view keeps it when that event isn't drawn). Tab lands where it always did; still one Tab stop in the chart.
  const placed = useRef<string | null>(null);
  useLayoutEffect(() => {
    const sync = () => {
      const root = lanesRef.current;
      if (!root) return;
      const at = (k: string | null) => (k ? root.querySelector<HTMLElement>(`[data-stop="${CSS.escape(k)}"]`) : null);
      const want = usesDefault ? defaultStopAt(o.viewStore.get().left) : rovingKey;
      const target = want && at(want) ? want : rovingKey;
      for (const k of new Set([placed.current, rovingKey])) {
        const el = k !== target ? at(k) : null;
        if (el) el.tabIndex = -1;
      }
      const el = at(target);
      if (el) el.tabIndex = 0;
      placed.current = target;
    };
    sync();
    const off = o.viewStore.subscribe(sync);
    const lanesEl = lanesRef.current; // the cleanup restores stops in the lanes this effect placed them in
    // before the next render's sync and on unmount: put back what React rendered (its own stop at 0, the hand-placed one
    // at -1), so a hand-set tabindex never outlives the render it was placed for
    return () => {
      off();
      const root = lanesEl;
      const at = (k: string | null) => (k && root ? root.querySelector<HTMLElement>(`[data-stop="${CSS.escape(k)}"]`) : null);
      const mine = placed.current !== rovingKey ? at(placed.current) : null;
      if (mine) mine.tabIndex = -1;
      const react = at(rovingKey);
      if (react) react.tabIndex = 0;
      placed.current = rovingKey;
    };
  });
  const goTo = (key: string) => {
    setActive(stopInfo(key));
    focusPending.current = true;
  };
  // the same function on every render, so memoised marks don't re-render for it (it reads the latest grid and stop)
  const latest = useRef({ active, stopInfo });
  useLayoutEffect(() => {
    latest.current = { active, stopInfo };
  });
  const onStopFocus = useCallback((key: string) => {
    if (latest.current.active?.key !== key) setActive(latest.current.stopInfo(key));
  }, []);
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
    } else if (ev.key === '/') {
      ev.preventDefault();
      o.onSearchKey?.();
    } else if ((ev.key === 'y' || ev.key === 'Y') && o.onCursorKey) {
      ev.preventDefault();
      const e = stopInfo(key)?.eventIds.map((id) => o.eventsById.get(id)).find(Boolean);
      o.onCursorKey(e ? e.start : o.centerYearRef.current);
    }
  };
  return { rovingKey, onStopFocus, onKeyNav };
}
