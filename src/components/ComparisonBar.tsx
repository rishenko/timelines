import { useId, useState, type FormEvent } from 'react';
import type { SetOrder } from '../lib/sets.ts';

interface Props {
  /** The set's rows, in the order shown. */
  rows: { id: string; name: string }[];
  /** Rows that can be added (every row not in the set), for the "Add a row" box. */
  candidates: { id: string; name: string }[];
  order: SetOrder;
  onOrder: (o: SetOrder) => void;
  /** The chart shows the set (else the whole timeline, with the set kept). */
  viewing: boolean;
  onView: (on: boolean) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const ORDER_LABELS: Record<SetOrder, string> = {
  picked: 'As picked',
  related: 'Related rows together',
  start: 'By start date',
};

/**
 * The comparison set, above the chart: while it is shown, its rows (each removable), the order, a box to add a row by
 * name, and the way back to the whole timeline; while the whole timeline is shown, a reminder with the way back to
 * the set.
 */
export function ComparisonBar(p: Props) {
  const listId = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const n = p.rows.length;
  const rows = `${n} ${n === 1 ? 'row' : 'rows'}`;

  const add = (e: FormEvent) => {
    e.preventDefault();
    const want = text.trim().toLowerCase();
    const hit = p.candidates.find((c) => c.name.toLowerCase() === want);
    if (!hit) {
      setError(want ? `No row is called “${text.trim()}”.` : 'Type or pick a row’s name.');
      return;
    }
    p.onAdd(hit.id);
    setText('');
    setError('');
  };

  if (!p.viewing)
    return (
      <div className="comparison-bar" role="region" aria-label="Comparison">
        <span>Comparison: {rows}</span>
        <button onClick={() => p.onView(true)}>Show the comparison</button>
        <button className="linklike" onClick={p.onClear}>
          Clear it
        </button>
      </div>
    );

  return (
    <div className="comparison-bar on" role="region" aria-label="Comparison">
      <div className="comparison-head">
        <strong>Comparing {rows}</strong>
        <label>
          Order{' '}
          <select value={p.order} onChange={(e) => p.onOrder(e.target.value as SetOrder)}>
            {(Object.keys(ORDER_LABELS) as SetOrder[]).map((o) => (
              <option key={o} value={o}>
                {ORDER_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={add} className="comparison-add">
          <label className="sr-only" htmlFor={`${listId}-input`}>
            Add a row
          </label>
          <input
            id={`${listId}-input`}
            list={listId}
            value={text}
            placeholder="Add a row…"
            aria-invalid={!!error}
            aria-describedby={error ? `${listId}-error` : undefined}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
          />
          <datalist id={listId}>
            {p.candidates.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <button type="submit">Add</button>
          {error && (
            <span id={`${listId}-error`} role="alert" className="comparison-error small">
              {error}
            </span>
          )}
        </form>
        <span className="spacer" />
        <button onClick={() => p.onView(false)}>Show the whole timeline</button>
        <button className="linklike" onClick={p.onClear}>
          Clear the comparison
        </button>
      </div>
      <ul className="comparison-rows" aria-label="Rows in the comparison">
        {p.rows.map((r) => (
          <li key={r.id}>
            {r.name}
            <button className="icon small" aria-label={`Remove ${r.name}`} title={`Remove ${r.name} from the comparison`} onClick={() => p.onRemove(r.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
