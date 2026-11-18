// How close together related regions sit. Every event shared by two top-level rows (regions), and every
// link between their events, counts toward that pair, but each event counts at most once per pair: a link
// from an event that already sits on both regions adds nothing. Distance is how many regions apart the two
// rows are in display order. Used to keep civilizations that interacted near each other.
import type { Dataset } from '../types.ts';

export interface RelatedPair {
  a: string;
  b: string;
  shared: number;
  distance: number;
}

export function relatedRegions(ds: Dataset): RelatedPair[] {
  const parent = new Map(ds.tracks.map((t) => [t.id, t.parent]));
  const regionOf = (id: string): string => {
    let cur = id;
    while (parent.get(cur)) cur = parent.get(cur)!;
    return cur;
  };
  const regions = ds.tracks.filter((t) => !t.parent).map((t) => t.id);
  const pos = new Map(regions.map((r, i) => [r, i]));

  const counts = new Map<string, number>();
  const eventRegions = new Map(ds.events.map((e) => [e.uuid, [...new Set(e.tracks.map(regionOf))]]));
  for (const e of ds.events) {
    const pairs = new Set<string>();
    const add = (x: string, y: string) => {
      if (x !== y) pairs.add([x, y].sort().join('|'));
    };
    const rs = eventRegions.get(e.uuid)!;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) add(rs[i], rs[j]);
    for (const l of e.links ?? []) {
      const to = eventRegions.get(l.to);
      if (to) add(rs[0], to[0]);
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

/** The farthest apart a pair may sit, given how much they share: close partners must be near. */
export function allowedDistance(shared: number): number {
  if (shared >= 5) return 3;
  if (shared >= 2) return 5;
  return Infinity;
}
