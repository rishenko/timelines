import { useState } from 'react';
import type { RegionNode } from '../lib/regions.ts';

interface Props {
  tree: RegionNode[];
  /** Ticked regions. */
  picked: string[];
  /** The regions a region sits inside (a ticked one includes it). */
  containing: (id: string) => Set<string>;
  /** Edit mode: the filter is off so every row can be reached. */
  editMode: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
}

/**
 * Filters → Regions: the timeline's regions as a tree, broad regions first with the narrower ones folded under them,
 * each with a checkbox and its row count. Ticking a region includes the regions inside it, which show as ticked and
 * can't be unticked on their own.
 */
export function RegionFilter({ tree, picked, containing, editMode, onToggle, onClear }: Props) {
  // open the branches holding a ticked region, so the reader sees what is ticked
  const [open, setOpen] = useState<Set<string>>(() => new Set(picked.flatMap((id) => [...containing(id)])));
  const flip = (id: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const pickedSet = new Set(picked);

  const node = (n: RegionNode, insideTicked?: string) => {
    const ticked = pickedSet.has(n.id);
    const isOpen = open.has(n.id);
    const label = `${n.name} (${n.rows} ${n.rows === 1 ? 'row' : 'rows'})`;
    return (
      <li key={n.id}>
        <span className="region-line">
          {n.children.length > 0 ? (
            <button
              className="icon small fold"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} the regions in ${n.name}`}
              title={`${isOpen ? 'Hide' : 'Show'} the regions in ${n.name}`}
              onClick={() => flip(n.id)}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="fold-space" />
          )}
          <label className="check" title={insideTicked ? `Included: it is part of ${insideTicked}` : undefined}>
            <input
              type="checkbox"
              checked={ticked || !!insideTicked}
              disabled={editMode || !!insideTicked}
              onChange={() => onToggle(n.id)}
            />
            <span>{label}</span>
          </label>
        </span>
        {n.children.length > 0 && isOpen && <ul>{n.children.map((c) => node(c, insideTicked ?? (ticked ? n.name : undefined)))}</ul>}
      </li>
    );
  };

  return (
    <section className="region-filter">
      <h3>
        Regions
        {picked.length > 0 && !editMode && (
          <span className="bulk">
            <button onClick={onClear}>clear</button>
          </span>
        )}
      </h3>
      <ul className="region-tree" aria-label="Regions">
        {tree.map((n) => node(n))}
      </ul>
      <p className="muted small">
        Tick regions to show only their rows. Each row’s regions come from its sources; ▸ opens the regions inside one.
        {editMode && ' Off while editing, so every row can be reached.'}
      </p>
    </section>
  );
}
