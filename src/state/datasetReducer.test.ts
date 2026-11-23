import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types.ts';
import { datasetReducer, type DatasetState } from './dataset.ts';

const base = (): Dataset => ({
  schemaVersion: 8,
  meta: {
    id: 'test',
    title: 'Test',
    calendar: { before: 'BL', after: 'L', yearZero: true },
    increments: [1, 10],
    defaultIncrement: 10,
  },
  tracks: [{ id: 'guild', name: 'Merchant Guild', color: '#0092a4' }],
  sources: {},
  tags: {},
  events: [
    { uuid: 'a', title: 'A', descr: '', start: 1, tracks: ['guild'], sources: [] },
    { uuid: 'b', title: 'B', descr: '', start: 2, tracks: ['guild'], sources: [], links: [{ to: 'a', kind: 'causes' }] },
    { uuid: 'c', title: 'C', descr: '', start: 3, tracks: ['guild'], sources: [], links: [{ to: 'b', kind: 'related' }] },
  ],
});

const state = (): DatasetState => {
  const d = base();
  return { published: d, data: d, dirty: false };
};

describe('datasetReducer: events', () => {
  it('upsertEvent replaces an event in place, marked edited', () => {
    const s = datasetReducer(state(), { type: 'upsertEvent', event: { ...base().events[1], title: 'B2' } });
    expect(s.dirty).toBe(true);
    expect(s.data.events.map((e) => e.uuid)).toEqual(['a', 'b', 'c']);
    expect(s.data.events[1]).toEqual({ ...base().events[1], title: 'B2', edited: true });
    expect(s.data.events[0]).toBe(s.published.events[0]);
  });

  it('upsertEvent adds a new event at the end, marked edited', () => {
    const event = { uuid: 'd', title: 'D', descr: '', start: 4, tracks: ['guild'], sources: [] };
    const s = datasetReducer(state(), { type: 'upsertEvent', event });
    expect(s.data.events.map((e) => e.uuid)).toEqual(['a', 'b', 'c', 'd']);
    expect(s.data.events[3]).toEqual({ ...event, edited: true });
  });

  it('removeEvent drops the event and links to it; only events that lost a link are marked edited', () => {
    const s = datasetReducer(state(), { type: 'removeEvent', uuid: 'a' });
    expect(s.dirty).toBe(true);
    expect(s.data.events.map((e) => e.uuid)).toEqual(['b', 'c']);
    expect(s.data.events[0]).toEqual({ ...base().events[1], links: [], edited: true });
    expect(s.data.events[1]).toBe(s.published.events[2]);
  });

  it('reset returns to the published data', () => {
    const edited = datasetReducer(state(), { type: 'removeEvent', uuid: 'a' });
    const s = datasetReducer(edited, { type: 'reset' });
    expect(s.data).toBe(s.published);
    expect(s.dirty).toBe(false);
  });
});
