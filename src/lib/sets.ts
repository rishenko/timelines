import type { Track, TimelineEvent } from '../types.ts';
import { childrenMap, trackIndex, trackPath, treeOrder } from './tracks.ts';
import { trackChronology } from './chronology.ts';
import { rawLifespan } from './lifespan.ts';

/**
 * Comparison sets: rows the reader picks from anywhere in the timeline, shown side by side as a flat list (feature
 * audit item 19, synchronoptic comparison). A picked row keeps its own sub-rows. Three orders:
 *
 * - `picked`: the order the reader picked them in;
 * - `start`: by when each row begins (its lifespan, else its earliest event);
 * - `related`: rows that share events or are linked sit together. Tied rows form clusters, clusters come in order of
 *   their middle row's start, and inside a cluster rows are moved one at a time to shorten the total distance between
 *   related rows; between equal distances start order wins. Deterministic.
 */
export type SetOrder = 'picked' | 'related' | 'start';
export const SET_ORDERS: SetOrder[] = ['picked', 'related', 'start'];

/** Row ids from the link (`?set=hittites,pharaonic-egypt`): known rows only, each once, none inside another picked row. */
export function parseSet(param: string | null, tracks: Track[]): string[] {
  const byId = trackIndex(tracks);
  const out: string[] = [];
  for (const id of (param ?? '').split(',').map((s) => s.trim())) if (id && byId.has(id) && !out.includes(id)) out.push(id);
  return withoutNested(out, tracks);
}

export const parseOrder = (param: string | null): SetOrder => (SET_ORDERS.includes(param as SetOrder) ? (param as SetOrder) : 'picked');

/** Drops picked rows that sit inside another picked row (they come along with it). */
export function withoutNested(ids: string[], tracks: Track[]): string[] {
  const byId = trackIndex(tracks);
  const set = new Set(ids);
  return ids.filter((id) => !trackPath(id, byId).slice(0, -1).some((a) => set.has(a.id)));
}

/** When each row begins: its lifespan's start, else its earliest event (counting its sub-rows'). */
function rowStarts(tracks: Track[], events: TimelineEvent[], setRowOf: (id: string) => string | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events)
    for (const t of e.tracks) {
      const r = setRowOf(t);
      if (r) out.set(r, Math.min(out.get(r) ?? Infinity, e.start));
    }
  for (const t of tracks) {
    // typed or worked out from phases; only its start matters, so the present doesn't
    const life = rawLifespan(t, 0);
    if (life && setRowOf(t.id) === t.id) out.set(t.id, life.start);
  }
  return out;
}

