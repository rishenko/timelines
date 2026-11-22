import type { Calendar, TimelineEvent } from '../types.ts';
import { formatDate } from './calendar.ts';
import { at0, at1, durationText, endAt, hasDays } from './subYear.ts';

/** Number of years between two stored years (astronomical numbering makes this plain subtraction). */
export function yearsBetween(a: number, b: number): number {
  return Math.abs(b - a);
}

/** Effective end year of an event, resolving `ongoing` against the dataset's present. */
export function effectiveEnd(e: TimelineEvent, present: number): number {
  if (e.ongoing) return Math.max(present, e.start);
  return e.end ?? e.start;
}

/** Whether an event is a stretch of time rather than one date: ongoing, or ending after its start date's year (or month, or day) is out. */
export function isSpan(e: TimelineEvent): boolean {
  return !!e.ongoing || (e.end !== undefined && (e.end > e.start || (hasDays(e) && at1(e) > endAt(e.start, e.startMonth, e.startDay))));
}

/** "c. 1595 BCE", "1792 BCE – 1750 BCE (42 yrs)", "4560 AE – ongoing". */
export function formatEventDates(e: TimelineEvent, cal: Calendar, approx = !!e.circa): string {
  const start = formatDate(e.start, e.startMonth, e.startDay, cal, approx);
  if (e.ongoing) return `${start} – ongoing`;
  if (e.end !== undefined && isSpan(e)) {
    return `${start} – ${formatDate(e.end, e.endMonth, e.endDay, cal, approx)} (${durationText({ ...e, end: e.end }, approx)})`;
  }
  return start;
}

export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  return (
    a.start - b.start ||
    at0(a) - at0(b) ||
    (a.order ?? 999) - (b.order ?? 999) ||
    a.title.localeCompare(b.title)
  );
}

/** The dataset's "present": its explicit `present`, else the latest year any event starts or ends in. */
export function datasetPresent(ds: { present?: number; events: TimelineEvent[] }): number {
  return ds.present ?? presentYear(ds.events);
}

export function presentYear(events: Pick<TimelineEvent, 'start' | 'end'>[]): number {
  let max = -Infinity;
  for (const e of events) max = Math.max(max, e.start, e.end ?? e.start);
  return Number.isFinite(max) ? max : 0;
}
