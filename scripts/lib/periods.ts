// Golden ages and eras from a plan (data-src/<short>-periods.json), for a timeline without a generator. The plan is
// written by pipelines/ancient/periods.py from pipelines/common/periods.json, whose dates are checked against the
// Wikipedia dump; applyPeriods puts it in the source file, so the build and CI need no dump. It runs first among the
// plans, so the importance and categories plans can name the events it adds.

type Json = Record<string, any>;

export interface PeriodsPlan {
  /** meta.eras, in the source file's readable years. */
  eras: Json[];
  /** Golden-age events to add or replace, by uuid. */
  events: Json[];
  /** The sources the eras and events cite, by key. */
  sources: Record<string, Json>;
  /** Tags those sources carry that the timeline may not define yet (PeriodO's), by id. */
  tags?: Record<string, Json>;
  /** meta.eraGroups: display names of the eras' groups (schema v7). */
  eraGroups?: Record<string, Json>;
}

/** Puts the plan in the source file (in place): the sources and their tags, meta.eras (none: removed), and each event, replaced in place or added at the end. */
export function applyPeriods(d: Json, plan: PeriodsPlan) {
  for (const [k, s] of Object.entries(plan.sources)) d.sources[k] = s;
  if (plan.tags) d.tags = { ...d.tags, ...plan.tags };
  const { eras: _old, eraGroups: _oldGroups, ...meta } = d.meta;
  d.meta = plan.eras.length ? { ...meta, eras: plan.eras, ...(plan.eraGroups ? { eraGroups: plan.eraGroups } : {}) } : meta;
  for (const e of plan.events) {
    for (const t of e.tracks) if (!d.tracks.some((x: Json) => x.id === t)) throw new Error(`periods plan: event "${e.uuid}" names no row "${t}"`);
    const i = d.events.findIndex((x: Json) => x.uuid === e.uuid);
    if (i >= 0) d.events[i] = e;
    else d.events.push(e);
  }
}
