import { useState, type Dispatch } from 'react';
import { draftKey, parseUpload, type DatasetAction } from './dataset.ts';
import { addToLibrary, fetchTimeline, removeFromLibrary, type LibraryEntry } from './library.ts';
import {
  collectionName,
  fetchCollection,
  loadCollections,
  removeCollection,
  saveCollection,
  type Collection,
} from './collections.ts';
import { addFromLink, listTimelines, reservedIds } from './timelines.ts';
import { goHome, goToTimeline, shareSearch } from './url.ts';
import type { TimelineIndexEntry } from '../data/timelineIndex.ts';
import type { Notify } from './toast.ts';
import type { Dataset } from '../types.ts';

/** Opening, adding, updating, removing and sharing timelines: the Timelines panel, uploads and share links. */
export function useLibraryActions(opts: {
  published: Dataset;
  /** The library entry the open timeline came from, if any. */
  library?: LibraryEntry;
  /** The site's timelines (timelines/index.json). */
  site: TimelineIndexEntry[];
  dispatch: Dispatch<DatasetAction>;
  notify: Notify;
}) {
  const { published, library, site, dispatch, notify } = opts;
  const currentId = published.meta.id;
  /** Every timeline the picker lists: the site's, then shared lists', then this browser's library. */
  const [timelines, setTimelines] = useState(() => listTimelines(site));
  /** The shared lists added in this browser. */
  const [collections, setCollections] = useState(loadCollections);
  const reload = () => {
    setTimelines(listTimelines(site));
    setCollections(loadCollections());
  };
  /** The shared list the open timeline comes from, if any. */
  const collection = timelines.find((t) => t.summary.id === currentId)?.collection;

  /**
   * Opens a timeline file. The current timeline's own file loads as edits to it; a file for another
   * of the site's (or a shared list's) timelines opens there as its edits; anything else is added to the library and
   * opened.
   * Throws an Error with a readable message.
   */
  const importFile = async (file: File) => {
    const { dataset, errors, notice } = parseUpload(await file.text());
    if (notice) notify(notice);
    if (!dataset) {
      console.error(errors);
      throw new Error(
        `Couldn't load ${file.name}: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more; see console)` : ''}`,
      );
    }
    const id = dataset.meta.id;
    if (id === currentId) {
      dispatch({ type: 'load', dataset });
      notify(`Loaded ${file.name}.`);
      return;
    }
    if (timelines.some((t) => t.entry && t.summary.id === id)) {
      // a whole file for another of the site's timelines: that timeline applies it in full (see restoreDraft)
      localStorage.setItem(draftKey(id), JSON.stringify({ format: 'replace', data: dataset }));
      goToTimeline(id);
      return;
    }
    goToTimeline(addToLibrary(dataset, { reservedIds: reservedIds(site) }).dataset.meta.id);
  };

  /** The edit bar's Upload JSON: like importFile, but errors become a toast. */
  const upload = (file: File) => importFile(file).catch((e: Error) => notify(e.message, 'error'));

  /** A link to a timeline or to a list of them. */
  const addFromUrl = async (raw: string) => goToTimeline(await addFromLink(raw, site));

  const refreshEntry = async (entry: LibraryEntry) => {
    const dataset = await fetchTimeline(entry.sourceUrl!);
    const updated = addToLibrary(dataset, { sourceUrl: entry.sourceUrl, reservedIds: reservedIds(site) });
    if (updated.dataset.meta.id === currentId) window.location.reload();
    else {
      reload();
      notify(`Updated "${updated.dataset.meta.title}".`);
    }
  };

  const removeEntry = (entry: LibraryEntry) => {
    const d = entry.dataset;
    if (!window.confirm(`Remove "${d.meta.title}" from this browser? Any edits you made to it are deleted too.`)) return;
    removeFromLibrary(d.meta.id);
    if (d.meta.id === currentId) goHome();
    else {
      reload();
      notify(`Removed "${d.meta.title}".`);
    }
  };

  const refreshCollection = async (c: Collection) => {
    const saved = saveCollection(await fetchCollection(c.url));
    const next = listTimelines(site);
    // the open timeline left the list: open the site's default
    if (collection?.url === c.url && !next.some((t) => t.summary.id === currentId)) return goHome();
    reload();
    notify(`Updated the list "${collectionName(saved)}".`);
  };

  const removeList = (c: Collection) => {
    const name = collectionName(c);
    if (!window.confirm(`Remove the list "${name}" from this browser? Any edits you made to its timelines are deleted too.`))
      return;
    const others = timelines.filter((t) => t.collection?.url !== c.url).map((t) => t.summary.id);
    removeCollection(c.url, others);
    if (collection?.url === c.url) goHome();
    else {
      reload();
      notify(`Removed the list "${name}".`);
    }
  };

  const listLink = (c: Collection, id?: string) =>
    `${window.location.origin}${window.location.pathname}?collection=${encodeURIComponent(c.url)}${id ? `&timeline=${encodeURIComponent(id)}` : ''}`;

  const copyListLink = async (c: Collection) => {
    await navigator.clipboard.writeText(listLink(c));
    notify('Link to the list copied.');
  };

  // a shared list's timeline shares as ?collection=…&timeline=…, so the link works in any browser
  const shareBase = (entry?: LibraryEntry) =>
    collection
      ? listLink(collection, currentId)
      : `${window.location.origin}${window.location.pathname}${shareSearch(currentId, entry)}`;

  const copyShareLink = async (entry: LibraryEntry) => {
    await navigator.clipboard.writeText(shareBase(entry));
    notify('Share link copied.');
  };

  /** A link to one event of the open timeline, with the current view settings (also what "Cite this" cites). */
  const eventLink = (eventId: string) => {
    // a URL timeline shares as ?data=…, so the link works in any browser; view settings ride along
    const q = new URLSearchParams(window.location.search);
    const extra = ['inc', 'at', 'compress']
      .filter((k) => q.has(k))
      .map((k) => `&${k}=${encodeURIComponent(q.get(k)!)}`)
      .join('');
    return `${shareBase(library)}${extra}#${eventId}`;
  };
  /** The open timeline's own link (what "Cite this timeline" cites). */
  const timelineLink = () => shareBase(library);

  /** Copies a link to one event of the open timeline, with the current view settings. */
  const copyEventLink = async (eventId: string) => {
    await navigator.clipboard.writeText(eventLink(eventId));
    notify('Link copied.');
  };

  return {
    timelines,
    collections,
    importFile,
    upload,
    addFromUrl,
    refreshEntry,
    removeEntry,
    copyShareLink,
    copyEventLink,
    eventLink,
    timelineLink,
    refreshCollection,
    removeList,
    copyListLink,
  };
}
