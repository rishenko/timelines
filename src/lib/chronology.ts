import { dayWindow, type DayWindow } from './subYear.ts';
import type { Chronology, DateClaim, DateDays, Dataset, SourceRef, TimelineEvent, Track, TrackSpan } from '../types.ts';
import { trackIndex, trackPath } from './tracks.ts';
import { datasetPresent } from './years.ts';

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
  /** The spread when sources disagree within months or days (every claim gives a month); then no year window. */
  startDays?: DayWindow;
  endDays?: DayWindow;
}

export interface ResolvedSpan extends DateDays {
  start: number;
  end: number;
  /** The span's dates are marked approximate (TrackSpan.circa). */
  circa?: boolean;
  /** Still going: `end` is the dataset's present. */
  ongoing?: boolean;
  /** The sources saying it is still going (TrackSpan.ongoingSources). */
  ongoingSources?: SourceRef[];
  /** A lifespan stretch worked out from the row's phases rather than typed. */
  derived?: boolean;
  /** The events that began and ended it (TrackSpan.startEvent, endEvent). */
  startEvent?: string;
  endEvent?: string;
  startWindow?: Window;
  endWindow?: Window;
  startDays?: DayWindow;
  endDays?: DayWindow;
}

/** A row's phase (Track.phases), resolved like a lifespan. */
export interface ResolvedPhase extends ResolvedSpan {
  name: string;
}

/**
 * Whether dates read as approximate ("c."): marked circa, or given a range by their sources. Both ends of an event,
 * lifespan or phase read the same way, everywhere they are shown.
 */
export function isApprox(d: { circa?: boolean; startWindow?: Window; endWindow?: Window; startDays?: DayWindow; endDays?: DayWindow }): boolean {
  return !!(d.circa || d.startWindow || d.endWindow || d.startDays || d.endDays);
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
  return trackPath(id, trackIndex(tracks)).findLast((t) => t.chronology)?.chronology;
}

/**
 * `trackChronology` for many tracks of one list: indexes the list once, so a caller that asks for every track (or
 * every event's tracks) does linear work, not tracks × tracks. Build it where the list is fixed; it doesn't see later
 * changes to the list.
 */
export function trackChronologies(tracks: Track[]): (id: string) => string | undefined {
  const byId = trackIndex(tracks);
  const memo = new Map<string, string | undefined>();
  return (id) => {
    if (!memo.has(id)) memo.set(id, trackPath(id, byId).findLast((t) => t.chronology)?.chronology);
    return memo.get(id);
  };
}

export function eventChronology(ds: Dataset, e: TimelineEvent, chronologyOf?: (id: string) => string | undefined): string | undefined {
  if (e.chronology) return e.chronology;
  for (const t of e.tracks) {
    const c = chronologyOf ? chronologyOf(t) : trackChronology(ds.tracks, t);
    if (c) return c;
  }
  return undefined;
}

/**
 * The chronology an event is dated by, when it matters: `eventChronology`, but only if another dating system of the
 * same group would plot the event elsewhere (a claim under that system, or a derived shift). Undefined when every
 * choice in the Dating menu leaves the event where it is, so the app doesn't say "Dated by …" for nothing.
 */
export function datingChronology(ds: Dataset, e: TimelineEvent): string | undefined {
  const chron = eventChronology(ds, e);
  const group = chron ? ds.chronologies?.[chron]?.group : undefined;
  if (!chron || !group) return undefined;
  const others = Object.entries(ds.chronologies ?? {})
    .filter(([id, c]) => c.group === group && id !== chron)
    .map(([id]) => id);
  const moves = (best: number, claims: DateClaim[] | undefined) => {
    const all = allClaims(ds, best, claims, chron);
    return others.some((t) => yearUnder(best, all, chron, t) !== best);
  };
  return moves(e.start, e.startDates) || (e.end !== undefined && moves(e.end, e.endDates)) ? chron : undefined;
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
  const chronologyOf = trackChronologies(ds.tracks);
  return ds.events.map((e) => {
    const chron = eventChronology(ds, e, chronologyOf);
    const s = resolveDate(ds, e.start, e.startDates, chron, selection, !!e.circa);
    const out: ResolvedEvent = { ...e, start: s.year };
    if (s.window) out.startWindow = s.window;
    if (e.end !== undefined) {
      const en = resolveDate(ds, e.end, e.endDates, chron, selection, !!e.circa);
      out.end = Math.max(en.year, s.year);
      if (en.window) out.endWindow = en.window;
    }
    attachDayWindows(out, e, !!e.circa);
    return out;
  });
}

/** A span's dates under the reader's Dating choice; `chron` overrides the row's chronology (an era names its own). */
export function resolveSpan(
  ds: Dataset,
  trackId: string,
  span: TrackSpan,
  selection: ChronologySelection,
  chron: string | undefined = trackChronology(ds.tracks, trackId),
): ResolvedSpan {
  const s = resolveDate(ds, span.start, span.startDates, chron, selection, !!span.circa);
  if (span.ongoing || span.end === undefined) {
    // still going: runs to the present, which no dating system moves
    const out: ResolvedSpan = { start: s.year, end: Math.max(datasetPresent(ds), s.year), startWindow: s.window, ongoing: true };
    if (span.startMonth) out.startMonth = span.startMonth;
    if (span.startDay) out.startDay = span.startDay;
    if (span.circa) out.circa = true;
    if (span.ongoingSources?.length) out.ongoingSources = span.ongoingSources;
    if (span.startEvent) out.startEvent = span.startEvent;
    attachDayWindows(out, span, !!span.circa);
    return out;
  }
  const e = resolveDate(ds, span.end, span.endDates, chron, selection, !!span.circa);
  const out: ResolvedSpan = { start: s.year, end: Math.max(e.year, s.year), startWindow: s.window, endWindow: e.window };
  // months and days ride along with the year when a dating system shifts it
  for (const k of ['startMonth', 'startDay', 'endMonth', 'endDay'] as const) if (span[k]) out[k] = span[k];
  if (span.circa) out.circa = true;
  if (span.startEvent) out.startEvent = span.startEvent;
  if (span.endEvent) out.endEvent = span.endEvent;
  attachDayWindows(out, span, !!span.circa);
  return out;
}

/**
 * Spreads in months or days (subYear.dayWindow) for a date left where its sources put it (no dating system moved it,
 * no circa fade): they replace the year windows, which can't show them.
 */
function attachDayWindows(
  out: { start: number; end?: number; startWindow?: Window; endWindow?: Window; startDays?: DayWindow; endDays?: DayWindow },
  src: DateDays & { start: number; end?: number; startDates?: DateClaim[]; endDates?: DateClaim[] },
  circa: boolean,
) {
  if (circa) return;
  if (out.start === src.start && src.startMonth) {
    const w = dayWindow({ year: src.start, month: src.startMonth, day: src.startDay }, src.startDates, 'start');
    if (w) {
      out.startDays = w;
      delete out.startWindow;
    }
  }
  if (src.end !== undefined && out.end === src.end && src.endMonth) {
    const w = dayWindow({ year: src.end, month: src.endMonth, day: src.endDay }, src.endDates, 'end');
    if (w) {
      out.endDays = w;
      delete out.endWindow;
    }
  }
}
