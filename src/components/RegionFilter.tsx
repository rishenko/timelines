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
  /** Rows the ticked regions show, to start a comparison set from (absent while no region is ticked). */
  rowCount?: number;
  onMakeSet?: () => void;
  /** A comparison set is shown, so the region filter doesn't apply for now. */
  paused?: boolean;
  /** The same tree for another facet (Filters → Categories): its heading, what it counts, and its help line. */
  heading?: string;
  noun?: [string, string];
  help?: string;
  /** The ▸ button's name for a value's narrower values (default "the regions in Near East"). */
  foldName?: (name: string) => string;
  /** Before each value's name (a category's glyph). */
  icon?: (id: string) => React.ReactNode;
}

/**
 * Filters → Regions: the timeline's regions as a tree, broad regions first with the narrower ones folded under them,
 * each with a checkbox and its row count. Ticking a region includes the regions inside it, which show as ticked and
 * can't be unticked on their own.
 */
export function RegionFilter({ tree, picked, containing, editMode, onToggle, onClear, rowCount, onMakeSet, paused, heading = 'Regions', noun = ['row', 'rows'], help, foldName, icon }: Props) {
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
    const label = `${n.name} (${n.rows} ${n.rows === 1 ? noun[0] : noun[1]})`;
    return (
      <li key={n.id}>
        <span className="region-line">
          {n.children.length > 0 ? (
            <button
              className="icon small fold"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} ${foldName?.(n.name) ?? `the regions in ${n.name}`}`}
              title={`${isOpen ? 'Hide' : 'Show'} ${foldName?.(n.name) ?? `the regions in ${n.name}`}`}
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
            {icon?.(n.id)}
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
        {heading}
        {picked.length > 0 && !editMode && (
          <span className="bulk">
            <button onClick={onClear}>clear</button>
          </span>
        )}
      </h3>
      <ul className="region-tree" aria-label={heading}>
        {tree.map((n) => node(n))}
      </ul>
      {onMakeSet && !!rowCount && (
        <button className="make-set" onClick={onMakeSet} title="Show these rows side by side, related rows together">
          Compare these {rowCount} rows
        </button>
      )}
      <p className="muted small">
        {help ?? 'Tick regions to show only their rows. Each row’s regions come from its sources; ▸ opens the regions inside one.'}
        {editMode && ' Off while editing, so every row can be reached.'}
        {paused && !editMode && ' Paused while a comparison is shown.'}
      </p>
    </section>
  );
}
