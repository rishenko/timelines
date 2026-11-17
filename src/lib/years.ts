import type { Calendar, TimelineEvent } from '../types.ts';
import { formatYear } from './calendar.ts';

/** Number of years between two stored years (astronomical numbering makes this plain subtraction). */
export function yearsBetween(a: number, b: number): number {
  return Math.abs(b - a);
}

/** Effective end year of an event, resolving `ongoing` against the dataset's present. */
export function effectiveEnd(e: TimelineEvent, present: number): number {
  if (e.ongoing) return Math.max(present, e.start);
  return e.end ?? e.start;
}

export function isSpan(e: TimelineEvent): boolean {
  return !!e.ongoing || (e.end !== undefined && e.end > e.start);
}

/** "c. 1595 BCE", "1792 BCE – 1750 BCE (42 yrs)", "4560 AE – ongoing". */
export function formatEventDates(e: TimelineEvent, cal: Calendar, approx = !!e.circa): string {
  const start = formatYear(e.start, cal, approx);
  if (e.ongoing) return `${start} – ongoing`;
  if (e.end !== undefined && e.end !== e.start) {
    const span = yearsBetween(e.start, e.end);
    return `${start} – ${formatYear(e.end, cal, approx)} (${approx ? 'c. ' : ''}${span} yr${span === 1 ? '' : 's'})`;
  }
  return start;
}

export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  return (
    a.start - b.start ||
    (a.order ?? 999) - (b.order ?? 999) ||
    a.title.localeCompare(b.title)
  );
}

/** The dataset's "present": its explicit `present`, else the latest year any event starts or ends in. */
export function datasetPresent(ds: { present?: number; events: TimelineEvent[] }): number {
  return ds.present ?? presentYear(ds.events);
}

export function presentYear(events: TimelineEvent[]): number {
  let max = -Infinity;
  for (const e of events) max = Math.max(max, e.start, e.end ?? e.start);
  return Number.isFinite(max) ? max : 0;
}
