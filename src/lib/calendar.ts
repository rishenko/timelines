import type { Calendar } from '../types.ts';
import { dayOf, daysInMonth, isMajorSubYearTick, MONTH_NAMES, monthShort, subYearFloor, subYearNext, subYearUnit } from './subYear.ts';

/**
 * Calendar-aware conversion between stored years and display years.
 *
 * Stored years use astronomical numbering (a year 0 always exists), so plain
 * subtraction gives the number of years between two dates in every calendar.
 * Only display, parsing and ruler ticks depend on the calendar.
 */

export type EraSide = 'before' | 'after';

/** A calendar with a year 0 (550 BE … 0 AE … 502 AE). Also the default for untyped data. */
export const YEAR_ZERO_CALENDAR: Calendar = { before: 'BE', after: 'AE', yearZero: true };

export const BCE_CE: Calendar = {
  before: 'BCE',
  after: 'CE',
  yearZero: false,
  aliases: { before: ['BC'], after: ['AD'] },
};

/** Display year and era of a stored year. */
export function fromStored(y: number, cal: Calendar): { year: number; era: EraSide } {
  if (cal.yearZero) return y < 0 ? { year: -y, era: 'before' } : { year: y, era: 'after' };
  return y <= 0 ? { year: 1 - y, era: 'before' } : { year: y, era: 'after' };
}

/** Stored year of a display year. A non-positive year in a calendar without year 0 is clamped to 1. */
export function toStored(year: number, era: EraSide, cal: Calendar): number {
  const n = Math.abs(year);
  if (cal.yearZero) return era === 'before' ? -n : n;
  const m = Math.max(1, n);
  return era === 'before' ? 1 - m : m;
}

export function eraLabel(era: EraSide, cal: Calendar): string {
  return era === 'before' ? cal.before : cal.after;
}

/** "28 June 1914 CE", "June 1914 CE", or the year alone ("1914 CE") without a month. */
export function formatDate(y: number, month: number | undefined, day: number | undefined, cal: Calendar, circa = false): string {
  if (!month) return formatYear(y, cal, circa);
  return `${circa ? 'c. ' : ''}${day ? `${day} ` : ''}${MONTH_NAMES[month - 1]} ${formatYear(y, cal)}`;
}