/** The set's rows in the chosen order. */
export function orderSet(tracks: Track[], events: TimelineEvent[], ids: string[], order: SetOrder): string[] {
  const picked = withoutNested(ids.filter((id) => tracks.some((t) => t.id === id)), tracks);
  if (order === 'picked' || picked.length < 2) return picked;
  const byId = trackIndex(tracks);
  const inSet = new Set(picked);
  const setRowOf = (id: string) => trackPath(id, byId).find((a) => inSet.has(a.id))?.id;
  const start = rowStarts(tracks, events, setRowOf);
  const pickedPos = new Map(picked.map((id, i) => [id, i]));
  const sorted = [...picked].sort((a, b) => (start.get(a) ?? Infinity) - (start.get(b) ?? Infinity) || pickedPos.get(a)! - pickedPos.get(b)!);
  if (order === 'start') return sorted;

  // ties between set rows: events on two or more of them, and links between events on them
  const rowsOf = new Map(events.map((e) => [e.uuid, [...new Set(e.tracks.map(setRowOf).filter((r): r is string => !!r))]]));
  const shared: string[][] = [];
  const links: [string[], string[]][] = [];
  for (const e of events) {
    const a = rowsOf.get(e.uuid)!;
    if (a.length > 1) shared.push(a);
    for (const l of e.links ?? []) {
      const b = rowsOf.get(l.to);
      if (a.length && b?.length && !(a.length === 1 && b.length === 1 && a[0] === b[0])) links.push([a, b]);
    }
  }
  // clusters of tied rows (union-find)
  const up = new Map(sorted.map((v) => [v, v]));
  const find = (v: string): string => {
    while (up.get(v) !== v) v = up.get(v)!;
    return v;
  };
  const join = (vs: string[]) => {
    for (const v of vs.slice(1)) {
      const a = find(vs[0]);
      const b = find(v);
      if (a !== b) up.set(b, a);
    }
  };
  for (const s of shared) join(s);
  for (const [a, b] of links) join([...a, ...b]);
  const clusters = new Map<string, string[]>();
  for (const v of sorted) clusters.set(find(v), [...(clusters.get(find(v)) ?? []), v]);
  // clusters by their middle row's start, so one long-lived cluster doesn't push every lone early row after it
  const rank = new Map(sorted.map((v, i) => [v, i]));
  const middle = (c: string[]) => rank.get(c[c.length >> 1])!;
  return [...clusters.values()]
    .sort((a, b) => middle(a) - middle(b) || rank.get(a[0])! - rank.get(b[0])!)
    .flatMap((c) => {
      const inside = new Set(c);
      return tighten(
        c,
        shared.filter((s) => inside.has(s[0])),
        links.filter(([a]) => inside.has(a[0])),
      );
    });
}

/** Total distance between related rows in an order. */
function spread(pos: Map<string, number>, shared: string[][], links: [string[], string[]][]): number {
  let total = 0;
  for (const s of shared) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of s) {
      const p = pos.get(v)!;
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    total += hi - lo;
  }
  for (const [a, b] of links) {
    let best = Infinity;
    for (const x of a) for (const y of b) best = Math.min(best, Math.abs(pos.get(x)! - pos.get(y)!));
    total += best;
  }
  return total;
}

/** Moves one row at a time to where it shortens the total distance most (ties: closer to start order), until none does. */
function tighten(rows: string[], shared: string[][], links: [string[], string[]][]): string[] {
  if (rows.length < 3) return rows;
  const rank = new Map(rows.map((v, i) => [v, i]));
  const cost = (o: string[]): [number, number] => [
    spread(new Map(o.map((v, i) => [v, i])), shared, links),
    o.reduce((s, v, i) => s + Math.abs(i - rank.get(v)!), 0),
  ];
  const better = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  let cur = [...rows];
  let best = cost(cur);
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let i = 0; i < cur.length; i++) {
      let bestHere: string[] | undefined;
      for (let j = 0; j < cur.length; j++) {
        if (j === i) continue;
        const cand = [...cur];
        const [v] = cand.splice(i, 1);
        cand.splice(j, 0, v);
        const c = cost(cand);
        if (better(c, best)) {
          best = c;
          bestHere = cand;
        }
      }
      if (bestHere) {
        cur = bestHere;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return cur;
}

/**
 * The rows to draw for a set: each picked row as a top-level row (keeping the chronology it inherited), followed by its
 * own sub-rows, in the given order.
 */
export function setTracks(tracks: Track[], ordered: string[]): Track[] {
  const byId = trackIndex(tracks);
  const kids = childrenMap(tracks);
  const order = treeOrder(tracks);
  const out: Track[] = [];
  for (const id of ordered) {
    const t = byId.get(id);
    if (!t) continue;
    const { parent: _parent, chronology: _own, ...rest } = t;
    const chronology = trackChronology(tracks, id);
    out.push({ ...rest, ...(chronology ? { chronology } : {}) });
    const below = new Set<string>();
    const visit = (p: string) => {
      for (const k of kids.get(p) ?? []) if (!below.has(k.id)) (below.add(k.id), visit(k.id));
    };
    visit(id);
    out.push(...order.filter((x) => below.has(x.id)));
  }
  return out;
}
