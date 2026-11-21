import { describe, expect, it } from 'vitest';
import type { Track, TimelineEvent } from '../types.ts';
import { orderSet, parseOrder, parseSet, setTracks } from './sets.ts';

const row = (id: string, start?: number, parent?: string, extra: Partial<Track> = {}): Track => ({
  id,
  name: id,
  color: '#000',
  parent,
  ...(start !== undefined ? { span: { start, end: start + 100 } } : {}),
  ...extra,
});
const ev = (uuid: string, tracks: string[], start = 0, links: string[] = []): TimelineEvent => ({
  uuid,
  title: uuid,
  descr: '',
  start,
  tracks,
  sources: [],
  links: links.map((to) => ({ to, kind: 'related' })),
});
const tracks: Track[] = [
  row('region', undefined, undefined, { chronology: 'middle' }),
  row('a', -500, 'region'),
  row('b', -400, 'region'),
  row('c', -300),
  row('d', -200),
  row('e', -100),
  row('f', undefined, 'e'), // e's sub-row, dated only by its event
];

describe('comparison sets', () => {
  it('reads the link: known rows, each once, none inside another picked row; unknown orders fall back to picked', () => {
    expect(parseSet('e,atlantis,a,e,f', tracks)).toEqual(['e', 'a']);
    expect(parseSet(null, tracks)).toEqual([]);
    expect(parseOrder('related')).toBe('related');
    expect(parseOrder('sideways')).toBe('picked');
  });

  it('keeps the picked order, or sorts by start', () => {
    expect(orderSet(tracks, [], ['d', 'a', 'c'], 'picked')).toEqual(['d', 'a', 'c']);
    expect(orderSet(tracks, [], ['d', 'a', 'c'], 'start')).toEqual(['a', 'c', 'd']);
  });

  it('puts related rows together, counting a picked row\'s sub-rows, and is otherwise by start', () => {
    const events = [ev('x', ['a', 'f']), ev('y', ['b']), ev('z', ['d'], 0, ['y'])];
    const o = orderSet(tracks, events, ['a', 'b', 'c', 'd', 'e'], 'related');
    expect(Math.abs(o.indexOf('a') - o.indexOf('e'))).toBe(1); // tied through e's sub-row f
    expect(Math.abs(o.indexOf('b') - o.indexOf('d'))).toBe(1); // linked events
    expect(orderSet(tracks, events, ['a', 'b', 'c', 'd', 'e'], 'related')).toEqual(o); // same every time
    expect(orderSet(tracks, [], ['c', 'a', 'b'], 'related')).toEqual(['a', 'b', 'c']);
  });

  it('draws each picked row at the top level with its own sub-rows, keeping its inherited chronology', () => {
    const drawn = setTracks(tracks, ['e', 'a']);
    expect(drawn.map((t) => [t.id, t.parent])).toEqual([
      ['e', undefined],
      ['f', 'e'],
      ['a', undefined],
    ]);
    expect(drawn.find((t) => t.id === 'a')!.chronology).toBe('middle');
  });
});
