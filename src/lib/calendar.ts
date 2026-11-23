import type { Calendar } from '../types.ts';
import { beforePresent } from './beforePresent.ts';
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

/** A whole number divided by 10^pow, written exactly, trailing zeros dropped: exactDec(251902137, 6) is "251.902137". */
function exactDec(n: number, pow: number): string {
  const s = String(n).padStart(pow + 1, '0');
  const frac = s.slice(-pow).replace(/0+$/, '');
  return frac ? `${s.slice(0, -pow)}.${frac}` : s.slice(0, -pow);
}

/** "251.902" × 10^6 as a whole number, by digits (no floating-point error); digits past 10^-pow are rounded. */
function scaledInt(text: string, pow: number): number {
  const [int, frac = ''] = text.replace(/,/g, '').split('.');
  const keep = frac.padEnd(pow, '0').slice(0, pow);
  const round = frac.length > pow && Number(frac[pow]) >= 5 ? 1 : 0;
  return Number(int) * 10 ** pow + Number(keep || '0') + round;
}

/** Up to three decimals, trailing zeros dropped: 4.567, 66, 11.7. */
const dec = (v: number) => String(Number(v.toFixed(3)));

/**
 * Deep time (`calendar.beforePresent`): a time before present in Ga, Ma, ka or years: "4.567 Ga", "66 Ma",
 * "11.7 ka BP", "9,600 years BP". Ga and Ma are written without "BP", as geologists do; ka and years add it when present
 * is 1950 (radiocarbon's and geology's BP), else ka reads "ka" and years "years ago". 0 is "present"; a year after the
 * present, "N years after present".
 */
export function formatAgo(ago: number, present: number, exact = false): string {
  const bp = present === 1950;
  // `exact` (the editors): every digit, so the text reads back as the same year ("251.902137 Ma")
  const d = (pow: number) => (exact && Number.isInteger(ago) ? exactDec(ago, pow) : dec(ago / 10 ** pow));
  if (ago >= 1e9) return `${d(9)} Ga`;
  if (ago >= 1e6) return `${d(6)} Ma`;
  if (ago >= 1e4) return `${d(3)} ka${bp ? ' BP' : ''}`;
  if (ago === 0) return 'present';
  if (ago < 0) return `${(-ago).toLocaleString('en')} ${ago === -1 ? 'year' : 'years'} after present`;
  return `${ago.toLocaleString('en')} ${ago === 1 ? 'year' : 'years'} ${bp ? 'BP' : 'ago'}`;
}

export function formatYear(y: number, cal: Calendar, circa = false): string {
  const bp = beforePresent(cal);
  if (bp) return `${circa ? 'c. ' : ''}${formatAgo(bp.present - y, bp.present)}`;
  const { year, era } = fromStored(y, cal);
  return `${circa ? 'c. ' : ''}${year} ${eraLabel(era, cal)}`;
}

/**
 * A year as an editor shows it: as `formatYear`, except that in deep time every digit is kept ("251.902137 Ma"), so
 * saving an unchanged form keeps the year. `formatDate`'s month and day as usual.
 */
