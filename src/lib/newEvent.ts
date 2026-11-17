import type { TimelineEvent } from '../types.ts';

export function newEvent(trackId: string | undefined, year: number): TimelineEvent {
  return {
    uuid: crypto.randomUUID(),
    title: '',
    descr: '',
    start: year,
    tracks: trackId ? [trackId] : [],
    sources: [],
  };
}
