import type { Calendar, Dataset, Track, TrackSpan } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedPhase, type ResolvedSpan } from './chronology.ts';
import { formatYear } from './calendar.ts';

/**
 * A row's lifespan (Track.span): typed as one stretch or a list of stretches, or, when the row has phases and no
 * typed span, worked out from its phases. A worked-out lifespan covers the phases and leaves the gaps between them
 * blank (the row didn't exist then); phases that overlap, touch, or lie within `GAP_TOLERANCE` years of each other
 * make one stretch.
 */

/** Phases this many years apart (or closer) belong to one stretch of a worked-out lifespan. */
export const GAP_TOLERANCE = 1;

/** The typed stretches of a lifespan, as a list (a single object is one stretch). */
export function spanStretches(span: Track['span']): TrackSpan[] {
  if (!span) return [];
  return Array.isArray(span) ? span : [span];
}

/** A stretch's last year: its `end`, or the timeline's present when it is `ongoing`. */
export function stretchEnd(s: { start: number; end?: number; ongoing?: boolean }, present: number): number {
  return s.ongoing ? Math.max(present, s.start) : (s.end ?? s.start);
}

/** The first and last year a row exists in the data as typed (before any Dating choice): its typed lifespan, else its phases. */
export function rawLifespan(t: Track, present: number): { start: number; end: number } | undefined {
  const parts: { start: number; end?: number; ongoing?: boolean }[] = t.span ? spanStretches(t.span) : (t.phases ?? []);
  if (!parts.length) return undefined;
  return {
    start: Math.min(...parts.map((p) => p.start)),
    end: Math.max(...parts.map((p) => stretchEnd(p, present))),
  };
}

const lo = (s: ResolvedSpan) => Math.min(s.start, s.startWindow?.[0] ?? s.start);
const hi = (s: ResolvedSpan) => Math.max(s.end, s.endWindow?.[1] ?? s.end);

/**
 * The stretches covered by resolved phases (or any dated parts): parts whose extents (with their uncertainty ranges)
 * overlap, touch or lie within GAP_TOLERANCE years of each other merge. Each stretch takes its start, start range and
 * circa (and the event that began it) from the part that starts earliest, and its end (with any sources saying it is
 * still going, and the event that ended it) from the part that ends latest. Marked `derived`.
 */
export function mergeStretches(parts: ResolvedSpan[]): ResolvedSpan[] {
  const sorted = [...parts].sort((a, b) => lo(a) - lo(b) || a.start - b.start);
  const out: (ResolvedSpan & { startCirca?: boolean; endCirca?: boolean })[] = [];
  for (const p of sorted) {
    const cur = out.at(-1);
    if (cur && lo(p) - hi(cur) <= GAP_TOLERANCE) {
      if (p.start < cur.start) {
        cur.start = p.start;
        cur.startWindow = p.startWindow;
        cur.startCirca = p.circa;
        cur.startEvent = p.startEvent;
      } else if (p.startWindow && p.startWindow[0] < lo(cur)) cur.startWindow = [p.startWindow[0], cur.startWindow?.[1] ?? cur.start];
      if (p.end > cur.end || (p.end === cur.end && p.ongoing)) {
        cur.end = p.end;
        cur.endWindow = p.endWindow;
        cur.endCirca = p.circa;
        cur.ongoing = p.ongoing;
        cur.ongoingSources = p.ongoingSources;
        cur.endEvent = p.endEvent;
      } else if (p.endWindow && p.endWindow[1] > hi(cur)) cur.endWindow = [cur.endWindow?.[0] ?? cur.end, p.endWindow[1]];
    } else
      out.push({
        start: p.start,
        end: p.end,
        startWindow: p.startWindow,
        endWindow: p.endWindow,
        startCirca: p.circa,
        endCirca: p.circa,
        ongoing: p.ongoing,
        ongoingSources: p.ongoingSources,
        startEvent: p.startEvent,
        endEvent: p.endEvent,
      });
  }
  return out.map(({ startCirca, endCirca, ...s }) => {
    const r: ResolvedSpan = { start: s.start, end: s.end, derived: true };
    if (s.startWindow) r.startWindow = s.startWindow;
    if (s.endWindow) r.endWindow = s.endWindow;
    if (startCirca || endCirca) r.circa = true;
    if (s.ongoing) r.ongoing = true;
    if (s.ongoing && s.ongoingSources?.length) r.ongoingSources = s.ongoingSources;
    if (s.startEvent) r.startEvent = s.startEvent;
    if (s.endEvent && !s.ongoing) r.endEvent = s.endEvent;
    return r;
  });
}

/**
 * A row's lifespan under the reader's Dating choice: each typed stretch resolved like a single span, in date order;
 * else, for a row with phases, the stretches its (resolved) phases cover. Empty for a row with neither.
 */
export function resolveLifespan(
  ds: Dataset,
  t: Track,
  selection: ChronologySelection,
  phases: ResolvedPhase[] = (t.phases ?? []).map((p) => ({ name: p.name, ...resolveSpan(ds, t.id, p, selection) })),
): ResolvedSpan[] {
  if (t.span) return spanStretches(t.span).map((s) => resolveSpan(ds, t.id, s, selection)).sort((a, b) => a.start - b.start);
  return phases.length ? mergeStretches(phases) : [];
}

/** The extent of a lifespan's stretches: first start to last end. */
export function stretchHull(list: { start: number; end: number }[] | undefined): { start: number; end: number } | undefined {
  if (!list?.length) return undefined;
  return { start: Math.min(...list.map((s) => s.start)), end: Math.max(...list.map((s) => s.end)) };
}

/** "1918 – 1940", "c. 1650 BCE – c. 1190 BCE", "1991 – ongoing". */
export function spanDates(s: { start: number; end: number; ongoing?: boolean }, cal: Calendar, approx: boolean): string {
  return `${formatYear(s.start, cal, approx)} – ${s.ongoing ? 'ongoing' : formatYear(s.end, cal, approx)}`;
}
