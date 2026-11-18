import { describe, expect, it } from 'vitest';
import { buildGrid, labelStopKey, move, relocate } from './keyboard.ts';
import type { LaneLayout, Mark } from './layout.ts';

const mark = (laneId: string, eventId: string, x0: number, kind: Mark['kind'] = 'event', eventIds?: string[]): Mark =>
  ({ key: `${laneId}:${eventId}`, kind, eventId, eventIds, laneId, row: 0, span: false, x0, x1: x0 + 10, footprintEnd: x0 + 50, cy: 0 }) as Mark;

const lane = (id: string, marks: Mark[], hasChildren = false): LaneLayout =>
  ({ lane: { id, hasChildren }, top: 0, height: 40, rows: 1, marks, overflow: 0 }) as unknown as LaneLayout;

// a: fold button, then events at 100, 300 (listed out of order), 500; b: no controls; c: events at 120 and a cluster at 480
const lanes = [
  lane('a', [mark('a', 'a3', 500), mark('a', 'a1', 100), mark('a', 'a2', 300)], true),
  lane('b', []),
  lane('c', [mark('c', 'c1', 120), mark('c', 'cl', 480, 'cluster', ['c2', 'c3'])]),
];
const grid = buildGrid(lanes, (l) => ((l.lane as { hasChildren: boolean }).hasChildren ? [labelStopKey(l.lane.id, 'fold')] : []));

describe('keyboard grid', () => {
  it('orders a lane as its fold buttons, then its marks by time', () => {
    expect(grid[0].stops.map((s) => s.key)).toEqual(['label:a:fold', 'a:a1', 'a:a2', 'a:a3']);
  });

  it('moves left and right along a lane, stopping at its ends', () => {
    expect(move(grid, 'a:a2', 'right')).toBe('a:a3');
    expect(move(grid, 'a:a3', 'right')).toBeUndefined();
    expect(move(grid, 'a:a1', 'left')).toBe('label:a:fold');
  });

  it('moves up and down to the nearest event in time, skipping lanes with nothing to focus', () => {
    expect(move(grid, 'a:a1', 'down')).toBe('c:c1');
    expect(move(grid, 'a:a3', 'down')).toBe('c:cl');
    expect(move(grid, 'c:c1', 'up')).toBe('a:a1');
    expect(move(grid, 'c:c1', 'down')).toBeUndefined();
  });

  it('Home and End go to the first and last event of the lane', () => {
    expect(move(grid, 'a:a2', 'home')).toBe('a:a1');
    expect(move(grid, 'a:a1', 'end')).toBe('a:a3');
  });

  it('Page Down jumps about a screen later in time', () => {
    expect(move(grid, 'a:a1', 'page-right', 400)).toBe('a:a3');
    expect(move(grid, 'a:a3', 'page-left', 200)).toBe('a:a2');
  });

  it('after a zoom, finds the cluster that now holds a focused event', () => {
    expect(relocate(grid, 'c', ['c3'])).toBe('c:cl');
    expect(relocate(grid, 'zzz', ['a2'])).toBe('a:a2');
    expect(relocate(grid, 'c', ['nope'])).toBeUndefined();
  });
});
