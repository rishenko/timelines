import { migrate } from '../data/migrate.ts';
import { validateDataset } from '../data/validate.ts';
import type { Dataset } from '../types.ts';
import { summarize, type TimelineSummary } from '../data/timelineIndex.ts';
import { parseUpload, draftKey } from './dataset.ts';
import { uniqueId } from './edits.ts';
export { isSafeUrl, safeUrl } from '../lib/urls.ts';

/**
 * The reader's timeline library: timelines they uploaded or opened from a URL,
 * kept in the browser next to the bundled ones. Each entry is a full dataset;
 * edits to it are a draft on top (same as bundled timelines).
 */

export interface LibraryEntry {
  /** The timeline. Absent on a link-only entry (`linkOnly`): too large to keep, it is fetched from `sourceUrl` again. */
  dataset?: Dataset;
  /**
   * A linked timeline too large for localStorage that IndexedDB couldn't keep either (none in this browser, or full):
   * only its summary is kept, and it opens by fetching its link, as a shared list's timelines do. It needs the network.
   */
  linkOnly?: TimelineSummary;
  /**
   * A timeline too large for localStorage (about 5 MB for the whole library): its summary stays here so the picker can
   * list it, and the timeline itself is in IndexedDB (`BigStore`), under its id. Read it with `loadEntryDataset`.
   */
  big?: TimelineSummary;
  /** Where it was loaded from, if from a URL. Used to refresh it and to build share links. */
  sourceUrl?: string;
  addedAt: string;
  updatedAt: string;
}

export const LIBRARY_KEY = 'timelines:library';

/** The entry's timeline id. */
export const entryId = (e: LibraryEntry): string => (e.dataset?.meta.id ?? e.big?.id ?? e.linkOnly?.id)!;

/** The entry's summary, as the picker shows it. */
export const entrySummary = (e: LibraryEntry): TimelineSummary => (e.dataset ? summarize(e.dataset) : (e.big ?? e.linkOnly)!);

/**
 * Timelines fetched this session whose entries are link-only, by link: opening one right after adding it doesn't
 * fetch it twice. Not saved.
 */
const fetchedThisSession = new Map<string, Dataset>();

/** A link-only entry's timeline if it was fetched this session; undefined otherwise. */
export const sessionCopy = (e: LibraryEntry): Dataset | undefined => (e.sourceUrl ? fetchedThisSession.get(e.sourceUrl) : undefined);

/** Keeps a freshly fetched timeline for this session (see `sessionCopy`). */
export const rememberFetched = (url: string, d: Dataset) => void fetchedThisSession.set(url, d);

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store => globalThis.localStorage;

/** Where timelines too large for localStorage are kept: IndexedDB in the browser, a map in tests. Reads and writes are async. */
export interface BigStore {
  get(id: string): Promise<Dataset | undefined>;
  put(id: string, d: Dataset): Promise<void>;
  delete(id: string): Promise<void>;
}

const DB_NAME = 'timelines-library';
const DB_STORE = 'datasets';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(DB_STORE, mode);
        const req = run(tx.objectStore(DB_STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(tx.error ?? req.error);
        };
      }),
  );
}

/** The browser's IndexedDB as a `BigStore`. */
export const indexedDbStore: BigStore = {
  get: (id) => request<Dataset | undefined>('readonly', (s) => s.get(id)),
  put: (id, d) => request('readwrite', (s) => s.put(d, id)).then(() => undefined),
  delete: (id) => request('readwrite', (s) => s.delete(id)).then(() => undefined),
};

/** The store for large timelines, or undefined where the browser has no IndexedDB (private modes, old browsers, tests). */
const defaultBig = (): BigStore | undefined => (bigOverride !== null ? bigOverride : globalThis.indexedDB ? indexedDbStore : undefined);

let bigOverride: BigStore | undefined | null = null;
/** For tests: stands in for IndexedDB everywhere the default store is used (undefined: none; null: the browser's). */
export const setBigStore = (b: BigStore | undefined | null) => void (bigOverride = b);

