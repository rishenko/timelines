import type { Dataset, Facet, TimelineEvent } from '../types.ts';
import { eventCategories, topOf } from './categories.ts';
import overrides from '../data/period-lane.json' with { type: 'json' };

/**
 * The period lane (Kevin, 2026-11-22): golden ages and long society spans apply to a whole civilization or country
 * and can span rulers, so each row draws them on a line of their own directly under its phases, above its other
 * events. An event goes there if:
 * - one of its categories (main or second) is the golden-age sub-kind; or
 * - its main category is a society kind (religion, law, culture, economy…) and it spans `PERIOD_MIN_YEARS` or more,
 *   unless it is a person's lifetime ("Life of …");
 * - `src/data/period-lane.json` includes or excludes events by id, per timeline, whatever the rule says.
 * It keeps its key-event and +N behaviour and its shape; only its line changes.
 */
export const PERIOD_MIN_YEARS = 25;
export const GOLDEN_AGE = 'golden-age';
const LIFETIME = /^(the\s+)?(life|lifetime)\s+of\b/i;

type Overrides = Record<string, { include?: string[]; exclude?: string[] }>;

/** Whether the rule (without the overrides) puts an event in the period lane. */
export function periodByRule(e: TimelineEvent, values: string[], facet: Facet): boolean {
  if (values.includes(GOLDEN_AGE)) return true;
  if (!values.length || topOf(values[0], facet) !== 'society') return false;
  if (e.end === undefined || e.end - e.start < PERIOD_MIN_YEARS) return false;
  return !LIFETIME.test(e.title.trim());
}

/** The events of a timeline that go in the period lane. */
export function periodLaneIds(
  ds: Dataset,
  facetId: string | undefined,
  facet: Facet | undefined,
  sourceOn: (key: string) => boolean,
  list: Overrides = overrides as unknown as Overrides,
): Set<string> {
  const own = list[ds.meta.id] ?? {};
  const include = new Set(own.include ?? []);
  const exclude = new Set(own.exclude ?? []);
  const out = new Set<string>();
  for (const e of ds.events) {
    if (exclude.has(e.uuid)) continue;
    if (include.has(e.uuid) || (facet && facetId && periodByRule(e, eventCategories(e, facetId, facet, sourceOn), facet))) out.add(e.uuid);
  }
  return out;
}
