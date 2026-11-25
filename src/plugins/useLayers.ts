import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { CommandRegistry } from '../commands/registry.ts';
import type { CursorStore } from '../cursor/cursorStore.ts';
import type { ViewportStore } from '../timeline/viewportStore.ts';
import type { LayerApi, LayerPlugin, LayerRow, LayerSlot } from './layer.ts';

/** What the chart hands its layers; read through `api` when a layer asks, so the api object itself never changes. */
export interface LayerInputs {
  scale: { x(year: number): number; yearAt(x: number): number; increment: number; width: number };
  viewStore: ViewportStore;
  rowsInView: () => LayerRow[];
  timeline: LayerApi['timeline'];
  cursorStore: CursorStore;
  setCursor: (year: number | null, keyboard?: boolean) => void;
  commands: CommandRegistry;
  formatYear: (year: number) => string;
}

/**
 * The layer host (plugin design §3–4): mounts each layer once, with an element per slot it asked for, and gives it one
 * `api` object. The api reads the chart's latest inputs, so the chart re-rendering doesn't remount anything; a layer
 * hears of new data, dating, zoom or rows through `api.onChange` (called after a render where `changed` differs).
 */
export function useLayers(layers: LayerPlugin[], slots: Record<LayerSlot, RefObject<HTMLDivElement | null>>, inputs: LayerInputs, changed: unknown[]) {
  const live = useRef(inputs);
  useLayoutEffect(() => {
    live.current = inputs;
  });
  const [listeners] = useState(() => new Set<() => void>());
  const [api] = useState<LayerApi>(() => ({
    scale: {
      x: (y) => live.current.scale.x(y),
      year: (x) => live.current.scale.yearAt(x),
      get step() {
        return live.current.scale.increment;
      },
      get width() {
        return live.current.scale.width;
      },
    },
    viewport: { get: () => live.current.viewStore.get(), subscribe: (fn) => live.current.viewStore.subscribe(fn) },
    rows: { inView: () => live.current.rowsInView() },
    timeline: {
      get events() {
        return live.current.timeline.events;
      },
      get spans() {
        return live.current.timeline.spans;
      },
      get phases() {
        return live.current.timeline.phases;
      },
      get ages() {
        return live.current.timeline.ages;
      },
      get reignLane() {
        return live.current.timeline.reignLane;
      },
    },
    cursor: {
      get: () => live.current.cursorStore.get(),
      set: (year, keyboard) => live.current.setCursor(year, keyboard),
      subscribe: (fn) => live.current.cursorStore.subscribe(fn),
    },
    command: (id, label, run, o) => live.current.commands.register({ id, label, run, scope: o.scope, key: o.key }),
    keys(el, scope) {
      const on = (ev: KeyboardEvent) => {
        if (live.current.commands.dispatch(ev, scope)) ev.preventDefault();
      };
      el.addEventListener('keydown', on);
      return () => el.removeEventListener('keydown', on);
    },
    formatYear: (y) => live.current.formatYear(y),
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  }));
  useLayoutEffect(() => {
    const offs = layers.map((l) => {
      const els: Partial<Record<LayerSlot, HTMLElement>> = {};
      for (const s of l.layer.slots) {
        const el = slots[s].current;
        if (el) els[s] = el;
      }
      return l.layer.mount(els, api);
    });
    return () => offs.forEach((off) => off());
    // layers mount once per chart: the api reads the latest inputs, and changes reach them through onChange
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    for (const fn of [...listeners]) fn();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, changed);
}
