import { useState } from 'react';
import { useFieldArray, useForm, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import type { Calendar, Dataset, Track, TrackPhase } from '../types.ts';
import { newProblems, nextTrackColor, slug, trackDeletion, uniqueId, upsertTrack } from '../state/edits.ts';
import { ClaimList, ProblemList } from './ClaimList.tsx';
import { claimsFromValues, toClaimValues, type ClaimFields, type ClaimValues } from '../lib/claims.ts';
import { isDescendant, trackDepth } from '../lib/tracks.ts';
import { formatYear, parseDate } from '../lib/calendar.ts';

interface FormValues extends ClaimFields {
  id: string;
  name: string;
  color: string;
  parent: string;
  image: string;
  chronology: string;
  spanStart: string;
  spanEnd: string;
  pinLast: boolean;
  phases: PhaseValues[];
}

/** One phase in the form: dates as typed (e.g. "c. 4500 AE"), plus its claims. */
interface PhaseValues {
  name: string;
  start: string;
  end: string;
  startDates: ClaimValues[];
  endDates: ClaimValues[];
}

const toPhaseValues = (p: TrackPhase, cal: Calendar): PhaseValues => ({
  name: p.name,
  start: formatYear(p.start, cal, p.circa),
  end: formatYear(p.end, cal, p.circa),
  startDates: (p.startDates ?? []).map((c) => toClaimValues(c, cal)),
  endDates: (p.endDates ?? []).map((c) => toClaimValues(c, cal)),
});

interface Props {
  /** Track being edited, or null to create one. */
  initial: Track | null;
  /** Preselected parent when creating a sub-track. */
  defaultParent?: string;
  data: Dataset;
  onSave: (t: Track, previousId?: string) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export function TrackForm({ initial, defaultParent, data, onSave, onDelete, onCancel }: Props) {
  const isNew = !initial;
  const cal = data.meta.calendar;
  const fmt = (y: number, circa?: boolean) => formatYear(y, cal, circa);
  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      id: initial?.id ?? '',
      name: initial?.name ?? '',
      color: initial?.color ?? nextTrackColor(data.tracks),
      parent: initial?.parent ?? defaultParent ?? '',
      image: initial?.image ?? '',
      chronology: initial?.chronology ?? '',
      spanStart: initial?.span ? fmt(initial.span.start, initial.span.circa) : '',
      spanEnd: initial?.span ? fmt(initial.span.end, initial.span.circa) : '',
      pinLast: !!initial?.pinLast,
      startDates: (initial?.span?.startDates ?? []).map((c) => toClaimValues(c, cal)),
      endDates: (initial?.span?.endDates ?? []).map((c) => toClaimValues(c, cal)),
      phases: (initial?.phases ?? []).map((p) => toPhaseValues(p, cal)),
    },
  });
  // A track can sit under any track except itself and its own descendants (rows nest to any depth).
  const parents = data.tracks.filter((t) => t.id !== initial?.id && !(initial && isDescendant(data.tracks, t.id, initial.id)));
  const name = watch('name');
  const idValue = watch('id');
  const otherIds = data.tracks.filter((t) => t.id !== initial?.id).map((t) => t.id);
  const previewId = idValue ? slug(idValue) : uniqueId(name, otherIds);
  const chronologies = Object.entries(data.chronologies ?? {});
  const example = fmt(data.meta.calendar.yearZero ? 4500 : -1499);
  /** What saving would break (e.g. a lifespan date outside its claims); shown above the buttons. */
  const [problems, setProblems] = useState<string[]>([]);

  const submit = (v: FormValues) => {
    const id = v.id ? slug(v.id) : uniqueId(v.name, otherIds);
    if (!id) return setError('id', { message: 'Id is required.' });
    if (otherIds.includes(id)) return setError('id', { message: `A track with id "${id}" already exists.` });
    const t: Track = { id, name: v.name.trim(), color: v.color };
    if (v.parent) t.parent = v.parent;
    if (v.image.trim()) t.image = v.image.trim();
    if (v.chronology) t.chronology = v.chronology;
    if (v.pinLast) t.pinLast = true;
    if (v.spanStart.trim() || v.spanEnd.trim()) {
      const s = parseDate(v.spanStart, cal);
      const e = parseDate(v.spanEnd, cal);
      if (!s) return setError('spanStart', { message: `Write a year like "${example}".` });
      if (!e) return setError('spanEnd', { message: `Write a year like "${example}".` });
      if (e.year < s.year) return setError('spanEnd', { message: 'The end is before the start.' });
      t.span = { start: s.year, end: e.year };
      if (s.circa || e.circa) t.span.circa = true;
      const startDates = claimsFromValues(v.startDates, cal);
      const endDates = claimsFromValues(v.endDates, cal);
      if (startDates) t.span.startDates = startDates;
      if (endDates) t.span.endDates = endDates;
    } else if (v.startDates.length || v.endDates.length) {
      return setError('spanStart', { message: 'Give the lifespan a start and an end, or remove its date claims.' });
    }
    const phases: TrackPhase[] = [];
    for (const [i, p] of v.phases.entries()) {
      if (!p.name.trim()) return setError(`phases.${i}.name`, { message: 'Give the phase a name.' });
      const s = parseDate(p.start, cal);
      const e = parseDate(p.end, cal);
      if (!s) return setError(`phases.${i}.start`, { message: `Write a year like "${example}".` });
      if (!e) return setError(`phases.${i}.end`, { message: `Write a year like "${example}".` });
      if (e.year < s.year) return setError(`phases.${i}.end`, { message: 'The end is before the start.' });
      const phase: TrackPhase = { name: p.name.trim(), start: s.year, end: e.year };
      if (s.circa || e.circa) phase.circa = true;
      const startDates = claimsFromValues(p.startDates, cal);
      const endDates = claimsFromValues(p.endDates, cal);
      if (startDates) phase.startDates = startDates;
      if (endDates) phase.endDates = endDates;
      phases.push(phase);
    }
    // stored in date order, whatever order they were typed in
    if (phases.length) t.phases = phases.sort((a, b) => a.start - b.start || a.end - b.end);
    const found = newProblems(data, upsertTrack(data, t, initial?.id));
    setProblems(found);
    if (!found.length) onSave(t, initial?.id);
  };

  const del = () => {
    if (!initial) return;
    const info = trackDeletion(data, initial.id);
    if (info.blocked) {
      window.alert(`Can't delete "${initial.name}". ${info.blocked}`);
      return;
    }
    const parts = [`Delete the track "${initial.name}"?`];
    if (info.orphaned) parts.push(`${info.orphaned} event(s) belong only to this track and will be deleted too.`);
    if (info.shared) parts.push(`${info.shared} event(s) shared with other tracks will just lose this one.`);
    if (window.confirm(parts.join('\n\n'))) onDelete(initial.id);
  };

  return (
    <aside className="side-panel editor">
      <header>
        <h2>{isNew ? 'New track' : `Edit track: ${initial.name}`}</h2>
        <button className="icon" onClick={onCancel} aria-label="Cancel" title="Cancel">
          ✕
        </button>
      </header>
      <p className="muted">
        Each track is a row on the timeline: a faction, a nation, a civilization, a dynasty. Tracks nest to any depth
        (e.g. region → civilization → period), and a parent can be collapsed to fold its sub-tracks in.
      </p>
      <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="tr-name">Name</label>
        <input id="tr-name" {...register('name', { required: 'Name is required.' })} autoFocus />
        {errors.name && <p role="alert">{errors.name.message}</p>}

        <label htmlFor="tr-color">Color</label>
        <input id="tr-color" type="color" {...register('color')} />

        <label htmlFor="tr-parent">Parent</label>
        <select id="tr-parent" {...register('parent')}>
          <option value="">(none: a top-level track)</option>
          {parents.map((t) => (
            <option key={t.id} value={t.id}>
              {'— '.repeat(trackDepth(data.tracks, t.id))}
              {t.name}
            </option>
          ))}
        </select>

        <fieldset>
          <legend>Lifespan (optional)</legend>
          <p className="muted small">Shaded across the row. Write "c." for approximate dates, e.g. "c. {example}".</p>
          <div className="row">
            <input aria-label="Lifespan start" placeholder="From" {...register('spanStart')} />
            <input aria-label="Lifespan end" placeholder="To" {...register('spanEnd')} />
          </div>
          {errors.spanStart && <p role="alert">{errors.spanStart.message}</p>}
          {errors.spanEnd && <p role="alert">{errors.spanEnd.message}</p>}
          <details open={!!(initial?.span?.startDates?.length || initial?.span?.endDates?.length)}>
            <summary>Dated claims</summary>
            <p className="muted small">
              What each source says the start and end are. The shaded ends of the lifespan show the range they give.
            </p>
            <h4>Start</h4>
            <ClaimList name="startDates" control={control} register={register} data={data} owner="row" />
            <h4>End</h4>
            <ClaimList name="endDates" control={control} register={register} data={data} owner="row" />
          </details>
        </fieldset>

        <PhaseList control={control} register={register} errors={errors} data={data} example={example} />

        {chronologies.length > 0 && (
          <>
            <label htmlFor="tr-chron">Chronology</label>
            <select id="tr-chron" {...register('chronology')}>
              <option value="">(inherit from parent)</option>
              {chronologies.map(([id, c]) => (
                <option key={id} value={id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="tr-image">Image link (optional)</label>
        <input id="tr-image" placeholder="https://… or timelines/…/logo.svg" {...register('image')} />

        <label className="check">
          <input type="checkbox" {...register('pinLast')} /> Keep at the bottom (e.g. "REDACTED", "Other")
        </label>

        <details>
          <summary>Id: {previewId || '…'}</summary>
          <p className="muted small">
            Used in the data file and links. Leave blank to derive it from the name. Changing it updates every event
            on this track.
          </p>
          <input aria-label="Track id" placeholder={previewId} {...register('id')} />
          {errors.id && <p role="alert">{errors.id.message}</p>}
        </details>

        <ProblemList problems={problems} />
        <footer>
          <button type="submit" className="primary">
            {isNew ? 'Create track' : 'Save track'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          {!isNew && (
            <button type="button" className="danger push-right" onClick={del}>
              Delete
            </button>
          )}
        </footer>
      </form>
    </aside>
  );
}

/**
 * The row's phases: named periods drawn on its own bar, such as successive governments (a kingdom, then a republic,
 * then an empire). Each has a name, dates, and optional dated claims for its start and end.
 */
function PhaseList({
  control,
  register,
  errors,
  data,
  example,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  data: Dataset;
  example: string;
}) {
  const phases = useFieldArray({ control, name: 'phases' });
  return (
    <fieldset className="phases">
      <legend>Phases (optional)</legend>
      <p className="muted small">
        Named periods on this row's own bar, such as successive governments: a kingdom, then a republic. A line marks
        each change and the name runs along the top of the row. Leave a gap where nothing is known; phases may overlap,
        as rival governments do in a civil war.
      </p>
      {phases.fields.map((f, i) => {
        const err = errors.phases?.[i];
        return (
          <div key={f.id} className="phase">
            <div className="row">
              <input aria-label="Phase name" placeholder="Name, e.g. Second Republic" {...register(`phases.${i}.name`)} />
              <button type="button" className="icon" onClick={() => phases.remove(i)} aria-label="Remove this phase" title="Remove this phase">
                ✕
              </button>
            </div>
            {err?.name && <p role="alert">{err.name.message}</p>}
            <div className="row">
              <input aria-label="Phase start" placeholder="From" {...register(`phases.${i}.start`)} />
              <input aria-label="Phase end" placeholder="To" {...register(`phases.${i}.end`)} />
            </div>
            {err?.start && <p role="alert">{err.start.message}</p>}
            {err?.end && <p role="alert">{err.end.message}</p>}
            {/* folded, so a row with many phases stays short; the count says what is inside */}
            <details>
              <summary>Dated claims{f.startDates.length + f.endDates.length ? ` (${f.startDates.length + f.endDates.length})` : ''}</summary>
              <p className="muted small">What each source says this phase's start and end are.</p>
              <h4>Start</h4>
              <ClaimList name={`phases.${i}.startDates`} control={control} register={register} data={data} owner="row" />
              <h4>End</h4>
              <ClaimList name={`phases.${i}.endDates`} control={control} register={register} data={data} owner="row" />
            </details>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => phases.append({ name: '', start: '', end: '', startDates: [], endDates: [] })}
        title={`Dates are written like "${example}"`}
      >
        + Add a phase
      </button>
    </fieldset>
  );
}