/** The entry's timeline: kept in the entry, or read from IndexedDB and validated; undefined for a link-only entry, one the browser lost, or a record that doesn't validate. */
export async function loadEntryDataset(e: LibraryEntry, big: BigStore | undefined = defaultBig()): Promise<Dataset | undefined> {
  if (e.dataset) return e.dataset;
  if (!e.big || !big) return undefined;
  try {
    const d = await big.get(entryId(e));
    if (!d) return undefined;
    // read back like a library entry in localStorage: lifted, then checked (a record from another version, or a damaged one, is not opened)
    const lifted = migrate(d);
    return validateDataset(lifted).length === 0 ? lifted : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Rewrites the summary a large or link-only entry shows in the picker, when the timeline just read has a newer title or
 * description than the summary written when it was added.
 */
export function updateSummary(d: Dataset, store: Store = defaultStore()) {
  const id = d.meta.id;
  const entries = loadLibrary(store);
  const e = entries.find((x) => !x.dataset && entryId(x) === id);
  if (!e) return;
  const now = summarize(d);
  const key = e.big ? 'big' : 'linkOnly';
  if (JSON.stringify(e[key]) === JSON.stringify(now)) return;
  try {
    saveLibrary(entries.map((x) => (x === e ? { ...x, [key]: now } : x)), store);
  } catch {
    // the old summary stays: a stale title is better than none
  }
}

export function loadLibrary(store: Store = defaultStore()): LibraryEntry[] {
  try {
    const raw = store.getItem(LIBRARY_KEY);
    const list = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
    // timelines saved by an older version of the app are lifted to the current one (data/migrate.ts)
    return Array.isArray(list)
      ? list
          .filter((e) => e?.dataset?.meta?.id || e?.big?.id || (e?.linkOnly?.id && e.sourceUrl))
          .map((e) => (e.dataset ? { ...e, dataset: migrate(e.dataset) } : e))
      : [];
  } catch {
    return [];
  }
}

const FULL = "Your browser's storage is full. Remove a timeline from the library and try again.";

function saveLibrary(entries: LibraryEntry[], store: Store) {
  try {
    store.setItem(LIBRARY_KEY, JSON.stringify(entries));
  } catch {
    throw new Error(FULL);
  }
}

export interface AddOptions {
  sourceUrl?: string;
  /** Ids that can't be used (the bundled timelines). A clashing timeline is given a new id. */
  reservedIds?: string[];
  store?: Store;
  /** Where a timeline too large for `store` goes (default: IndexedDB). */
  big?: BigStore;
  now?: string;
}

/**
 * Adds a timeline to the library, or replaces the entry it updates. An entry is
 * the same timeline when it has the same id and (for URL timelines) the same URL;
 * a different timeline that happens to share an id gets a fresh one.
 */
/** An entry with its timeline at hand (what `addToLibrary` returns, link-only or not). */
export type LoadedEntry = LibraryEntry & { dataset: Dataset };

export async function addToLibrary(ds: Dataset, opts: AddOptions = {}): Promise<LoadedEntry> {
  const store = opts.store ?? defaultStore();
  const big = opts.big ?? defaultBig();
  const now = opts.now ?? new Date().toISOString();
  const entries = loadLibrary(store);
  const existing = entries.find((e) => entryId(e) === ds.meta.id && (e.sourceUrl ?? null) === (opts.sourceUrl ?? null));
  const sameUrl = opts.sourceUrl ? entries.find((e) => e.sourceUrl === opts.sourceUrl) : undefined;
  let dataset = ds;
  const target = existing ?? sameUrl;
  if (target) {
    dataset = { ...ds, meta: { ...ds.meta, id: entryId(target) } };
  } else {
    const taken = [...(opts.reservedIds ?? []), ...entries.map(entryId)];
    if (taken.includes(ds.meta.id)) dataset = { ...ds, meta: { ...ds.meta, id: uniqueId(ds.meta.id, taken) } };
  }
  const entry: LoadedEntry = {
    dataset,
    ...(opts.sourceUrl ? { sourceUrl: opts.sourceUrl } : {}),
    addedAt: target?.addedAt ?? now,
    updatedAt: now,
  };
  const place = (x: LibraryEntry) => (target ? entries.map((e) => (e === target ? x : e)) : [...entries, x]);
  try {
    saveLibrary(place(entry), store);
    // it fits again: a copy kept in IndexedDB for an earlier, larger version is no longer needed
    if (target?.big) await big?.delete(entryId(target)).catch(() => {});
    return entry;
  } catch (e) {
    const { dataset: _full, ...rest } = entry;
    // too large for localStorage: the timeline goes to IndexedDB, and only its summary stays in the list
    if (big) {
      try {
        await big.put(dataset.meta.id, dataset);
        const stored: LibraryEntry = { ...rest, big: summarize(dataset) };
        saveLibrary(place(stored), store);
        return { ...stored, dataset };
      } catch {
        await big.delete(dataset.meta.id).catch(() => {});
      }
    }
    // no IndexedDB (or it is full too): a linked timeline is kept as its link and summary, and fetched again when opened
    if (!opts.sourceUrl) throw e;
    const linkOnly: LibraryEntry = { ...rest, linkOnly: summarize(dataset) };
    saveLibrary(place(linkOnly), store);
    rememberFetched(opts.sourceUrl, dataset);
    return { ...linkOnly, dataset };
  }
}

/** Removes a timeline and any draft of it. */
export async function removeFromLibrary(id: string, store: Store = defaultStore(), big: BigStore | undefined = defaultBig()) {
  const gone = loadLibrary(store).find((e) => entryId(e) === id);
  saveLibrary(loadLibrary(store).filter((e) => entryId(e) !== id), store);
  store.removeItem(draftKey(id));
  if (gone?.big) await big?.delete(id).catch(() => {});
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
