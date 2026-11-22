import type { Calendar, Dataset, RowMembership, SourceRef, Track } from '../types.ts';
import { resolveSpan, type ChronologySelection, type ResolvedSpan } from './chronology.ts';
import { fromStored, formatYear } from './calendar.ts';
import { mergeStretches, spanStretches, stretchEnd } from './lifespan.ts';

/**
 * Dated memberships (Track.memberOf): a row belonged to another row (a union, empire or alliance) for a stretch of
 * years. The member's row draws each as one more strip line; the union's row lists its members.
 */

/** A membership resolved under the reader's Dating choice, like a phase. */
export interface ResolvedMembership extends ResolvedSpan {
  /** The row it belonged to. */
  row: string;
  sources: SourceRef[];
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
      t.memberOf.map((m) => ({ ...resolveSpan(ds, t.id, m, selection), row: m.row, sources: m.sources })).sort((a, b) => a.start - b.start),
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
export function shortYears(s: { start: number; end: number; ongoing?: boolean }, cal: Calendar, approx = false): string {
  const c = approx ? 'c. ' : '';
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

/** The name a membership's strip shows: "in Soviet Union, 1922–91". */
export function membershipLabel(m: ResolvedMembership, unionName: string, cal: Calendar, approx = false): string {
  return `in ${unionName}, ${shortYears(m, cal, approx)}`;
}

/** A union's members in words, for its tooltips: "Members: Russia 1922–91, Ukraine 1922–91". Empty without members. */
export function membersTip(members: UnionMember[] | undefined, nameOf: (id: string) => string, cal: Calendar): string {
  if (!members?.length) return '';
  return `Members (${members.length}): ${members.map((u) => `${nameOf(u.member)} ${shortYears(u.membership, cal)}`).join(', ')}`;
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
