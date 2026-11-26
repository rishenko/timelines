import { useCallback, useState } from 'react';

/**
 * A request to bring something into view: from search, links, zoom and the table view. App holds the latest one;
 * the timeline and the table each act on it.
 */
export interface FocusRequest {
  year: number;
  /**
   * Years to bring into view (a row's lifespan, an event's dates). Centered if they fit on screen; if not,
   * their start goes near the left edge so the reader sees where they begin. Without it, `year` is centered.
   */
  range?: [number, number];
  /** Where `year` goes on the time axis, as a share of its width from the left, at once (a pinch keeps the year under the fingers). Default: centred, smoothly. */
  at?: number;
  /** Row to scroll down (or up) to and briefly highlight. */
  trackId?: string;
  /** Changes with every request, so asking for the same place again still scrolls there. */
  nonce: number;
}

/** The latest focus request, and `focusOn` to make one (it adds the nonce). */
export function useFocusRequest() {
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const focusOn = useCallback((f: Omit<FocusRequest, 'nonce'>) => setFocus({ ...f, nonce: Date.now() }), []);
  return [focus, focusOn] as const;
}
