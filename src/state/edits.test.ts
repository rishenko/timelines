import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types.ts';
import {
  moveTrack,
  nextTrackColor,
  removeSource,
  removeTrack,
  sourceUsage,
  trackDeletion,
  uniqueId,
  upsertSource,
  upsertTrack,
} from './edits.ts';
import { validateDataset } from '../data/validate.ts';
import data from '../timelines/REDACTED.json';
import { REDACTED_META } from '../data/migrate.ts';

const base = (): Dataset => ({
  schemaVersion: 3,
  meta: structuredClone(REDACTED_META),
  tracks: [
    { id: 'redacted', name: 'REDACTED', color: '#ccc' },
    { id: 'REDACTED', name: 'REDACTED', color: '#0092a4' },
    { id: 'REDACTED', name: 'REDACTED', color: '#777', pinLast: true },
  ],
  sources: { REDACTED: { name: 'Core', tags: ['first'] } },
  tags: { first: { name: 'First Party' } },
  events: [
    { uuid: 'a', title: 'A', descr: '', start: 1, tracks: ['REDACTED'], sources: [{ sourceKey: 'REDACTED', sourceLocation: '' }] },
    { uuid: 'b', title: 'B', descr: '', start: 2, tracks: ['REDACTED', 'redacted'], sources: [], links: [{ to: 'a', kind: 'causes' }] },
  ],
});

describe('ids and colors', () => {
  it('makes unique slugs', () => {
    expect(uniqueId('Second REDACTED', ['second-REDACTED'])).toBe('second-REDACTED-2');
    expect(uniqueId('Ünïon!', [])).toBe('redacted');
  });
  it('picks an unused color', () => {
    expect(nextTrackColor(base().tracks)).toMatch(/^#/);
  });
});

describe('tracks', () => {
  it('inserts new top-level tracks before REDACTED, children at the end', () => {
    let d = upsertTrack(base(), { id: 'gm', name: 'My Faction', color: '#f00' });
    expect(d.tracks.map((t) => t.id)).toEqual(['redacted', 'REDACTED', 'gm', 'REDACTED']);
    d = upsertTrack(d, { id: 'gm-cell', name: 'Cell', color: '#f00', parent: 'gm' });
    expect(d.tracks.at(-1)!.id).toBe('gm-cell');
    expect(validateDataset(d)).toEqual([]);
  });

  it('renames a track everywhere', () => {
    let d = upsertTrack(base(), { id: 'child', name: 'C', color: '#000', parent: 'REDACTED' });
    d = upsertTrack(d, { id: 'REDACTED', name: 'REDACTED', color: '#0092a4' }, 'REDACTED');
    expect(d.events[0].tracks).toEqual(['REDACTED']);
    expect(d.tracks.find((t) => t.id === 'child')!.parent).toBe('REDACTED');
    expect(validateDataset(d)).toEqual([]);
  });

  it('moves among siblings only', () => {
    const d = moveTrack(base(), 'REDACTED', -1);
    expect(d.tracks.map((t) => t.id)).toEqual(['REDACTED', 'redacted', 'REDACTED']);
    expect(moveTrack(d, 'REDACTED', -1)).toBe(d);
  });

  it('deletes a track, its single-track events, and links to them', () => {
    const d0 = base();
    expect(trackDeletion(d0, 'REDACTED')).toEqual({ blocked: undefined, orphaned: 1, shared: 1 });
    const d = removeTrack(d0, 'REDACTED');
    expect(d.events.map((e) => e.uuid)).toEqual(['b']);
    expect(d.events[0].tracks).toEqual(['redacted']);
    expect(d.events[0].links).toEqual([]);
    expect(validateDataset(d)).toEqual([]);
  });

  it('refuses to delete a track with sub-tracks', () => {
    const d = upsertTrack(base(), { id: 'child', name: 'C', color: '#000', parent: 'REDACTED' });
    expect(trackDeletion(d, 'REDACTED').blocked).toMatch(/sub-tracks/);
    expect(removeTrack(d, 'REDACTED')).toBe(d);
  });
});

describe('sources', () => {
  it('adds a homebrew source and creates the tag', () => {
    const d = upsertSource(base(), 'my-campaign', { name: 'My Campaign', tags: ['homebrew'] });
    expect(d.tags.homebrew.name).toBe('Homebrew');
    expect(validateDataset(d)).toEqual([]);
  });

  it('renames a source key in citations, keeping order', () => {
    const d = upsertSource(base(), 'core', { name: 'Core', tags: ['first'] }, 'REDACTED');
    expect(Object.keys(d.sources)).toEqual(['core']);
    expect(d.events[0].sources[0].sourceKey).toBe('core');
  });

  it('removes a source and its citations', () => {
    expect(sourceUsage(base(), 'REDACTED')).toBe(1);
    const d = removeSource(base(), 'REDACTED');
    expect(d.sources).toEqual({});
    expect(d.events[0].sources).toEqual([]);
    expect(validateDataset(d)).toEqual([]);
  });
});

describe('shipped data', () => {
  it('has a homebrew tag for custom sources', () => {
    expect((data as Dataset).tags.homebrew).toBeDefined();
  });
});
