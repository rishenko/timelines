import { migrate, minorNeeded, newerMinor } from '../data/migrate.ts';
import { useEffect, useReducer, useState } from 'react';
import type { Dataset, Source, TimelineEvent, Track } from '../types.ts';
import * as edits from './edits.ts';
import { validateDataset } from '../data/validate.ts';
import { applyChanges, changesFromLegacyCopy, diffDataset, fingerprint, isEmpty, type DraftChanges, type StoredDraft } from './draft.ts';

export const draftKey = (timelineId: string) => `timelines:${timelineId}:draft`;

export type DatasetAction =
  | { type: 'load'; dataset: Dataset }
  | { type: 'upsertEvent'; event: TimelineEvent }
  | { type: 'removeEvent'; uuid: string }
  | { type: 'upsertTrack'; track: Track; previousId?: string }
  | { type: 'moveTrack'; id: string; dir: -1 | 1 }
  | { type: 'removeTrack'; id: string }
  | { type: 'upsertSource'; key: string; source: Source; previousKey?: string }
  | { type: 'removeSource'; key: string }
  | { type: 'reset' };

export interface DatasetState {
  /** The bundled timeline this state belongs to; `reset` returns to it. */
  published: Dataset;
  data: Dataset;
  /** True when the data differs from the published file (edits or an upload). */
  dirty: boolean;
  /** True when a saved draft was replayed onto published data that changed after the draft was made. */
  updatedUnderDraft?: boolean;
  /** True when a saved draft couldn't be applied; it was kept under `unreadableDraftKey`. */
  unreadableDraft?: boolean;
}

export function datasetReducer(state: DatasetState, action: DatasetAction): DatasetState {
  const set = (data: Dataset): DatasetState => ({ ...state, data, dirty: true });
  switch (action.type) {
    case 'load':
      return set(action.dataset);
    case 'reset':
      return { ...state, data: state.published, dirty: false };
    case 'upsertEvent':
      return set(edits.upsertEvent(state.data, action.event));
    case 'removeEvent':
      return set(edits.removeEvent(state.data, action.uuid));
    case 'upsertTrack':
      return set(edits.upsertTrack(state.data, action.track, action.previousId));
    case 'moveTrack':
      return set(edits.moveTrack(state.data, action.id, action.dir));
    case 'removeTrack':
      return set(edits.removeTrack(state.data, action.id));
    case 'upsertSource':
      return set(edits.upsertSource(state.data, action.key, action.source, action.previousKey));
    case 'removeSource':
      return set(edits.removeSource(state.data, action.key));
  }
}

/**
 * Stores a whole file uploaded for another of the site's timelines as that timeline's draft (format `replace`). A file past the
 * browser's storage limit (about 5 MB for the whole site; Modern States alone is 9 MB) can't be kept: throws an Error that says so,
 * instead of the browser's raw quota error, and leaves any draft already stored as it was.
 */
export function saveReplaceDraft(id: string, dataset: Dataset, title: string, store: Pick<Storage, 'setItem'> = localStorage) {
  try {
    store.setItem(draftKey(id), JSON.stringify({ format: 'replace', data: dataset }));
  } catch {
    throw new Error(
      `This file is too large to keep in this browser as a replacement for "${title}" (about 5 MB is available for the whole site). ` +
        `Nothing was changed. Remove timelines or edits you no longer need and try again, or add the file as a timeline of its own from a link.`,
    );
  }
}

/**
 * Turns whatever is stored for a timeline into the reader's dataset. Three stored forms:
 * - `{ format: 'changes' }` (current): the reader's changes, replayed onto today's published data;
 * - `{ format: 'replace', data }`: a whole file uploaded for this timeline from another one (see useLibraryActions), applied in
 *   full against today's published data, deletions included;
 * - a bare dataset: a draft saved before drafts were stored as changes; converted conservatively (see
 *   `changesFromLegacyCopy`).
 * `updated` is true when the published data has changed since the reader's changes were made.
 */
export function restoreDraft(published: Dataset, stored: unknown): { data: Dataset; updated: boolean } | null {
  if (!stored || typeof stored !== 'object') return null;
  const s = stored as { format?: string; base?: string; changes?: DraftChanges; data?: unknown };
  let changes: DraftChanges;
  let updated: boolean;
  if (s.format === 'changes' && s.changes) {
    changes = s.changes;
    updated = s.base !== fingerprint(published);
  } else if (s.format === 'replace' && s.data && validateDataset(s.data).length === 0) {
    changes = diffDataset(published, s.data as Dataset);
    updated = false;
  } else if (validateDataset(stored).length === 0) {
    changes = changesFromLegacyCopy(published, stored as Dataset);
    updated = true;
  } else return null;
  if (isEmpty(changes)) return null;
  const data = applyChanges(published, changes);
  return validateDataset(data).length === 0 ? { data, updated } : null;
}

