/**
 * The year cursor's readout ("meanwhile"): what was going on in one year across the rows on screen.
 * Per row: the reign in force (an event on the reign lane spanning the year), the phase, (a folded row) its sub-rows
 * alive that year, and up to `maxOngoing` other
 * events still going (spans covering the year, most important first). Plus the ages of the year (the Ages strip and
 * the rows' bands). Pure, so it's tested without the chart. An event counts on its first row only, so one shared by
 * several rows is missed while its first row is off screen.
 */
import type { ResolvedEvent, ResolvedPhase } from '../lib/chronology.ts';
import type { PlacedAge } from '../lib/eras.ts';

export interface MeanwhileLane {
  id: string;
  name: string;
  color: string;
  depth: number;
  /** The rows the lane draws: itself, plus its sub-rows when it's folded. */
  members: string[];
  /** The members' names (for a folded row's sub-rows alive in the year). */
  memberNames?: Map<string, string>;
}

export interface MeanwhileRow {
  id: string;
  name: string;
  color: string;
  depth: number;
  reign?: string;
  phase?: string;
  /** A folded row: its sub-rows whose lifespan covers the year. */
  alive?: string[];
  ongoing: string[];
}

export interface Meanwhile {
  year: number;
  ages: string[];
  rows: MeanwhileRow[];
}

const covers = (s: { start: number; end?: number }, year: number) => s.start <= year && (s.end ?? s.start) >= year;

export function meanwhile(
  year: number,
  lanes: MeanwhileLane[],
  phases: Map<string, ResolvedPhase[]>,
  events: ResolvedEvent[],
  reignIds: ReadonlySet<string>,
  ages: PlacedAge[] = [],
  lifespans: Map<string, { start: number; end: number }[]> = new Map(),
  maxOngoing = 2,
): Meanwhile {
  // events covering the year, by their first row
  const byTrack = new Map<string, ResolvedEvent[]>();
  for (const e of events) {
    if (e.end === undefined || e.end === e.start || !covers(e, year)) continue;
    const t = e.tracks[0];
    if (t) byTrack.set(t, [...(byTrack.get(t) ?? []), e]);
  }
  const rows: MeanwhileRow[] = [];
  for (const l of lanes) {
    const evs = l.members.flatMap((m) => byTrack.get(m) ?? []);
    const reigns = evs.filter((e) => reignIds.has(e.uuid)).sort((a, b) => b.start - a.start);
    const others = evs
      .filter((e) => !reignIds.has(e.uuid))
      .sort((a, b) => (a.importance ?? 2) - (b.importance ?? 2) || b.start - a.start);
    // the row's own phase, else (folded) the latest-starting phase among its sub-rows
    const phase = l.members
      .flatMap((m) => phases.get(m) ?? [])
      .filter((p) => covers(p, year))
      .sort((a, b) => b.start - a.start)[0];
    const alive = l.members
      .slice(1)
      .filter((m) => (lifespans.get(m) ?? []).some((s) => covers(s, year)))
      .map((m) => l.memberNames?.get(m) ?? m);
    const row: MeanwhileRow = {
      id: l.id,
      name: l.name,
      color: l.color,
      depth: l.depth,
      ...(reigns[0] ? { reign: reigns[0].title } : {}),
      ...(phase ? { phase: phase.name } : {}),
      ...(alive.length ? { alive } : {}),
      ongoing: others.slice(0, maxOngoing).map((e) => e.title),
    };
    if (row.reign || row.phase || alive.length || row.ongoing.length) rows.push(row);
  }
  const ageNames = ages
    .filter((a) => covers({ start: a.span.start, end: a.drawEnd ?? a.span.end }, year) && (a.drawEnd === undefined || a.drawEnd > year))
    .map((a) => (a.lineName ? `${a.era.name} (${a.lineName})` : a.era.name));
  return { year, ages: [...new Set(ageNames)], rows };
}

/** One row's note: reign, phase, (folded) sub-rows alive, then ongoing events. */
export const rowNote = (r: MeanwhileRow, ongoing = true) =>
  [r.reign, r.phase, r.alive && r.alive.join(', '), ...(ongoing ? r.ongoing : [])].filter(Boolean).join(' · ');
