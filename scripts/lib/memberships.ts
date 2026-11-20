// Category memberships: which facet values (regions, peoples, civilizations) each row belongs to, with the sources
// that place it there. The plan (data-src/<short>-memberships.json) holds the facets, any sources the memberships
// need that the timeline doesn't have yet, and each row's memberships; applyMemberships puts them in the source file
// (run by `npm run data -- importance` and `run-all`, after the row links).

type Json = Record<string, any>;

export interface MembershipPlan {
  facets: Record<string, { name: string; values: Record<string, { name: string; broader?: string[] }> }>;
  /** Sources to add (a row's Wikipedia article that no event cites yet), by key. */
  sources: Record<string, Json>;
  /** Each row's memberships, by row id; a row not listed has none. */
  rows: Record<string, { facet: string; value: string; sources: { sourceKey: string; sourceLocation: string }[] }[]>;
}

/** Puts the plan in the source file (in place): meta.facets, the plan's sources, and each row's memberships last. */
export function applyMemberships(d: Json, plan: MembershipPlan) {
  d.meta = { ...d.meta, facets: plan.facets };
  for (const [k, s] of Object.entries(plan.sources)) d.sources[k] = s;
  d.tracks = d.tracks.map((t: Json) => {
    const { memberships: _old, ...rest } = t;
    const ms = plan.rows[t.id];
    return ms?.length ? { ...rest, memberships: ms } : rest;
  });
}
