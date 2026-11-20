// Row (track) helpers for the data scripts: putting rows in a new order and choosing which open collapsed.
// Rows are listed depth-first in a source file: each row, then its sub-rows. Used by scripts/reorder-regions.ts,
// archive/scripts/additions/groups.ts and archive/scripts/classical/collapsed.ts.

export type Row = { id: string; parent?: string };

/**
 * Rebuilds a row list depth-first. `order` gives the order of the children of some parents (`undefined` is the
 * top level); every other set of siblings keeps its current order. A listed id that isn't a child of that parent
 * is an error, as is losing rows (a parent cycle).
 */
export function orderRows<T extends Row>(rows: T[], order: Map<string | undefined, string[]>): T[] {
  const kids = (id: string | undefined) => {
    const ks = rows.filter((t) => t.parent === id);
    const o = order.get(id);
    if (!o) return ks;
    return o.map((x) => {
      const k = ks.find((t) => t.id === x);
      if (!k) throw new Error(`"${x}" is not a row under ${id ?? 'the top level'}`);
      return k;
    });
  };
  const out: T[] = [];
  const visit = (t: T) => {
    out.push(t);
    for (const k of kids(t.id)) visit(k);
  };
  for (const t of kids(undefined)) visit(t);
  if (out.length !== rows.length) throw new Error(`lost rows while ordering (${rows.length} → ${out.length}); check the order lists and for parent cycles`);
  return out;
}

/**
 * The opening overview both historical timelines use: groups (top-level rows) stay expanded and every region inside
 * a group that has sub-rows starts collapsed, so each region row leads with its key events.
 */
export function regionsWithSubRows(rows: Row[]): string[] {
  const tops = new Set(rows.filter((t) => !t.parent).map((t) => t.id));
  const hasKids = (id: string) => rows.some((t) => t.parent === id);
  return rows.filter((t) => t.parent && tops.has(t.parent) && hasKids(t.id)).map((t) => t.id);
}
