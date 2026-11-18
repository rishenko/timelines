import { useCallback, useEffect, useState } from 'react';

/** The toolbar's toggle panels. Each opens and closes on its own; several can be open at once. */
export type PanelName = 'filters' | 'legend' | 'timelines' | 'theme';

/** Set once the legend has been shown, so it opens by itself only on a first visit. */
const LEGEND_SEEN_KEY = 'timelines:legend-seen';

function firstVisit(): boolean {
  try {
    return !localStorage.getItem(LEGEND_SEEN_KEY);
  } catch {
    return false;
  }
}

export function usePanels() {
  const [open, setOpen] = useState<Record<PanelName, boolean>>(() => ({
    filters: false,
    legend: firstVisit(),
    timelines: false,
    theme: false,
  }));
  useEffect(() => {
    try {
      localStorage.setItem(LEGEND_SEEN_KEY, '1');
    } catch {
      // storage disabled: the legend just opens on every visit
    }
  }, []);
  const toggle = useCallback((p: PanelName) => setOpen((o) => ({ ...o, [p]: !o[p] })), []);
  const show = useCallback((p: PanelName, on: boolean) => setOpen((o) => ({ ...o, [p]: on })), []);
  return { open, toggle, show };
}
