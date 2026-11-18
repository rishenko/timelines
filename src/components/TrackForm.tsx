import { useForm } from 'react-hook-form';
import type { Dataset, Track } from '../types.ts';
import { nextTrackColor, slug, trackDeletion, uniqueId } from '../state/edits.ts';
import { isDescendant, trackDepth } from '../lib/tracks.ts';
import { formatYear, parseDate } from '../lib/calendar.ts';

interface FormValues {
  id: string;
  name: string;
  color: string;
  parent: string;
  image: string;
  chronology: string;
  spanStart: string;
  spanEnd: string;
  pinLast: boolean;
}

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
      // keep date claims if the dates themselves didn't change
      const old = initial?.span;
      t.span = { start: s.year, end: e.year };
      if (s.circa || e.circa) t.span.circa = true;
      if (old?.startDates && old.start === s.year) t.span.startDates = old.startDates;
      if (old?.endDates && old.end === e.year) t.span.endDates = old.endDates;
    }
    onSave(t, initial?.id);
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
        <button className="icon" onClick={onCancel} title="Cancel">
          ✕
        </button>
      </header>
      <p className="muted">
        Each track is a row on the timeline: a faction, a nation, a civilization, a dynasty. Tracks nest up to three
        levels deep (e.g. region → civilization → period), and a parent can be collapsed to fold its sub-tracks in.
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
        </fieldset>

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
