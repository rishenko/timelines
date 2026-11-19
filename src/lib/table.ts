import type { Calendar, Dataset, Track } from '../types.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan, Window } from './chronology.ts';
import { eventChronology, isApprox } from './chronology.ts';
import { formatYear } from './calendar.ts';
import { compareEvents, formatEventDates } from './years.ts';
import { trackIndex, trackPath, treeOrder } from './tracks.ts';

/**
 * The table view's data: events grouped into sections (a region, or a top-level row when there are no regions),
 * dates spelled out with their ranges, and the same rows as CSV. The table is the accessible equivalent of the
 * timeline (docs/feature-audit.md items 20 and 23), so everything the timeline shows by position and tint is said in
 * words here.
 */

export interface TableSection {
  /** The row the section is about: a region (second level), or a top-level row when it has no regions above it. */
  track: Track;
  /** The top-level group above the region, if any (shown as a heading over its regions). */
  group?: Track;
  events: ResolvedEvent[];
}

/** The section an event row belongs to: the second level of its path (a region), else the top level. */
function sectionTrack(trackId: string, byId: Map<string, Track>): { track: Track; group?: Track } | undefined {
  const path = trackPath(trackId, byId);
  if (!path.length) return undefined;
  return path.length > 1 ? { track: path[1], group: path[0] } : { track: path[0] };
}

/**
 * Groups events into sections, in the timeline's row order. An event on rows in several sections is listed in each
 * (a reader browsing Egypt should find the Battle of Kadesh even though it is also a Hittite event). Events within a
 * section are in date order. Sections with no events are left out.
 */
export function tableSections(tracks: Track[], events: ResolvedEvent[]): TableSection[] {
  const byId = trackIndex(tracks);
  const sections = new Map<string, TableSection>();
  for (const e of events) {
    const seen = new Set<string>();
    for (const t of e.tracks) {
      const s = sectionTrack(t, byId);
      if (!s || seen.has(s.track.id)) continue;
      seen.add(s.track.id);
      let sec = sections.get(s.track.id);
      if (!sec) sections.set(s.track.id, (sec = { track: s.track, group: s.group, events: [] }));
      sec.events.push(e);
    }
  }
  const order = new Map(treeOrder(tracks).map((t, i) => [t.id, i]));
  return [...sections.values()]
    .sort((a, b) => (order.get(a.track.id) ?? 0) - (order.get(b.track.id) ?? 0))
    .map((s) => ({ ...s, events: s.events.sort(compareEvents) }));
}

const range = (w: Window, cal: Calendar) => `${formatYear(w[0], cal)} and ${formatYear(w[1], cal)}`;

/**
 * An event's dates in words: the best estimate (under the reader's chosen chronology), then the range the cited
 * sources allow, e.g. "c. 1595 BCE; the sources put it between 1651 and 1531 BCE".
 */
export function datesInWords(e: ResolvedEvent, cal: Calendar): { main: string; ranges: string[] } {
  const main = formatEventDates(e, cal, isApprox(e));
  const ranges: string[] = [];
  const single = e.end === undefined || e.end === e.start;
  if (single && e.startWindow) ranges.push(`the sources put it between ${range(e.startWindow, cal)}`);
  else {
    if (e.startWindow) ranges.push(`start between ${range(e.startWindow, cal)}`);
    if (e.endWindow) ranges.push(`end between ${range(e.endWindow, cal)}`);
  }
  return { main, ranges };
}

/** The chronology an event is dated by, by name (only where the timeline defines chronologies). */
export function chronologyName(data: Dataset, e: ResolvedEvent): string | undefined {
  const id = eventChronology(data, e);
  return id ? data.chronologies?.[id]?.name : undefined;
}

const csvCell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The events as CSV, one row per event (not per section), in date order. Years come twice: as read ("c. 1595 BCE")
 * and as stored astronomical numbers (-1594), so spreadsheets can sort and compute with them.
 */
