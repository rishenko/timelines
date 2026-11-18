import { useEffect, useRef, useState } from 'react';
import type { Chronology } from '../types.ts';
import type { ChronologySelection } from '../lib/chronology.ts';

interface Props {
  /** Each group with more than one dating system, in display order. */
  groups: [string, { id: string; c: Chronology }[]][];
  selection: ChronologySelection;
  defaults: ChronologySelection;
  onChange: (group: string, id: string) => void;
  onReset: () => void;
}

/**
 * One toolbar button for all dating systems (chronologies), which used to sit in the toolbar as one menu per
 * region and wrapped it onto a second row. The button says how many regions differ from their default.
 */
export function DatingMenu({ groups, selection, defaults, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const changed = groups.filter(([g]) => selection[g] !== defaults[g]).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!groups.length) return null;
  return (
    <div className="dating-menu" ref={ref}>
      <button
        className={open || changed ? 'on' : ''}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Dating systems: scholars disagree on some regions' dates; pick which chronology to plot"
      >
        Dating{changed ? ` · ${changed} changed` : ''} ▾
      </button>
      {open && (
        <div className="dating-pop" role="dialog" aria-label="Dating systems">
          <p className="muted small">Scholars disagree on some regions’ dates. Pick the dating system to plot for each.</p>
          {groups.map(([g, list]) => (
            <label key={g} className="chron-select">
              <span>{g}</span>
              <select value={selection[g]} onChange={(e) => onChange(g, e.target.value)}>
                {list.map(({ id, c }) => (
                  <option key={id} value={id}>
                    {c.name}
                    {id === defaults[g] ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {changed > 0 && (
            <button className="linklike" onClick={onReset}>
              Reset to defaults
            </button>
          )}
        </div>
      )}
    </div>
  );
}
