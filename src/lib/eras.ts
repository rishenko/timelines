import type { ContextSpan, Dataset } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';
import { at0 } from './subYear.ts';

/**
 * Ages: context spans of kind `age` (schema v8). The timeline's own (meta.context) are drawn in a strip under the
 * ruler; a group's or row's own (Track.context) on its band (a region's title band, e.g. the Nile Valley's ages on
 * Africa). Each is dated like a phase, under the reader's Dating choice (an age may name its own `chronology`). Ages
 * on one `line` follow each other (validate refuses overlaps there), so each line gets one line of its strip or band,
 * in the order lines first appear.
 * Neighbours may share a boundary year (both ends year-only, as PeriodO's chains are written); the earlier one is then
 * drawn to the later one's start, so the two meet on the line instead of overlapping by that year.
 */
export interface PlacedAge {
  /** The context span (kind `age`). */
  era: ContextSpan;
  span: ResolvedSpan;
  /** Its line in the strip or band (its `line`'s). */
  line: number;
  /** The row whose band it's drawn on (the track whose `context` holds it); absent: the Ages strip. */
  band?: string;
  /** Its line's name, at the line's left end: from meta.lines, or (a band with two or more lines) one made from the line id. */
  lineName?: string;
  /** Where its bar ends when it shares its end year with the next age on its line: that age's start. */
  drawEnd?: number;
}

export function placeAges(ds: Dataset, selection: ChronologySelection): PlacedAge[] {
  // lines are numbered per strip or band, by line id, in the order lines first appear there
  const lines = new Map<string, Map<string, number>>();
  const lineOf = (band: string, g: string) => {
    const m = lines.get(band) ?? lines.set(band, new Map()).get(band)!;
    if (!m.has(g)) m.set(g, m.size);
    return m.get(g)!;
  };
  const nodes: [string | undefined, ContextSpan[] | undefined][] = [[undefined, ds.meta.context], ...ds.tracks.map((t): [string, ContextSpan[] | undefined] => [t.id, t.context])];
  const placed: PlacedAge[] = nodes.flatMap(([band, list]) =>
    (list ?? [])
      .filter((era) => era.kind === 'age')
      .map((era) => ({
        era,
        span: resolveSpan(ds, '', era, selection, era.chronology),
        line: lineOf(band ?? '', era.line ?? ''),
        ...(band ? { band } : {}),
      })),
  );
  // a band's lines are named from meta.lines, even a band's only line ("Nile Valley" on Africa: the band's name alone
  // doesn't say which Africa the ages are); a band with two or more lines names the rest from their line ids
  for (const band of lines.keys()) {
    if (!band) continue;
    const several = lines.get(band)!.size > 1;
    for (const a of placed) {
      if (a.band !== band) continue;
      const named = a.era.line && ds.meta.lines?.[a.era.line]?.name;
      if (named || several) a.lineName = named || groupLabel(a.era.line);
    }
  }
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

/**
 * A line's name when meta.lines gives none, from its line id: "ages-central-europe" → "Central Europe" (a leading
 * "ages-" dropped, words capitalized).
 */
export function groupLabel(group: string | undefined): string | undefined {
  if (!group) return undefined;
  const words = group.replace(/^ages-/, '').split('-').filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : undefined;
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
