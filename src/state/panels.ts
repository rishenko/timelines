import { useCallback, useEffect, useState } from 'react';

/**
 * The toolbar's toggle panels, plus the guided tour. Each opens and closes on its own; several can be open at once.
 */
export type PanelName = 'filters' | 'legend' | 'timelines' | 'theme' | 'tour';

/**
 * Set on a reader's first visit, so the guided tour starts by itself only once. (The name dates from when the legend
 * opened on a first visit instead; keeping it means readers who saw the legend aren't sent on the tour.)
 */
const LEGEND_SEEN_KEY = 'timelines:legend-seen';

function firstVisit(): boolean {
  try {
    return !localStorage.getItem(LEGEND_SEEN_KEY);
  } catch {
    return false;
  }
}

/** autoTour: false when the page opens in table view (the tour is about the chart; the Legend can still start it). */
export function usePanels(autoTour = true) {
  const [open, setOpen] = useState<Record<PanelName, boolean>>(() => ({
    filters: false,
    legend: false,
    timelines: false,
    theme: false,
    tour: autoTour && firstVisit(),
  }));
  useEffect(() => {
    try {
      localStorage.setItem(LEGEND_SEEN_KEY, '1');
    } catch {
      // storage disabled: firstVisit() is false then, so the tour never starts by itself
    }
  }, []);
  const toggle = useCallback((p: PanelName) => setOpen((o) => ({ ...o, [p]: !o[p] })), []);
  const show = useCallback((p: PanelName, on: boolean) => setOpen((o) => ({ ...o, [p]: on })), []);
  return { open, toggle, show };
}
