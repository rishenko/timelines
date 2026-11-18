import type { Track } from '../types.ts';

/** Ids of rows that have sub-rows: the only rows that can collapse. */
export function parentIds(tracks: Track[]): string[] {
  const ids = new Set(tracks.map((t) => t.id));
  return [...new Set(tracks.flatMap((t) => (t.parent && ids.has(t.parent) ? [t.parent] : [])))];
}

/** True if any row that has sub-rows is collapsed. */
export function anyCollapsed(tracks: Track[], collapsed: Record<string, boolean>): boolean {
  return parentIds(tracks).some((id) => collapsed[id]);
}

/** The collapsed rows a timeline opens with (its `meta.collapsed`). */
export function defaultCollapsed(ids: string[] | undefined): Record<string, boolean> {
  return Object.fromEntries((ids ?? []).map((id) => [id, true]));
}

/** True if the same rows with sub-rows are collapsed in both states (rows without sub-rows don't matter). */
export function sameCollapsed(tracks: Track[], a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  return parentIds(tracks).every((id) => !!a[id] === !!b[id]);
}

/**
 * Collapses every row that has sub-rows, at every level, so only the top-level rows show. Expanding one
 * of them then shows its children still collapsed: readers drill down a level at a time.
 */
export function collapseAll(tracks: Track[]): Record<string, boolean> {
  return Object.fromEntries(parentIds(tracks).map((id) => [id, true]));
}
