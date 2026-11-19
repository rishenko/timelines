import type { Dataset } from '../types.ts';
import { assertDataset, validateDataset } from '../data/validate.ts';
import { loadLibrary, type LibraryEntry } from '../state/library.ts';
import ancient from './ancient-near-east.json';
import classical from './classical.json';

/** Timelines bundled with the app, in picker order. The first is the default. */
export const BUNDLED: Dataset[] = [assertDataset(ancient), assertDataset(classical)];
export const BUNDLED_IDS = BUNDLED.map((t) => t.meta.id);

export interface TimelineChoice {
  dataset: Dataset;
  /** Present for timelines from the reader's library. */
  library?: LibraryEntry;
}

/** Bundled timelines, then valid library timelines. */
export function allTimelines(): TimelineChoice[] {
  const lib = loadLibrary()
    .filter((e) => !BUNDLED_IDS.includes(e.dataset.meta.id) && validateDataset(e.dataset).length === 0)
    .map((e) => ({ dataset: e.dataset, library: e }));
  return [...BUNDLED.map((dataset) => ({ dataset })), ...lib];
}

export function findTimeline(id: string | null | undefined): TimelineChoice {
  const all = allTimelines();
  return all.find((t) => t.dataset.meta.id === id) ?? all[0];
}
