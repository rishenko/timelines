import { everyField } from '../data/fixtures/everyField.ts';
import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types.ts';
import {
  moveTrack,
  removeEvent,
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
import { spanStretches } from '../lib/lifespan.ts';

const base = (): Dataset => ({
  schemaVersion: 8,
  meta: {
    id: 'test',
    title: 'Test',
    calendar: { before: 'BL', after: 'L', yearZero: true },
    increments: [1, 10],
    defaultIncrement: 10,
    customSourceTag: 'homebrew',
  },
  tracks: [
    { id: 'north', name: 'The North', color: '#ccc' },
    { id: 'guild', name: 'Merchant Guild', color: '#0092a4' },
    { id: 'others', name: 'Others', color: '#777', pinLast: true },
  ],
  sources: { annals: { name: 'Annals', tags: ['first'] } },
  tags: { first: { name: 'First Party' } },
  events: [
    { uuid: 'a', title: 'A', descr: '', start: 1, tracks: ['guild'], sources: [{ sourceKey: 'annals', sourceLocation: '' }] },
    { uuid: 'b', title: 'B', descr: '', start: 2, tracks: ['guild', 'north'], sources: [], links: [{ to: 'a', kind: 'causes' }] },
  ],
});

describe('ids and colors', () => {
  it('makes unique slugs', () => {
    expect(uniqueId('Second Council', ['second-council'])).toBe('second-council-2');
    expect(uniqueId('Ünïty!', [])).toBe('unity');
  });
  it('picks an unused color', () => {
    expect(nextTrackColor(base().tracks)).toMatch(/^#/);
  });
});

describe('tracks', () => {
  it('inserts new top-level tracks before the pinned last one, children at the end', () => {
    let d = upsertTrack(base(), { id: 'mine', name: 'My Faction', color: '#f00' });
    expect(d.tracks.map((t) => t.id)).toEqual(['north', 'guild', 'mine', 'others']);
    d = upsertTrack(d, { id: 'mine-cell', name: 'Cell', color: '#f00', parent: 'mine' });
    expect(d.tracks.at(-1)!.id).toBe('mine-cell');
    expect(validateDataset(d)).toEqual([]);
  });

  it('renames a track everywhere', () => {
    let d = upsertTrack(base(), { id: 'child', name: 'C', color: '#000', parent: 'guild' });
    d = upsertTrack(d, { id: 'merchants', name: 'Merchant Guild', color: '#0092a4' }, 'guild');
    expect(d.events[0].tracks).toEqual(['merchants']);
    expect(d.tracks.find((t) => t.id === 'child')!.parent).toBe('merchants');
    expect(validateDataset(d)).toEqual([]);
  });

  it('moves among siblings only', () => {
    const d = moveTrack(base(), 'guild', -1);
    expect(d.tracks.map((t) => t.id)).toEqual(['guild', 'north', 'others']);
    expect(moveTrack(d, 'guild', -1)).toBe(d);
  });

  it('deletes a track, its single-track events, and links to them', () => {
    const d0 = base();
    expect(trackDeletion(d0, 'guild')).toEqual({ blocked: undefined, orphaned: 1, shared: 1, agesToStrip: [] });
    const d = removeTrack(d0, 'guild');
    expect(d.events.map((e) => e.uuid)).toEqual(['b']);
    expect(d.events[0].tracks).toEqual(['north']);
    expect(d.events[0].links).toEqual([]);
    expect(validateDataset(d)).toEqual([]);
  });

  it('refuses to delete a track with sub-rows', () => {
    const d = upsertTrack(base(), { id: 'child', name: 'C', color: '#000', parent: 'guild' });
    expect(trackDeletion(d, 'guild').blocked).toMatch(/sub-rows/);
    expect(removeTrack(d, 'guild')).toBe(d);
  });
});

describe('sources', () => {
  it('adds a homebrew source and creates the tag', () => {
    const d = upsertSource(base(), 'my-campaign', { name: 'My Campaign', tags: ['homebrew'] });
    expect(d.tags.homebrew.name).toBe('Homebrew');
    expect(validateDataset(d)).toEqual([]);
  });

  it('renames a source key in citations, keeping order', () => {
    const d = upsertSource(base(), 'annals-2', { name: 'Annals', tags: ['first'] }, 'annals');
    expect(Object.keys(d.sources)).toEqual(['annals-2']);
    expect(d.events[0].sources[0].sourceKey).toBe('annals-2');
  });

  it('removes a source and its citations', () => {
    expect(sourceUsage(base(), 'annals')).toBe(1);
    const d = removeSource(base(), 'annals');
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
    expect(spanStretches(d.tracks[1].span)[0].endDates![0].source!.sourceKey).toBe('annals-src');
    expect(d.chronologies!.annals.source!.sourceKey).toBe('annals-src');
    expect(d.events[1].edited).toBe(true);
  });

  it('removes a source cited only by claims; the claims keep their values', () => {
    const before = claimed();
    expect(sourceUsage(before, 'chron')).toBe(1);
    const d = removeSource(before, 'chron');
    expect(validateDataset(d)).toEqual([]);
    expect(d.events[1].startDates).toEqual([{ year: 2, margin: 1 }]);
    expect(spanStretches(d.tracks[1].span)[0].endDates).toEqual([{ year: 5 }]);
    expect(d.chronologies!.annals.source).toBeUndefined();
  });

  it('deleting a source drops it from facet memberships, and drops a membership left citing nothing', () => {
    const d0 = base();
    d0.sources.atlas = { name: 'Atlas', tags: ['first'] };
    d0.meta.facets = {
      category: { name: 'Category', applies: 'events', values: { conflict: { name: 'Wars' }, siege: { name: 'Siege', broader: ['conflict'] } } },
      region: { name: 'Region', values: { coast: { name: 'Coast' } } },
    };
    const annals = { sourceKey: 'annals', sourceLocation: '' };
    const atlas = { sourceKey: 'atlas', sourceLocation: 'map 2' };
    // a: one category cites only the deleted source, the other cites both
    d0.events[0].memberships = [
      { facet: 'category', value: 'siege', sources: [annals] },
      { facet: 'category', value: 'conflict', sources: [annals, atlas] },
    ];
    // a row's region membership cites only the deleted source
    d0.tracks[0].memberships = [{ facet: 'region', value: 'coast', sources: [annals] }];
    expect(validateDataset(d0)).toEqual([]);
    const d = removeSource(d0, 'annals');
    expect(d.events[0].memberships).toEqual([{ facet: 'category', value: 'conflict', sources: [atlas] }]);
    expect(d.tracks[0].memberships).toBeUndefined();
    expect(validateDataset(d)).toEqual([]);
  });

  it('a draft that deletes a source cited by claims survives a reload', () => {
    const published = claimed();
    const stored = JSON.parse(JSON.stringify(draftToStore(published, removeSource(published, 'chron'))));
    expect(restoreDraft(published, stored)?.data.sources.chron).toBeUndefined();
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

describe('memberships in other rows (memberOf)', () => {
  /** The guild belongs to the North for years 1–5, the membership begun by event "a" and cited to the annals. */
  const withMembership = (): Dataset => {
    const d = base();
    d.tracks = d.tracks.map((t) => (t.id === 'north' ? { ...t, span: { start: 0, end: 10 } } : t));
    d.tracks = d.tracks.map((t) =>
      t.id === 'guild'
        ? { ...t, span: { start: 0, end: 10 }, memberOf: [{ row: 'north', start: 1, end: 5, startEvent: 'a', sources: [{ sourceKey: 'annals', sourceLocation: 'p. 1' }] }] }
        : t,
    );
    expect(validateDataset(d)).toEqual([]);
    return d;
  };
  const guild = (d: Dataset) => d.tracks.find((t) => t.id === 'guild')!;

  it('renaming a row updates the memberships that name it', () => {
    const d = upsertTrack(withMembership(), { ...withMembership().tracks[0], id: 'northlands' }, 'north');
    expect(guild(d).memberOf!.map((m) => m.row)).toEqual(['northlands']);
    expect(validateDataset(d)).toEqual([]);
  });

  it('removing a row drops the memberships in it (and the field, when none are left)', () => {
    const d = removeTrack(withMembership(), 'north');
    expect(guild(d)).not.toHaveProperty('memberOf');
    expect(validateDataset(d)).toEqual([]);
  });

  it('removing an event drops it from the memberships it began or ended', () => {
    const d = removeEvent(withMembership(), 'a');
    expect(guild(d).memberOf![0]).not.toHaveProperty('startEvent');
    expect(validateDataset(d)).toEqual([]);
  });

  it('renaming a source rewrites a membership’s citations; removing its only source drops the membership', () => {
    const renamed = upsertSource(withMembership(), 'chronicle', { name: 'Annals', tags: ['first'] }, 'annals');
    expect(guild(renamed).memberOf![0].sources).toEqual([{ sourceKey: 'chronicle', sourceLocation: 'p. 1' }]);
    expect(validateDataset(renamed)).toEqual([]);
    const removed = removeSource(withMembership(), 'annals');
    expect(guild(removed)).not.toHaveProperty('memberOf');
    expect(validateDataset(removed)).toEqual([]);
  });
});

describe('a row’s ages (Track.context) follow row edits', () => {
  const spanIds = (d: Dataset, row?: string) => (row ? d.tracks.find((t) => t.id === row)?.context : d.meta.context)?.map((a) => a.id) ?? [];
  it('renaming a row keeps its ages on it', () => {
    const d0 = structuredClone(everyField) as Dataset;
    const quay = d0.tracks.find((t) => t.id === 'quay')!;
    expect(spanIds(upsertTrack(d0, { ...quay, id: 'quay-town' }, 'quay'), 'quay-town')).toEqual(['age-of-piers', 'quay-high-tide']);
  });
  it('removing a row moves its ages to the timeline’s own (the strip); its other context spans go with it', () => {
    const d0 = structuredClone(everyField) as Dataset;
    const leaf = d0.tracks.find((t) => t.id !== 'quay' && !d0.tracks.some((c) => c.parent === t.id))!;
    const quay = d0.tracks.find((t) => t.id === 'quay')!;
    leaf.context = quay.context;
    delete quay.context;
    const d1 = removeTrack(d0, leaf.id);
    expect(spanIds(d1)).toEqual(['long-harbor', 'age-of-leagues', 'age-of-piers']);
    expect(validateDataset(d1)).toEqual([]);
  });
  it('an age without a line takes the removed row’s id as its line, so it never runs into the timeline’s own', () => {
    const d0 = structuredClone(everyField) as Dataset;
    const leaf = d0.tracks.find((t) => t.id !== 'quay' && !d0.tracks.some((c) => c.parent === t.id))!;
    // overlaps The Long Harbor (an age with no line on the timeline)
    leaf.context = [{ id: 'leaf-age', kind: 'age', name: 'Leaf age', start: 0, end: 10, sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }] }];
    const d1 = removeTrack(d0, leaf.id);
    expect(d1.meta.context!.find((a) => a.id === 'leaf-age')!.line).toBe(leaf.id);
    expect(validateDataset(d1)).toEqual([]);
  });
  it('the delete warning names the ages that move to the strip', () => {
    const d0 = structuredClone(everyField) as Dataset;
    expect(trackDeletion(d0, 'quay')).toMatchObject({ agesToStrip: ['The Age of Piers'] });
  });
});

