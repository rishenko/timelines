import { describe, expect, it } from 'vitest';
import type { Dataset, Facet, TimelineEvent } from '../types.ts';
import { categoryFacetId, categoryLabel, categoryTree, eventCategories, inPickedCategories, parseCategories, topOf } from './categories.ts';
import modern from '../../public/timelines/modern-states.json';

const facet: Facet = {
  name: 'Category',
  applies: 'events',
  values: {
    conflict: { name: 'Wars and battles' },
    siege: { name: 'Siege', broader: ['conflict'] },
    battle: { name: 'Battle', broader: ['conflict'] },
    place: { name: 'Cities and places' },
    sack: { name: 'Sack or fall', broader: ['place'] },
    archaeology: { name: 'Archaeology' },
  },
};
const on = () => true;
const ev = (uuid: string, values: string[], sourceKey = 'wp'): TimelineEvent => ({
  uuid,
  title: uuid,
  descr: '',
  start: 0,
  tracks: ['row'],
  sources: [{ sourceKey, sourceLocation: '' }],
  ...(values.length ? { memberships: values.map((value) => ({ facet: 'category', value, sources: [{ sourceKey, sourceLocation: '' }] })) } : {}),
});

describe('event categories', () => {
  it('finds the events facet only (a facet for rows or both is the region filter’s)', () => {
    const meta = (facets: Dataset['meta']['facets']) => ({ meta: { facets } }) as unknown as Dataset;
    expect(categoryFacetId(meta({ geo: { name: 'Region', values: {} }, kind: { name: 'Kind', applies: 'events', values: {} } }))).toBe('kind');
    expect(categoryFacetId(meta({ geo: { name: 'Region', applies: 'both', values: {} } }))).toBeUndefined();
  });

  it('names a sub-kind with its kind, and finds a value’s kind', () => {
    expect(topOf('siege', facet)).toBe('conflict');
    expect(topOf('conflict', facet)).toBe('conflict');
    expect(categoryLabel('siege', facet)).toBe('Wars and battles: Siege');
    expect(categoryLabel('place', facet)).toBe('Cities and places');
  });

  it('counts each event once under every value it is in, sub-kinds folded under their kind', () => {
    const tree = categoryTree([ev('a', ['siege', 'sack']), ev('b', ['battle']), ev('c', [])], 'category', facet, on);
    const conflict = tree.find((n) => n.id === 'conflict')!;
    expect(tree.map((n) => n.id)).toEqual(['conflict', 'place', 'archaeology']);
    expect(conflict.rows).toBe(2);
    expect(conflict.children.map((n) => [n.id, n.rows])).toEqual([
      ['siege', 1],
      ['battle', 1],
    ]);
    expect(tree.find((n) => n.id === 'place')!.rows).toBe(1);
    expect(tree.find((n) => n.id === 'archaeology')!.rows).toBe(0);
  });

  it('shows an event when either of its categories is ticked or inside a ticked kind; one with no category always', () => {
    const shows = (e: TimelineEvent, picked: string[]) => inPickedCategories(e, 'category', facet, new Set(picked), on);
    const siegeAndSack = ev('a', ['siege', 'sack']);
    expect(shows(siegeAndSack, ['conflict'])).toBe(true);
    expect(shows(siegeAndSack, ['sack'])).toBe(true);
    expect(shows(siegeAndSack, ['battle'])).toBe(false);
    expect(shows(siegeAndSack, ['archaeology'])).toBe(false);
    expect(shows(ev('none', []), ['archaeology'])).toBe(true);
  });

  it('counts a category only while one of its sources is on (a hidden source gives nothing away)', () => {
    const e = ev('a', ['siege'], 'spoiler');
    expect(eventCategories(e, 'category', facet, (k) => k !== 'spoiler')).toEqual([]);
    expect(inPickedCategories(e, 'category', facet, new Set(['place']), (k) => k !== 'spoiler')).toBe(true);
    expect(eventCategories(e, 'category', facet, on)).toEqual(['siege']);
  });

  it('reads the link’s cat= keeping only known values, each once', () => {
    expect(parseCategories('conflict, siege,nope,conflict,', facet)).toEqual(['conflict', 'siege']);
    expect(parseCategories(null, facet)).toEqual([]);
    expect(parseCategories('conflict', undefined)).toEqual([]);
  });

  it('works on the bundled Modern States: every event with a category is under one of the kinds', () => {
    const ds = modern as unknown as Dataset;
    const id = categoryFacetId(ds)!;
    const f = ds.meta.facets![id];
    const tree = categoryTree(ds.events, id, f, on);
    const all = new Set(Object.keys(f.values).filter((v) => !f.values[v].broader));
    // one root per kind in the facet (ten since science was added)
    expect(tree.map((n) => n.id)).toEqual([...all]);
    const withCats = ds.events.filter((e) => eventCategories(e, id, f, on).length).length;
    expect(ds.events.filter((e) => inPickedCategories(e, id, f, all, on)).length).toBe(ds.events.length);
    expect(withCats).toBeGreaterThan(1000);
  });
});
