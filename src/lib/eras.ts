import type { Dataset, Era } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';
import { at0 } from './subYear.ts';

/**
 * Ages (meta.eras): named periods across the whole timeline, drawn in a strip under the ruler. Each is dated like a
 * phase, under the reader's Dating choice (an age may name its own `chronology`). Ages in one `group` follow each
 * other (validate refuses overlaps there), so each group gets one line of the strip, in the order groups first appear.
 * Neighbours may share a boundary year (both ends year-only, as PeriodO's chains are written); the earlier one is then
 * drawn to the later one's start, so the two meet on the line instead of overlapping by that year.
 */
export interface PlacedAge {
  era: Era;
  span: ResolvedSpan;
  /** Its line in the strip (its group's). */
  line: number;
  /** Where its bar ends when it shares its end year with the next age on its line: that age's start. */
  drawEnd?: number;
}

export function placeAges(ds: Dataset, selection: ChronologySelection): PlacedAge[] {
  const lines = new Map<string, number>();
  const placed: PlacedAge[] = (ds.meta.eras ?? []).map((era) => {
    const g = era.group ?? '';
    if (!lines.has(g)) lines.set(g, lines.size);
    return { era, span: resolveSpan(ds, '', era, selection, era.chronology), line: lines.get(g)! };
  });
  for (const line of new Set(placed.map((a) => a.line))) {
    const on = placed.filter((a) => a.line === line).sort((a, b) => at0(a.span) - at0(b.span));
    for (let i = 1; i < on.length; i++) {
      const [prev, next] = [on[i - 1].span, on[i].span];
      if (!prev.ongoing && prev.end === next.start && !prev.endMonth && !prev.endDay && !next.startMonth && !next.startDay)
        on[i - 1].drawEnd = at0(next);
    }
  }
  return placed;
}

/** How many lines the strip needs. */
export const ageLines = (ages: PlacedAge[]) => (ages.length ? Math.max(...ages.map((a) => a.line)) + 1 : 0);

/**
 * The ages to draw for the years in view: lines with no age there are left out and the rest close up, so the strip
 * is only as tall as it needs to be (like rows with nothing in view). Checked when scrolling settles, not every frame.
 */
export function agesInView(ages: PlacedAge[], window: { y0: number; y1: number } | null): PlacedAge[] {
  if (!window) return ages;
  const used = [...new Set(ages.filter((a) => a.span.end >= window.y0 && a.span.start <= window.y1).map((a) => a.line))].sort((a, b) => a - b);
  const renumber = new Map(used.map((l, i) => [l, i]));
  return ages.filter((a) => renumber.has(a.line)).map((a) => ({ ...a, line: renumber.get(a.line)! }));
}
