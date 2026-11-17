import { useEffect, useReducer } from 'react';
import type { Dataset, Source, TimelineEvent, Track } from '../types.ts';
import * as edits from './edits.ts';
import { validateDataset } from '../data/validate.ts';
import { upgrade } from '../data/migrate.ts';

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

function loadInitial(published: Dataset): DatasetState {
  try {
    const raw = localStorage.getItem(draftKey(published.meta.id));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateDataset(parsed).length === 0) return { published, data: parsed as Dataset, dirty: true };
    }
  } catch {
    // ignore unreadable drafts
  }
  return { published, data: published, dirty: false };
}

/** Dataset state for one bundled timeline, with automatic draft persistence to localStorage. */
export function useDataset(published: Dataset) {
  const [state, dispatch] = useReducer(datasetReducer, published, loadInitial);
  useEffect(() => {
    const key = draftKey(state.published.meta.id);
    if (state.dirty) localStorage.setItem(key, JSON.stringify(state.data));
    else localStorage.removeItem(key);
  }, [state]);
  return [state, dispatch] as const;
}

/** Parses an uploaded file: v3 is validated; v1 and v2 REDACTED files are converted first. */
export function parseUpload(text: string): { dataset?: Dataset; errors: string[]; migratedFrom?: 1 | 2 } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const { data, from } = upgrade(json);
  const errors = validateDataset(data);
  return errors.length ? { errors, migratedFrom: from } : { dataset: data as Dataset, errors: [], migratedFrom: from };
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
