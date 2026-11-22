// Date claims in edit forms: the form's text fields for a claim, and converting them to and from stored claims.
// Shared by the event form and the track form (components/ClaimList.tsx draws the fields).
import type { Calendar, DateClaim, Locator, SourceRef } from '../types.ts';
import { fromStored, toStored, type EraSide } from './calendar.ts';

export interface ClaimValues {
  year: number;
  era: EraSide;
  margin: string;
  /** Month (1–12) and day as typed, or '' (only shown where the timeline is dated in months and days). */
  month?: string;
  day?: string;
  chronology: string;
  sourceKey: string;
  sourceLocation: string;
  note: string;
  /** The source's locator, not edited: kept while the source and its location stay as they were (`locatedAt`). */
  locator?: Locator;
  locatedAt?: string;
}

/** The part of a form's values ClaimList edits. */
export interface ClaimFields {
  startDates: ClaimValues[];
  endDates: ClaimValues[];
}

export const toClaimValues = (c: DateClaim, cal: Calendar): ClaimValues => {
  const d = fromStored(c.year, cal);
  return {
    year: d.year,
    era: d.era,
    margin: c.margin === undefined ? '' : String(c.margin),
    month: c.month ? String(c.month) : '',
    day: c.day ? String(c.day) : '',
    chronology: c.chronology ?? '',
    sourceKey: c.source?.sourceKey ?? '',
    sourceLocation: c.source?.sourceLocation ?? '',
    note: c.note ?? '',
    ...(c.source?.locator ? { locator: c.source.locator, locatedAt: located(c.source) } : {}),
  };
};

const located = (r: Pick<SourceRef, 'sourceKey' | 'sourceLocation'>) => `${r.sourceKey}\n${r.sourceLocation}`;

/**
 * A source reference from an edit form, keeping its locator only if the reference still names the same place it was
 * written for: the form can't keep the two in step, so an edited location drops it.
 */
export function keepLocator(r: SourceRef, before: SourceRef[] | undefined): SourceRef {
  const { locator, ...rest } = r;
  if (!locator) return rest;
  const same = before?.some((b) => located(b) === located(r) && JSON.stringify(b.locator) === JSON.stringify(locator));
  return same ? { ...rest, locator } : rest;
}

export const fromClaimValues = (v: ClaimValues, cal: Calendar): DateClaim | null => {
  if (!Number.isFinite(Number(v.year))) return null;
  const c: DateClaim = { year: toStored(Number(v.year), v.era, cal) };
  if (v.margin.trim() !== '' && Number(v.margin) >= 0) c.margin = Number(v.margin);
  if (Number(v.month) >= 1) c.month = Number(v.month);
  if (c.month && Number(v.day) >= 1) c.day = Number(v.day);
  if (v.chronology) c.chronology = v.chronology;
  if (v.sourceKey) {
    c.source = { sourceKey: v.sourceKey, sourceLocation: v.sourceLocation };
    if (v.locator && v.locatedAt === located(c.source)) c.source.locator = v.locator;
  }
  if (v.note.trim()) c.note = v.note.trim();
  return c;
};

/** A form's claim rows as stored claims; undefined when there are none. */
export const claimsFromValues = (list: ClaimValues[], cal: Calendar): DateClaim[] | undefined => {
  const out = list.map((c) => fromClaimValues(c, cal)).filter((c) => c !== null);
  return out.length ? out : undefined;
};
