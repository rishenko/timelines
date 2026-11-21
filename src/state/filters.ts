import { useCallback, useState } from 'react';
import type { Dataset, TimelineEvent } from '../types.ts';

export interface Filters {
  tracks: Record<string, boolean>;
  sources: Record<string, boolean>;
  tags: Record<string, boolean>;
}

/** Missing keys count as visible, so new tracks/sources show up without a reset. */
export const isOn = (m: Record<string, boolean>, k: string) => m[k] !== false;

export function initialFilters(ds: Dataset): Filters {
  const sources: Record<string, boolean> = {};
  for (const [k, s] of Object.entries(ds.sources)) if (s.hiddenByDefault) sources[k] = false;
  return { tracks: {}, sources, tags: {} };
}

export function isEventVisible(e: TimelineEvent, f: Filters): boolean {
  const anyTrack = e.tracks.some((t) => isOn(f.tracks, t));
  // events with no sources are not hidden by the source filter
  const anySource = e.sources.length === 0 || e.sources.some((s) => isOn(f.sources, s.sourceKey));
  return anyTrack && anySource;
}

export function useFilters(ds: Dataset) {
  const [filters, setFilters] = useState<Filters>(() => initialFilters(ds));

  const toggleTrack = useCallback(
    (id: string) => setFilters((f) => ({ ...f, tracks: { ...f.tracks, [id]: !isOn(f.tracks, id) } })),
    [],
  );
  const toggleSource = useCallback(
    (key: string) => setFilters((f) => ({ ...f, sources: { ...f.sources, [key]: !isOn(f.sources, key) } })),
    [],
  );
  /** Toggling a tag sets every source carrying it. */
  const toggleTag = useCallback(
    (tag: string) =>
      setFilters((f) => {
        const next = !isOn(f.tags, tag);
        const sources = { ...f.sources };
        for (const [k, s] of Object.entries(ds.sources)) if (s.tags.includes(tag)) sources[k] = next;
        return { ...f, sources, tags: { ...f.tags, [tag]: next } };
      }),
    [ds.sources],
  );
  /** Switches several rows at once (a group's checkbox switches the group and every row below it). */
  const setTracks = useCallback(
    (ids: string[], on: boolean) => setFilters((f) => ({ ...f, tracks: { ...f.tracks, ...Object.fromEntries(ids.map((id) => [id, on])) } })),
    [],
  );
  /** Switches several sources at once (a group of sources in Filters). */
  const setSources = useCallback(
    (keys: string[], on: boolean) => setFilters((f) => ({ ...f, sources: { ...f.sources, ...Object.fromEntries(keys.map((k) => [k, on])) } })),
    [],
  );
  const setAllTracks = useCallback(
    (on: boolean) =>
      setFilters((f) => ({ ...f, tracks: Object.fromEntries(ds.tracks.map((t) => [t.id, on])) })),
    [ds.tracks],
  );

  return { filters, toggleTrack, toggleSource, toggleTag, setAllTracks, setTracks, setSources, isOn };
}
