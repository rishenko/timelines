import { useMemo, useState } from 'react';
import type { Dataset, TimelineEvent } from '../types.ts';
import { categoryFacetId, categoryLabel, categoryTree, eventCategories, inPickedCategories, topOf } from '../lib/categories.ts';
import type { RegionNode } from '../lib/regions.ts';
import { isOn } from './filters.ts';

/** An event's categories as the chart, table and panel show them. */
export interface EventCategories {
  /** The main category's kind (top level), which picks the glyph. */
  kind: string;
  /** Each category in words, main first: "Wars and battles: Siege". */
  labels: string[];
}

/**
 * The category filter's state (see lib/categories.ts): the ticked categories, from the link (`?cat=`) at first.
 * Events outside them are hidden; events with no category always show. Off in edit mode, where every event must be
 * reachable.
 */
export function useCategoryFilter(data: Dataset, initial: string[], sources: Record<string, boolean>, editMode: boolean) {
  const [picked, setPicked] = useState<string[]>(initial);
  const facetId = categoryFacetId(data);
  const facet = facetId ? data.meta.facets![facetId] : undefined;
  const sourceOn = useMemo(() => (key: string) => isOn(sources, key), [sources]);
  // kinds and sub-kinds with no events on this timeline are left out (a ticked one stays, so it can be unticked)
  const tree = useMemo<RegionNode[]>(() => {
    if (!facet || !facetId) return [];
    const keep = (nodes: RegionNode[]): RegionNode[] =>
      nodes.filter((n) => n.rows > 0 || picked.includes(n.id)).map((n) => ({ ...n, children: keep(n.children) }));
    return keep(categoryTree(data.events, facetId, facet, sourceOn));
  }, [data.events, facet, facetId, sourceOn, picked]);
  const active = !editMode && !!facet && picked.length > 0;
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  /** Whether the filter lets an event through (always, while it is off). */
  const shows = useMemo(
    () => (active ? (e: TimelineEvent) => inPickedCategories(e, facetId!, facet!, pickedSet, sourceOn) : () => true),
    [active, facetId, facet, pickedSet, sourceOn],
  );
  /** Each event's categories for display: the kind of its main one (the glyph) and both in words ("Wars and battles: Siege"). */
  const info = useMemo(() => {
    const out = new Map<string, EventCategories>();
    if (!facet || !facetId) return out;
    for (const e of data.events) {
      const own = eventCategories(e, facetId, facet, sourceOn);
      if (own.length) out.set(e.uuid, { kind: topOf(own[0], facet), labels: own.map((v) => categoryLabel(v, facet)) });
    }
    return out;
  }, [data.events, facet, facetId, sourceOn]);
  const names = useMemo(() => picked.map((id) => facet?.values[id]?.name ?? id), [picked, facet]);
  /** Categories that contain `id` (its `broader` values, and theirs). */
  const containing = (id: string, seen = new Set<string>()): Set<string> => {
    for (const b of facet?.values[id]?.broader ?? []) if (!seen.has(b)) containing(b, seen.add(b));
    return seen;
  };
  // ticking a kind drops its sub-kinds from the list (it includes them now)
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.filter((x) => !containing(x).has(id)), id]));
  const clear = () => setPicked([]);
  return { facetId, facet, sourceOn, info, tree, picked, names, active, shows, toggle, clear, containing };
}
