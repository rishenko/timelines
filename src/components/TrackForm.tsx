import { useState } from 'react';
import { useFieldArray, useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import type { Calendar, Dataset, SourceRef, Track, TrackKind, TrackPhase, TrackSpan } from '../types.ts';
import { newProblems, nextTrackColor, slug, trackDeletion, uniqueId, upsertTrack } from '../state/edits.ts';
import { ClaimList, ProblemList } from './ClaimList.tsx';
import { claimsFromValues, toClaimValues, type ClaimFields, type ClaimValues } from '../lib/claims.ts';
import { isDescendant, trackDepth } from '../lib/tracks.ts';
import { formatEditDate, formatYear, parseFullDate } from '../lib/calendar.ts';
import { at0, at1, hasDayZoom } from '../lib/subYear.ts';
import { errorProps, FieldError } from './FieldError.tsx';
import { isSafeUrl } from '../lib/urls.ts';
import { resolveLifespan, spanDates, spanStretches } from '../lib/lifespan.ts';
import { defaultSelection, isApprox } from '../lib/chronology.ts';
import { citationsInWords } from '../lib/table.ts';

interface FormValues extends ClaimFields {
  id: string;
  name: string;
  color: string;
  parent: string;
  kind: TrackKind;
  image: string;
  url: string;
  wikidata: string;
  chronology: string;
  spanStart: string;
  spanEnd: string;
  spanOngoing: boolean;
  pinLast: boolean;
  phases: PhaseValues[];
}

/** One phase in the form: dates as typed (e.g. "c. 4500 AE"), plus its claims. */
interface PhaseValues {
  name: string;
  start: string;
  end: string;
  ongoing: boolean;
  startDates: ClaimValues[];
  endDates: ClaimValues[];
  /** Sources saying it is still going: not edited here, kept while the phase stays ongoing. */
  ongoingSources?: SourceRef[];
  /** The events that began and ended it: not edited here, kept (the end only while the phase has one). */
  startEvent?: string;
  endEvent?: string;
}

const toPhaseValues = (p: TrackPhase, cal: Calendar): PhaseValues => ({
  name: p.name,
  start: formatEditDate(p.start, p.startMonth, p.startDay, cal, p.circa),
  end: p.end === undefined ? '' : formatEditDate(p.end, p.endMonth, p.endDay, cal, p.circa),
  ongoing: !!p.ongoing,
  startDates: (p.startDates ?? []).map((c) => toClaimValues(c, cal)),
  endDates: (p.endDates ?? []).map((c) => toClaimValues(c, cal)),
  ...(p.ongoingSources ? { ongoingSources: p.ongoingSources } : {}),
  ...(p.startEvent ? { startEvent: p.startEvent } : {}),
  ...(p.endEvent ? { endEvent: p.endEvent } : {}),
});

type Typed = { year: number; month?: number; day?: number };

/** A typed date's month and day onto a stretch or phase (a date typed as a year alone has none). */
function withDays<T extends TrackSpan>(o: T, s: Typed, e: Typed | null): T {
  if (s.month) o.startMonth = s.month;
  if (s.day) o.startDay = s.day;
  if (e?.month) o.endMonth = e.month;
  if (e?.day) o.endDay = e.day;
  return o;
}

/** Whether a typed end comes before its start (each date covers its year, month or day). */
const endsBefore = (s: Typed, e: Typed) => at1({ start: e.year, startMonth: e.month, startDay: e.day }) <= at0({ start: s.year, startMonth: s.month, startDay: s.day });

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
  // the form edits the lifespan's first stretch; any later stretches (a lifespan with gaps) are kept as they are
  const [first, ...laterStretches] = spanStretches(initial?.span);
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
      kind: initial?.kind ?? 'polity',
      image: initial?.image ?? '',
      url: initial?.url ?? '',
      wikidata: initial?.ids?.wikidata ?? '',
      chronology: initial?.chronology ?? '',
      spanStart: first ? formatEditDate(first.start, first.startMonth, first.startDay, cal, first.circa) : '',
      spanEnd: first?.end !== undefined ? formatEditDate(first.end, first.endMonth, first.endDay, cal, first.circa) : '',
      spanOngoing: !!first?.ongoing,
      pinLast: !!initial?.pinLast,
      startDates: (first?.startDates ?? []).map((c) => toClaimValues(c, cal)),
      endDates: (first?.endDates ?? []).map((c) => toClaimValues(c, cal)),
      phases: (initial?.phases ?? []).map((p) => toPhaseValues(p, cal)),
    },
  });
  // A track can sit under any track except itself and its own descendants (rows nest to any depth).
  const parents = data.tracks.filter((t) => t.id !== initial?.id && !(initial && isDescendant(data.tracks, t.id, initial.id)));
  const name = watch('name');
  const spanOngoing = watch('spanOngoing');
  // a row with phases and no typed lifespan: its lifespan as worked out from them (read-only)
  const derivedLife =
    initial && !initial.span && initial.phases?.length
      ? resolveLifespan(data, initial, defaultSelection(data))
          .map((s) => spanDates(s, cal, isApprox(s)))
          .join(', ')
      : undefined;
  // its memberships in other rows (Track.memberOf), read-only: "Soviet Union (1922 CE – 1991 CE)"
  const memberOfText = initial?.memberOf
    ?.map((m) => `${data.tracks.find((t) => t.id === m.row)?.name ?? m.row} (${m.phase ? `as ${m.phase}, ` : ''}${spanDates({ start: m.start, end: m.end ?? m.start, ongoing: m.ongoing }, cal, !!m.circa)})`)
    .join(', ');
  const idValue = watch('id');
  const otherIds = data.tracks.filter((t) => t.id !== initial?.id).map((t) => t.id);
  const previewId = idValue ? slug(idValue) : uniqueId(name, otherIds);
  const chronologies = Object.entries(data.chronologies ?? {});
  const example = fmt(data.meta.calendar.yearZero ? 4500 : -1499);
  /** What saving would break (e.g. a lifespan date outside its claims); shown above the buttons. */
  const [problems, setProblems] = useState<string[]>([]);

  const submit = (v: FormValues) => {
    const id = v.id ? slug(v.id) : uniqueId(v.name, otherIds);
    if (!id) return setError('id', { message: 'Id is required.' }, { shouldFocus: true });
    if (otherIds.includes(id)) return setError('id', { message: `A row with id "${id}" already exists.` }, { shouldFocus: true });
    const t: Track = { id, name: v.name.trim(), color: v.color };
    if (v.parent) t.parent = v.parent;
    // a polity is the default: written only when chosen over another kind, or if the row already said so
    if (v.kind !== 'polity' || initial?.kind === 'polity') t.kind = v.kind;
    if (v.image.trim()) t.image = v.image.trim();
    const url = v.url.trim();
    if (url && !isSafeUrl(url))
      return setError('url', { message: 'Use a link that starts with https:// (or a path on this site).' }, { shouldFocus: true });
    if (url) t.url = url;
    // keeps any other ids the row has (only the Wikidata id is edited here)
    const qid = v.wikidata.trim().toUpperCase();
    if (qid && !/^Q[1-9]\d*$/.test(qid))
      return setError('wikidata', { message: 'A Wikidata id is a Q and a number, like Q11768.' }, { shouldFocus: true });
    const { wikidata: _old, ...keptIds } = initial?.ids ?? {};
    const ids = { ...keptIds, ...(qid ? { wikidata: qid } : {}) };
    if (Object.keys(ids).length) t.ids = ids;
    if (v.chronology) t.chronology = v.chronology;
    if (v.pinLast) t.pinLast = true;
    let firstStretch: TrackSpan | undefined;
    if (v.spanStart.trim() || (!v.spanOngoing && v.spanEnd.trim())) {
      const s = parseFullDate(v.spanStart, cal);
      const e = v.spanOngoing ? null : parseFullDate(v.spanEnd, cal);
      if (!s) return setError('spanStart', { message: `Write a year like "${example}".` }, { shouldFocus: true });
      if (!v.spanOngoing && !e) return setError('spanEnd', { message: `Write a year like "${example}", or tick "Still going".` }, { shouldFocus: true });
      if (e && endsBefore(s, e)) return setError('spanEnd', { message: 'The end is before the start.' }, { shouldFocus: true });
      firstStretch = withDays(e ? { start: s.year, end: e.year } : { start: s.year, ongoing: true }, s, e);
      if (s.circa || e?.circa) firstStretch.circa = true;
      const startDates = claimsFromValues(v.startDates, cal);
      const endDates = e ? claimsFromValues(v.endDates, cal) : undefined;
      if (startDates) firstStretch.startDates = startDates;
      if (endDates) firstStretch.endDates = endDates;
      if (!e && first?.ongoing && first.ongoingSources) firstStretch.ongoingSources = first.ongoingSources;
      if (first?.startEvent) firstStretch.startEvent = first.startEvent;
      if (e && first?.endEvent) firstStretch.endEvent = first.endEvent;
    } else if (v.startDates.length || v.endDates.length) {
      return setError('spanStart', { message: 'Give the lifespan a start and an end, or remove its date claims.' }, { shouldFocus: true });
    }
    const stretches = [...(firstStretch ? [firstStretch] : []), ...laterStretches];
    if (stretches.length) t.span = stretches.length === 1 ? stretches[0] : stretches;
    const phases: TrackPhase[] = [];
    for (const [i, p] of v.phases.entries()) {
      if (!p.name.trim()) return setError(`phases.${i}.name`, { message: 'Give the phase a name.' }, { shouldFocus: true });
      const s = parseFullDate(p.start, cal);
      const e = p.ongoing ? null : parseFullDate(p.end, cal);
      if (!s) return setError(`phases.${i}.start`, { message: `Write a year like "${example}".` }, { shouldFocus: true });
      if (!p.ongoing && !e) return setError(`phases.${i}.end`, { message: `Write a year like "${example}", or tick "Still going".` }, { shouldFocus: true });
      if (e && endsBefore(s, e)) return setError(`phases.${i}.end`, { message: 'The end is before the start.' }, { shouldFocus: true });
      const phase: TrackPhase = withDays(e ? { name: p.name.trim(), start: s.year, end: e.year } : { name: p.name.trim(), start: s.year, ongoing: true }, s, e);
      if (s.circa || e?.circa) phase.circa = true;
      const startDates = claimsFromValues(p.startDates, cal);
      const endDates = e ? claimsFromValues(p.endDates, cal) : undefined;
      if (startDates) phase.startDates = startDates;
      if (endDates) phase.endDates = endDates;
      if (!e && p.ongoingSources?.length) phase.ongoingSources = p.ongoingSources;
      if (p.startEvent) phase.startEvent = p.startEvent;
      if (e && p.endEvent) phase.endEvent = p.endEvent;
      phases.push(phase);
    }
    // kept in the order they were written: a row that groups others lists each one's phases together (the chart
    // sorts them by date)
    if (phases.length) t.phases = phases;
    // memberships in other rows, and category memberships (regions, peoples), aren't edited here yet: kept as they were
    if (initial?.memberOf?.length) t.memberOf = initial.memberOf;
    if (initial?.memberships?.length) t.memberships = initial.memberships;
    // its context lines (ages of a region, for example) aren't edited here, and stay as they were
    if (initial?.context?.length) t.context = initial.context;
    // a cycle (draft v11) isn't edited here yet: kept as it was
    if (initial?.cycle) t.cycle = initial.cycle;
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
    const parts = [`Delete the row "${initial.name}"?`];
    if (info.orphaned) parts.push(`${info.orphaned} event(s) belong only to this row and will be deleted too.`);
    if (info.shared) parts.push(`${info.shared} event(s) shared with other rows will just lose this one.`);
    if (info.agesToStrip.length)
      parts.push(`${info.agesToStrip.length === 1 ? 'This age moves' : 'These ages move'} to the Ages strip at the top: ${info.agesToStrip.join(', ')}.`);
    if (window.confirm(parts.join('\n\n'))) onDelete(initial.id);
  };

  return (
    <aside className="side-panel editor">
      <header>
        <h2>{isNew ? 'New row' : `Edit row: ${initial.name}`}</h2>
        <button className="icon" onClick={onCancel} aria-label="Cancel" title="Cancel">
          ✕
        </button>
      </header>
      <p className="muted">
        Each row is one thing on the timeline: a faction, a nation, a civilization, a dynasty. Rows nest to any depth
        (e.g. region → civilization → period), and a parent can be collapsed to fold its sub-rows in.
      </p>
      <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="tr-name">Name</label>
        <input id="tr-name" {...register('name', { required: 'Name is required.' })} {...errorProps('tr-name', errors.name)} autoFocus />
        <FieldError id="tr-name" error={errors.name} />

        <label htmlFor="tr-color">Color</label>
        <input id="tr-color" type="color" {...register('color')} />

        <label htmlFor="tr-parent">Parent</label>
        <select id="tr-parent" {...register('parent')}>
          <option value="">(none: a top-level row)</option>
          {parents.map((t) => (
            <option key={t.id} value={t.id}>
              {'— '.repeat(trackDepth(data.tracks, t.id))}
              {t.name}
            </option>
          ))}
        </select>

        <label htmlFor="tr-kind">Kind of row</label>
        <select id="tr-kind" aria-describedby="tr-kind-help" {...register('kind')}>
          <option value="polity">A state, people or group</option>
          <option value="person">A person</option>
          <option value="theme">A theme: a network, route or movement</option>
        </select>
        <p id="tr-kind-help" className="muted small">
          Most rows are states, peoples or groups. A theme (the Silk Roads, the Reformation) has no government of its
          own; its events are shared with the rows where they happened.
        </p>

        <fieldset>
          <legend>Lifespan (optional)</legend>
          <p className="muted small">
            Shaded across the row. Write "c." for approximate dates, e.g. "c. {example}". A row with phases can leave it
            empty: its lifespan is then worked out from its phases, blank in the gaps between them. Type one only if the
            row carried on through those gaps; it must cover all its phases.
          </p>
          {derivedLife && <p className="small">Worked out from its phases: {derivedLife}</p>}
          {memberOfText && <p className="small">Member of {memberOfText} (kept as they are; edit them in the file).</p>}
          <div className="row">
            <input aria-label="Lifespan start" placeholder="From" {...register('spanStart')} {...errorProps('tr-span-start', errors.spanStart)} />
            <input
              aria-label="Lifespan end"
              placeholder={spanOngoing ? 'Still going' : 'To'}
              disabled={spanOngoing}
              {...register('spanEnd')}
              {...errorProps('tr-span-end', errors.spanEnd)}
            />
          </div>
          <label className="check">
            <input type="checkbox" {...register('spanOngoing')} /> Still going (runs to the present)
          </label>
          <FieldError id="tr-span-start" error={errors.spanStart} />
          <FieldError id="tr-span-end" error={errors.spanEnd} />
          {spanOngoing && first?.ongoingSources?.length ? (
            <p className="small">Still going per {citationsInWords(first.ongoingSources, data.sources)} (kept; edit in the file)</p>
          ) : null}
          {laterStretches.length > 0 && (
            <p className="small">
              Later stretches, kept as they are (edit them in the file):{' '}
              {laterStretches.map((s) => `${fmt(s.start, s.circa)} – ${s.ongoing || s.end === undefined ? 'ongoing' : fmt(s.end, s.circa)}`).join(', ')}
            </p>
          )}
          <details open={!!(first?.startDates?.length || first?.endDates?.length)}>
            <summary>Dated claims</summary>
            <p className="muted small">
              What each source says the start and end are. The shaded ends of the lifespan show the range they give.
            </p>
            <h4>Start</h4>
            <ClaimList name="startDates" control={control} register={register} data={data} owner="row" days={hasDayZoom(data.meta.increments)} />
            <h4>End</h4>
            <ClaimList name="endDates" control={control} register={register} data={data} owner="row" days={hasDayZoom(data.meta.increments)} />
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

        <label htmlFor="tr-url">Page about this row (optional)</label>
        <input id="tr-url" placeholder="https://en.wikipedia.org/wiki/…" {...register('url')} {...errorProps('tr-url', errors.url)} />
        <FieldError id="tr-url" error={errors.url} />
        <p className="muted small">The row's name links to it.</p>

        <label htmlFor="tr-wikidata">Wikidata id (optional)</label>
        <input id="tr-wikidata" placeholder="Q11768" {...register('wikidata')} {...errorProps('tr-wikidata', errors.wikidata)} />
        <FieldError id="tr-wikidata" error={errors.wikidata} />

        <label className="check">
          <input type="checkbox" {...register('pinLast')} /> Keep at the bottom (e.g. "Other peoples", "Other")
        </label>

        <details open={errors.id ? true : undefined}>
          <summary>Id: {previewId || '…'}</summary>
          <p className="muted small">
            Used in the data file and links. Leave blank to derive it from the name. Changing it updates every event
            on this row.
          </p>
          <input aria-label="Row id" placeholder={previewId} {...register('id')} {...errorProps('tr-id', errors.id)} />
          <FieldError id="tr-id" error={errors.id} />
        </details>

        <ProblemList problems={problems} />
        <footer>
          <button type="submit" className="primary">
            {isNew ? 'Create row' : 'Save row'}
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
  const ongoingList = useWatch({ control, name: 'phases' });
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
        const ongoing = ongoingList?.[i]?.ongoing;
        return (
          <div key={f.id} className="phase">
            <div className="row">
              <input aria-label="Phase name" placeholder="Name, e.g. Second Republic" {...register(`phases.${i}.name`)} {...errorProps(`tr-phase-${i}-name`, err?.name)} />
              <button type="button" className="icon" onClick={() => phases.remove(i)} aria-label="Remove this phase" title="Remove this phase">
                ✕
              </button>
            </div>
            <FieldError id={`tr-phase-${i}-name`} error={err?.name} />
            <div className="row">
              <input aria-label="Phase start" placeholder="From" {...register(`phases.${i}.start`)} {...errorProps(`tr-phase-${i}-start`, err?.start)} />
              <input
                aria-label="Phase end"
                placeholder={ongoing ? 'Still going' : 'To'}
                disabled={ongoing}
                {...register(`phases.${i}.end`)}
                {...errorProps(`tr-phase-${i}-end`, err?.end)}
              />
            </div>
            <label className="check">
              <input type="checkbox" {...register(`phases.${i}.ongoing`)} /> Still going
            </label>
            <FieldError id={`tr-phase-${i}-start`} error={err?.start} />
            <FieldError id={`tr-phase-${i}-end`} error={err?.end} />
            {ongoing && f.ongoingSources?.length ? (
              <p className="small">Still going per {citationsInWords(f.ongoingSources, data.sources)} (kept; edit in the file)</p>
            ) : null}
            {/* folded, so a row with many phases stays short; the count says what is inside */}
            <details>
              <summary>Dated claims{f.startDates.length + f.endDates.length ? ` (${f.startDates.length + f.endDates.length})` : ''}</summary>
              <p className="muted small">What each source says this phase's start and end are.</p>
              <h4>Start</h4>
              <ClaimList name={`phases.${i}.startDates`} control={control} register={register} data={data} owner="row" days={hasDayZoom(data.meta.increments)} />
              <h4>End</h4>
              <ClaimList name={`phases.${i}.endDates`} control={control} register={register} data={data} owner="row" days={hasDayZoom(data.meta.increments)} />
            </details>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => phases.append({ name: '', start: '', end: '', ongoing: false, startDates: [], endDates: [] })}
        title={`Dates are written like "${example}"`}
      >
        + Add a phase
      </button>
    </fieldset>
  );
}
