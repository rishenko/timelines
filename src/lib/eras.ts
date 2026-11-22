import type { Dataset, Era } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';
import { at0 } from './subYear.ts';

/**
 * Ages (meta.eras): named periods, drawn in a strip under the ruler when they cross regions, or on the band of each row
 * they name in `tracks` (a region's title band, e.g. the Nile Valley's ages on Africa). Each is dated like a phase,
 * under the reader's Dating choice (an age may name its own `chronology`). Ages in one `group` follow each other
 * (validate refuses overlaps there), so each group gets one line of its strip or band, in the order groups first appear.
 * Neighbours may share a boundary year (both ends year-only, as PeriodO's chains are written); the earlier one is then
 * drawn to the later one's start, so the two meet on the line instead of overlapping by that year.
 */
export interface PlacedAge {
  era: Era;
  span: ResolvedSpan;
  /** Its line in the strip or band (its group's). */
  line: number;
  /** The row whose band it's drawn on; absent: the Ages strip. An age in several rows is placed once in each. */
  band?: string;
  /** Where its bar ends when it shares its end year with the next age on its line: that age's start. */
  drawEnd?: number;
}

export function placeAges(ds: Dataset, selection: ChronologySelection): PlacedAge[] {
  // lines are numbered per strip or band, by group, in the order groups first appear there
  const lines = new Map<string, Map<string, number>>();
  const lineOf = (band: string, g: string) => {
    const m = lines.get(band) ?? lines.set(band, new Map()).get(band)!;
    if (!m.has(g)) m.set(g, m.size);
    return m.get(g)!;
  };
  const placed: PlacedAge[] = (ds.meta.eras ?? []).flatMap((era) => {
    const span = resolveSpan(ds, '', era, selection, era.chronology);
    const g = era.group ?? '';
    const bands = era.tracks?.length ? era.tracks : [undefined];
    return bands.map((band) => ({ era, span, line: lineOf(band ?? '', g), ...(band ? { band } : {}) }));
  });
  const key = (a: PlacedAge) => `${a.band ?? ''}\n${a.line}`;
  for (const k of new Set(placed.map(key))) {
    const on = placed.filter((a) => key(a) === k).sort((a, b) => at0(a.span) - at0(b.span));
    for (let i = 1; i < on.length; i++) {
      const [prev, next] = [on[i - 1].span, on[i].span];
      if (!prev.ongoing && prev.end === next.start && !prev.endMonth && !prev.endDay && !next.startMonth && !next.startDay)
        on[i - 1].drawEnd = at0(next);
    }
  }
  return placed;
}

/** How many lines the strip (or a band) needs. */
export const ageLines = (ages: PlacedAge[]) => (ages.length ? Math.max(...ages.map((a) => a.line)) + 1 : 0);

/**
 * The ages to draw for the years in view: lines with no age there are left out and the rest close up, so the strip
 * and each band are only as tall as they need to be (like rows with nothing in view). Checked when scrolling settles,
 * not every frame.
 */
export function agesInView(ages: PlacedAge[], window: { y0: number; y1: number } | null): PlacedAge[] {
  if (!window) return ages;
  const key = (a: PlacedAge, line = a.line) => `${a.band ?? ''}\n${line}`;
  const used = new Set(ages.filter((a) => a.span.end >= window.y0 && a.span.start <= window.y1).map((a) => key(a)));
  const renumber = new Map<string, number>();
  for (const band of new Set(ages.map((a) => a.band ?? ''))) {
    const kept = [...new Set(ages.filter((a) => (a.band ?? '') === band && used.has(key(a))).map((a) => a.line))].sort((a, b) => a - b);
    kept.forEach((l, i) => renumber.set(`${band}\n${l}`, i));
  }
  return ages.filter((a) => renumber.has(key(a))).map((a) => ({ ...a, line: renumber.get(key(a))! }));
}

/** The strip's ages (no `band`) and each band's, by row id. */
export function splitAges(ages: PlacedAge[]): { strip: PlacedAge[]; bands: Map<string, PlacedAge[]> } {
  const bands = new Map<string, PlacedAge[]>();
  for (const a of ages) if (a.band) (bands.get(a.band) ?? bands.set(a.band, []).get(a.band)!).push(a);
  return { strip: ages.filter((a) => !a.band), bands };
}