/** Where a draft that can't be restored is kept, so opening the timeline never deletes a reader's edits. */
export const unreadableDraftKey = (timelineId: string) => `timelines:${timelineId}:draft-unreadable`;

export function loadInitial(published: Dataset): DatasetState {
  const key = draftKey(published.meta.id);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    const restored = raw ? restoreDraft(published, JSON.parse(raw)) : null;
    if (restored) return { published, data: restored.data, dirty: true, updatedUnderDraft: restored.updated };
  } catch {
    // unreadable JSON: kept below
  }
  // A stored draft that doesn't apply (it would make the timeline invalid, or isn't readable) would be cleared by
  // the save effect below; keep a copy first. A draft with no changes left is simply dropped.
  let unreadableDraft = false;
  if (raw) {
    let empty = false;
    try {
      const s = JSON.parse(raw);
      empty = s?.format === 'changes' && isEmpty(s.changes);
    } catch {
      // not JSON: keep it
    }
    if (!empty) {
      try {
        localStorage.setItem(unreadableDraftKey(published.meta.id), raw);
        unreadableDraft = true;
      } catch {
        // storage full or disabled: nothing more we can do
      }
    }
  }
  return { published, data: published, dirty: false, ...(unreadableDraft ? { unreadableDraft } : {}) };
}

/** What to store for a reader's dataset: their changes against the published data, or nothing. */
export function draftToStore(published: Dataset, data: Dataset): StoredDraft | null {
  const changes = diffDataset(published, data);
  return isEmpty(changes) ? null : { format: 'changes', base: fingerprint(published), changes };
}

/**
 * Dataset state for one bundled timeline, with automatic draft persistence to localStorage. `unsaved` is true while
 * the latest draft couldn't be stored (storage full or turned off): the edits still apply, but only until the page
 * closes, so the app tells the reader to download them.
 */
export function useDataset(published: Dataset) {
  const [state, dispatch] = useReducer(datasetReducer, published, loadInitial);
  const [unsaved, setUnsaved] = useState(false);
  useEffect(() => {
    const key = draftKey(state.published.meta.id);
    const draft = state.dirty ? draftToStore(state.published, state.data) : null;
    try {
      if (draft) localStorage.setItem(key, JSON.stringify(draft));
      else localStorage.removeItem(key);
      // whether storage took the draft is only known after writing it; an unchanged value doesn't re-render
      // oxlint-disable-next-line react/set-state-in-effect
      setUnsaved(false);
    } catch {
      setUnsaved(true);
    }
  }, [state]);
  return [state, dispatch, unsaved] as const;
}

/** The message for a file that isn't a valid timeline: the first problem, and how many more there are. */
export const uploadError = (name: string, errors: string[]) =>
  `Couldn't load ${name}: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more; see console)` : ''}`;

/** Parses and validates an uploaded file. */
export function parseUpload(text: string): { dataset?: Dataset; errors: string[]; notice?: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const errors = validateDataset(json);
  // a file saved by an older version of the app is lifted to the current one (data/migrate.ts); one made with a newer
  // minor version loads, with a notice (core 1.0, rule 1)
  const notice = newerMinor(json) ?? undefined;
  return errors.length ? { errors } : { dataset: migrate(json) as Dataset, errors: [], ...(notice ? { notice } : {}) };
}

/**
 * The file a download writes: lifted to the current version, `schemaMinor` set as the build sets it (the minor the data
 * needs), but never lower than the file's own: a newer file's fields were kept (core 1.0, rule 2) and may need its
 * minor. A "final" file drops the edit marks.
 */
export function forDownload(data: Dataset, final: boolean): Dataset {
  const lifted = migrate(data) as Dataset;
  const minor = Math.max(lifted.schemaMinor ?? 0, minorNeeded(lifted));
  const { schemaMinor: _old, ...rest } = lifted;
  const current: Dataset = minor ? { ...rest, schemaMinor: minor } : rest;
  return final ? { ...current, events: current.events.map(({ edited: _edited, ...e }) => e) } : current;
}

export function downloadDataset(data: Dataset, final: boolean) {
  const out = forDownload(data, final);
  const blob = new Blob([JSON.stringify(out, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.meta.id}-${final ? 'final' : 'editing'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
