import { useFieldArray, type Control, type FieldValues, type UseFormRegister } from 'react-hook-form';
import type { Calendar, Dataset } from '../types.ts';
import type { ClaimValues } from '../lib/claims.ts';

/**
 * Editing date claims (what each source says a date is), shared by the event form and the track form (lifespans).
 * A form keeps each list of claims in a field array of ClaimValues (lib/claims.ts): `startDates` and `endDates` at the
 * top of the form, or nested, like a row's phases (`phases.2.startDates`).
 */

/** Where a list of claims sits in a form's values. */
export type ClaimPath = 'startDates' | 'endDates' | `phases.${number}.startDates` | `phases.${number}.endDates`;

/** What saving would break, listed above a form's buttons; nothing when there is nothing. */
export function ProblemList({ problems }: { problems: string[] }) {
  if (!problems.length) return null;
  return (
    <div className="form-problems" role="alert">
      <p>This can't be saved yet:</p>
      <ul>
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export function EraSelect({ cal, label, reg }: { cal: Calendar; label: string; reg: object }) {
  return (
    <select aria-label={label} {...reg}>
      <option value="after">{cal.after}</option>
      <option value="before">{cal.before}</option>
    </select>
  );
}

/** Editable list of date claims. `owner` names what the claims date ("event" or "row"), for the chronology menu. */
export function ClaimList<T extends FieldValues>({
  name,
  control,
  register,
  data,
  owner = 'event',
}: {
  name: ClaimPath;
  control: Control<T>;
  register: UseFormRegister<T>;
  data: Dataset;
  owner?: 'event' | 'row';
}) {
  // the form's other fields don't matter here; ClaimList only touches its own field array (typed loosely, since the
  // path may be nested)
  const ctl = control as unknown as Control<Record<string, ClaimValues[]>>;
  const reg = register as unknown as UseFormRegister<Record<string, string | number>>;
  const claims = useFieldArray({ control: ctl, name });
  const cal = data.meta.calendar;
  const chronologies = Object.entries(data.chronologies ?? {});
  return (
    <div className="claims">
      {claims.fields.map((f, i) => (
        <div key={f.id} className="claim">
          <div className="row">
            <input aria-label="Year" type="number" min={0} {...reg(`${name}.${i}.year`, { valueAsNumber: true })} />
            <EraSelect cal={cal} label="Era" reg={reg(`${name}.${i}.era`)} />
            <span className="muted">±</span>
            <input aria-label="Margin in years" className="narrow" placeholder="0" {...reg(`${name}.${i}.margin`)} />
            {chronologies.length > 0 && (
              <select aria-label="Chronology" {...reg(`${name}.${i}.chronology`)}>
                <option value="">({owner}'s chronology)</option>
                {chronologies.map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="icon" onClick={() => claims.remove(i)} aria-label="Remove" title="Remove">
              ✕
            </button>
          </div>
          <div className="row">
            <select aria-label="Source" {...reg(`${name}.${i}.sourceKey`)}>
              <option value="">Source…</option>
              {Object.entries(data.sources).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.name}
                </option>
              ))}
            </select>
            <input aria-label="Location in source" placeholder="p. 12" {...reg(`${name}.${i}.sourceLocation`)} />
          </div>
          <input aria-label="Note" placeholder="Note (optional)" {...reg(`${name}.${i}.note`)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          claims.append({
            year: 0,
            era: cal.yearZero ? 'after' : 'before',
            margin: '',
            chronology: '',
            sourceKey: '',
            sourceLocation: '',
            note: '',
          })
        }
      >
        + Add a dated claim
      </button>
    </div>
  );
}
