import { useState, type Dispatch } from 'react';
import { draftKey, parseUpload, type DatasetAction } from './dataset.ts';
import { addToLibrary, fetchTimeline, normalizeUrl, removeFromLibrary, type LibraryEntry } from './library.ts';
import { allTimelines, BUNDLED, BUNDLED_IDS } from '../timelines/index.ts';
import { goToTimeline, shareSearch } from './url.ts';
import type { Notify } from './toast.ts';
import type { Dataset } from '../types.ts';

/** Opening, adding, updating, removing and sharing timelines: the Timelines panel, uploads and share links. */
export function useLibraryActions(opts: {
  published: Dataset;
  /** The library entry the open timeline came from, if any. */
  library?: LibraryEntry;
  dispatch: Dispatch<DatasetAction>;
  notify: Notify;
}) {
  const { published, library, dispatch, notify } = opts;
  const currentId = published.meta.id;
  /** Every timeline the picker lists: bundled, then this browser's library. */
  const [timelines, setTimelines] = useState(allTimelines);

  /**
   * Opens a timeline file. The current timeline's own file loads as edits to it; a file for another
   * bundled timeline opens there as its edits; anything else is added to the library and opened.
   * Throws an Error with a readable message.
   */
  const importFile = async (file: File) => {
    const { dataset, errors } = parseUpload(await file.text());
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
    if (BUNDLED_IDS.includes(id)) {
      // a whole file for another bundled timeline: that timeline applies it in full (see restoreDraft)
      localStorage.setItem(draftKey(id), JSON.stringify({ format: 'replace', data: dataset }));
      goToTimeline(id);
      return;
    }
    goToTimeline(addToLibrary(dataset, { reservedIds: BUNDLED_IDS }).dataset.meta.id);
  };

  /** The edit bar's Upload JSON: like importFile, but errors become a toast. */
  const upload = (file: File) => importFile(file).catch((e: Error) => notify(e.message, 'error'));

  const addFromUrl = async (raw: string) => {
    const url = normalizeUrl(raw);
    const dataset = await fetchTimeline(url);
    goToTimeline(addToLibrary(dataset, { sourceUrl: url, reservedIds: BUNDLED_IDS }).dataset.meta.id);
  };

  const refreshEntry = async (entry: LibraryEntry) => {
    const dataset = await fetchTimeline(entry.sourceUrl!);
    const updated = addToLibrary(dataset, { sourceUrl: entry.sourceUrl, reservedIds: BUNDLED_IDS });
    if (updated.dataset.meta.id === currentId) window.location.reload();
    else {
      setTimelines(allTimelines());
      notify(`Updated "${updated.dataset.meta.title}".`);
    }
  };

  const removeEntry = (entry: LibraryEntry) => {
    const d = entry.dataset;
    if (!window.confirm(`Remove "${d.meta.title}" from this browser? Any edits you made to it are deleted too.`)) return;
    removeFromLibrary(d.meta.id);
    if (d.meta.id === currentId) goToTimeline(BUNDLED[0].meta.id);
    else {
      setTimelines(allTimelines());
      notify(`Removed "${d.meta.title}".`);
    }
  };

  const shareBase = (entry?: LibraryEntry) =>
    `${window.location.origin}${window.location.pathname}${shareSearch(currentId, entry)}`;

  const copyShareLink = async (entry: LibraryEntry) => {
    await navigator.clipboard.writeText(shareBase(entry));
    notify('Share link copied.');
  };

  /** Copies a link to one event of the open timeline, with the current view settings. */
  const copyEventLink = async (eventId: string) => {
    // a URL timeline shares as ?data=…, so the link works in any browser; view settings ride along
    const q = new URLSearchParams(window.location.search);
    const extra = ['inc', 'at', 'compress', 'links']
      .filter((k) => q.has(k))
      .map((k) => `&${k}=${encodeURIComponent(q.get(k)!)}`)
      .join('');
    await navigator.clipboard.writeText(`${shareBase(library)}${extra}#${eventId}`);
    notify('Link copied.');
  };

  return { timelines, importFile, upload, addFromUrl, refreshEntry, removeEntry, copyShareLink, copyEventLink };
}
