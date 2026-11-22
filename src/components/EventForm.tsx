import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  LINK_KINDS,
  type Calendar,
  type Dataset,
  type EventLink,
  type SourceRef,
  type TimelineEvent,
} from '../types.ts';
import { compareEvents } from '../lib/years.ts';
import { at0, at1, hasDayZoom } from '../lib/subYear.ts';
import { childrenMap } from '../lib/tracks.ts';
import { formatYear, fromStored, toStored, type EraSide } from '../lib/calendar.ts';
import { ClaimList, DayFields, EraSelect, ProblemList } from './ClaimList.tsx';
import { claimsFromValues, keepLocator, toClaimValues, type ClaimFields } from '../lib/claims.ts';
import { citationsInWords } from '../lib/table.ts';
import { eventChronology } from '../lib/chronology.ts';
import { customTags, newProblems, nextTrackColor, uniqueId, upsertEvent } from '../state/edits.ts';
import type { Source, Track } from '../types.ts';
import { LINK_LABEL } from './linkLabels.ts';
import { errorProps, FieldError } from './FieldError.tsx';

interface FormValues extends ClaimFields {
  uuid: string;
  title: string;
  descr: string;
  startYear: number;
  startEra: EraSide;
  /** Month (1–12) and day as typed, or '' (asked only where the timeline is dated in months and days). */
  startMonth: string;
  startDay: string;
  hasEnd: boolean;
  endYear: number;
  endEra: EraSide;
  endMonth: string;
  endDay: string;
  ongoing: boolean;
  circa: boolean;
  chronology: string;
  order: string;
  importance: string;
  tracks: string[];
  sources: SourceRef[];
  links: EventLink[];
}

/** Whether an event's end is its start's own date (same year, month and day as given). */
const sameDate = (e: TimelineEvent) => e.end === e.start && e.endMonth === e.startMonth && e.endDay === e.startDay;

function toForm(e: TimelineEvent, cal: Calendar): FormValues {
  const s = fromStored(e.start, cal);
  const end = fromStored(e.end ?? e.start, cal);
  return {
    uuid: e.uuid,
    title: e.title,
    descr: e.descr,
    startYear: s.year,
    startEra: s.era,
    startMonth: e.startMonth ? String(e.startMonth) : '',
    startDay: e.startDay ? String(e.startDay) : '',
    hasEnd: e.end !== undefined && !sameDate(e),
    endYear: end.year,
    endEra: end.era,
    endMonth: e.endMonth ? String(e.endMonth) : '',
    endDay: e.endDay ? String(e.endDay) : '',
    ongoing: !!e.ongoing,
    circa: !!e.circa,
    chronology: e.chronology ?? '',
    order: e.order === undefined ? '' : String(e.order),
    importance: String(e.importance ?? 2),
    tracks: [...e.tracks],
    sources: e.sources.map((x) => ({ ...x })),
    links: (e.links ?? []).map((x) => ({ ...x })),
    startDates: (e.startDates ?? []).map((c) => toClaimValues(c, cal)),
    endDates: (e.endDates ?? []).map((c) => toClaimValues(c, cal)),
  };
}

