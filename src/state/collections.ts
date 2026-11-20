import { isSafeUrl } from '../lib/urls.ts';
import { parseTimelineIndex, type TimelineIndexEntry } from '../data/timelineIndex.ts';
import { draftKey } from './dataset.ts';
import { fetchText } from './library.ts';

/**
 * Shared lists: a list of timelines in the site index's format (`{ "title": …, "timelines": [ … ] }`), hosted
 * anywhere. `?collection=<link>` (or pasting the link in Customize → Timelines) saves the list in this browser, so
 * its timelines join the picker. Only the list is saved: each timeline loads from its link when it is opened, like
 * the site's own, so readers always see the latest version.
 */
export interface Collection {
  /** Where the list was loaded from; also its identity. */
  url: string;
  title?: string;
  /** The list's entries, with `file` turned into a full address. */
  entries: TimelineIndexEntry[];
  addedAt: string;
  updatedAt: string;
}

export const COLLECTIONS_KEY = 'timelines:collections';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store => globalThis.localStorage;

export function loadCollections(store: Store = defaultStore()): Collection[] {
  try {
    const raw = store.getItem(COLLECTIONS_KEY);
    const list = raw ? (JSON.parse(raw) as Collection[]) : [];
    return Array.isArray(list) ? list.filter((c) => typeof c?.url === 'string' && Array.isArray(c.entries)) : [];
  } catch {
    return [];
  }
}

function saveCollections(list: Collection[], store: Store) {
  try {
    store.setItem(COLLECTIONS_KEY, JSON.stringify(list));
  } catch {
    throw new Error("Your browser's storage is full. Remove a timeline or list and try again.");
  }
}

/** A list's name for people: its title, else the site it is on. */
export const collectionName = (c: Pick<Collection, 'url' | 'title'>) => c.title ?? new URL(c.url).host;

/**
 * Reads a list's JSON: entries without a usable id, title or file are left out (as for the site's index), and each
 * file is resolved against the list's own address. Throws a readable Error when nothing usable is left.
 */
export function parseCollection(json: unknown, url: string): Pick<Collection, 'url' | 'title' | 'entries'> {
  const { entries, errors, title } = parseTimelineIndex(json);
  if (errors.length) console.warn(`${url}:`, errors);
  const resolved = entries.flatMap((e) => {
    const file = new URL(e.file, url).href;
    return isSafeUrl(file) ? [{ ...e, file }] : [];
  });
  if (!resolved.length) throw new Error(`That list has no timelines that can be opened${errors.length ? `: ${errors[0]}` : '.'}`);
  return { url, ...(title ? { title } : {}), entries: resolved };
}

/** Fetches and reads a list. Throws a readable Error. */
export async function fetchCollection(url: string, fetchImpl: typeof fetch = fetch) {
  const text = await fetchText(url, fetchImpl);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  return parseCollection(json, url);
}

/** Saves a list, or replaces the saved copy from the same address. */
export function saveCollection(
  c: Pick<Collection, 'url' | 'title' | 'entries'>,
  opts: { store?: Store; now?: string } = {},
): Collection {
  const store = opts.store ?? defaultStore();
  const now = opts.now ?? new Date().toISOString();
  const list = loadCollections(store);
  const old = list.find((x) => x.url === c.url);
  const saved: Collection = { ...c, addedAt: old?.addedAt ?? now, updatedAt: now };
  saveCollections(old ? list.map((x) => (x === old ? saved : x)) : [...list, saved], store);
  return saved;
}

/** Forgets a list, and the reader's edits to its timelines (except ids another place still lists). */
export function removeCollection(url: string, keepIds: string[] = [], store: Store = defaultStore()) {
  const list = loadCollections(store);
  const gone = list.find((c) => c.url === url);
  if (!gone) return;
  const rest = list.filter((c) => c !== gone);
  saveCollections(rest, store);
  const stillListed = new Set([...keepIds, ...rest.flatMap((c) => c.entries.map((e) => e.id))]);
  for (const e of gone.entries) if (!stillListed.has(e.id)) store.removeItem(draftKey(e.id));
}
