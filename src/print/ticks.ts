// Print and Export's ruler: a round step for the years shown, and its ticks through the timeline's calendar (so a
// calendar with a year 0 gets its 0 and its round years; one without gets 1 CE and BCE years offset by one).
import { ticksBetween } from '../lib/calendar.ts';
import type { Calendar } from '../types.ts';

/** At most 12 ticks: today's steps up to 5,000 years, then 1, 2 or 5 × 10ⁿ, with no limit (deep time). */
export function tickStep(years: number): number {
  if (!Number.isFinite(years) || years <= 0) return 1;
  for (const s of [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000]) if (years / s <= 12) return s;
  for (let m = 10_000; ; m *= 10) for (const k of [1, 2, 5]) if (years / (k * m) <= 12) return k * m;
}

/** The ticks between two stored years. */
export function printTicks(from: number, to: number, cal: Calendar): number[] {
  return ticksBetween(from, to, tickStep(to - from), cal);
}