export function formatYear(y: number, cal: Calendar, circa = false): string {
  const { year, era } = fromStored(y, cal);
  return `${circa ? 'c. ' : ''}${year} ${eraLabel(era, cal)}`;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parses "1450 BCE", "1450bc", "c. 1450 BCE", "ca 1450 BCE", "4560 AE", "4560", "-500".
 * A bare number is in the "after" era; a leading minus means the "before" era.
 */
export function parseDate(input: string, cal: Calendar): { year: number; circa: boolean } | null {
  const before = [cal.before, ...(cal.aliases?.before ?? [])].map(escape).join('|');
  const after = [cal.after, ...(cal.aliases?.after ?? [])].map(escape).join('|');
  const re = new RegExp(`^\\s*(c\\.?|ca\\.?|circa)?\\s*(-?\\d+)\\s*(?:(${before})|(${after}))?\\s*$`, 'i');
  const m = re.exec(input);
  if (!m) return null;
  const n = Number(m[2]);
  if (!Number.isFinite(n)) return null;
  const isBefore = !!m[3] || n < 0;
  if (!cal.yearZero && n === 0) return null;
  return { year: toStored(Math.abs(n), isBefore ? 'before' : 'after', cal), circa: !!m[1] };
}

/**
 * Parses a date that may give a month and day: "28 June 1914", "June 1914", "Jun 1914", "c. July 1916",
 * "15 March 44 BCE", "1914-06-28", "1914-06", or anything parseDate reads (a year). Month names may be cut to three
 * letters. Null if it can't be read, or the day doesn't exist in that month.
 */
export function parseFullDate(input: string, cal: Calendar): { year: number; month?: number; day?: number; circa: boolean } | null {
  const plain = parseDate(input, cal);
  if (plain) return plain;
  const iso = /^\s*(c\.?|ca\.?|circa)?\s*(-?\d+)-(\d{1,2})(?:-(\d{1,2}))?\s*$/i.exec(input);
  let circa = false;
  let yearText: string;
  let month: number;
  let day: number | undefined;
  if (iso) {
    circa = !!iso[1];
    yearText = iso[2];
    month = Number(iso[3]);
    day = iso[4] !== undefined ? Number(iso[4]) : undefined;
  } else {
    const m = /^\s*(c\.?|ca\.?|circa)?\s*(?:(\d{1,2})\s+)?([a-z]+)\.?,?\s+(.+)$/i.exec(input);
    if (!m) return null;
    const name = m[3].toLowerCase();
    const i = name.length >= 3 ? MONTH_NAMES.findIndex((n) => n.toLowerCase().startsWith(name)) : -1;
    if (i < 0) return null;
    circa = !!m[1];
    month = i + 1;
    day = m[2] !== undefined ? Number(m[2]) : undefined;
    yearText = m[4];
  }
  // an ISO year is astronomical (stored as written); a written year goes through the calendar
  const y = iso ? Number(yearText) : parseDate(yearText, cal)?.year;
  if (y === undefined || y === null || !Number.isInteger(y)) return null;
  if (!(month >= 1 && month <= 12)) return null;
  if (day !== undefined && !(day >= 1 && day <= daysInMonth(y, month))) return null;
  return day !== undefined ? { year: y, month, day, circa } : { year: y, month, circa };
}

export function parseYear(input: string, cal: Calendar): number | null {
  return parseDate(input, cal)?.year ?? null;
}

/** An example year for placeholders, e.g. "1450 BCE". */
export function exampleYear(cal: Calendar, y: number): string {
  return formatYear(y, cal);
}

// ---- ruler ticks -----------------------------------------------------------
//
// Ticks fall on round *displayed* years. With a year 0 that's every multiple of
// the increment. Without one, the BCE side is offset by one (stored -1499 is
// 1500 BCE), the CE side uses multiples, and 1 CE marks the era boundary:
//   …, 1-2·inc, 1-inc, 1, inc, 2·inc, …

/** The largest tick at or before `y`. */
export function tickFloor(y: number, inc: number, cal: Calendar): number {
  const unit = subYearUnit(inc);
  if (unit) return subYearFloor(y, unit);
  if (cal.yearZero) return Math.floor(y / inc) * inc;
  if (y >= inc && inc > 1) return Math.floor(y / inc) * inc;
  if (y >= 1) return inc === 1 ? Math.floor(y) : 1;
  return 1 - Math.ceil((1 - y) / inc) * inc;
}

/** The tick after `t` (which must itself be a tick). */
export function nextTick(t: number, inc: number, cal: Calendar): number {
  const unit = subYearUnit(inc);
  if (unit) return subYearNext(t, unit);
  if (cal.yearZero) return t + inc;
  if (t === 1) return inc > 1 ? inc : 2;
  return t + inc;
}

/** Ticks in [a, b]. */
export function ticksBetween(a: number, b: number, inc: number, cal: Calendar): number[] {
  const out: number[] = [];
  let t = tickFloor(a, inc, cal);
  if (t < a) t = nextTick(t, inc, cal);
  for (; t <= b; t = nextTick(t, inc, cal)) out.push(t);
  return out;
}

/** The first year of the "after" era: drawn as the era line on the ruler. */
export function eraStart(cal: Calendar): number {
  return cal.yearZero ? 0 : 1;
}

/** Major ticks: displayed year is a multiple of ten increments. */
export function isMajorTick(t: number, inc: number, cal: Calendar): boolean {
  const unit = subYearUnit(inc);
  if (unit) return isMajorSubYearTick(t, unit);
  return fromStored(t, cal).year % (inc * 10) === 0;
}

/**
 * A ruler tick's label: the year at a zoom of a year or more; below that, months ("Apr", the year on January) or
 * days ("8", the month and year on the 1st). `full`: the whole date ("21 Jun 1941 CE"), for a tick after a compressed gap.
 */
export function tickLabel(t: number, inc: number, cal: Calendar, full = false): string {
  const unit = subYearUnit(inc);
  if (!unit) return formatYear(t, cal);
  const { year, month, day } = dayOf(t);
  // the first tick after a compressed gap (or in view) says where the ruler is
  if (full) return unit === 'quarter' || unit === 'month' ? `${monthShort(month)} ${formatYear(year, cal)}` : `${day} ${monthShort(month)} ${formatYear(year, cal)}`;
  if (unit === 'quarter' || unit === 'month') return month === 1 ? formatYear(year, cal) : monthShort(month);
  return day === 1 ? `${monthShort(month)} ${formatYear(year, cal)}` : String(day);
}
