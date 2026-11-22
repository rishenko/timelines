import type { Dataset, Era } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';

/**
 * Ages (meta.eras): named periods across the whole timeline, drawn in a strip under the ruler. Each is dated like a
 * phase, under the reader's Dating choice (an age may name its own `chronology`). Ages in one `group` follow each
 * other (validate refuses overlaps there), so each group gets one line of the strip, in the order groups first appear.
 */
export interface PlacedAge {
  era: Era;
  span: ResolvedSpan;
  /** Its line in the strip (its group's). */
  line: number;
}

export function placeAges(ds: Dataset, selection: ChronologySelection): PlacedAge[] {
  const lines = new Map<string, number>();
  return (ds.meta.eras ?? []).map((era) => {
    const g = era.group ?? '';
    if (!lines.has(g)) lines.set(g, lines.size);
    return { era, span: resolveSpan(ds, '', era, selection, era.chronology), line: lines.get(g)! };
  });
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