/** The event as saved: the form's fields, plus what the form shows but doesn't edit, kept from `initial`. */
function fromForm(v: FormValues, cal: Calendar, initial: TimelineEvent): TimelineEvent {
  const start = toStored(Number(v.startYear), v.startEra, cal);
  const e: TimelineEvent = {
    uuid: v.uuid,
    title: v.title.trim(),
    descr: v.descr.trim(),
    start,
    tracks: [...new Set(v.tracks)],
    sources: v.sources.filter((s) => s.sourceKey).map((s) => keepLocator(s, initial.sources)),
  };
  const sm = Number(v.startMonth);
  if (sm >= 1) {
    e.startMonth = sm;
    if (Number(v.startDay) >= 1) e.startDay = Number(v.startDay);
  }
  if (v.ongoing) {
    e.ongoing = true;
    // the sources saying it is still going aren't edited here: kept while it stays ongoing
    if (initial.ongoingSources?.length) e.ongoingSources = initial.ongoingSources;
  } else if (v.hasEnd) {
    const end = toStored(Number(v.endYear), v.endEra, cal);
    const withEnd: TimelineEvent = { ...e, end };
    const em = Number(v.endMonth);
    if (em >= 1) {
      withEnd.endMonth = em;
      if (Number(v.endDay) >= 1) withEnd.endDay = Number(v.endDay);
    }
    // an end on the start's own date (year, or month and day) is no end; any other is kept (and checked on save)
    if (!sameDate(withEnd)) Object.assign(e, withEnd);
  }
  if (v.circa) e.circa = true;
  if (v.chronology) e.chronology = v.chronology;
  if (v.order.trim() !== '') e.order = Number(v.order);
  if (v.importance === '1' || v.importance === '3') e.importance = Number(v.importance) as 1 | 3;
  const starts = claimsFromValues(v.startDates, cal);
  if (starts) e.startDates = starts;
  const ends = claimsFromValues(v.endDates, cal);
  if (ends && e.end !== undefined) e.endDates = ends;
  const links = v.links.filter((l) => l.to && l.to !== v.uuid);
  if (links.length) e.links = links;
  // its facet values (categories) aren't edited here yet: kept as they were
  if (initial.memberships?.length) e.memberships = initial.memberships;
  return e;
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
  // months and days are asked for where the timeline is dated in them (or this event already is)
  const days = hasDayZoom(data.meta.increments) || !!(initial.startMonth || initial.endMonth);
  const [newTrack, setNewTrack] = useState<{ name: string; color: string; parent: string } | null>(null);
  const [newSource, setNewSource] = useState<{ name: string; url: string } | null>(null);
  /** What saving would break (e.g. the start outside its date claims); shown above the buttons. */
  const [problems, setProblems] = useState<string[]>([]);
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
  const children = childrenMap(data.tracks);
  const childrenOf = (id: string | undefined) => children.get(id) ?? [];
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
    const e = fromForm(v, cal, initial);
    if (e.tracks.length === 0) {
      setError('tracks', { message: 'Pick at least one track.' }, { shouldFocus: true });
      return;
    }
    if (e.end !== undefined && (e.end < e.start || at1(e) <= at0(e))) {
      setError('endYear', { message: e.end < e.start ? 'End year is before the start year.' : 'The end date is before the start date.' }, { shouldFocus: true });
      return;
    }
    const found = newProblems(data, upsertEvent(data, e));
    setProblems(found);
    if (!found.length) onSave(e);
  };

  return (
    <aside className="side-panel editor">
      <header>
        <h2>{isNew ? 'New event' : 'Edit event'}</h2>
        <button className="icon" onClick={onCancel} aria-label="Cancel" title="Cancel">
          ✕
        </button>
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="ev-title">Title</label>
        <input id="ev-title" {...register('title', { required: 'Title is required.' })} {...errorProps('ev-title', errors.title)} autoFocus />
        <FieldError id="ev-title" error={errors.title} />

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
            {days && <DayFields label="Start" month={register('startMonth')} day={register('startDay')} />}
          </div>
          <label className="check">
            <input type="checkbox" {...register('hasEnd')} disabled={ongoing} /> {days ? 'Has an end date' : 'Spans multiple years'}
          </label>
          <label className="check">
            <input type="checkbox" {...register('ongoing')} /> Ongoing (runs to the present)
          </label>
          {ongoing && initial.ongoingSources?.length ? (
            <p className="small">Still going per {citationsInWords(initial.ongoingSources, data.sources)} (kept; edit in the file)</p>
          ) : null}
          {hasEnd && !ongoing && (
            <div className="year-row">
              <label htmlFor="ev-end">End</label>
              <input id="ev-end" type="number" min={0} {...register('endYear', { valueAsNumber: true, min: 0 })} {...errorProps('ev-end', errors.endYear)} />
              <EraSelect cal={cal} label="End era" reg={register('endEra')} />
              {days && <DayFields label="End" month={register('endMonth')} day={register('endDay')} />}
            </div>
          )}
          <FieldError id="ev-end" error={errors.endYear} />
          <label className="check" title="Shown as c. and drawn with soft edges">
            <input type="checkbox" {...register('circa')} /> Approximate ("c.")
          </label>
          <div className="year-row">
            <label htmlFor="ev-order" title="Ordering among events that start in the same year; lower comes first">
              Order
            </label>
            <input id="ev-order" type="number" placeholder="(none)" {...register('order')} />
          </div>
          <div className="year-row">
            <label htmlFor="ev-importance" title="Key events are bold and stay visible when a row is crowded or collapsed">
              Importance
            </label>
            <select id="ev-importance" {...register('importance')}>
              <option value="1">Key</option>
              <option value="2">Normal</option>
              <option value="3">Minor</option>
            </select>
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
          <ClaimList name="startDates" control={control} register={register} data={data} days={days} />
          {hasEnd && !ongoing && (
            <>
              <h4>End</h4>
              <ClaimList name="endDates" control={control} register={register} data={data} days={days} />
            </>
          )}
        </fieldset>

        <label htmlFor="ev-descr">Description</label>
        <textarea id="ev-descr" rows={5} {...register('descr')} />

        <fieldset {...errorProps('ev-tracks', errors.tracks)}>
          <legend>Tracks</legend>
          <div className="track-checks">{trackTree(undefined, 0)}</div>
          <FieldError id="ev-tracks" error={errors.tracks} />
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
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      under {t.name}
                    </option>
                  ))}
              </select>
              <button type="button" className="primary" onClick={createTrack} disabled={!newTrack.name.trim()}>
                Create
              </button>
              <button type="button" className="icon" onClick={() => setNewTrack(null)} aria-label="Cancel" title="Cancel">
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
              <button type="button" className="icon" onClick={() => sources.remove(i)} aria-label="Remove source" title="Remove source">
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
              <button type="button" className="icon" onClick={() => setNewSource(null)} aria-label="Cancel" title="Cancel">
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
              <button type="button" className="icon" onClick={() => links.remove(i)} aria-label="Remove link" title="Remove link">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => links.append({ to: '', kind: 'causes' })}>
            Add connection
          </button>
        </fieldset>

        {initial.memberships?.length ? (
          <p className="small">
            {initial.memberships.map((m) => {
              const f = data.meta.facets?.[m.facet];
              return `${f?.name ?? m.facet}: ${f?.values[m.value]?.name ?? m.value}`;
            }).join('; ')}{' '}
            (kept as they are; edit them in the file)
          </p>
        ) : null}

        <details>
          <summary>Id</summary>
          <input aria-label="Event id" readOnly {...register('uuid')} />
        </details>

        <ProblemList problems={problems} />
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
