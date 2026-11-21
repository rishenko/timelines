import { useMemo, useState } from 'react';
import type { Dataset } from '../types.ts';
import { orderSet, setTracks, withoutNested, type SetOrder } from '../lib/sets.ts';

/**
 * The comparison set (lib/sets.ts): the rows the reader picked, the order, and whether the chart shows the set or the
 * whole timeline. A link with `?set=` opens on the set. Off in edit mode, where rows are edited in their own place.
 */
export function useComparison(data: Dataset, initial: { set: string[]; order: SetOrder }, editMode: boolean) {
  const [rows, setRows] = useState<string[]>(initial.set);
  const [order, setOrder] = useState<SetOrder>(initial.order);
  const [viewing, setViewing] = useState(initial.set.length > 0);

  const ordered = useMemo(() => orderSet(data.tracks, data.events, rows, order), [data.tracks, data.events, rows, order]);
  const active = viewing && !editMode && ordered.length > 0;
  /** The rows to draw while the set is shown: the picked rows at the top level, with their own sub-rows. */
  const tracks = useMemo(() => (active ? setTracks(data.tracks, ordered) : null), [active, data.tracks, ordered]);
  /** `false` for every row outside the set, to lay over the reader's own row toggles (events and search follow). */
  const overlay = useMemo<Record<string, false>>(() => {
    if (!tracks) return {};
    const drawn = new Set(tracks.map((t) => t.id));
    return Object.fromEntries(data.tracks.filter((t) => !drawn.has(t.id)).map((t) => [t.id, false]));
  }, [tracks, data.tracks]);
  const inSet = useMemo(() => new Set(rows), [rows]);

  const toggle = (id: string) => setRows((r) => (r.includes(id) ? r.filter((x) => x !== id) : withoutNested([...r, id], data.tracks)));
  const add = (id: string) => setRows((r) => (r.includes(id) ? r : withoutNested([...r, id], data.tracks)));
  /** Starts a new set (from a region filter): these rows, in this order, shown at once. */
  const replace = (ids: string[], o: SetOrder) => {
    setRows(withoutNested(ids, data.tracks));
    setOrder(o);
    setViewing(true);
  };
  const clear = () => {
    setRows([]);
    setViewing(false);
  };
  return { rows, ordered, order, setOrder, viewing, setViewing, active, tracks, overlay, inSet, toggle, add, replace, clear };
}
