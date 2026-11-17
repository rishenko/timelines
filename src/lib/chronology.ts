import type { Chronology, DateClaim, Dataset, TimelineEvent, Track, TrackSpan } from '../types.ts';

/**
 * Chronologies, date claims and error margins.
 *
 * An event's `start`/`end` are best estimates under its chronology (its own
 * `chronology`, else the nearest one set on its first track or that track's
 * ancestors). Each date can carry claims: what a source says, under which
 * chronology, with what ± margin. Chronologies may also be *derived* from
 * another by a fixed shift (the Mesopotamian High/Low chronologies are the
 * Middle one shifted by -56/+64 years).
 *
 * The error window of a date is computed from that data, never typed in: it is
 * the union of every claim's year ± margin, every derived alternative, and the
 * best estimate itself (plus `meta.circaFade` for circa dates).
 */

/** Selected chronology id per chronology group. */
export type ChronologySelection = Record<string, string>;

export type Window = [number, number];

export interface ResolvedEvent extends TimelineEvent {
  /** Earliest and latest plausible start, when the data gives a range. */
  startWindow?: Window;
  endWindow?: Window;
}

export interface ResolvedSpan {
  start: number;
  end: number;
  startWindow?: Window;
  endWindow?: Window;
}

export function chronologyGroups(ds: Dataset): Map<string, { id: string; c: Chronology }[]> {
  const groups = new Map<string, { id: string; c: Chronology }[]>();
  for (const [id, c] of Object.entries(ds.chronologies ?? {})) groups.set(c.group, [...(groups.get(c.group) ?? []), { id, c }]);
  return groups;
}

/** Each group's default chronology (the one flagged `default`, else the first). */
export function defaultSelection(ds: Dataset): ChronologySelection {
  const sel: ChronologySelection = {};
  for (const [g, list] of chronologyGroups(ds)) sel[g] = (list.find((x) => x.c.default) ?? list[0]).id;
  return sel;
}

/** The chronology a track uses: its own, else its nearest ancestor's. */
export function trackChronology(tracks: Track[], id: string): string | undefined {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  let t = byId.get(id);
  for (let guard = 0; t && guard < 10; guard++) {
    if (t.chronology) return t.chronology;
    t = t.parent ? byId.get(t.parent) : undefined;
  }
  return undefined;
}

export function eventChronology(ds: Dataset, e: TimelineEvent): string | undefined {
  if (e.chronology) return e.chronology;
  for (const t of e.tracks) {
    const c = trackChronology(ds.tracks, t);
    if (c) return c;
  }
  return undefined;
}

export interface Claim extends DateClaim {
  /** True when computed from another chronology's date rather than stated by a source. */
  derived?: boolean;
}

/**
 * Explicit claims plus derived ones: for every chronology defined as a shift of
 * `chron`, the best estimate shifted, unless a source already states that chronology's value.
 */
export function allClaims(ds: Dataset, best: number, claims: DateClaim[] | undefined, chron: string | undefined): Claim[] {
  const out: Claim[] = [...(claims ?? [])];
  if (!chron) return out;
  const stated = new Set(out.map((c) => c.chronology));
  for (const [id, c] of Object.entries(ds.chronologies ?? {})) {
    const d = c.derive;
    if (!d || d.from !== chron || stated.has(id)) continue;
    if (d.until !== undefined && best > d.until) continue;
    out.push({ year: best + d.offset, chronology: id, derived: true });
  }
  return out;
}

/** The year to plot for a date when the reader has selected chronology `target`. */
export function yearUnder(best: number, claims: Claim[], chron: string | undefined, target: string | undefined): number {
  if (!target || !chron || target === chron) return best;
  const hit = claims.find((c) => c.chronology === target);
  return hit ? hit.year : best;
}

/** Earliest–latest plausible year from the claims, the best estimate, and a circa fade. Undefined when there's no spread. */
export function dateWindow(claims: DateClaim[], best: number, circaFade = 0): Window | undefined {
  let lo = best - circaFade;
  let hi = best + circaFade;
  for (const c of claims) {
    const m = c.margin ?? 0;
    lo = Math.min(lo, c.year - m);
    hi = Math.max(hi, c.year + m);
  }
  return lo < hi ? [lo, hi] : undefined;
}

function resolveDate(
  ds: Dataset,
  best: number,
  claims: DateClaim[] | undefined,
  chron: string | undefined,
  selection: ChronologySelection,
  circa: boolean,
): { year: number; window?: Window } {
  const all = allClaims(ds, best, claims, chron);
  const group = chron ? ds.chronologies?.[chron]?.group : undefined;
  const year = yearUnder(best, all, chron, group ? selection[group] : undefined);
  const fade = circa ? (ds.meta.circaFade ?? 0) : 0;
  return { year, window: dateWindow(all, best, fade) };
}

/** Events with dates re-plotted under the selected chronologies, and their error windows attached. */
export function resolveEvents(ds: Dataset, selection: ChronologySelection): ResolvedEvent[] {
  if (!ds.chronologies && !ds.events.some((e) => e.circa || e.startDates || e.endDates)) return ds.events;
  return ds.events.map((e) => {
    const chron = eventChronology(ds, e);
    const s = resolveDate(ds, e.start, e.startDates, chron, selection, !!e.circa);
    const out: ResolvedEvent = { ...e, start: s.year };
    if (s.window) out.startWindow = s.window;
    if (e.end !== undefined) {
      const en = resolveDate(ds, e.end, e.endDates, chron, selection, !!e.circa);
      out.end = Math.max(en.year, s.year);
      if (en.window) out.endWindow = en.window;
    }
    return out;
  });
}

export function resolveSpan(ds: Dataset, trackId: string, span: TrackSpan, selection: ChronologySelection): ResolvedSpan {
  const chron = trackChronology(ds.tracks, trackId);
  const s = resolveDate(ds, span.start, span.startDates, chron, selection, !!span.circa);
  const e = resolveDate(ds, span.end, span.endDates, chron, selection, !!span.circa);
  return { start: s.year, end: Math.max(e.year, s.year), startWindow: s.window, endWindow: e.window };
}
