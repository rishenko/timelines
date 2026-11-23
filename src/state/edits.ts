import type { Dataset, DateClaim, Membership, RowMembership, Source, SourceRef, TimelineEvent, Track, TrackSpan } from '../types.ts';
import { validateDataset } from '../data/validate.ts';
import { spanStretches } from '../lib/lifespan.ts';

/**
 * The problems an edit would add: what `validateDataset` finds in `after` but not in `before`. Forms check this
 * before saving, because a draft that fails validation can't be restored when the page is opened again.
 */
export function newProblems(before: Dataset, after: Dataset): string[] {
  const had = new Set(validateDataset(before));
  return validateDataset(after).filter((p) => !had.has(p));
}

/** Adds or replaces an event (by uuid), marked `edited`. */
export function upsertEvent(d: Dataset, event: TimelineEvent): Dataset {
  const edited = { ...event, edited: true };
  const i = d.events.findIndex((e) => e.uuid === event.uuid);
  return { ...d, events: i === -1 ? [...d.events, edited] : d.events.with(i, edited) };
}

/** Removes an event and every link to it; events that lose a link are marked `edited`. */
export function removeEvent(d: Dataset, uuid: string): Dataset {
  const events = d.events
    .filter((e) => e.uuid !== uuid)
    .map((e) =>
      e.links?.some((l) => l.to === uuid) ? { ...e, links: e.links.filter((l) => l.to !== uuid), edited: true } : e,
    );
  return { ...d, tracks: dropEdgeEvents(d.tracks, new Set([uuid])), events };
}

/** Lifespan stretches, phases and memberships that named a removed event as their start or end no longer name it. */
function dropEdgeEvents(tracks: Track[], removed: ReadonlySet<string>): Track[] {
  const clean = <S extends TrackSpan>(s: S): S => {
    if (!(s.startEvent && removed.has(s.startEvent)) && !(s.endEvent && removed.has(s.endEvent))) return s;
    const out = { ...s };
    if (out.startEvent && removed.has(out.startEvent)) delete out.startEvent;
    if (out.endEvent && removed.has(out.endEvent)) delete out.endEvent;
    return out;
  };
  return tracks.map((t) => {
    if (!t.span && !t.phases && !t.memberOf) return t;
    const span = Array.isArray(t.span) ? t.span.map(clean) : t.span && clean(t.span);
    const phases = t.phases?.map(clean);
    const memberOf = t.memberOf?.map(clean);
    const same =
      (span === t.span || (Array.isArray(span) && span.every((x, i) => x === (t.span as TrackSpan[])[i]))) &&
      (phases ?? []).every((p, i) => p === t.phases![i]) &&
      (memberOf ?? []).every((m, i) => m === t.memberOf![i]);
    return same ? t : { ...t, ...(span ? { span } : {}), ...(phases ? { phases } : {}), ...(memberOf ? { memberOf } : {}) };
  });
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

/**
 * Adds or replaces a track; a rename rewrites event, child and membership references. New top-level tracks go before
 * pinned-last ones.
 */
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
    // ages placed in the renamed row follow it
    if (d.meta.eras?.some((a) => a.tracks?.includes(previousId)))
      d = { ...d, meta: { ...d.meta, eras: d.meta.eras.map((a) => (a.tracks?.includes(previousId) ? { ...a, tracks: a.tracks.map((t) => (t === previousId ? track.id : t)) } : a)) } };
    // memberships in the renamed row follow it
    tracks = tracks.map((t) =>
      t.memberOf?.some((m) => m.row === previousId) ? { ...t, memberOf: t.memberOf.map((m) => (m.row === previousId ? { ...m, row: track.id } : m)) } : t,
    );
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
  /** Ages (by name) placed only in this row: they move to the Ages strip at the top. */
  agesToStrip: string[];
  /** Ages placed in this row and others: they stay in the others. */
  agesShared: string[];
}

export function trackDeletion(d: Dataset, id: string): TrackDeletion {
  const children = d.tracks.filter((t) => t.parent === id);
  const using = d.events.filter((e) => e.tracks.includes(id));
  const orphaned = using.filter((e) => e.tracks.length === 1).length;
  return {
    blocked: children.length
      ? `It has sub-rows (${children.map((c) => c.name).join(', ')}). Delete or move those first.`
      : undefined,
    orphaned,
    shared: using.length - orphaned,
    agesToStrip: (d.meta.eras ?? []).filter((a) => a.tracks?.length === 1 && a.tracks[0] === id).map((a) => a.name),
    agesShared: (d.meta.eras ?? []).filter((a) => (a.tracks?.length ?? 0) > 1 && a.tracks!.includes(id)).map((a) => a.name),
  };
}

