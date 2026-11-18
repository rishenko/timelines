import { describe, expect, it } from 'vitest';
import type { Track } from '../types.ts';
import { anyCollapsed, collapseAll, defaultCollapsed, parentIds, sameCollapsed } from './collapse.ts';
import { buildLanes } from '../timeline/layout.ts';

const tracks: Track[] = [
  { id: 'ane', name: 'Ancient Near East', color: '#000' },
  { id: 'egypt', name: 'Egypt', color: '#000', parent: 'ane' },
  { id: 'nk', name: 'New Kingdom', color: '#000', parent: 'egypt' },
  { id: 'americas', name: 'Americas', color: '#000' },
];

describe('collapse all / expand all', () => {
  it('finds the rows that have sub-rows', () => {
    expect(parentIds(tracks).sort()).toEqual(['ane', 'egypt']);
  });

  it('collapse all leaves only the top-level rows, and children stay folded when a parent opens', () => {
    const c = collapseAll(tracks);
    expect(buildLanes(tracks, {}, c).map((l) => l.id)).toEqual(['ane', 'americas']);
    expect(buildLanes(tracks, {}, { ...c, ane: false }).map((l) => l.id)).toEqual(['ane', 'egypt', 'americas']);
  });

  it('reports whether anything is collapsed', () => {
    expect(anyCollapsed(tracks, {})).toBe(false);
    expect(anyCollapsed(tracks, { egypt: true })).toBe(true);
    expect(anyCollapsed(tracks, { americas: true })).toBe(false); // a row without sub-rows doesn't count
  });

  it('a flat timeline has nothing to collapse', () => {
    expect(parentIds([{ id: 'a', name: 'A', color: '#000' }])).toEqual([]);
  });
});

describe('default view', () => {
  it('builds the opening state from meta.collapsed', () => {
    expect(defaultCollapsed(['egypt'])).toEqual({ egypt: true });
    expect(defaultCollapsed(undefined)).toEqual({});
  });

  it('compares states only on rows that have sub-rows', () => {
    const d = defaultCollapsed(['egypt']);
    expect(sameCollapsed(tracks, d, { egypt: true, americas: true })).toBe(true);
    expect(sameCollapsed(tracks, d, {})).toBe(false);
    expect(sameCollapsed(tracks, d, collapseAll(tracks))).toBe(false);
  });
});
