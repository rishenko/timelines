import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types.ts';
import {
  moveTrack,
  newProblems,
  upsertEvent,
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
import { draftToStore, restoreDraft } from './dataset.ts';
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

  // A source cited by date claims, a lifespan and a chronology, not only by an event's sources list.
  const claimed = (): Dataset => {
    const d = base();
    d.sources.chron = { name: 'Chronicle', tags: ['first'] };
    const cite = { sourceKey: 'chron', sourceLocation: 'p. 1' };
    d.events[1].startDates = [{ year: 2, margin: 1, source: cite }];
    d.tracks[1].span = { start: 0, end: 5, endDates: [{ year: 5, source: cite }] };
    d.chronologies = { annals: { name: 'Annals', group: 'g', default: true, source: cite } };
    return d;
  };

  it('renames a source key in date claims, lifespans and chronologies too', () => {
    const d = upsertSource(claimed(), 'annals-src', { name: 'Chronicle', tags: ['first'] }, 'chron');
    expect(validateDataset(d)).toEqual([]);
    expect(d.events[1].startDates![0].source!.sourceKey).toBe('annals-src');
    expect(d.tracks[1].span!.endDates![0].source!.sourceKey).toBe('annals-src');
    expect(d.chronologies!.annals.source!.sourceKey).toBe('annals-src');
    expect(d.events[1].edited).toBe(true);
  });

  it('removes a source cited only by claims; the claims keep their values', () => {
    const before = claimed();
    expect(sourceUsage(before, 'chron')).toBe(1);
    const d = removeSource(before, 'chron');
    expect(validateDataset(d)).toEqual([]);
    expect(d.events[1].startDates).toEqual([{ year: 2, margin: 1 }]);
    expect(d.tracks[1].span!.endDates).toEqual([{ year: 5 }]);
    expect(d.chronologies!.annals.source).toBeUndefined();
  });

  it('a draft that deletes a source cited by claims survives a reload', () => {
    const published = claimed();
    const stored = JSON.parse(JSON.stringify(draftToStore(published, removeSource(published, 'chron'))));
    expect(restoreDraft(published, stored)?.data.sources.chron).toBeUndefined();
  });
});

describe('shipped data', () => {
  it('has a homebrew tag for custom sources', () => {
    expect((data as Dataset).tags.homebrew).toBeDefined();
  });
});

describe('checking an edit before saving', () => {
  it('reports only the problems the edit adds', () => {
    const d = base();
    expect(newProblems(d, d)).toEqual([]);
    // a start outside its own date claims
    const e = { ...d.events[0], start: 50, startDates: [{ year: 10, margin: 2 }] };
    const after = upsertEvent(d, e);
    expect(newProblems(d, after).join()).toContain('lies outside its claims');
    // once a problem exists, a later unrelated edit isn't blocked by it
    expect(newProblems(after, upsertEvent(after, { ...after.events[1], title: 'B2' }))).toEqual([]);
  });

  it('checks lifespan claims on a track', () => {
    const d = base();
    const t = { ...d.tracks[1], span: { start: 0, end: 10, startDates: [{ year: 100 }] } };
    expect(newProblems(d, upsertTrack(d, t, t.id)).join()).toContain('lifespan start');
  });
});
