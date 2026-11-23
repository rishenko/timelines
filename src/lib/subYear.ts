/**
 * Months and days within a stored year.
 *
 * A date is a stretch of time on the axis: a year-only date covers its year, a month-only date its month, a full date
 * its day. Positions are fractional stored years: year Y runs from Y to Y + 1, and each year is exactly one unit wide,
 * so a day is 1/365 or 1/366 of its year (Gregorian month lengths and leap years, astronomical numbering; dates are
 * placed as their sources give them, with no Julian/Gregorian conversion). A year-only date therefore sits exactly
 * where whole years always have.
 *
 * Zoom steps below a year (meta.increments may name them) are held as fractional years: QUARTER, MONTH, WEEK, DAY.
 * Their ruler ticks fall on calendar boundaries rather than on multiples: quarters on Jan/Apr/Jul/Oct 1, months on
 * the 1st, weeks on the 1st, 8th, 15th and 22nd of each month, days on every day.
 */

export type SubYearUnit = 'quarter' | 'month' | 'week' | 'day';

/** The average Gregorian year, in days: only sizes the week and day zoom steps. */
const MEAN_YEAR_DAYS = 365.2425;

export const SUB_YEAR: Record<SubYearUnit, number> = {
  quarter: 1 / 4,
  month: 1 / 12,
  week: 7 / MEAN_YEAR_DAYS,
  day: 1 / MEAN_YEAR_DAYS,
};

/** A zoom step as written in a timeline (years per tick, or a unit below a year) in years per tick. */
export function incrementYears(i: number | string): number {
  return typeof i === 'number' ? i : (SUB_YEAR[i as SubYearUnit] ?? Number(i));
}

/** The unit below a year that a zoom step is, if it is one. */
export function subYearUnit(inc: number): SubYearUnit | undefined {
  return (Object.keys(SUB_YEAR) as SubYearUnit[]).find((u) => Math.abs(SUB_YEAR[u] - inc) < 1e-12);
}

const dec = (v: number) => String(Number(v.toFixed(3)));

/**
 * A length of 10,000 years or more, short: "100 Myr", "1 Gyr", "50 kyr" (deep time's zoom steps; lengths in Myr, dates
 * in Ma, as geologists write them: Kevin, 2026-11-23). Null below that, so the other timelines' steps are unchanged.
 */
export function shortYears(n: number): string | null {
  if (n < 1e4) return null;
  return n >= 1e9 ? `${dec(n / 1e9)} Gyr` : n >= 1e6 ? `${dec(n / 1e6)} Myr` : `${dec(n / 1e3)} kyr`;
}

/** Spoken: "100 million years", "50 thousand years", "10 years". */
function spokenYears(n: number): string {
  return n >= 1e9 ? `${dec(n / 1e9)} billion years` : n >= 1e6 ? `${dec(n / 1e6)} million years` : n >= 1e4 ? `${dec(n / 1e3)} thousand years` : `${n} years`;
}

/** Deep time: a shortened gap's length, "4.4 Gyr", "540 Myr", "11.7 kyr", under 10,000 years "9,600 yrs". */
export function formatSpan(yrs: number): string {
  const s = shortYears(yrs);
  if (s) return s;
  const n = Math.round(yrs);
  return `${n.toLocaleString('en')} ${n === 1 ? 'yr' : 'yrs'}`;
}

/** "10 yr", "1 month", "1 week", "100 Myr": a zoom step, short. */
export function incrementLabel(inc: number): string {
  const u = subYearUnit(inc);
  return u ? (u === 'quarter' ? '3 months' : `1 ${u}`) : (shortYears(inc) ?? `${inc} yr`);
}

/** "10 years per tick", "1 month per tick", "100 million years per tick": a zoom step, spoken. */
export function incrementSpoken(inc: number): string {
  const u = subYearUnit(inc);
  return u ? `${u === 'quarter' ? '3 months' : `1 ${u}`} per tick` : `${spokenYears(inc)} per tick`;
}

/** A zoom step's toolbar button: the number, or the unit's short name below a year. */
export function incrementButton(inc: number): string {
  const u = subYearUnit(inc);
  return u ? { quarter: '3 mo', month: 'Month', week: 'Week', day: 'Day' }[u] : (shortYears(inc) ?? String(inc));
}

/**
 * A zoom step button's accessible name: as spoken for a number ("10 years per tick", which begins with its visible
 * "10"); below a year, and in deep time, its visible name first ("Day: 1 day per tick", "100 Myr: 100 million years per
 * tick"), so speech input can say what it sees (2.5.3).
 */
export function incrementName(inc: number): string {
  return subYearUnit(inc) || shortYears(inc) ? `${incrementButton(inc)}: ${incrementSpoken(inc)}` : incrementSpoken(inc);
}

