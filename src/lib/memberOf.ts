import type { Calendar, Dataset, DateDays, RowMembership, SourceRef, Track, TrackKind } from '../types.ts';
import { hasDays, monthShort } from './subYear.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';
import { formatDate, fromStored, formatYear, hasCalendarSystem } from './calendar.ts';
import { mergeStretches, spanStretches, stretchEnd } from './lifespan.ts';

/**
 * Dated memberships (Track.memberOf): a row belonged to another row (a union, empire or alliance) for a stretch of
 * years. The member's row draws each as one more strip line; the union's row lists its members.
 */

/** A membership resolved under the reader's Dating choice, like a phase. */
export interface ResolvedMembership extends ResolvedSpan {
  /** The row it belonged to. */
  row: string;
  /** The member row's phase that held it, when the data names one (RowMembership.phase). */
  phase?: string;
  sources: SourceRef[];
  /** Its index in the member row's Track.memberOf (the list here is sorted by start, which a Dating choice can change). */
  index: number;
}

/** One member of a union, as the union's row lists it. */
export interface UnionMember {
  /** The member row's id. */
  member: string;
  membership: ResolvedMembership;
}

/** Each row's memberships, resolved (rows without any are absent), in date order. */
export function resolveMemberships(ds: Dataset, selection: ChronologySelection): Map<string, ResolvedMembership[]> {
  const out = new Map<string, ResolvedMembership[]>();
  for (const t of ds.tracks) {
    if (!t.memberOf?.length) continue;
    out.set(
      t.id,
      t.memberOf
        .map((m, index) => ({
          ...resolveSpan(ds, t.id, m, selection),
          row: m.row,
          ...(m.phase !== undefined ? { phase: m.phase } : {}),
          sources: m.sources,
          index,
        }))
        .sort((a, b) => a.start - b.start),
    );
  }
  return out;
}

/** Each union's members (by the union's row id), in the order of the rows, then by start. */
export function membersByUnion(memberships: Map<string, ResolvedMembership[]>): Map<string, UnionMember[]> {
  const out = new Map<string, UnionMember[]>();
  for (const [member, list] of memberships)
    for (const m of list) {
      const l = out.get(m.row) ?? [];
      l.push({ member, membership: m });
      out.set(m.row, l);
    }
  return out;
}

/**
 * A membership's years, short: "1922–91" (the end's century left out when both share it), "1517–1914",
 * "c. 2400 BCE–2200 BCE", "since 1991" when it is still going.
 */
export function shortYears(s: { start: number; end: number; ongoing?: boolean } & DateDays, cal: Calendar, approx = false): string {
  const c = approx ? 'c. ' : '';
  if (hasCalendarSystem(cal)) {
    const start = formatDate(s.start, s.startMonth, s.startDay, cal, approx);
    return s.ongoing ? `since ${start}` : `${start}–${formatDate(s.end, s.endMonth, s.endDay, cal)}`;
  }
  if (hasDays(s)) return shortDates(s, cal, c);
  const a = fromStored(s.start, cal);
  if (s.ongoing) return `since ${c}${a.era === 'after' ? a.year : formatYear(s.start, cal)}`;
  const b = fromStored(s.end, cal);
  if (a.era === 'after' && b.era === 'after') {
    if (a.year === b.year) return `${c}${a.year}`;
    const sameCentury = a.year >= 100 && String(a.year).length === String(b.year).length && Math.floor(a.year / 100) === Math.floor(b.year / 100);
    return `${c}${a.year}–${sameCentury ? String(b.year).slice(-2) : b.year}`;
  }
  return `${c}${formatYear(s.start, cal)}–${formatYear(s.end, cal)}`;
}

/**
 * A stretch given in months or days, short: "3 Mar–14 Jun 3080", "Mar 3080–Feb 3081", "since 3 Mar 3080"; the year
 * once when both ends share it.
 */
function shortDates(s: { start: number; end: number; ongoing?: boolean } & DateDays, cal: Calendar, c: string): string {
  const year = (y: number) => {
    const d = fromStored(y, cal);
    return d.era === 'after' ? String(d.year) : formatYear(y, cal);
  };
  const part = (m?: number, d?: number) => (m ? `${d ? `${d} ` : ''}${monthShort(m)}` : '');
  const a = part(s.startMonth, s.startDay);
  if (s.ongoing) return `since ${c}${a ? `${a} ` : ''}${year(s.start)}`;
  const b = part(s.endMonth, s.endDay);
  if (s.start === s.end && a && b) return `${c}${a}–${b} ${year(s.end)}`;
  return `${c}${a ? `${a} ` : ''}${year(s.start)}–${b ? `${b} ` : ''}${year(s.end)}`;
}

/** How a membership reads, by the kind of row it is in (11.3): "member of" an organization, "fought in" a conflict, "in" anything else. */
export const memberWord = (kind?: TrackKind): string => (kind === 'organization' ? 'member of' : kind === 'conflict' ? 'fought in' : 'in');

/** A union row as a membership names it: the row (its name and kind), or just an id when the row isn't in the file. */
export type UnionRef = { name: string; kind?: TrackKind } | string;
export const unionName = (u: UnionRef): string => (typeof u === 'string' ? u : u.name);
export const unionWord = (u: UnionRef): string => memberWord(typeof u === 'string' ? undefined : u.kind);

/**
 * The name a membership's strip shows: "in Soviet Union, 1922–91"; with the phase that held it, "West Germany: member of
 * NATO, 1955–90" (a row with rival phases at the time); a war row (kind conflict) reads "fought in".
 */
export function membershipLabel(m: ResolvedMembership, union: UnionRef, cal: Calendar, approx = false): string {
  return `${m.phase ? `${m.phase}: ` : ''}${unionWord(union)} ${unionName(union)}, ${shortYears(m, cal, approx)}`;
}

/** A union's members in words, for its tooltips: "Members: Russia 1922–91, Ukraine 1922–91". Empty without members. */
export function membersTip(members: UnionMember[] | undefined, nameOf: (id: string) => string, cal: Calendar): string {
  if (!members?.length) return '';
  return `Members (${members.length}): ${members.map((u) => `${nameOf(u.member)}${u.membership.phase ? ` (${u.membership.phase})` : ''} ${shortYears(u.membership, cal)}`).join(', ')}`;
}

/**
 * A row's lifespan from its best estimates (no Dating choice, no uncertainty ranges): its typed stretches, else the
 * stretches its phases cover. Used to check that a membership lies within both rows' lifespans.
 */
export function bestLifespan(t: Track, present: number): { start: number; end: number }[] {
  if (t.span) return spanStretches(t.span).map((s) => ({ start: s.start, end: stretchEnd(s, present) }));
  const phases = (t.phases ?? []).filter((p) => Number.isInteger(p.start));
  return mergeStretches(phases.map((p) => ({ start: p.start, end: stretchEnd(p, present) }))).map((s) => ({ start: s.start, end: s.end }));
}

/** Whether a membership's years (best estimates) lie within one stretch of a lifespan. */
export function withinLifespan(m: Pick<RowMembership, 'start' | 'end' | 'ongoing'>, life: { start: number; end: number }[], present: number): boolean {
  const end = stretchEnd(m, present);
  return life.some((s) => s.start <= m.start && s.end >= end);
}
