// Event categories from a plan (data-src/<short>-categories.json), for a timeline without a generator. The plan is
// written by pipelines/ancient/categories.py, which runs the shared classifier (pipelines/common/event_categories.py)
// with reviewed overrides; applyCategories puts it in the source file, so the build and CI need no Wikipedia dump.
// It runs after applyMemberships, which sets the other facets, and adds only `meta.facets.category`.

type Json = Record<string, any>;

export interface CategoryPlan {
  /** The `category` facet exactly as the classifier's facet() writes it: top levels, and sub-kinds with `broader`. */
  facet: { name: string; applies: string; values: Record<string, { name: string; broader?: string[] }> };
  /** Each event's categories, main first (one or two), by uuid; an event not listed has none. */
  events: Record<string, string[]>;
}

/**
 * Puts the plan in the source file (in place): the facet, and each listed event's categories first in its
 * memberships, each citing the event's first source. Throws on an event the file doesn't have (a stale plan) or a
 * value the facet doesn't define. Up to two values, and no sub-kind beside its own kind, are checked in the classifier.
 */
export function applyCategories(d: Json, plan: CategoryPlan) {
  d.meta = { ...d.meta, facets: { ...d.meta.facets, category: plan.facet } };
  const uuids = new Set(d.events.map((e: Json) => e.uuid));
  for (const [uuid, values] of Object.entries(plan.events)) {
    if (!uuids.has(uuid)) throw new Error(`categories plan: no event "${uuid}" (rerun pipelines/ancient/categories.py)`);
    for (const v of values) if (!plan.facet.values[v]) throw new Error(`categories plan: "${uuid}" has unknown category "${v}"`);
  }
  d.events = d.events.map((e: Json) => {
    const { memberships: old, ...rest } = e;
    const others = (old ?? []).filter((m: Json) => m.facet !== 'category');
    const mine = (plan.events[e.uuid] ?? []).map((value) => ({ facet: 'category', value, sources: [{ ...e.sources[0] }] }));
    const ms = [...mine, ...others];
    return ms.length ? { ...rest, memberships: ms } : rest;
  });
}