/** A zoom step's name in links (?inc=): its unit name below a year, else its number. */
export function incrementParam(inc: number): string {
  return subYearUnit(inc) ?? String(inc);
}

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInYear = (y: number) => (isLeap(y) ? 366 : 365);
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const daysInMonth = (y: number, m: number) => (m === 2 && isLeap(y) ? 29 : MONTH_DAYS[m - 1]);

/** Days in the year before the 1st of month m. */
function daysBefore(y: number, m: number): number {
  let n = 0;
  for (let i = 1; i < m; i++) n += daysInMonth(y, i);
  return n;
}

/** Where a date starts: the start of its year, month or day, in fractional years. */
export function startAt(year: number, month?: number, day?: number): number {
  if (!month) return year;
  return year + (daysBefore(year, month) + (day ? day - 1 : 0)) / daysInYear(year);
}

/** Where a date ends (exclusive): the end of its year, month or day. */
export function endAt(year: number, month?: number, day?: number): number {
  if (!month) return year + 1;
  if (!day) return month === 12 ? year + 1 : startAt(year, month + 1);
  return day === daysInMonth(year, month) ? (month === 12 ? year + 1 : startAt(year, month + 1)) : startAt(year, month, day + 1);
}

/** The calendar day a position falls on. */
export function dayOf(t: number): { year: number; month: number; day: number } {
  const year = Math.floor(t);
  // a small allowance so a tick computed as the start of a day isn't read as the day before
  let d = Math.floor((t - year) * daysInYear(year) + 1e-6);
  let month = 1;
  while (month < 12 && d >= daysInMonth(year, month)) d -= daysInMonth(year, month++);
  return { year, month, day: Math.min(d + 1, daysInMonth(year, month)) };
}

const WEEK_DAYS = [1, 8, 15, 22];

/** The last tick of a unit below a year at or before t. */
export function subYearFloor(t: number, unit: SubYearUnit): number {
  const { year, month, day } = dayOf(t);
  switch (unit) {
    case 'quarter':
      return startAt(year, month - ((month - 1) % 3));
    case 'month':
      return startAt(year, month);
    case 'week':
      return startAt(year, month, WEEK_DAYS.findLast((w) => w <= day));
    case 'day':
      return startAt(year, month, day);
  }
}

/** The tick after `t` (itself a tick) of a unit below a year. */
export function subYearNext(t: number, unit: SubYearUnit): number {
  const { year, month, day } = dayOf(t);
  switch (unit) {
    case 'quarter':
      return month >= 10 ? year + 1 : startAt(year, month + 3);
    case 'month':
      return endAt(year, month);
    case 'week': {
      const w = WEEK_DAYS.find((w) => w > day);
      return w ? startAt(year, month, w) : endAt(year, month);
    }
    case 'day':
      return endAt(year, month, day);
  }
}