export function formatEditDate(y: number, month: number | undefined, day: number | undefined, cal: Calendar, circa = false): string {
  const bp = beforePresent(cal);
  if (!bp) return formatDate(y, month, day, cal, circa);
  const when = formatAgo(bp.present - y, bp.present, true);
  return `${circa ? 'c. ' : ''}${month ? `${day ? `${day} ` : ''}${MONTH_NAMES[month - 1]} ` : ''}${when}`;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parses "1450 BCE", "1450bc", "c. 1450 BCE", "ca 1450 BCE", "4560 AE", "4560", "-500".
 * A bare number is in the "after" era; a leading minus means the "before" era.
 */
export function parseDate(input: string, cal: Calendar): { year: number; circa: boolean; margin?: number } | null {
  const ago = parseAgo(input, cal);
  if (ago) return ago;
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

const AGO_POW: Record<string, number> = { ga: 9, ma: 6, ka: 3 };

/**
 * Deep time (`calendar.beforePresent` only): reads what `formatAgo` writes, and a margin. "4.567 Ga", "66 Ma",
 * "11.7 ka BP", "c. 2.6 Ma", "9,600 years BP", "9,600 years ago", "present", "50 years after present", and
 * "251.902 ± 0.024 Ma" (or "+/-"; the margin in the same unit). Exact by digits, rounded to a whole stored year. Null for
 * anything else, or on a calendar without `beforePresent`.
 */
export function parseAgo(input: string, cal: Calendar): { year: number; circa: boolean; margin?: number } | null {
  const bp = beforePresent(cal);
  if (!bp) return null;
  const num = String.raw`(\d[\d,]*(?:\.\d+)?)`;
  const c = String.raw`^\s*(c\.?|ca\.?|circa)?\s*`;
  const unit = new RegExp(`${c}${num}\\s*(?:(?:±|\\+/-)\\s*${num}\\s*)?(ga|ma|ka)(?:\\s*bp)?\\s*$`, 'i').exec(input);
  if (unit) {
    const pow = AGO_POW[unit[4].toLowerCase()];
    const out: { year: number; circa: boolean; margin?: number } = { year: bp.present - scaledInt(unit[2], pow), circa: !!unit[1] };
    if (unit[3] !== undefined) out.margin = scaledInt(unit[3], pow);
    return out;
  }
  const years = new RegExp(`${c}${num}\\s*years?\\s+(bp|ago|after\\s+present)\\s*$`, 'i').exec(input);
  if (years) {
    const n = scaledInt(years[2], 0);
    return { year: /after/i.test(years[3]) ? bp.present + n : bp.present - n, circa: !!years[1] };
  }
  const now = new RegExp(`${c}present\\s*$`, 'i').exec(input);
  if (now) return { year: bp.present, circa: !!now[1] };
  return null;
}

/**
 * Parses a date that may give a month and day: "28 June 1914", "June 1914", "Jun 1914", "c. July 1916",
 * "15 March 44 BCE", "1914-06-28", "1914-06", or anything parseDate reads (a year). Month names may be cut to three
 * letters. Null if it can't be read, or the day doesn't exist in that month.
 */
export function parseFullDate(input: string, cal: Calendar): { year: number; month?: number; day?: number; circa: boolean; margin?: number } | null {
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
  // deep time: ticks on round ages ("100 Ma", not 100 million stored years, which is 1,950 years off)
  const bp = beforePresent(cal);
  if (bp) return bp.present - Math.ceil((bp.present - y) / inc) * inc;
  if (cal.yearZero) return Math.floor(y / inc) * inc;
  if (y >= inc && inc > 1) return Math.floor(y / inc) * inc;
  if (y >= 1) return inc === 1 ? Math.floor(y) : 1;
  return 1 - Math.ceil((1 - y) / inc) * inc;
}

/** The tick after `t` (which must itself be a tick). */
export function nextTick(t: number, inc: number, cal: Calendar): number {
  const unit = subYearUnit(inc);
  if (unit) return subYearNext(t, unit);
  if (cal.yearZero || beforePresent(cal)) return t + inc;
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

/** The first year of the "after" era: drawn as the era line on the ruler. In deep time, the present. */
export function eraStart(cal: Calendar): number {
  const bp = beforePresent(cal);
  if (bp) return bp.present;
  return cal.yearZero ? 0 : 1;
}

/** Major ticks: displayed year is a multiple of ten increments. */
export function isMajorTick(t: number, inc: number, cal: Calendar): boolean {
  const unit = subYearUnit(inc);
  if (unit) return isMajorSubYearTick(t, unit);
  const bp = beforePresent(cal);
  if (bp) return (bp.present - t) % (inc * 10) === 0;
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
