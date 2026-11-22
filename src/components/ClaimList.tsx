import { useFieldArray, type Control, type FieldValues, type UseFormRegister } from 'react-hook-form';
import type { Calendar, Dataset } from '../types.ts';
import type { ClaimValues } from '../lib/claims.ts';
import { MONTH_NAMES } from '../lib/subYear.ts';

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

/** A date's month (a select) and day, after its year: in editors of timelines dated in months and days. */
export function DayFields({ label, month, day }: { label: string; month: object; day: object }) {
  return (
    <>
      <select aria-label={`${label} month`} {...month}>
        <option value="">Month…</option>
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <input aria-label={`${label} day`} className="narrow" type="number" min={1} max={31} placeholder="Day" {...day} />
    </>
  );
}

/** Editable list of date claims. `owner` names what the claims date ("event" or "row"), for the chronology menu. */
export function ClaimList<T extends FieldValues>({
  name,
  control,
  register,
  data,
  owner = 'event',
  days = false,
}: {
  name: ClaimPath;
  control: Control<T>;
  register: UseFormRegister<T>;
  data: Dataset;
  /** Ask for each claim's month and day too. */
  days?: boolean;
  owner?: 'event' | 'row';
}) {
  // the form's other fields don't matter here; ClaimList only touches its own field array (typed loosely, since the
  // path may be nested)
  const ctl = control as unknown as Control<Record<string, ClaimValues[]>>;
  const reg = register as unknown as UseFormRegister<Record<string, string | number>>;
  const claims = useFieldArray({ control: ctl, name });
  const cal = data.meta.calendar;
  const chronologies = Object.entries(data.chronologies ?? {});
  // a real list, so a screen reader says how many claims there are and which one it is in ("2 of 3")
  const which = name.endsWith('endDates') ? 'end' : 'start';
  return (
    <div className="claims">
      {claims.fields.length > 0 && (
        <ul className="claim-list" aria-label={`Dated claims for the ${which}`}>
      {claims.fields.map((f, i) => (
        <li key={f.id} className="claim">
          <div className="row">
            <input aria-label="Year" type="number" min={0} {...reg(`${name}.${i}.year`, { valueAsNumber: true })} />
            <EraSelect cal={cal} label="Era" reg={reg(`${name}.${i}.era`)} />
            {days && <DayFields label="Claim" month={reg(`${name}.${i}.month`)} day={reg(`${name}.${i}.day`)} />}
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
            <button
              type="button"
              className="icon"
              onClick={() => claims.remove(i)}
              aria-label={`Remove claim ${i + 1}`}
              title={`Remove claim ${i + 1}`}
            >
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
        </li>
      ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          claims.append({
            year: 0,
            era: cal.yearZero ? 'after' : 'before',
            margin: '',
            month: '',
            day: '',
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
