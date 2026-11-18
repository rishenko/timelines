import { describe, expect, it } from 'vitest';
import type { Track } from '../types.ts';
import { ancestorIds, childrenMap, isDescendant, rootOf, subtreeIds, trackDepth, trackIndex, treeOrder } from './tracks.ts';
import { trackChronology } from './chronology.ts';

const row = (id: string, parent?: string, extra: Partial<Track> = {}): Track => ({ id, name: id, color: '#000', parent, ...extra });

// group → region → civilization → period, plus a second top-level row listed before its children
const tracks: Track[] = [
  row('ne'),
  row('anatolia', 'ne'),
  row('hittites', 'anatolia'),
  row('hit-old', 'hittites'),
  row('other'),
  row('egypt', 'ne'),
];

describe('row tree', () => {
  it('finds ancestors, depth, root and descendants', () => {
    expect(ancestorIds('hit-old', tracks)).toEqual(['ne', 'anatolia', 'hittites']);
    expect(trackDepth(tracks, 'hit-old')).toBe(3);
    expect(trackDepth(tracks, 'ne')).toBe(0);
    expect(rootOf('hit-old', trackIndex(tracks))?.id).toBe('ne');
    expect(isDescendant(tracks, 'hit-old', 'anatolia')).toBe(true);
    expect(isDescendant(tracks, 'egypt', 'anatolia')).toBe(false);
    expect([...subtreeIds('anatolia', tracks)]).toEqual(['anatolia', 'hittites', 'hit-old']);
  });

  it('lists rows in lane order: each followed by its sub-rows', () => {
    expect(treeOrder(tracks).map((t) => t.id)).toEqual(['ne', 'anatolia', 'hittites', 'hit-old', 'egypt', 'other']);
    expect(childrenMap(tracks).get(undefined)!.map((t) => t.id)).toEqual(['ne', 'other']);
  });

  it('stops at a parent cycle instead of hanging', () => {
    const loop = [row('a', 'b'), row('b', 'a')];
    expect(ancestorIds('a', loop)).toEqual(['b']);
    expect(trackDepth(loop, 'a')).toBe(1);
  });

  it('inherits a chronology from any depth (there used to be a 10-level cap)', () => {
    const deep = [row('t0', undefined, { chronology: 'middle' })];
    for (let i = 1; i <= 15; i++) deep.push(row(`t${i}`, `t${i - 1}`));
    expect(trackChronology(deep, 't15')).toBe('middle');
    deep[3] = { ...deep[3], chronology: 'low' };
    expect(trackChronology(deep, 't15')).toBe('low');
  });
});
