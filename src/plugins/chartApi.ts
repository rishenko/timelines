import { createContext, useContext, useState } from 'react';
import type { LayerApi } from './layer.ts';

/**
 * The chart's layer api, published for tools (plugin design §3): set while a chart is mounted, null in table view and
 * between two charts. Listeners always hear null before a new api, so a tool drops what it subscribed to on the old one.
 */
export interface ChartApiStore {
  get(): LayerApi | null;
  set(api: LayerApi | null): void;
  subscribe(fn: (api: LayerApi | null) => void): () => void;
}

export function createChartApiStore(): ChartApiStore {
  let current: LayerApi | null = null;
  const subs = new Set<(api: LayerApi | null) => void>();
  const emit = (api: LayerApi | null) => {
    current = api;
    for (const fn of [...subs]) fn(api);
  };
  return {
    get: () => current,
    set(api) {
      if (api === current) return;
      if (current && api) emit(null);
      emit(api);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** The app's one store (Boot provides it, beside the command registry). */
export const ChartApiContext = createContext<ChartApiStore | null>(null);

/** The app's store, or one of this component's own (a chart or toolbar rendered on its own, as in tests). */
export function useChartApis(): ChartApiStore {
  const shared = useContext(ChartApiContext);
  const [own] = useState(createChartApiStore);
  return shared ?? own;
}
