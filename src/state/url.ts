import { useCallback, useEffect, useRef } from 'react';
import { parseFullDate, parseYear } from '../lib/calendar.ts';
import { centerParam, incrementParam, incrementYears, startAt } from '../lib/subYear.ts';
import type { LibraryEntry } from './library.ts';
import type { Dataset } from '../types.ts';
import { parseRegions } from '../lib/regions.ts';
import { categoryFacetId, parseCategories } from '../lib/categories.ts';
import { parseOrder, parseSet, type SetOrder } from '../lib/sets.ts';
import { regionFacetId } from './regionFilter.ts';
import { followRedirect, followRedirectList } from '../data/ids.ts';

/**
 * The address bar. View settings live in the query string (`?timeline=…&inc=100&at=-1594&compress=0&rows=all`; rows is all, active or thin;
 * the region filter as `&regions=anatolia,nile`; a comparison set as `&set=hittites,pharaonic-egypt&order=related`)
 * and the selected event in the hash (`#sack-of-babylon`), so any view can be shared as a link. Ids in a link follow the
 * timeline's `redirects`, so a link made before a row or event was renamed still opens on it.
 */

/** Reads the view settings the page was opened with, for the timeline it opened (see Boot). */
export function readUrl(published: Dataset) {
  const q = new URLSearchParams(window.location.search);
  const { increments, defaultIncrement, calendar } = published.meta;
  const inc = incrementYears(q.get('inc') ?? '');
  const at = q.get('at');
  return {
    increment: increments.map(incrementYears).includes(inc) ? inc : incrementYears(defaultIncrement),
    at: at !== null ? parseCenter(at, calendar) : null,
    compress: q.get('compress') !== '0',
    /** Hide rows with nothing in view: from the link if it says, else the timeline's default. */
    hideOutOfView: ['active', 'thin'].includes(q.get('rows') ?? '') ? true : q.get('rows') === 'all' ? false : published.meta.hideRowsOutOfView !== false,
    /** Hidden rows drawn as thin lines rather than taken out. */
    thinRows: q.get('rows') === 'thin',
    view: (q.get('view') === 'table' ? 'table' : 'timeline') as View,
    /** Ticked regions of the region filter (values of the timeline's first facet). */
    regions: parseRegions(followRedirectList(published, q.get('regions')), published.meta.facets?.[regionFacetId(published) ?? '']),
    /** A comparison set to open on, and its order. */
    set: parseSet(followRedirectList(published, q.get('set')), published.tracks),
    /** Ticked categories of the category filter (`?cat=conflict,siege`; none = every category). */
    cat: parseCategories(followRedirectList(published, q.get('cat')), published.meta.facets?.[categoryFacetId(published) ?? '']),
    order: parseOrder(q.get('order')),
    selected: selectedFromHash(published),
  };
}

/** The event selected in the link's hash, after its redirect (null when it was removed). */
function selectedFromHash(published: Dataset): string | null {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return id ? followRedirect(published, id) : null;
}

/** The center in a link: a year ("1594", "-1594", "1594 BCE"), or a day below a year's zoom ("1916-07-01"). */
function parseCenter(at: string, cal: Dataset['meta']['calendar']): number | null {
  const y = parseYear(at, cal);
  if (y !== null) return y;
  const d = parseFullDate(at, cal);
  return d ? startAt(d.year, d.month, d.day) : null;
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

interface ViewState {
  view: View;
  timelineId: string;
  increment: number;
  compress: boolean;
  selectedId: string | null;
  hideOutOfView: boolean;
  thinRows: boolean;
  /** The timeline's default for hideOutOfView: the link says rows= only when the reader changed it. */
  hideOutOfViewDefault: boolean;
  /** Ticked regions of the region filter. */
  regions: string[];
  /** The comparison set while it is shown (empty otherwise), and its order. */
  set: string[];
  order: SetOrder;
  /** Ticked categories of the category filter. */
  cat: string[];
}

/**
 * Keeps the address bar in step with the view, debounced. The center year changes on every scroll, so it is
 * kept in a ref rather than state: `onCenterYearChange` records it and schedules a write without re-rendering.
 */
export function useUrlSync(view: ViewState, initialCenter: number) {
  const { timelineId, increment, compress, selectedId, view: mode, hideOutOfView, thinRows, hideOutOfViewDefault } = view;
  const regions = view.regions.join(',');
  const set = view.set.join(',');
  const order = view.order;
  const cat = view.cat.join(',');
  const centerRef = useRef(initialCenter);
  const timer = useRef(0);
  const writeUrl = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const q = new URLSearchParams();
      q.set('timeline', timelineId);
      q.set('inc', incrementParam(increment));
      q.set('at', centerParam(centerRef.current));
      if (!compress) q.set('compress', '0');
      if (hideOutOfView !== hideOutOfViewDefault || (hideOutOfView && thinRows))
        q.set('rows', !hideOutOfView ? 'all' : thinRows ? 'thin' : 'active');
      if (mode === 'table') q.set('view', 'table');
      if (regions) q.set('regions', regions);
      if (set) q.set('set', set);
      if (set && order !== 'picked') q.set('order', order);
      if (cat) q.set('cat', cat);
      const hash = selectedId ? `#${selectedId}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}?${q}${hash}`);
    }, 250);
  }, [timelineId, increment, compress, selectedId, mode, hideOutOfView, thinRows, hideOutOfViewDefault, regions, set, order, cat]);
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
