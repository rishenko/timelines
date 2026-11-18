import type { Dataset, DateClaim, Source, SourceRef, TimelineEvent, Track } from '../types.ts';
import { validateDataset } from '../data/validate.ts';

/**
 * The problems an edit would add: what `validateDataset` finds in `after` but not in `before`. Forms check this
 * before saving, because a draft that fails validation can't be restored when the page is opened again.
 */
export function newProblems(before: Dataset, after: Dataset): string[] {
  const had = new Set(validateDataset(before));
  return validateDataset(after).filter((p) => !had.has(p));
}

/** Adds or replaces an event (by uuid). */
export function upsertEvent(d: Dataset, event: TimelineEvent): Dataset {
  const i = d.events.findIndex((e) => e.uuid === event.uuid);
  return { ...d, events: i === -1 ? [...d.events, event] : d.events.with(i, event) };
}

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

/**
 * Rewrites every citation of source `from`: an event's sources, its date claims, a track's lifespan claims and a
 * chronology's source. `to` renames the key; `null` drops the citation. A date claim keeps its year and margin
 * when its source goes (removing the claim could leave the best estimate outside the remaining claims).
 * Events whose citations change are marked `edited`.
 */
function recite(d: Dataset, from: string, to: string | null): Pick<Dataset, 'events' | 'tracks' | 'chronologies'> {
  const ref = (r: SourceRef): SourceRef | null => (r.sourceKey !== from ? r : to === null ? null : { ...r, sourceKey: to });
  const claim = (c: DateClaim): DateClaim => {
    if (c.source?.sourceKey !== from) return c;
    const source = ref(c.source);
    if (source) return { ...c, source };
    const { source: _dropped, ...rest } = c;
    return rest;
  };
  const claims = (list: DateClaim[] | undefined) => list?.map(claim);
  const cites = (list: DateClaim[] | undefined) => !!list?.some((c) => c.source?.sourceKey === from);

  const events = d.events.map((e) =>
    e.sources.some((s) => s.sourceKey === from) || cites(e.startDates) || cites(e.endDates)
      ? {
          ...e,
          sources: e.sources.flatMap((s) => ref(s) ?? []),
          ...(e.startDates ? { startDates: claims(e.startDates) } : {}),
          ...(e.endDates ? { endDates: claims(e.endDates) } : {}),
          edited: true,
        }
      : e,
  );
  const tracks = d.tracks.map((t) =>
    t.span && (cites(t.span.startDates) || cites(t.span.endDates))
      ? {
          ...t,
          span: {
            ...t.span,
            ...(t.span.startDates ? { startDates: claims(t.span.startDates) } : {}),
            ...(t.span.endDates ? { endDates: claims(t.span.endDates) } : {}),
          },
        }
      : t,
  );
  const chronologies = d.chronologies
    ? Object.fromEntries(
        Object.entries(d.chronologies).map(([id, c]) => {
          if (c.source?.sourceKey !== from) return [id, c];
          const source = ref(c.source);
          if (source) return [id, { ...c, source }];
          const { source: _dropped, ...rest } = c;
          return [id, rest];
        }),
      )
    : undefined;
  return { events, tracks, ...(chronologies ? { chronologies } : {}) };
}

/** Adds or replaces a source; a key change rewrites every citation of it. Unknown tags are created. */
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
  const renamed = previousKey && previousKey !== key ? recite(d, previousKey, key) : {};
  return { ...d, ...renamed, sources, tags };
}

/** How many events cite a source, in their sources or their date claims. */
export function sourceUsage(d: Dataset, key: string): number {
  const cites = (list: DateClaim[] | undefined) => !!list?.some((c) => c.source?.sourceKey === key);
  return d.events.filter((e) => e.sources.some((s) => s.sourceKey === key) || cites(e.startDates) || cites(e.endDates))
    .length;
}

/** Removes a source and every citation of it; date claims that cited it keep their values. */
export function removeSource(d: Dataset, key: string): Dataset {
  const { [key]: _removed, ...sources } = d.sources;
  return { ...d, ...recite(d, key, null), sources };
}