/** Major ticks below a year: the start of a year (quarter and month zoom) or of a month (week and day zoom). */
export function isMajorSubYearTick(t: number, unit: SubYearUnit): boolean {
  const { month, day } = dayOf(t);
  return unit === 'quarter' || unit === 'month' ? month === 1 && day === 1 : day === 1;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthShort = (m: number) => MONTH_NAMES[m - 1].slice(0, 3);

/** The part of a date's position below the year, in years: what to add to a year to place the date. */
export interface DayParts {
  month?: number;
  day?: number;
}

/** A dated thing's start position: its start year plus its start month and day. */
export const at0 = (o: { start: number; startMonth?: number; startDay?: number }) => startAt(o.start, o.startMonth, o.startDay);

/**
 * A dated thing's end position (exclusive): the end of its end year, month or day. Without an `end` (a single date)
 * it ends where its start date does. `end` overrides the year (an ongoing span runs to the present).
 */
export function at1(o: { start: number; end?: number; startMonth?: number; startDay?: number; endMonth?: number; endDay?: number }, end = o.end): number {
  if (end === undefined) return endAt(o.start, o.startMonth, o.startDay);
  return endAt(end, o.endMonth, o.endDay);
}

/** Whether a dated thing gives any month or day. */
export const hasDays = (o: { startMonth?: number; endMonth?: number }) => !!(o.startMonth || o.endMonth);

/** A compressed gap's length on the ruler: "120 yrs" (whole years, as always), else "4 months", "12 days". */
export function gapLength(y0: number, y1: number): string {
  const yrs = y1 - y0;
  if (Number.isInteger(yrs)) return `${yrs} yrs`;
  if (yrs >= 0.95) return `${Math.round(yrs)} ${Math.round(yrs) === 1 ? 'yr' : 'yrs'}`;
  const days = Math.round(yrs * MEAN_YEAR_DAYS);
  if (days >= 60) return `${Math.round(days / 30.44)} months`;
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Days since a fixed epoch (proleptic Gregorian, astronomical years): differences count days between dates. */
export function dayNumber(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe;
}

/**
 * How long a dated stretch lasts, for "(… )" after its dates: "141 days" when both ends give days and it is under a
 * year, "4 months" when both give months, else whole years ("42 yrs") as always. Undefined for nothing to say.
 */
export function durationText(o: { start: number; end: number; startMonth?: number; startDay?: number; endMonth?: number; endDay?: number }, approx = false): string {
  const c = approx ? 'c. ' : '';
  if (o.startMonth && o.endMonth) {
    if (o.startDay && o.endDay) {
      const days = dayNumber(o.end, o.endMonth, o.endDay) - dayNumber(o.start, o.startMonth, o.startDay) + 1;
      if (days < 365) return `${c}${days} day${days === 1 ? '' : 's'}`;
    }
    const months = (o.end - o.start) * 12 + o.endMonth - o.startMonth + 1;
    if (months < 12) return `${c}${months} month${months === 1 ? '' : 's'}`;
  }
  const span = Math.abs(o.end - o.start);
  return `${c}${span} yr${span === 1 ? '' : 's'}`;
}

/** The view's center as kept between zooms: a whole year at a year's zoom or more (as always), else a day. */
export function roundCenter(y: number, inc: number): number {
  if (inc >= 1) return Math.round(y);
  const { year, month, day } = dayOf(y);
  return startAt(year, month, day);
}

/** The center in a link: the year, or the day ("1916-07-01", astronomical year) when it isn't a whole year. */
export function centerParam(y: number): string {
  if (Number.isInteger(y)) return String(y);
  const { year, month, day } = dayOf(y);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The spread of a date whose sources disagree within months or days (every claim gives a month): positions, not
 * years. `from` is where the earliest date starts and `to` where the latest ends; `solid` is the latest start (for a
 * start: the bar is certain from there) or the earliest end (for an end: certain up to there). `lo`/`hi` are the
 * earliest and latest dates, for text.
 */
export interface DayWindow {
  from: number;
  solid: number;
  to: number;
  lo: { year: number; month: number; day?: number };
  hi: { year: number; month: number; day?: number };
}

type DatedValue = { year: number; month?: number; day?: number; margin?: number; chronology?: string };

/**
 * A date's spread in months or days, from its best estimate and its sources' claims: only when every value gives a
 * month, none has a ± margin in years, and they don't all agree. Claims under another dating system are left out.
 */
export function dayWindow(best: DatedValue, claims: DatedValue[] | undefined, side: 'start' | 'end'): DayWindow | undefined {
  const own = (claims ?? []).filter((c) => !c.chronology);
  const vals = [best, ...own];
  if (vals.length < 2 || vals.some((v) => !v.month || v.margin)) return undefined;
  const starts = vals.map((v) => startAt(v.year, v.month, v.day));
  const ends = vals.map((v) => endAt(v.year, v.month, v.day));
  const iLo = starts.indexOf(Math.min(...starts));
  const iHi = ends.indexOf(Math.max(...ends));
  const part = (v: DatedValue) => ({ year: v.year, month: v.month!, ...(v.day ? { day: v.day } : {}) });
  const w = {
    from: starts[iLo],
    to: ends[iHi],
    solid: side === 'start' ? Math.max(...starts) : Math.min(...ends),
    lo: part(vals[iLo]),
    hi: part(vals[iHi]),
  };
  return (side === 'start' ? w.solid > w.from : w.solid < w.to) ? w : undefined;
}

/** Anything drawn from a start to an end, with the uncertainty its sources leave at each end. */
type Drawn = {
  start: number;
  end?: number;
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
  startWindow?: [number, number];
  endWindow?: [number, number];
  startDays?: DayWindow;
  endDays?: DayWindow;
};

/** Where it is drawn from: its start, or the earliest date its sources allow. */
export const drawnFrom = (o: Drawn) => Math.min(at0(o), o.startWindow?.[0] ?? Infinity, o.startDays?.from ?? Infinity);

/** Where it is drawn to (exclusive): the end of its end date, or of the latest end its sources allow. `end` overrides the end year (ongoing). */
export const drawnTo = (o: Drawn, end = o.end ?? o.start) => Math.max(at1(o, end), o.endWindow ? o.endWindow[1] + 1 : -Infinity, o.endDays?.to ?? -Infinity);

/** Where its start is certain (the latest start its sources allow), if they leave it uncertain. */
export const certainFrom = (o: Drawn) => (o.startDays ? o.startDays.solid : o.startWindow ? o.startWindow[1] : undefined);

/** Where its end is certain up to (the earliest end), if they leave it uncertain. */
export const certainTo = (o: Drawn) => (o.endDays ? o.endDays.solid : o.endWindow ? o.endWindow[0] + 1 : undefined);

/** Whether a timeline is dated in months and days: it offers a zoom step below a year. Its editor then asks for them. */
export const hasDayZoom = (increments: (number | string)[]) => increments.some((i) => incrementYears(i) < 1);