export function eventsCsv(data: Dataset, events: ResolvedEvent[]): string {
  const cal = data.meta.calendar;
  const names = new Map(data.tracks.map((t) => [t.id, t.name]));
  const head = [
    'id', 'title', 'dates', 'start_year', 'end_year', 'start_earliest', 'start_latest', 'end_earliest', 'end_latest',
    'approximate', 'chronology', 'rows', 'importance', 'sources', 'description',
  ];
  const lines = [head.join(',')];
  for (const e of [...events].sort(compareEvents)) {
    const sources = e.sources
      .map((s) => [data.sources[s.sourceKey]?.name ?? s.sourceKey, s.sourceLocation].filter(Boolean).join(', '))
      .join('; ');
    lines.push(
      [
        e.uuid,
        e.title,
        formatEventDates(e, cal, isApprox(e)),
        e.start,
        e.end,
        e.startWindow?.[0],
        e.startWindow?.[1],
        e.endWindow?.[0],
        e.endWindow?.[1],
        isApprox(e) ? 'yes' : 'no',
        chronologyName(data, e),
        e.tracks.map((t) => names.get(t) ?? t).join('; '),
        e.importance === 1 ? 'key' : e.importance === 3 ? 'minor' : 'normal',
        sources,
        e.descr,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}

/** A row (civilization, kingdom, faction) with what the chart shows on its bar: its lifespan and its phases. */
export interface TableRow {
  track: Track;
  /** The row it sits under, when that isn't the section itself (so "Kush, in Nubia" reads right without the indent). */
  parent?: Track;
  span?: ResolvedSpan;
  phases: ResolvedPhase[];
}

/**
 * The rows to list in a section (or, without a section, in the whole timeline): those with a lifespan or phases, in
 * the timeline's row order, skipping rows hidden by Filters. Rows that only group others (a region, "Nubia") have
 * nothing to show on their own and are left out.
 */
export function sectionRows(
  tracks: Track[],
  sectionId: string | undefined,
  spans: Map<string, ResolvedSpan>,
  phases: Map<string, ResolvedPhase[]>,
  visible: (trackId: string) => boolean,
): TableRow[] {
  const byId = trackIndex(tracks);
  return treeOrder(tracks)
    .filter((t) => (spans.has(t.id) || phases.has(t.id)) && visible(t.id))
    .filter((t) => sectionId === undefined || trackPath(t.id, byId).some((a) => a.id === sectionId))
    .map((t) => {
      const parent = t.parent ? byId.get(t.parent) : undefined;
      return {
        track: t,
        parent: parent && parent.id !== sectionId ? parent : undefined,
        span: spans.get(t.id),
        phases: phases.get(t.id) ?? [],
      };
    });
}

/** A lifespan or phase in words: "c. 1650 BCE – c. 1190 BCE", plus the ranges its sources allow. */
export function spanInWords(s: ResolvedSpan, cal: Calendar): { main: string; ranges: string[] } {
  const approx = isApprox(s);
  const main = `${formatYear(s.start, cal, approx)} – ${formatYear(s.end, cal, approx)}`;
  const ranges: string[] = [];
  if (s.startWindow) ranges.push(`start between ${range(s.startWindow, cal)}`);
  if (s.endWindow) ranges.push(`end between ${range(s.endWindow, cal)}`);
  return { main, ranges };
}

export interface FullSection extends TableSection {
  rows: TableRow[];
}

/**
 * Sections with both their rows (lifespans and phases) and their events, in row order. A region with rows but no
 * events (all filtered out, or none recorded) still gets a section, so every bar the chart draws is in the table.
 */
export function fullSections(
  tracks: Track[],
  events: ResolvedEvent[],
  spans: Map<string, ResolvedSpan>,
  phases: Map<string, ResolvedPhase[]>,
  visible: (trackId: string) => boolean,
): FullSection[] {
  const byId = trackIndex(tracks);
  const map = new Map<string, FullSection>(tableSections(tracks, events).map((s) => [s.track.id, { ...s, rows: [] }]));
  for (const r of sectionRows(tracks, undefined, spans, phases, visible)) {
    const s = sectionTrack(r.track.id, byId);
    if (!s) continue;
    let sec = map.get(s.track.id);
    if (!sec) map.set(s.track.id, (sec = { track: s.track, group: s.group, events: [], rows: [] }));
    sec.rows.push({ ...r, parent: r.parent && r.parent.id !== s.track.id ? r.parent : undefined });
  }
  const order = new Map(treeOrder(tracks).map((t, i) => [t.id, i]));
  return [...map.values()].sort((a, b) => (order.get(a.track.id) ?? 0) - (order.get(b.track.id) ?? 0));
}
