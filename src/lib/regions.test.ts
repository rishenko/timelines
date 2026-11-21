import { describe, expect, it } from 'vitest';
import type { Facet, Track } from '../types.ts';
import { parseRegions, regionOverlay, regionTree, rowRegions } from './regions.ts';

const FACET: Facet = {
  name: 'Region',
  values: { med: { name: 'Mediterranean' }, aegean: { name: 'Aegean', broader: ['med'] }, meso: { name: 'Mesopotamia' } },
};
const inRegion = (value: string, sourceKey = 'book') => ({ facet: 'geography', value, sources: [{ sourceKey, sourceLocation: 'p. 1' }] });
const row = (id: string, parent?: string, memberships: Track['memberships'] = []): Track => ({ id, name: id, color: '#000', parent, memberships });
const tracks: Track[] = [
  row('home'),
  row('a', 'home', [inRegion('aegean')]),
  row('b', 'home', [inRegion('meso')]),
  row('c', 'home'),
  row('other'),
  // its region is cited only to a spoiler source
  row('d', 'other', [inRegion('aegean', 'late-book')]),
];
const all = (_key: string) => true;
const noSpoilers = (k: string) => k !== 'late-book';
const shown = (picked: string[], sourceOn = all) => {
  const off = regionOverlay(tracks, 'geography', FACET, picked, sourceOn);
  return tracks.map((t) => t.id).filter((id) => off[id] !== false);
};

describe('region filter', () => {
  it('counts the regions a row sits inside', () => {
    expect([...rowRegions(tracks[1], 'geography', FACET, all)].sort()).toEqual(['aegean', 'med']);
  });

  it('lists broad regions with the narrower ones under them, each with its row count', () => {
    const tree = regionTree(tracks, 'geography', FACET, all);
    expect(tree.map((n) => [n.id, n.rows, n.children.map((c) => [c.id, c.rows])])).toEqual([
      ['med', 2, [['aegean', 2]]],
      ['meso', 1, []],
    ]);
  });

  it('shows the rows in any ticked region (and the regions inside it), with their headers', () => {
    expect(shown(['med'])).toEqual(['home', 'a', 'other', 'd']);
    expect(shown(['aegean', 'meso'])).toEqual(['home', 'a', 'b', 'other', 'd']);
    expect(shown(['meso'])).toEqual(['home', 'b']); // "other" has nothing in Mesopotamia, so its header goes too
  });

  it('hides rows with no region while a filter is on', () => {
    expect(shown(['med', 'meso'])).not.toContain('c');
  });

  it('ignores a membership whose sources are all switched off (spoilers stay hidden)', () => {
    expect(shown(['aegean'], noSpoilers)).toEqual(['home', 'a']);
    expect(regionTree(tracks, 'geography', FACET, noSpoilers)[0].rows).toBe(1);
  });

  it('reads the link, keeping only known regions, each once', () => {
    expect(parseRegions('aegean,atlantis,aegean, meso', FACET)).toEqual(['aegean', 'meso']);
    expect(parseRegions(null, FACET)).toEqual([]);
    expect(parseRegions('aegean', undefined)).toEqual([]);
  });
});