/** Removes a track; events left with no track are deleted, links to them are dropped, and so are memberships in it. */
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
  // memberships in the removed row go with it (a row that had only those loses the field)
  const tracks = d.tracks
    .filter((t) => t.id !== id)
    .map((t) => {
      if (!t.memberOf?.some((m) => m.row === id)) return t;
      const memberOf = t.memberOf.filter((m) => m.row !== id);
      const { memberOf: _dropped, ...rest } = t;
      return memberOf.length ? { ...t, memberOf } : rest;
    });
  // ages placed in the removed row lose it (an age left with none spans the whole timeline)
  const meta = d.meta.eras?.some((a) => a.tracks?.includes(id))
    ? {
        ...d.meta,
        eras: d.meta.eras.map((a) => {
          if (!a.tracks?.includes(id)) return a;
          const rest = a.tracks.filter((t) => t !== id);
          const { tracks: _dropped, ...era } = a;
          return rest.length ? { ...a, tracks: rest } : era;
        }),
      }
    : d.meta;
  return { ...d, meta, tracks: dropEdgeEvents(tracks, removed), events };
}

/**
 * Rewrites every citation of source `from`: an event's sources, its date claims, a track's lifespan, phase and
 * membership claims (and the sources saying they are still going, and a membership's sources) and a chronology's source. `to` renames the key; `null` drops the
 * citation. A date claim keeps its year and margin when its source goes (removing the claim could leave the best
 * estimate outside the remaining claims).
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

  // facet memberships (an event's categories, a row's regions) keep their other citations; one left citing nothing
  // is dropped, since a membership must cite a source
  const facetCites = (list: Membership[] | undefined) => !!list?.some((m) => m.sources.some((r) => r.sourceKey === from));
  const refacet = (list: Membership[]): Membership[] =>
    list.flatMap((m) => {
      const sources = m.sources.flatMap((r) => ref(r) ?? []);
      return sources.length ? [{ ...m, sources }] : [];
    });
  const withMemberships = <T extends { memberships?: Membership[] }>(x: T): T => {
    if (!x.memberships) return x;
    const { memberships: _old, ...rest } = x;
    const kept = refacet(x.memberships);
    return (kept.length ? { ...rest, memberships: kept } : rest) as T;
  };
  const events = d.events.map((e) =>
    e.sources.some((s) => s.sourceKey === from) || cites(e.startDates) || cites(e.endDates) || facetCites(e.memberships)
      ? withMemberships({
          ...e,
          sources: e.sources.flatMap((s) => ref(s) ?? []),
          ...(e.startDates ? { startDates: claims(e.startDates) } : {}),
          ...(e.endDates ? { endDates: claims(e.endDates) } : {}),
          edited: true,
        })
      : e,
  );
  const spanCites = (s: TrackSpan | undefined) =>
    !!s && (cites(s.startDates) || cites(s.endDates) || !!s.ongoingSources?.some((r) => r.sourceKey === from));
  const respan = <S extends TrackSpan>(s: S): S => {
    const out: S = {
      ...s,
      ...(s.startDates ? { startDates: claims(s.startDates) } : {}),
      ...(s.endDates ? { endDates: claims(s.endDates) } : {}),
    };
    if (s.ongoingSources) {
      const kept = s.ongoingSources.flatMap((r) => ref(r) ?? []);
      if (kept.length) out.ongoingSources = kept;
      else delete out.ongoingSources;
    }
    return out;
  };
  // a membership keeps its other citations; one left citing nothing is dropped (a membership must cite a source)
  const memberCites = (m: RowMembership) => spanCites(m) || m.sources.some((r) => r.sourceKey === from);
  const remember = (m: RowMembership): RowMembership[] => {
    const sources = m.sources.flatMap((r) => ref(r) ?? []);
    return sources.length ? [{ ...respan(m), sources }] : [];
  };
  const tracks = d.tracks.map((t) => {
    if (!(spanStretches(t.span).some(spanCites) || t.phases?.some(spanCites) || t.memberOf?.some(memberCites) || facetCites(t.memberships))) return t;
    const { memberOf: _old, ...rest } = t;
    const memberOf = t.memberOf?.flatMap(remember);
    return withMemberships({
      ...rest,
      ...(t.span ? { span: Array.isArray(t.span) ? t.span.map(respan) : respan(t.span) } : {}),
      ...(t.phases ? { phases: t.phases.map(respan) } : {}),
      ...(memberOf?.length ? { memberOf } : {}),
    });
  });
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
