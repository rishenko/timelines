import type { Dataset, Facet } from '../types.ts';
import { eventCategories } from './categories.ts';

/**
 * The reign lane (Kevin, 2026-11-22: "rulers just be events again, but keep them at the top relative to other
 * events"): a row's reigns ("Reign of X", "Presidency of Y") go on its first event lines, above the period lane and
 * every other event. An event goes there if one of its categories (main or second) is the `reign` sub-kind; the
 * classifier sets it for spans titled "Reign of …" and the like. Reigns run one after another on the top line;
 * overlapping reigns (co-rulers, rival claimants), or names that would collide, go on a second line. The lane has at most two lines (`maxReignRows`): zoomed out, where each
 * label is wider than its reign, the rest fold into "+N" as on the live site.
 */
export const REIGN = 'reign';
/** A sourced gap in rule ("Ottoman Interregnum"), drawn on the reign line too (Kevin, 2026-11-23). */
export const INTERREGNUM = 'interregnum';

/**
 * The ruler verdicts that count as "who ruled" (wave 3 E; pipelines/common/reign_verdicts.py). A reign's verdict is a value
 * under `reign`; a reign with none yet is plain `reign` and counts. Any other value under `reign` (consort, party office,
 * another realm's ruler, a de facto leader, unclassified, or one this app doesn't know) is drawn in the lane but never answers "who ruled".
 */
export const RULED = new Set(['head', 'acting', 'co-ruler', 'usurper', 'regency']);

/** The reign lane's events, and `ruled`: those that answer "who ruled" (the cursor's readout of the reign in force). */
export class ReignLane extends Set<string> {
  readonly ruled = new Set<string>();
}

/** The events of a timeline that go in the reign lane: a reign, a verdict under it, or an interregnum. */
export function reignLaneIds(ds: Dataset, facetId: string | undefined, facet: Facet | undefined, sourceOn: (key: string) => boolean): ReignLane {
  const out = new ReignLane();
  if (!facet || !facetId) return out;
  for (const e of ds.events) {
    const cats = eventCategories(e, facetId, facet, sourceOn);
    const verdicts = cats.filter((c) => facet.values[c]?.broader?.includes(REIGN));
    if (!verdicts.length && !cats.some((c) => c === REIGN || c === INTERREGNUM)) continue;
    out.add(e.uuid);
    if (verdicts.length ? verdicts.some((v) => RULED.has(v)) : cats.includes(REIGN)) out.ruled.add(e.uuid);
  }
  return out;
}
