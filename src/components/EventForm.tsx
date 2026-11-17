import { useState } from 'react';
import { useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form';
import {
  LINK_KINDS,
  type Calendar,
  type DateClaim,
  type Dataset,
  type EventLink,
  type SourceRef,
  type TimelineEvent,
} from '../types.ts';
import { compareEvents } from '../lib/years.ts';
import { formatYear, fromStored, toStored, type EraSide } from '../lib/calendar.ts';
import { eventChronology } from '../lib/chronology.ts';
import { customTags, nextTrackColor, trackDepth, uniqueId } from '../state/edits.ts';
import { MAX_DEPTH } from '../data/validate.ts';
import type { Source, Track } from '../types.ts';
import { LINK_LABEL } from './linkLabels.ts';

interface ClaimValues {
  year: number;
  era: EraSide;
  margin: string;
  chronology: string;
  sourceKey: string;
  sourceLocation: string;
  note: string;
}

interface FormValues {
  uuid: string;
  title: string;
  descr: string;
  startYear: number;
  startEra: EraSide;
  hasEnd: boolean;
  endYear: number;
  endEra: EraSide;
  ongoing: boolean;
  circa: boolean;
  chronology: string;
  order: string;
  tracks: string[];
  sources: SourceRef[];
  links: EventLink[];
  startDates: ClaimValues[];
  endDates: ClaimValues[];
}

const toClaimValues = (c: DateClaim, cal: Calendar): ClaimValues => {
  const d = fromStored(c.year, cal);
  return {
    year: d.year,
    era: d.era,
    margin: c.margin === undefined ? '' : String(c.margin),
    chronology: c.chronology ?? '',
    sourceKey: c.source?.sourceKey ?? '',
    sourceLocation: c.source?.sourceLocation ?? '',
    note: c.note ?? '',
  };
};

const fromClaimValues = (v: ClaimValues, cal: Calendar): DateClaim | null => {
  if (!Number.isFinite(Number(v.year))) return null;
  const c: DateClaim = { year: toStored(Number(v.year), v.era, cal) };
  if (v.margin.trim() !== '' && Number(v.margin) >= 0) c.margin = Number(v.margin);
  if (v.chronology) c.chronology = v.chronology;
  if (v.sourceKey) c.source = { sourceKey: v.sourceKey, sourceLocation: v.sourceLocation };
  if (v.note.trim()) c.note = v.note.trim();
  return c;
};

function toForm(e: TimelineEvent, cal: Calendar): FormValues {
  const s = fromStored(e.start, cal);
  const end = fromStored(e.end ?? e.start, cal);
  return {
    uuid: e.uuid,
    title: e.title,
    descr: e.descr,
    startYear: s.year,
    startEra: s.era,
    hasEnd: e.end !== undefined && e.end !== e.start,
    endYear: end.year,
    endEra: end.era,
    ongoing: !!e.ongoing,
    circa: !!e.circa,
    chronology: e.chronology ?? '',
    order: e.order === undefined ? '' : String(e.order),
    tracks: [...e.tracks],
    sources: e.sources.map((x) => ({ ...x })),
    links: (e.links ?? []).map((x) => ({ ...x })),
    startDates: (e.startDates ?? []).map((c) => toClaimValues(c, cal)),
    endDates: (e.endDates ?? []).map((c) => toClaimValues(c, cal)),
  };
}

function fromForm(v: FormValues, cal: Calendar): TimelineEvent {
  const start = toStored(Number(v.startYear), v.startEra, cal);
  const e: TimelineEvent = {
    uuid: v.uuid,
    title: v.title.trim(),
    descr: v.descr.trim(),
    start,
    tracks: [...new Set(v.tracks)],
    sources: v.sources.filter((s) => s.sourceKey),
  };
  if (v.ongoing) e.ongoing = true;
  else if (v.hasEnd) {
    const end = toStored(Number(v.endYear), v.endEra, cal);
    if (end !== start) e.end = end;
  }
  if (v.circa) e.circa = true;
  if (v.chronology) e.chronology = v.chronology;
  if (v.order.trim() !== '') e.order = Number(v.order);
  const starts = v.startDates.map((c) => fromClaimValues(c, cal)).filter((c) => c !== null);
  if (starts.length) e.startDates = starts;
  const ends = v.endDates.map((c) => fromClaimValues(c, cal)).filter((c) => c !== null);
  if (ends.length && e.end !== undefined) e.endDates = ends;
  const links = v.links.filter((l) => l.to && l.to !== v.uuid);
  if (links.length) e.links = links;
  return e;
}

function EraSelect({ cal, label, reg }: { cal: Calendar; label: string; reg: ReturnType<UseFormRegister<FormValues>> }) {
  return (
    <select aria-label={label} {...reg}>
      <option value="after">{cal.after}</option>
      <option value="before">{cal.before}</option>
    </select>
  );
}

/** Editable list of date claims (what each source says the date is). */
function ClaimList({
  name,
  control,
  register,
  data,
}: {
  name: 'startDates' | 'endDates';
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  data: Dataset;
}) {
  const claims = useFieldArray({ control, name });
  const cal = data.meta.calendar;
  const chronologies = Object.entries(data.chronologies ?? {});
  return (
    <div className="claims">
      {claims.fields.map((f, i) => (
        <div key={f.id} className="claim">
          <div className="row">
            <input aria-label="Year" type="number" min={0} {...register(`${name}.${i}.year`, { valueAsNumber: true })} />
            <EraSelect cal={cal} label="Era" reg={register(`${name}.${i}.era`)} />
            <span className="muted">±</span>
            <input aria-label="Margin in years" className="narrow" placeholder="0" {...register(`${name}.${i}.margin`)} />
            {chronologies.length > 0 && (
              <select aria-label="Chronology" {...register(`${name}.${i}.chronology`)}>
                <option value="">(event's chronology)</option>
                {chronologies.map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="icon" onClick={() => claims.remove(i)} title="Remove">
              ✕
            </button>
          </div>
          <div className="row">
            <select aria-label="Source" {...register(`${name}.${i}.sourceKey`)}>
              <option value="">Source…</option>
              {Object.entries(data.sources).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.name}
                </option>
              ))}
            </select>
            <input aria-label="Location in source" placeholder="p. 12" {...register(`${name}.${i}.sourceLocation`)} />
          </div>
          <input aria-label="Note" placeholder="Note (optional)" {...register(`${name}.${i}.note`)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          claims.append({ year: 0, era: 'before', margin: '', chronology: '', sourceKey: '', sourceLocation: '', note: '' })
        }
      >
        + Add a dated claim
      </button>
    </div>
  );
}

interface Props {
  initial: TimelineEvent;
  isNew: boolean;
  data: Dataset;
  onSave: (e: TimelineEvent) => void;
  onCancel: () => void;
  onCreateTrack: (t: Track) => void;
  onCreateSource: (key: string, s: Source) => void;
}

export function EventForm({ initial, isNew, data, onSave, onCancel, onCreateTrack, onCreateSource }: Props) {
  const cal = data.meta.calendar;
  const [newTrack, setNewTrack] = useState<{ name: string; color: string; parent: string } | null>(null);
  const [newSource, setNewSource] = useState<{ name: string; url: string } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: toForm(initial, cal) });

  const checkedTracks = (): string[] => {
    const v = getValues('tracks') as unknown;
    return Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : [];
  };

  const createTrack = () => {
    if (!newTrack?.name.trim()) return;
    const id = uniqueId(newTrack.name, data.tracks.map((t) => t.id));
    const t: Track = { id, name: newTrack.name.trim(), color: newTrack.color };
    if (newTrack.parent) t.parent = newTrack.parent;
    onCreateTrack(t);
    setValue('tracks', [...checkedTracks(), id]);
    clearErrors('tracks');
    setNewTrack(null);
  };

  const createSource = () => {
    if (!newSource?.name.trim()) return;
    const key = uniqueId(newSource.name, Object.keys(data.sources));
    const src: Source = { name: newSource.name.trim(), tags: customTags(data) };
    if (newSource.url.trim()) src.url = newSource.url.trim();
    onCreateSource(key, src);
    sources.append({ sourceKey: key, sourceLocation: '' });
    setNewSource(null);
  };

  // Enter inside the quick-create boxes creates the item instead of submitting the event
  const enterTo = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fn();
    }
  };
  const sources = useFieldArray({ control, name: 'sources' });
  const links = useFieldArray({ control, name: 'links' });
  const hasEnd = watch('hasEnd');
  const ongoing = watch('ongoing');

  const otherEvents = data.events.filter((e) => e.uuid !== initial.uuid).sort(compareEvents);
  const childrenOf = (id: string | undefined) => data.tracks.filter((t) => t.parent === id);
  const chronologies = Object.entries(data.chronologies ?? {});
  const inherited = eventChronology(data, { ...initial, chronology: undefined });
  const customTag = data.meta.customSourceTag;

  const trackTree = (parent: string | undefined, depth: number): React.ReactNode =>
    childrenOf(parent).map((t) => (
      <div key={t.id}>
        <label
          className={`check ${depth ? 'child' : ''}`}
          style={{ '--track-color': t.color, marginLeft: Math.max(0, depth - 1) * 16 } as React.CSSProperties}
        >
          <input type="checkbox" value={t.id} {...register('tracks')} />
          <span className="chip" /> {t.name}
        </label>
        {trackTree(t.id, depth + 1)}
      </div>
    ));

  const submit = (v: FormValues) => {
    const e = fromForm(v, cal);
    if (e.tracks.length === 0) {
      setError('tracks', { message: 'Pick at least one track.' });
      return;
    }
    if (e.end !== undefined && e.end < e.start) {
      setError('endYear', { message: 'End year is before the start year.' });
      return;
    }
    onSave(e);
  };

  return (
    <aside className="side-panel editor">
      <header>
        <h2>{isNew ? 'New event' : 'Edit event'}</h2>
        <button className="icon" onClick={onCancel} title="Cancel">
          ✕
        </button>
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="ev-title">Title</label>
        <input id="ev-title" {...register('title', { required: 'Title is required.' })} autoFocus />
        {errors.title && <p role="alert">{errors.title.message}</p>}

        <fieldset>
          <legend>When</legend>
          <div className="year-row">
            <label htmlFor="ev-start">Start</label>
            <input
              id="ev-start"
              type="number"
              min={0}
              {...register('startYear', { required: true, valueAsNumber: true, min: 0 })}
            />
            <EraSelect cal={cal} label="Start era" reg={register('startEra')} />
          </div>
          <label className="check">
            <input type="checkbox" {...register('hasEnd')} disabled={ongoing} /> Spans multiple years
          </label>
          <label className="check">
            <input type="checkbox" {...register('ongoing')} /> Ongoing (runs to the present)
          </label>
          {hasEnd && !ongoing && (
            <div className="year-row">
              <label htmlFor="ev-end">End</label>
              <input id="ev-end" type="number" min={0} {...register('endYear', { valueAsNumber: true, min: 0 })} />
              <EraSelect cal={cal} label="End era" reg={register('endEra')} />
            </div>
          )}
          {errors.endYear && <p role="alert">{errors.endYear.message}</p>}
          <label className="check" title="Shown as c. and drawn with soft edges">
            <input type="checkbox" {...register('circa')} /> Approximate ("c.")
          </label>
          <div className="year-row">
            <label htmlFor="ev-order" title="Ordering among events that start in the same year; lower comes first">
              Order
            </label>
            <input id="ev-order" type="number" placeholder="(none)" {...register('order')} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Dating evidence</legend>
          <p className="muted small">
            The dates above are your best estimate. Record what each source says here, with its ± margin if it gives one;
            the timeline draws the uncertainty from these.
          </p>
          {chronologies.length > 0 && (
            <>
              <label htmlFor="ev-chron">Chronology</label>
              <select id="ev-chron" {...register('chronology')}>
                <option value="">
                  {inherited ? `(from its track: ${data.chronologies?.[inherited]?.name ?? inherited})` : '(none)'}
                </option>
                {chronologies.map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <h4>Start</h4>
          <ClaimList name="startDates" control={control} register={register} data={data} />
          {hasEnd && !ongoing && (
            <>
              <h4>End</h4>
              <ClaimList name="endDates" control={control} register={register} data={data} />
            </>
          )}
        </fieldset>

        <label htmlFor="ev-descr">Description</label>
        <textarea id="ev-descr" rows={5} {...register('descr')} />

        <fieldset>
          <legend>Tracks</legend>
          <div className="track-checks">{trackTree(undefined, 0)}</div>
          {errors.tracks && <p role="alert">{errors.tracks.message}</p>}
          {newTrack ? (
            <div className="quick-create">
              <input
                aria-label="New track name"
                placeholder="Track name"
                value={newTrack.name}
                autoFocus
                onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                onKeyDown={enterTo(createTrack)}
              />
              <input
                aria-label="New track color"
                type="color"
                value={newTrack.color}
                onChange={(e) => setNewTrack({ ...newTrack, color: e.target.value })}
              />
              <select
                aria-label="New track parent"
                value={newTrack.parent}
                onChange={(e) => setNewTrack({ ...newTrack, parent: e.target.value })}
              >
                <option value="">Top-level track</option>
                {data.tracks
                  .filter((t) => trackDepth(data.tracks, t.id) < MAX_DEPTH)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      under {t.name}
                    </option>
                  ))}
              </select>
              <button type="button" className="primary" onClick={createTrack} disabled={!newTrack.name.trim()}>
                Create
              </button>
              <button type="button" className="icon" onClick={() => setNewTrack(null)} title="Cancel">
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewTrack({ name: '', color: nextTrackColor(data.tracks), parent: '' })}
            >
              + New track
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend>Sources</legend>
          {sources.fields.map((f, i) => (
            <div key={f.id} className="row">
              <select aria-label="Source" {...register(`sources.${i}.sourceKey`, { required: true })}>
                <option value="">Pick a source…</option>
                {Object.entries(data.sources).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input aria-label="Location in source" placeholder="pgs. 12" {...register(`sources.${i}.sourceLocation`)} />
              <button type="button" className="icon" onClick={() => sources.remove(i)} title="Remove source">
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <button type="button" onClick={() => sources.append({ sourceKey: '', sourceLocation: '' })}>
              Cite a source
            </button>
            {!newSource && (
              <button type="button" onClick={() => setNewSource({ name: '', url: '' })}>
                + New source
              </button>
            )}
          </div>
          {newSource && (
            <div className="quick-create">
              <input
                aria-label="New source name"
                placeholder="A book, article, web page or your own notes"
                value={newSource.name}
                autoFocus
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                onKeyDown={enterTo(createSource)}
              />
              <input
                aria-label="New source link"
                placeholder="Link (optional)"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                onKeyDown={enterTo(createSource)}
              />
              <button type="button" className="primary" onClick={createSource} disabled={!newSource.name.trim()}>
                Create
              </button>
              <button type="button" className="icon" onClick={() => setNewSource(null)} title="Cancel">
                ✕
              </button>
              <p className="muted small">
                {customTag ? `Tagged ${data.tags[customTag]?.name ?? customTag}. ` : ''}Edit it later from Filters →
                Sources.
              </p>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Connections</legend>
          {links.fields.map((f, i) => (
            <div key={f.id} className="row">
              <select aria-label="Link kind" {...register(`links.${i}.kind`)}>
                {LINK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LINK_LABEL[k].form}
                  </option>
                ))}
              </select>
              <select aria-label="Linked event" {...register(`links.${i}.to`, { required: true })}>
                <option value="">Pick an event…</option>
                {otherEvents.map((e) => (
                  <option key={e.uuid} value={e.uuid}>
                    {formatYear(e.start, cal, e.circa)} · {e.title}
                  </option>
                ))}
              </select>
              <button type="button" className="icon" onClick={() => links.remove(i)} title="Remove link">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => links.append({ to: '', kind: 'causes' })}>
            Add connection
          </button>
        </fieldset>

        <details>
          <summary>Id</summary>
          <input aria-label="Event id" readOnly {...register('uuid')} />
        </details>

        <footer>
          <button type="submit" className="primary">
            {isNew ? 'Create event' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </form>
    </aside>
  );
}
