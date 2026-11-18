import { useCallback, useEffect, useRef } from 'react';
import { findTimeline } from '../timelines/index.ts';
import { parseYear } from '../lib/calendar.ts';
import type { LibraryEntry } from './library.ts';

/**
 * The address bar. View settings live in the query string (`?timeline=…&inc=100&at=-1594&compress=0&links=1`)
 * and the selected event in the hash (`#sack-of-babylon`), so any view can be shared as a link.
 */

/** Reads the timeline and view settings the page was opened with. */
export function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const choice = findTimeline(q.get('timeline'));
  const published = choice.dataset;
  const { increments, defaultIncrement, calendar } = published.meta;
  const inc = Number(q.get('inc'));
  const at = q.get('at');
  return {
    published,
    library: choice.library,
    increment: increments.includes(inc) ? inc : defaultIncrement,
    at: at !== null ? parseYear(at, calendar) : null,
    compress: q.get('compress') !== '0',
    links: q.get('links') === '1',
    view: (q.get('view') === 'table' ? 'table' : 'timeline') as View,
    selected: decodeURIComponent(window.location.hash.slice(1)) || null,
  };
}

/** Opens another timeline (a full page load, so it starts from its own defaults and draft). */
export const goToTimeline = (id: string) => {
  window.location.href = `${window.location.pathname}?timeline=${encodeURIComponent(id)}`;
};

/** A link anyone can open: timelines from a URL travel as ?data=<url>; others by id (bundled, or in this browser's library). */
export function shareSearch(id: string, library?: LibraryEntry): string {
  return library?.sourceUrl ? `?data=${encodeURIComponent(library.sourceUrl)}` : `?timeline=${encodeURIComponent(id)}`;
}

/** Timeline (the chart) or table (the same events as tables: the accessible equivalent). */
export type View = 'timeline' | 'table';

interface ViewState {
  view: View;
  timelineId: string;
  increment: number;
  compress: boolean;
  showLinks: boolean;
  selectedId: string | null;
}

/**
 * Keeps the address bar in step with the view, debounced. The center year changes on every scroll, so it is
 * kept in a ref rather than state: `onCenterYearChange` records it and schedules a write without re-rendering.
 */
export function useUrlSync(view: ViewState, initialCenter: number) {
  const { timelineId, increment, compress, showLinks, selectedId, view: mode } = view;
  const centerRef = useRef(initialCenter);
  const timer = useRef(0);
  const writeUrl = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const q = new URLSearchParams();
      q.set('timeline', timelineId);
      q.set('inc', String(increment));
      q.set('at', String(centerRef.current));
      if (!compress) q.set('compress', '0');
      if (showLinks) q.set('links', '1');
      if (mode === 'table') q.set('view', 'table');
      const hash = selectedId ? `#${selectedId}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}?${q}${hash}`);
    }, 250);
  }, [timelineId, increment, compress, showLinks, selectedId, mode]);
  useEffect(writeUrl, [writeUrl]);
  const onCenterYearChange = useCallback(
    (y: number) => {
      centerRef.current = y;
      writeUrl();
    },
    [writeUrl],
  );
  return { centerRef, onCenterYearChange };
}
