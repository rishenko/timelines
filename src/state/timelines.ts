import type { Dataset } from '../types.ts';
import { validateDataset } from '../data/validate.ts';
import {
  INDEX_PATH,
  isTimelineIndex,
  parseTimelineIndex,
  type TimelineIndexEntry,
  type TimelineSummary,
} from '../data/timelineIndex.ts';
import { addToLibrary, entryId, entrySummary, fetchText, fetchTimeline, loadLibrary, normalizeUrl, timelineFromText, type LibraryEntry } from './library.ts';
import { loadCollections, parseCollection, removeCollection, saveCollection, type Collection } from './collections.ts';

/**
 * The timelines a reader can open: the site's (listed in timelines/index.json, loaded when opened), then those of
 * shared lists the reader added (also loaded when opened), then their own library in this browser (saved whole, so
 * they open at once).
 */
export interface TimelineChoice {
  summary: TimelineSummary;
  /** The index entry, for the site's timelines and those of shared lists (`file` is then a full address). */
  entry?: TimelineIndexEntry;
  /** The shared list it comes from. */
  collection?: Collection;
  /** The library entry, for the reader's own timelines. */
  library?: LibraryEntry;
}

/**
 * The site's timelines, then the shared lists' timelines, then valid library timelines. Ids are unique: the site's
 * timelines come first, then the reader's own (so adding a list never hides one of them), then the lists in the
 * order they were added; a list's timeline whose id is taken is left out.
 */
export function listTimelines(site: TimelineIndexEntry[]): TimelineChoice[] {
  const taken = new Set(site.map((e) => e.id));
  const lib = loadLibrary()
    // a link-only entry (too large to keep) is checked when it is fetched, as a shared list's timelines are
    .filter((e) => !taken.has(entryId(e)) && (!e.dataset || validateDataset(e.dataset).length === 0))
    .map((e) => ({ summary: entrySummary(e), library: e }));
  for (const t of lib) taken.add(t.summary.id);
  const shared = loadCollections().flatMap((collection) =>
    collection.entries.flatMap((entry) => {
      if (taken.has(entry.id)) return [];
      taken.add(entry.id);
      return [{ summary: entry, entry, collection }];
    }),
  );
  return [...site.map((entry) => ({ summary: entry, entry })), ...shared, ...lib];
}

/** Ids a new library timeline can't take: the site's and the shared lists'. */
export const reservedIds = (site: TimelineIndexEntry[]) => [
  ...site.map((e) => e.id),
  ...loadCollections().flatMap((c) => c.entries.map((e) => e.id)),
];

/** The timeline with this id, else the first one; undefined when there are none at all. */
export function findTimeline(choices: TimelineChoice[], id: string | null | undefined): TimelineChoice | undefined {
  return choices.find((t) => t.summary.id === id) ?? choices[0];
}

/** The index's address, resolved against the page (the site may be served from a sub-folder). */
export const indexUrl = () => new URL(INDEX_PATH, document.baseURI).href;

/**
 * Reads the site's index. A missing index (404) means the site has no timelines of its own; other failures throw a
 * readable Error. Problems with single entries are logged and those entries skipped.
 */
export async function fetchIndex(fetchImpl: typeof fetch = fetch): Promise<TimelineIndexEntry[]> {
  let res: Response;
  try {
    res = await fetchImpl(indexUrl(), { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error("Couldn't reach this site's list of timelines. Check your connection and reload the page.");
  }
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`This site's list of timelines couldn't be read: the server answered ${res.status}.`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("This site's list of timelines (timelines/index.json) isn't valid JSON.");
  }
  const { entries, errors } = parseTimelineIndex(json);
  if (errors.length) console.warn('timelines/index.json:', errors);
  return entries;
}

/** Loads one of the site's (or a shared list's) timelines and checks it is the one the list says. Throws a readable Error. */
export async function loadSiteTimeline(entry: TimelineIndexEntry, fetchImpl: typeof fetch = fetch): Promise<Dataset> {
  const url = new URL(entry.file, indexUrl()).href;
  let data: Dataset;
  try {
    data = await fetchTimeline(url, fetchImpl);
  } catch (e) {
    throw new Error(`Couldn't load "${entry.title}". ${(e as Error).message}`);
  }
  if (data.meta.id !== entry.id)
    throw new Error(`${entry.file} holds the timeline "${data.meta.id}", but its list calls it "${entry.id}".`);
  return data;
}

/**
 * Adds what a link points to: a timeline (saved in the library) or a list of timelines (saved as a shared list).
 * Returns the id to open: the timeline, or the list's first. Throws a readable Error.
 */
export async function addFromLink(raw: string, site: TimelineIndexEntry[], fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = normalizeUrl(raw);
  const text = await fetchText(url, fetchImpl);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined; // timelineFromText says what is wrong
  }
  if (!isTimelineIndex(json))
    return addToLibrary(timelineFromText(text), { sourceUrl: url, reservedIds: reservedIds(site) }).dataset.meta.id;
  const known = loadCollections().some((c) => c.url === url);
  saveCollection(parseCollection(json, url));
  const first = listTimelines(site).find((t) => t.collection?.url === url);
  if (!first) {
    if (!known) removeCollection(url, listTimelines(site).map((t) => t.summary.id));
    throw new Error("Every timeline in that list is already here (their ids are taken), so the list wasn't added.");
  }
  return first.summary.id;
}
