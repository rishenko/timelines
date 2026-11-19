import { useEffect, useReducer } from 'react';
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
    case 'upsertEvent': {
      const event = { ...action.event, edited: true };
      const i = state.data.events.findIndex((e) => e.uuid === event.uuid);
      const events = i === -1 ? [...state.data.events, event] : state.data.events.with(i, event);
      return set({ ...state.data, events });
    }
    case 'removeEvent': {
      const events = state.data.events
        .filter((e) => e.uuid !== action.uuid)
        // drop dangling links to the removed event
        .map((e) =>
          e.links?.some((l) => l.to === action.uuid)
            ? { ...e, links: e.links.filter((l) => l.to !== action.uuid), edited: true }
            : e,
        );
      return set({ ...state.data, events });
    }
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

/** Dataset state for one bundled timeline, with automatic draft persistence to localStorage. */
export function useDataset(published: Dataset) {
  const [state, dispatch] = useReducer(datasetReducer, published, loadInitial);
  useEffect(() => {
    const key = draftKey(state.published.meta.id);
    const draft = state.dirty ? draftToStore(state.published, state.data) : null;
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  }, [state]);
  return [state, dispatch] as const;
}

/** Parses and validates an uploaded file. */
export function parseUpload(text: string): { dataset?: Dataset; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const errors = validateDataset(json);
  return errors.length ? { errors } : { dataset: json as Dataset, errors: [] };
}

export function downloadDataset(data: Dataset, final: boolean) {
  const out: Dataset = final
    ? { ...data, events: data.events.map(({ edited: _edited, ...rest }) => rest) }
    : data;
  const blob = new Blob([JSON.stringify(out, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.meta.id}-${final ? 'final' : 'editing'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
