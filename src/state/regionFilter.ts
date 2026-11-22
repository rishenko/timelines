import { useMemo, useState } from 'react';
import type { Dataset } from '../types.ts';
import { regionOverlay, regionTree, rowRegionList, rowRegions, regionsTooltip, type RegionNode, type RowRegion } from '../lib/regions.ts';
import { isOn } from './filters.ts';

/**
 * The region filter's state (see lib/regions.ts): the ticked regions, from the link (`?regions=`) at first. It works on
 * the timeline's first facet (geography in the bundled timeline; the people and civilization lists aren't settled).
 * Off in edit mode, where every row must be reachable.
 */
/** The facet the region filter uses: the first one that rows belong to (facets for events only are skipped). */
export const regionFacetId = (data: Dataset): string | undefined =>
  Object.entries(data.meta.facets ?? {}).find(([, f]) => (f.applies ?? 'tracks') !== 'events')?.[0];

export function useRegionFilter(data: Dataset, initial: string[], sources: Record<string, boolean>, editMode: boolean) {
  const [picked, setPicked] = useState<string[]>(initial);
  const facetId = regionFacetId(data);
  const facet = facetId ? data.meta.facets![facetId] : undefined;
  const sourceOn = useMemo(() => (key: string) => isOn(sources, key), [sources]);

  const tree = useMemo<RegionNode[]>(
    () => (facet && facetId ? regionTree(data.tracks, facetId, facet, sourceOn) : []),
    [data.tracks, facet, facetId, sourceOn],
  );
  const active = !editMode && !!facet && picked.length > 0;
  /** `false` for each row the filter hides, to lay over the reader's own row toggles. */
  const overlay = useMemo<Record<string, false>>(
    () => (active ? regionOverlay(data.tracks, facetId!, facet!, picked, sourceOn) : {}),
    [active, data.tracks, facetId, facet, picked, sourceOn],
  );
  const names = useMemo(() => picked.map((id) => facet?.values[id]?.name ?? id), [picked, facet]);
  /** The rows themselves in a ticked region (not the headers kept over them), for "make a comparison of these rows". */
  const rowsInPicked = useMemo(() => {
    if (!active) return [];
    const want = new Set(picked);
    return data.tracks.filter((t) => [...rowRegions(t, facetId!, facet!, sourceOn)].some((v) => want.has(v))).map((t) => t.id);
  }, [active, picked, data.tracks, facetId, facet, sourceOn]);
  /** Each row's own regions with their sources (table view), and the same as tooltip text (row labels). */
  const regionsOf = useMemo<Map<string, RowRegion[]> | undefined>(
    () => (facet && facetId ? new Map(data.tracks.map((t) => [t.id, rowRegionList(t, facetId, facet, data.sources, sourceOn)])) : undefined),
    [data.tracks, data.sources, facet, facetId, sourceOn],
  );
  const regionTips = useMemo(
    () => (regionsOf ? new Map([...regionsOf].flatMap(([id, list]) => (list.length ? [[id, regionsTooltip(list)] as const] : []))) : undefined),
    [regionsOf],
  );

  /** Regions that contain `id` (its `broader` values, and theirs). */
  const containing = (id: string, seen = new Set<string>()): Set<string> => {
    for (const b of facet?.values[id]?.broader ?? []) if (!seen.has(b)) containing(b, seen.add(b));
    return seen;
  };
  // ticking a region drops the regions inside it from the list (it includes them now)
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.filter((x) => !containing(x).has(id)), id]));
  const clear = () => setPicked([]);
  return { tree, picked, names, active, overlay, toggle, clear, containing, regionsOf, regionTips, rowsInPicked };
}
