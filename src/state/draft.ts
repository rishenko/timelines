// Drafts as changes, not copies. A reader's edit-mode draft used to be a full copy of the timeline, which hid
// every later fix to the published data from that reader. Now the draft stores only what the reader changed
// (events, tracks and sources added, edited or removed; the track order; the timeline's settings), and is
// replayed onto whatever the published timeline is today. Where the reader and a later update both changed
// the same item, the reader's version wins; items the reader removed stay removed.
import type { Dataset, Source, TimelineEvent, Track } from '../types.ts';

export interface DraftChanges {
  events: { upsert: TimelineEvent[]; remove: string[] };
  tracks: { upsert: Track[]; remove: string[]; order?: string[] };
  sources: { upsert: Record<string, Source>; remove: string[] };
  /** Top-level fields the reader changed (meta, present, tags, chronologies), stored whole. */
  fields?: Partial<Pick<Dataset, 'meta' | 'present' | 'tags' | 'chronologies'>>;
}

/** What is saved in localStorage. `base` fingerprints the published data the changes were made against. */
export interface StoredDraft {
  format: 'changes';
  base: string;
  changes: DraftChanges;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Fingerprints by dataset object. Datasets are never changed in place (every edit makes a new one), and the
 * published timeline is fingerprinted on every saved edit, so this saves re-serializing it each time.
 */
const fingerprints = new WeakMap<Dataset, string>();

/** A short fingerprint of a dataset (FNV-1a over its JSON), to notice when the published data has changed. */
export function fingerprint(d: Dataset): string {
  let f = fingerprints.get(d);
  if (f === undefined) fingerprints.set(d, (f = computeFingerprint(d)));
  return f;
}

function computeFingerprint(d: Dataset): string {
  const s = JSON.stringify(d);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + ':' + s.length.toString(36);
}

/** The changes that turn `base` into `edited`. */
export function diffDataset(base: Dataset, edited: Dataset): DraftChanges {
  const byKey = <T,>(list: T[], key: (x: T) => string) => new Map(list.map((x) => [key(x), x]));
  const be = byKey(base.events, (e) => e.uuid);
  const ee = byKey(edited.events, (e) => e.uuid);
  const bt = byKey(base.tracks, (t) => t.id);
  const et = byKey(edited.tracks, (t) => t.id);

  const changes: DraftChanges = {
    events: {
      upsert: edited.events.filter((e) => !same(e, be.get(e.uuid))),
      remove: base.events.filter((e) => !ee.has(e.uuid)).map((e) => e.uuid),
    },
    tracks: {
      upsert: edited.tracks.filter((t) => !same(t, bt.get(t.id))),
      remove: base.tracks.filter((t) => !et.has(t.id)).map((t) => t.id),
    },
    sources: {
      upsert: Object.fromEntries(Object.entries(edited.sources).filter(([k, s]) => !same(s, base.sources[k]))),
      remove: Object.keys(base.sources).filter((k) => !(k in edited.sources)),
    },
  };
  // track order matters (it is the row order); keep the reader's order when it differs
  const baseOrder = base.tracks.map((t) => t.id).filter((id) => et.has(id));
  const editedOrder = edited.tracks.map((t) => t.id).filter((id) => bt.has(id));
  if (!same(baseOrder, editedOrder)) changes.tracks.order = edited.tracks.map((t) => t.id);

  const fields: DraftChanges['fields'] = {};
  for (const f of ['meta', 'present', 'tags', 'chronologies'] as const)
    if (!same(base[f], edited[f])) (fields as Record<string, unknown>)[f] = edited[f];
  if (Object.keys(fields).length) changes.fields = fields;
  return changes;
}

export function isEmpty(c: DraftChanges): boolean {
  return (
    !c.events.upsert.length && !c.events.remove.length &&
    !c.tracks.upsert.length && !c.tracks.remove.length && !c.tracks.order &&
    !Object.keys(c.sources.upsert).length && !c.sources.remove.length &&
    !c.fields
  );
}

/** Replays a reader's changes onto (possibly newer) published data. */
export function applyChanges(published: Dataset, c: DraftChanges): Dataset {
  const upsertBy = <T,>(list: T[], add: T[], remove: string[], key: (x: T) => string): T[] => {
    const gone = new Set(remove);
    const repl = new Map(add.map((x) => [key(x), x]));
    const out = list.filter((x) => !gone.has(key(x))).map((x) => repl.get(key(x)) ?? x);
    const have = new Set(out.map(key));
    for (const x of add) if (!have.has(key(x))) out.push(x);
    return out;
  };
  const events = upsertBy(published.events, c.events.upsert, c.events.remove, (e) => e.uuid);
  let tracks = upsertBy(published.tracks, c.tracks.upsert, c.tracks.remove, (t) => t.id);
  if (c.tracks.order) tracks = reorder(tracks, c.tracks.order, published.tracks.map((t) => t.id));

  const sources = { ...published.sources };
  for (const k of c.sources.remove) delete sources[k];
  Object.assign(sources, c.sources.upsert);

  return { ...published, ...c.fields, tracks, sources, events };
}

/**
 * Orders tracks by the reader's order; tracks the reader never saw (added by a later update) go right after
 * the track that precedes them in the published order, or first if none does.
 */
function reorder(tracks: Track[], order: string[], publishedOrder: string[]): Track[] {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const out = order.filter((id) => byId.has(id));
  const placed = new Set(out);
  for (const id of publishedOrder) {
    if (placed.has(id) || !byId.has(id)) continue;
    const prev = publishedOrder.slice(0, publishedOrder.indexOf(id)).reverse().find((p) => placed.has(p));
    out.splice(prev === undefined ? 0 : out.indexOf(prev) + 1, 0, id);
    placed.add(id);
  }
  for (const t of tracks) if (!placed.has(t.id)) out.push(t.id);
  return out.map((id) => byId.get(id)!);
}

/**
 * A draft saved before drafts were stored as changes is a full copy, made against published data we no
 * longer have. Keep what the reader added or edited, but never delete: anything missing from the copy may
 * simply be newer published data. Events the reader touched carry `edited: true`.
 */
export function changesFromLegacyCopy(published: Dataset, copy: Dataset): DraftChanges {
  const full = diffDataset(published, copy);
  const pubIds = new Set(published.events.map((e) => e.uuid));
  return {
    events: { upsert: full.events.upsert.filter((e) => e.edited || !pubIds.has(e.uuid)), remove: [] },
    tracks: { upsert: full.tracks.upsert, remove: [] },
    sources: { upsert: full.sources.upsert, remove: [] },
  };
}
