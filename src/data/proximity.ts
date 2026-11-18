// How close together related rows sit. For one parent (or the top level), every event shared by two of its
// children's subtrees, and every link between events in them, counts toward that pair of children; each
// event counts at most once per pair, so a link from an event that already sits on both adds nothing.
// Distance is how many siblings apart the two are in display order. Used to keep civilizations that
// interacted near each other: at the top level for groups (or regions), and inside each group for regions.
import type { Dataset } from '../types.ts';
import { trackDepth } from '../lib/tracks.ts';

export interface RelatedPair {
  a: string;
  b: string;
  shared: number;
  distance: number;
}

/** Pairs of children of `parentId` (the top level when omitted) that share events or links. */
export function relatedSiblings(ds: Dataset, parentId?: string): RelatedPair[] {
  const parent = new Map(ds.tracks.map((t) => [t.id, t.parent]));
  /** The child of parentId whose subtree holds this track, or undefined if it lies outside parentId. */
  const childUnder = (id: string): string | undefined => {
    let cur: string | undefined = id;
    for (let n = 0; cur !== undefined && n <= ds.tracks.length; n++) {
      const p = parent.get(cur);
      if (p === parentId) return cur;
      cur = p;
    }
    return undefined;
  };
  const siblings = ds.tracks.filter((t) => t.parent === parentId).map((t) => t.id);
  const pos = new Map(siblings.map((r, i) => [r, i]));

  const counts = new Map<string, number>();
  const eventChildren = new Map(
    ds.events.map((e) => [e.uuid, [...new Set(e.tracks.map(childUnder))]] as const),
  );
  for (const e of ds.events) {
    const pairs = new Set<string>();
    const add = (x: string | undefined, y: string | undefined) => {
      if (x !== undefined && y !== undefined && x !== y) pairs.add([x, y].sort().join('|'));
    };
    const cs = eventChildren.get(e.uuid)!;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) add(cs[i], cs[j]);
    for (const l of e.links ?? []) {
      const to = eventChildren.get(l.to);
      if (to) add(cs[0], to[0]);
    }
    for (const k of pairs) counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return [...counts]
    .map(([k, shared]) => {
      const [a, b] = k.split('|');
      return { a, b, shared, distance: Math.abs(pos.get(a)! - pos.get(b)!) };
    })
    .sort((x, y) => y.shared - x.shared || y.distance - x.distance);
}

/** Pairs of top-level rows that share events or links. */
export const relatedRegions = (ds: Dataset): RelatedPair[] => relatedSiblings(ds);

/**
 * The parents whose children's order matters: the top level (undefined) and every row in the first
 * `levels - 1` levels that has two or more children. levels = 2 checks groups and the regions inside them.
 */
export function proximityParents(ds: Dataset, levels: number): (string | undefined)[] {
  const depth = (id: string) => trackDepth(ds.tracks, id);
  const kids = (id: string) => ds.tracks.filter((t) => t.parent === id).length;
  return [undefined, ...ds.tracks.filter((t) => depth(t.id) < levels - 1 && kids(t.id) > 1).map((t) => t.id)];
}

/** The farthest apart a pair may sit, given how much they share: close partners must be near. */
export function allowedDistance(shared: number): number {
  if (shared >= 5) return 3;
  if (shared >= 2) return 5;
  return Infinity;
}
