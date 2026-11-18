import type { Track } from '../types.ts';

/**
 * Walking the row tree. Rows (tracks) nest to any depth through `parent`; these helpers are the one place that
 * walks it. Every walk stops at an unknown parent or a cycle, so hand-edited data that hasn't been validated yet
 * can't hang the app (validate.ts reports cycles as errors).
 */

export const trackIndex = (tracks: Track[]): Map<string, Track> => new Map(tracks.map((t) => [t.id, t]));

/** Ancestor chain of a row, outermost first, ending with the row itself. Empty for an unknown id. */
export function trackPath(trackId: string, byId: Map<string, Track>): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  let t = byId.get(trackId);
  while (t && !seen.has(t.id)) {
    seen.add(t.id);
    out.unshift(t);
    t = t.parent ? byId.get(t.parent) : undefined;
  }
  return out;
}

/** Ids of a row's ancestors, outermost first (the row itself not included). */
export function ancestorIds(trackId: string, tracks: Track[]): string[] {
  return trackPath(trackId, trackIndex(tracks))
    .slice(0, -1)
    .map((t) => t.id);
}

/** 0 for top-level rows, 1 for their children, and so on. */
export function trackDepth(tracks: Track[], id: string): number {
  return Math.max(0, trackPath(id, trackIndex(tracks)).length - 1);
}

/** True if `ancestor` sits somewhere above `id`. */
export function isDescendant(tracks: Track[], id: string, ancestor: string): boolean {
  return ancestorIds(id, tracks).includes(ancestor);
}

/** The top-level row a row sits under (the row itself if it is top-level). */
export function rootOf(trackId: string, byId: Map<string, Track>): Track | undefined {
  return trackPath(trackId, byId)[0];
}

/** Each row's direct sub-rows, in dataset order. Top-level rows are listed under `undefined`. */
export function childrenMap(tracks: Track[]): Map<string | undefined, Track[]> {
  const kids = new Map<string | undefined, Track[]>();
  for (const t of tracks) kids.set(t.parent, [...(kids.get(t.parent) ?? []), t]);
  return kids;
}

/** Rows in lane order: each row followed by its sub-rows, depth-first. */
export function treeOrder(tracks: Track[]): Track[] {
  const kids = childrenMap(tracks);
  const out: Track[] = [];
  const seen = new Set<string>();
  const visit = (t: Track) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    out.push(t);
    for (const k of kids.get(t.id) ?? []) visit(k);
  };
  for (const t of kids.get(undefined) ?? []) visit(t);
  return out;
}

/** A row's id and the ids of every row below it. */
export function subtreeIds(trackId: string, tracks: Track[]): Set<string> {
  const kids = childrenMap(tracks);
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const k of kids.get(id) ?? []) visit(k.id);
  };
  visit(trackId);
  return ids;
}
