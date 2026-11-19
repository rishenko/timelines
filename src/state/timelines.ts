import type { Dataset } from '../types.ts';
import { validateDataset } from '../data/validate.ts';
import { INDEX_PATH, parseTimelineIndex, summarize, type TimelineIndexEntry, type TimelineSummary } from '../data/timelineIndex.ts';
import { fetchTimeline, loadLibrary, type LibraryEntry } from './library.ts';

/**
 * The timelines a reader can open: the site's (listed in timelines/index.json, loaded when opened), then their own
 * library in this browser (saved whole, so they open at once).
 */
export interface TimelineChoice {
  summary: TimelineSummary;
  /** The site's index entry, for the site's timelines. */
  entry?: TimelineIndexEntry;
  /** The library entry, for the reader's own timelines. */
  library?: LibraryEntry;
}

/** The site's timelines, then valid library timelines whose ids the site doesn't use. */
export function listTimelines(site: TimelineIndexEntry[]): TimelineChoice[] {
  const siteIds = new Set(site.map((e) => e.id));
  const lib = loadLibrary()
    .filter((e) => !siteIds.has(e.dataset.meta.id) && validateDataset(e.dataset).length === 0)
    .map((e) => ({ summary: summarize(e.dataset), library: e }));
  return [...site.map((entry) => ({ summary: entry, entry })), ...lib];
}

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

/** Loads one of the site's timelines and checks it is the one the index says. Throws a readable Error. */
export async function loadSiteTimeline(entry: TimelineIndexEntry, fetchImpl: typeof fetch = fetch): Promise<Dataset> {
  const url = new URL(entry.file, indexUrl()).href;
  let data: Dataset;
  try {
    data = await fetchTimeline(url, fetchImpl);
  } catch (e) {
    throw new Error(`Couldn't load "${entry.title}". ${(e as Error).message}`);
  }
  if (data.meta.id !== entry.id)
    throw new Error(`${entry.file} holds the timeline "${data.meta.id}", but the site's list calls it "${entry.id}".`);
  return data;
}
