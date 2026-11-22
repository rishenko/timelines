import type { Dataset, Track } from '../types.ts';
import { spanStretches } from './lifespan.ts';

/**
 * Succession: lifespan stretches and phases may name the event that began or ended them (TrackSpan.startEvent,
 * endEvent). This lists those edges per event, so an event can say which rows and phases it started and ended.
 */

/** One edge of a lifespan stretch or a phase that names its event. */
export interface SuccessionEdge {
  trackId: string;
  /** The phase's name; absent for a lifespan stretch or a membership. */
  phase?: string;
  /** For a membership (Track.memberOf): the row it was a membership in. */
  member?: string;
  side: 'start' | 'end';
  eventId: string;
  /** The edge's best estimate (stored year). */
  year: number;
}

/** Every edge in the dataset that names an event: lifespan stretches first, then phases, in row order. */
export function successionEdges(tracks: Track[]): SuccessionEdge[] {
  const out: SuccessionEdge[] = [];
  for (const t of tracks) {
    const parts = [...spanStretches(t.span).map((s) => ({ s, phase: undefined as string | undefined })), ...(t.phases ?? []).map((p) => ({ s: p, phase: p.name }))];
    for (const { s, phase } of parts) {
      if (s.startEvent) out.push({ trackId: t.id, ...(phase !== undefined ? { phase } : {}), side: 'start', eventId: s.startEvent, year: s.start });
      if (s.endEvent && s.end !== undefined)
        out.push({ trackId: t.id, ...(phase !== undefined ? { phase } : {}), side: 'end', eventId: s.endEvent, year: s.end });
    }
    // memberships (Track.memberOf) come after the row's own lifespan and phases
    for (const m of t.memberOf ?? []) {
      if (m.startEvent) out.push({ trackId: t.id, member: m.row, side: 'start', eventId: m.startEvent, year: m.start });
      if (m.endEvent && m.end !== undefined) out.push({ trackId: t.id, member: m.row, side: 'end', eventId: m.endEvent, year: m.end });
    }
  }
  return out;
}

/** What an event started and ended. */
export interface Succession {
  started: SuccessionEdge[];
  ended: SuccessionEdge[];
}

/** Each event's started and ended edges (events that name none are absent). */
export function successionIndex(tracks: Track[]): Map<string, Succession> {
  const m = new Map<string, Succession>();
  for (const e of successionEdges(tracks)) {
    let s = m.get(e.eventId);
    if (!s) m.set(e.eventId, (s = { started: [], ended: [] }));
    (e.side === 'start' ? s.started : s.ended).push(e);
  }
  return m;
}

/**
 * The lines a lifespan stretch's or phase's tooltip adds for the events that began and ended it ("Began with: …"),
 * each starting with a line break; empty when it names none (or names events that aren't there).
 */
export function successionTip(s: { startEvent?: string; endEvent?: string }, eventTitle: (id: string) => string | undefined): string {
  const began = s.startEvent && eventTitle(s.startEvent);
  const ended = s.endEvent && eventTitle(s.endEvent);
  return `${began ? `\nBegan with: ${began}` : ''}${ended ? `\nEnded with: ${ended}` : ''}`;
}

/** "Russia: Russian Federation" for a phase, "Soviet Union" for a lifespan, "Ukraine in Soviet Union" for a membership. */
export function edgeName(e: Pick<SuccessionEdge, 'trackId' | 'phase' | 'member'>, ds: Pick<Dataset, 'tracks'>): string {
  const name = (id: string) => ds.tracks.find((t) => t.id === id)?.name ?? id;
  const row = name(e.trackId);
  if (e.member !== undefined) return `${row} in ${name(e.member)}`;
  return e.phase !== undefined ? `${row}: ${e.phase}` : row;
}

/** What an edge is the edge of, in words: "lifespan", "phase" or "membership". */
export function edgeKind(e: Pick<SuccessionEdge, 'phase' | 'member'>): string {
  return e.member !== undefined ? 'membership' : e.phase !== undefined ? 'phase' : 'lifespan';
}
