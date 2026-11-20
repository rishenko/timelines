import type { Dataset } from '../types.ts';
import { parseUpload, draftKey } from './dataset.ts';
import { uniqueId } from './edits.ts';
export { isSafeUrl, safeUrl } from '../lib/urls.ts';

/**
 * The reader's timeline library: timelines they uploaded or opened from a URL,
 * kept in the browser next to the bundled ones. Each entry is a full dataset;
 * edits to it are a draft on top (same as bundled timelines).
 */

export interface LibraryEntry {
  dataset: Dataset;
  /** Where it was loaded from, if from a URL. Used to refresh it and to build share links. */
  sourceUrl?: string;
  addedAt: string;
  updatedAt: string;
}

export const LIBRARY_KEY = 'timelines:library';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store => globalThis.localStorage;

export function loadLibrary(store: Store = defaultStore()): LibraryEntry[] {
  try {
    const raw = store.getItem(LIBRARY_KEY);
    const list = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
    return Array.isArray(list) ? list.filter((e) => e?.dataset?.meta?.id) : [];
  } catch {
    return [];
  }
}

function saveLibrary(entries: LibraryEntry[], store: Store) {
  try {
    store.setItem(LIBRARY_KEY, JSON.stringify(entries));
  } catch {
    throw new Error("Your browser's storage is full. Remove a timeline from the library and try again.");
  }
}

export interface AddOptions {
  sourceUrl?: string;
  /** Ids that can't be used (the bundled timelines). A clashing timeline is given a new id. */
  reservedIds?: string[];
  store?: Store;
  now?: string;
}

/**
 * Adds a timeline to the library, or replaces the entry it updates. An entry is
 * the same timeline when it has the same id and (for URL timelines) the same URL;
 * a different timeline that happens to share an id gets a fresh one.
 */
export function addToLibrary(ds: Dataset, opts: AddOptions = {}): LibraryEntry {
  const store = opts.store ?? defaultStore();
  const now = opts.now ?? new Date().toISOString();
  const entries = loadLibrary(store);
  const existing = entries.find(
    (e) => e.dataset.meta.id === ds.meta.id && (e.sourceUrl ?? null) === (opts.sourceUrl ?? null),
  );
  const sameUrl = opts.sourceUrl ? entries.find((e) => e.sourceUrl === opts.sourceUrl) : undefined;
  let dataset = ds;
  const target = existing ?? sameUrl;
  if (target) {
    dataset = { ...ds, meta: { ...ds.meta, id: target.dataset.meta.id } };
  } else {
    const taken = [...(opts.reservedIds ?? []), ...entries.map((e) => e.dataset.meta.id)];
    if (taken.includes(ds.meta.id)) dataset = { ...ds, meta: { ...ds.meta, id: uniqueId(ds.meta.id, taken) } };
  }
  const entry: LibraryEntry = {
    dataset,
    ...(opts.sourceUrl ? { sourceUrl: opts.sourceUrl } : {}),
    addedAt: target?.addedAt ?? now,
    updatedAt: now,
  };
  const next = target ? entries.map((e) => (e === target ? entry : e)) : [...entries, entry];
  saveLibrary(next, store);
  return entry;
}

/** Removes a timeline and any draft of it. */
export function removeFromLibrary(id: string, store: Store = defaultStore()) {
  saveLibrary(loadLibrary(store).filter((e) => e.dataset.meta.id !== id), store);
  store.removeItem(draftKey(id));
}

/** Fetches a file from a URL as text. Throws an Error with a readable message. */
export async function fetchText(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!/^https?:\/\//i.test(url)) throw new Error('The link must start with http:// or https://.');
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error(
      "Couldn't reach that address. The server may not allow other sites to read the file (CORS); GitHub raw files and gists do.",
    );
  }
  if (!res.ok) throw new Error(`The server answered ${res.status} ${res.statusText}.`);
  return res.text();
}

/** Checks a timeline file's text. Throws an Error with a readable message. */
export function timelineFromText(text: string): Dataset {
  const { dataset, errors } = parseUpload(text);
  if (!dataset) throw new Error(`That file isn't a valid timeline: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`);
  return dataset;
}

/** Fetches and validates a timeline from a URL. Throws an Error with a readable message. */
export async function fetchTimeline(url: string, fetchImpl: typeof fetch = fetch): Promise<Dataset> {
  return timelineFromText(await fetchText(url, fetchImpl));
}

/** A fetch that gives up after `ms`, for checks that mustn't hold up opening the page. */
export const withTimeout =
  (fetchImpl: typeof fetch, ms: number): typeof fetch =>
  (input, init) =>
    fetchImpl(input, { ...init, signal: AbortSignal.timeout(ms) });

/** Turns a GitHub page link into its raw file link, so people can paste either. */
export function normalizeUrl(url: string): string {
  const u = url.trim();
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(u);
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}` : u;
}
