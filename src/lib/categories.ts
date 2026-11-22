import type { Dataset, Facet, TimelineEvent } from '../types.ts';
import type { RegionNode } from './regions.ts';

/**
 * Event categories (Filters → Categories, the glyph on each event, the table's Category column): the values of the
 * timeline's events facet (`applies: "events"`; the bundled timelines call it `category`). Sub-kinds sit inside their
 * kind through `broader` (a siege is a kind of conflict). An event names at most two values, its main one first.
 * Like regions, a membership counts only while one of its sources is switched on. An event with no category is never
 * hidden by the category filter: it isn't of some other kind, it just hasn't been given one.
 */

/** The facet the category features use: the first one for events. */
export const categoryFacetId = (data: Dataset): string | undefined =>
  Object.entries(data.meta.facets ?? {}).find(([, f]) => f.applies === 'events')?.[0];

/** A value's top level: the last value up its `broader` chain (loop-safe). */
export function topOf(value: string, facet: Facet): string {
  const seen = new Set<string>();
  let v = value;
  while (!seen.has(v)) {
    seen.add(v);
    const up = facet.values[v]?.broader?.[0];
    if (!up || !facet.values[up]) return v;
    v = up;
  }
  return v;
}

/** The event's own category values, main first (memberships with a source switched on). */
export function eventCategories(e: TimelineEvent, facetId: string, facet: Facet, sourceOn: (key: string) => boolean): string[] {
  const out: string[] = [];
  for (const m of e.memberships ?? [])
    if (m.facet === facetId && facet.values[m.value] && m.sources.some((s) => sourceOn(s.sourceKey)) && !out.includes(m.value)) out.push(m.value);
  return out;
}

/** Each value plus every value containing it. */
function withBroader(value: string, facet: Facet, into: Set<string>) {
  if (into.has(value)) return;
  into.add(value);
  for (const b of facet.values[value]?.broader ?? []) withBroader(b, facet, into);
}

/** The categories as a tree for the panel, in the facet's order, each with its event count (sub-kinds counted in). */
export function categoryTree(events: TimelineEvent[], facetId: string, facet: Facet, sourceOn: (key: string) => boolean): RegionNode[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const all = new Set<string>();
    for (const v of eventCategories(e, facetId, facet, sourceOn)) withBroader(v, facet, all);
    for (const v of all) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const nodes = new Map<string, RegionNode>(
    Object.entries(facet.values).map(([id, v]) => [id, { id, name: v.name, rows: counts.get(id) ?? 0, children: [] }]),
  );
  const roots: RegionNode[] = [];
  for (const [id, v] of Object.entries(facet.values)) {
    const parent = v.broader?.map((b) => nodes.get(b)).find(Boolean);
    (parent ? parent.children : roots).push(nodes.get(id)!);
  }
  return roots;
}

/**
 * Whether an event shows under the ticked categories: it has no category, or one of its categories (main or second)
 * is ticked or sits inside a ticked one.
 */
export function inPickedCategories(
  e: TimelineEvent,
  facetId: string,
  facet: Facet,
  picked: ReadonlySet<string>,
  sourceOn: (key: string) => boolean,
): boolean {
  const own = eventCategories(e, facetId, facet, sourceOn);
  if (!own.length) return true;
  const all = new Set<string>();
  for (const v of own) withBroader(v, facet, all);
  return [...all].some((v) => picked.has(v));
}

/** Ticked categories from the link (`?cat=conflict,siege`), keeping only the facet's values, each once. */
export function parseCategories(param: string | null, facet: Facet | undefined): string[] {
  if (!facet) return [];
  const out: string[] = [];
  for (const v of (param ?? '').split(',').map((s) => s.trim())) if (v && Object.hasOwn(facet.values, v) && !out.includes(v)) out.push(v);
  return out;
}

/** "Wars and battles: Siege" for a sub-kind, "Wars and battles" for a kind. */
export function categoryLabel(value: string, facet: Facet): string {
  const top = topOf(value, facet);
  const name = facet.values[value]?.name ?? value;
  return top === value ? name : `${facet.values[top]?.name ?? top}: ${name}`;
}
