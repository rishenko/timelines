import { describe, expect, it } from 'vitest';
import { originFinder, treeLines } from '../../scripts/lib/tree.ts';
import { sourceTimeline } from '../../scripts/lib/timelines.ts';

const rows = [
  { id: 'g', name: 'Group' },
  { id: 'a', name: 'A', parent: 'g' },
  { id: 'a1', name: 'A one', parent: 'a', kind: 'theme' },
  { id: 'b', name: 'B', parent: 'g' },
  { id: 'h', name: 'Other' },
];

describe('data tree', () => {
  it('prints the row with its parent and place, then its subtree depth-first and indented', () => {
    expect(treeLines(rows, 'g')).toEqual(['g "Group" #1/2 · parent (top level)', '  a "A" #1/2', '    a1 "A one" [theme] #1/1', '  b "B" #2/2']);
    expect(treeLines(rows, 'a')[0]).toBe('a "A" #1/2 · parent g');
  });
  it('stops at --depth and sums up what passes --max in one line', () => {
    expect(treeLines(rows, 'g', { depth: 1 })).toEqual(['g "Group" #1/2 · parent (top level)', '  a "A" #1/2', '  b "B" #2/2']);
    expect(treeLines(rows, 'g', { max: 2 })).toEqual(['g "Group" #1/2 · parent (top level)', '… 3 more rows (--depth N or --max N)']);
  });
  it('refuses a row the timeline does not have', () => {
    expect(() => treeLines(rows, 'nowhere')).toThrow('no row "nowhere"');
  });
  it('names the file that sets a row, one that only names it, or the source file', () => {
    expect(originFinder(sourceTimeline('medieval'))('tulunids')).toBe('set in pipelines/medieval/med_near_east.py');
    expect(originFinder(sourceTimeline('ancient-classical'))('egypt')).toBe('named in scripts/ancient-classical/egypt-in-africa.ts');
    expect(originFinder(sourceTimeline('ancient-classical'))('nabta')).toBe('data-src/ancient-classical.json');
  });
});
