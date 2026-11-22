import { effectiveEnd, isSpan } from '../lib/years.ts';
import { at0, at1, startAt } from '../lib/subYear.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';

/** Years that must stay uncompressed on the axis: every event start and end, the edges of their error windows, and track lifespans. */
/** A timeline's stated range (meta.range): anchors outside it are clamped to its ends, so long-running rows or wide
 * uncertainty ranges don't stretch the ruler far past the period the timeline is about. */
export function anchorsFor(
  events: ResolvedEvent[],
  present: number,
  spans: ResolvedSpan[] = [],
  range?: { start: number; end: number },
  /** Zoomed in below a year: the ends of dates (the end of a year, month or day) are kept uncompressed too. */
  fine = false,
): number[] {
  const out: number[] = [];
  for (const e of events) {
    out.push(at0(e));
    const end = effectiveEnd(e, present);
    if (end !== e.start || e.endMonth) out.push(startAt(end, e.endMonth, e.endDay));
    if (fine) out.push(at1(e, e.end === undefined && !e.ongoing ? undefined : end));
    if (e.startWindow) out.push(...e.startWindow);
    if (e.endWindow) out.push(...e.endWindow);
  }
  for (const s of spans) {
    out.push(at0(s), startAt(s.end, s.endMonth, s.endDay));
    if (fine) out.push(at1(s));
    if (s.startWindow) out.push(...s.startWindow);
    if (s.endWindow) out.push(...s.endWindow);
  }
  return range ? out.map((y) => Math.min(Math.max(y, range.start), range.end)) : out;
}

/**
 * Below a year's zoom, the stretches never compressed: every event bar, from its start to the end of its last day
 * (Kevin, 2026-11-21: days inside an event bar are never squeezed out; lifespans and phases still may be).
 */
export function keptStretches(events: ResolvedEvent[], present: number, range?: { start: number; end: number }): [number, number][] {
  const clamp = (y: number) => (range ? Math.min(Math.max(y, range.start), range.end + 1) : y);
  return events.filter(isSpan).map((e) => [clamp(at0(e)), clamp(at1(e, effectiveEnd(e, present)))]);
}
