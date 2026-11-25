import { useMemo } from 'react';
import type { Dataset } from '../types.ts';
import type { useFilters } from './filters.ts';
import type { useRegionFilter } from './regionFilter.ts';
import type { useComparison } from './comparison.ts';

/**
 * The rows the chart and table draw: the reader's own row toggles, with the comparison set (when shown) or else the
 * region filter laid over them; the data with the set's rows; each row's region tag in a comparison; and what Filters
 * dims and opens for the region filter.
 */
export function useRowOverlays(
  data: Dataset,
  filters: ReturnType<typeof useFilters>['filters'],
  regions: ReturnType<typeof useRegionFilter>,
  comparison: ReturnType<typeof useComparison>,
) {
  const rowsOn = useMemo(
    () =>
      comparison.active
        ? { ...filters.tracks, ...comparison.overlay }
        : regions.active
          ? { ...filters.tracks, ...regions.overlay }
          : filters.tracks,
    [comparison.active, comparison.overlay, regions.active, regions.overlay, filters.tracks],
  );
  /** The data the chart and table draw: the set's rows while a comparison is shown. */
  const viewData = useMemo(() => (comparison.tracks ? { ...data, tracks: comparison.tracks } : data), [comparison.tracks, data]);
  // in a comparison each row shows its broad region beside its name
  const rowTags = useMemo(() => {
    if (!comparison.active || !regions.regionsOf) return undefined;
    const tags = new Map<string, string>();
    for (const id of comparison.ordered) {
      const r = regions.regionsOf.get(id)?.[0];
      if (r) tags.set(id, r.within.at(-1) ?? r.name);
    }
    return tags;
  }, [comparison.active, comparison.ordered, regions.regionsOf]);
  const trackName = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  // in Filters, rows and sources outside the ticked regions are dimmed and the groups holding the ones inside open
  const regionRows = useMemo(
    () => (regions.active ? new Set(data.tracks.filter((t) => regions.overlay[t.id] !== false).map((t) => t.id)) : undefined),
    [regions.active, regions.overlay, data.tracks],
  );
  const regionOpen = useMemo(() => {
    if (!regions.active) return undefined;
    const byId = new Map(data.tracks.map((t) => [t.id, t]));
    const open = new Set<string>();
    for (const id of regions.rowsInPicked) for (let p = byId.get(id)?.parent; p && !open.has(p); p = byId.get(p)?.parent) open.add(p);
    return [...open];
  }, [regions.active, regions.rowsInPicked, data.tracks]);
  const shownFilters = useMemo(() => ({ ...filters, tracks: rowsOn }), [filters, rowsOn]);
  return { rowsOn, viewData, rowTags, trackName, regionRows, regionOpen, shownFilters };
}
