import type { Dataset, Source, Track } from '../types.ts';

/** Tags applied by default to sources created in the editor (the timeline's custom tag, if it has one). */
export function customTags(d: Dataset): string[] {
  return d.meta.customSourceTag ? [d.meta.customSourceTag] : [];
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A slug of `base` that doesn't collide with `taken` (appends -2, -3, ...). */
export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slug(base) || 'item';
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) if (!used.has(`${root}-${n}`)) return `${root}-${n}`;
}

const PALETTE = ['#e0583a', '#4cc38a', '#5b8def', '#d6409f', '#f5a524', '#12a594', '#a07cf0', '#e5484d', '#8db600'];

/** A palette color no track uses yet (falls back to cycling). */
export function nextTrackColor(tracks: Track[]): string {
  const used = new Set(tracks.map((t) => t.color.toLowerCase()));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[tracks.length % PALETTE.length];
}

/** Adds or replaces a track; a rename rewrites event and child references. New top-level tracks go before pinned-last ones. */
export function upsertTrack(d: Dataset, track: Track, previousId?: string): Dataset {
  const id = previousId ?? track.id;
  const i = d.tracks.findIndex((t) => t.id === id);
  let tracks: Track[];
  if (i !== -1) tracks = d.tracks.with(i, track);
  else {
    const pinned = d.tracks.findIndex((t) => t.pinLast && !t.parent);
    tracks = [...d.tracks];
    if (!track.parent && !track.pinLast && pinned !== -1) tracks.splice(pinned, 0, track);
    else tracks.push(track);
  }
  let events = d.events;
  if (previousId && previousId !== track.id) {
    events = events.map((e) =>
      e.tracks.includes(previousId) ? { ...e, tracks: e.tracks.map((t) => (t === previousId ? track.id : t)) } : e,
    );
    tracks = tracks.map((t) => (t.parent === previousId ? { ...t, parent: track.id } : t));
  }
  return { ...d, tracks, events };
}

/** 0 for top-level tracks, 1 for their children, and so on (rows nest to any depth). */
export function trackDepth(tracks: Track[], id: string): number {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  let depth = 0;
  // the bound only guards against a parent cycle in unvalidated data
  for (let p = byId.get(id)?.parent; p !== undefined && depth < tracks.length; p = byId.get(p)?.parent) depth++;
  return depth;
}

export function isDescendant(tracks: Track[], id: string, ancestor: string): boolean {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  for (let p = byId.get(id)?.parent, n = 0; p !== undefined && n < tracks.length; p = byId.get(p)?.parent, n++) if (p === ancestor) return true;
  return false;
}

/** Swaps a track with its previous/next sibling (same parent). */
export function moveTrack(d: Dataset, id: string, dir: -1 | 1): Dataset {
  const i = d.tracks.findIndex((t) => t.id === id);
  if (i === -1) return d;
  const parent = d.tracks[i].parent;
  let j = i + dir;
  while (j >= 0 && j < d.tracks.length && d.tracks[j].parent !== parent) j += dir;
  if (j < 0 || j >= d.tracks.length) return d;
  const tracks = [...d.tracks];
  [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  return { ...d, tracks };
}

export interface TrackDeletion {
  /** Why the track can't be deleted, if it can't. */
  blocked?: string;
  /** Events that belong only to this track and would be deleted with it. */
  orphaned: number;
  /** Events that also belong to other tracks; they just lose this one. */
  shared: number;
}

export function trackDeletion(d: Dataset, id: string): TrackDeletion {
  const children = d.tracks.filter((t) => t.parent === id);
  const using = d.events.filter((e) => e.tracks.includes(id));
  const orphaned = using.filter((e) => e.tracks.length === 1).length;
  return {
    blocked: children.length
      ? `It has sub-tracks (${children.map((c) => c.name).join(', ')}). Delete or move those first.`
      : undefined,
    orphaned,
    shared: using.length - orphaned,
  };
}

/** Removes a track; events left with no track are deleted, and links to them are dropped. */
export function removeTrack(d: Dataset, id: string): Dataset {
  if (trackDeletion(d, id).blocked) return d;
  const removed = new Set<string>();
  let events = d.events.flatMap((e) => {
    if (!e.tracks.includes(id)) return [e];
    const tracks = e.tracks.filter((t) => t !== id);
    if (tracks.length === 0) {
      removed.add(e.uuid);
      return [];
    }
    return [{ ...e, tracks, edited: true }];
  });
  if (removed.size)
    events = events.map((e) =>
      e.links?.some((l) => removed.has(l.to)) ? { ...e, links: e.links.filter((l) => !removed.has(l.to)) } : e,
    );
  return { ...d, tracks: d.tracks.filter((t) => t.id !== id), events };
}

/** Adds or replaces a source; a key change rewrites event references. Unknown tags are created. */
export function upsertSource(d: Dataset, key: string, source: Source, previousKey?: string): Dataset {
  const sources: Record<string, Source> = {};
  let placed = false;
  for (const [k, s] of Object.entries(d.sources)) {
    if (k === (previousKey ?? key)) {
      sources[key] = source;
      placed = true;
    } else sources[k] = s;
  }
  if (!placed) sources[key] = source;
  const tags = { ...d.tags };
  for (const a of source.tags) if (!tags[a]) tags[a] = { name: titleCase(a) };
  const events =
    previousKey && previousKey !== key
      ? d.events.map((e) =>
          e.sources.some((s) => s.sourceKey === previousKey)
            ? { ...e, sources: e.sources.map((s) => (s.sourceKey === previousKey ? { ...s, sourceKey: key } : s)) }
            : e,
        )
      : d.events;
  return { ...d, sources, tags, events };
}

export function sourceUsage(d: Dataset, key: string): number {
  return d.events.filter((e) => e.sources.some((s) => s.sourceKey === key)).length;
}

/** Removes a source and every citation of it. */
export function removeSource(d: Dataset, key: string): Dataset {
  const { [key]: _removed, ...sources } = d.sources;
  const events = d.events.map((e) =>
    e.sources.some((s) => s.sourceKey === key)
      ? { ...e, sources: e.sources.filter((s) => s.sourceKey !== key), edited: true }
      : e,
  );
  return { ...d, sources, events };
}
