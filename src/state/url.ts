import { useCallback, useEffect, useRef } from 'react';
import type { LibraryEntry } from './library.ts';
import type { Dataset } from '../types.ts';
import type { SetOrder } from '../lib/sets.ts';
import { linkNotice, parseView, resolveView, serializeHash, serializeView, type ViewState } from './viewState.ts';
import { LABEL_W, LABEL_W_NARROW } from '../timeline/gestures.ts';

/**
 * The address bar: the timeline (`?timeline=`, `?data=` or `?collection=`), then the view as a link (`v=1&inc=100&at=…`,
 * see viewState.ts for the format, its order and its versions), then the selected event in the hash
 * (`#sack-of-babylon`). Any view can be shared as a link, and links made before v1 (no `v`) open as they always did.
 * Ids in a link follow the timeline's `redirects`, so a link made before a row or event was renamed still opens on it;
 * ones the timeline doesn't have are skipped, and `notice` says so once.
 */

/** Reads the view the page was opened with, for the timeline it opened (see Boot): the defaults filled in. */
export function readUrl(published: Dataset) {
  const parsed = parseView(window.location.search, window.location.hash, published);
  // the chart hasn't been measured yet: its width is estimated from the window, less the row labels
  const narrow = !!window.matchMedia?.('(max-width: 640px)').matches;
  const width = Math.max(200, (window.innerWidth || 1200) - (narrow ? LABEL_W_NARROW : LABEL_W));
  return { ...resolveView(parsed.state, published, width), notice: linkNotice(parsed) };
}

/** Opens another timeline (a full page load, so it starts from its own defaults and draft). */
export const goToTimeline = (id: string) => {
  window.location.href = `${window.location.pathname}?timeline=${encodeURIComponent(id)}`;
};

/** Opens the site's default timeline (the first in its list, else the reader's first, else the welcome page). */
export const goHome = () => {
  window.location.href = window.location.pathname;
};

/** A link anyone can open: timelines from a URL travel as ?data=<url>; others by id (bundled, or in this browser's library). */
export function shareSearch(id: string, library?: LibraryEntry): string {
  return library?.sourceUrl ? `?data=${encodeURIComponent(library.sourceUrl)}` : `?timeline=${encodeURIComponent(id)}`;
}

/** Timeline (the chart) or table (the same events as tables: the accessible equivalent). */
export type View = 'timeline' | 'table';

interface UrlView {
  view: View;
  timelineId: string;
  increment: number;
  compress: boolean;
  selectedId: string | null;
  hideOutOfView: boolean;
  thinRows: boolean;
  /** Ticked regions of the region filter. */
  regions: string[];
  /** The comparison set while it is shown (empty otherwise), and its order. */
  set: string[];
  order: SetOrder;
  /** Ticked categories of the category filter. */
  cat: string[];
  /** The end-year window the page was opened with (`from`/`to`): kept in the link until the reader scrolls or zooms. */
  openedWindow: { from: number; to: number } | null;
}

/**
 * Keeps the address bar in step with the view, debounced. The center year changes on every scroll, so it is
 * kept in a ref rather than state: `onCenterYearChange` records it and schedules a write without re-rendering.
 */
export function useUrlSync(v: UrlView, initialCenter: number, ds: Dataset) {
  const centerRef = useRef(initialCenter);
  // the opened from/to stays in the link until the zoom changes or the centre moves half a tick from where it was put
  const keepWindow = useRef(v.openedWindow ? { ...v.openedWindow, increment: v.increment, center: initialCenter } : null);
  const timer = useRef(0);
  const regions = v.regions.join(',');
  const set = v.set.join(',');
  const cat = v.cat.join(',');
  const { timelineId, increment, compress, selectedId, view: mode, hideOutOfView, thinRows, order } = v;
  const writeUrl = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const k = keepWindow.current;
      if (k && (k.increment !== increment || Math.abs(centerRef.current - k.center) > increment / 2)) keepWindow.current = null;
      const state: ViewState = {
        window: keepWindow.current ? { from: keepWindow.current.from, to: keepWindow.current.to } : { inc: increment, at: centerRef.current },
        ...(mode === 'table' ? { view: 'table' as const } : {}),
        ...(compress ? {} : { compress: false as const }),
        rows: !hideOutOfView ? 'all' : thinRows ? 'thin' : 'active',
        ...(regions ? { regions: regions.split(',') } : {}),
        ...(set ? { set: { ids: set.split(','), order } } : {}),
        ...(cat ? { cat: cat.split(',') } : {}),
        ...(selectedId ? { selected: selectedId } : {}),
      };
      // a view plugin's ?plugin= stays in the link (docs/plugins.md)
      const plugin = new URLSearchParams(window.location.search).get('plugin');
      const query = `timeline=${encodeURIComponent(timelineId)}&${serializeView(state, ds)}${plugin ? `&plugin=${encodeURIComponent(plugin)}` : ''}`;
      window.history.replaceState(null, '', `${window.location.pathname}?${query}${serializeHash(state)}`);
    }, 250);
  }, [timelineId, increment, compress, selectedId, mode, hideOutOfView, thinRows, regions, set, order, cat, ds]);
  useEffect(() => {
    writeUrl();
    // a write still waiting when the app closes is dropped (in tests, the page is gone by then)
    return () => clearTimeout(timer.current);
  }, [writeUrl]);
  const onCenterYearChange = useCallback(
    (y: number) => {
      centerRef.current = y;
      writeUrl();
    },
    [writeUrl],
  );
  return { centerRef, onCenterYearChange };
}
