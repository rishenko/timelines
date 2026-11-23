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

/** The events of a timeline that go in the reign lane. */
export function reignLaneIds(
  ds: Dataset,
  facetId: string | undefined,
  facet: Facet | undefined,
  sourceOn: (key: string) => boolean,
): Set<string> {
  const out = new Set<string>();
  if (!facet || !facetId) return out;
  for (const e of ds.events) if (eventCategories(e, facetId, facet, sourceOn).includes(REIGN)) out.add(e.uuid);
  return out;
}
