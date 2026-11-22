import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset, Track } from '../types.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import type { FocusRequest } from '../state/focus.ts';
import {
  chronologyName,
  citationsInWords,
  datesInWords,
  eventsCsv,
  fullSections,
  sectionRows,
  spanInWords,
  type FullSection,
  type TableRow,
} from '../lib/table.ts';
import { compareEvents } from '../lib/years.ts';
import { trackIndex, trackPath } from '../lib/tracks.ts';
import type { RowRegion } from '../lib/regions.ts';
import { safeUrl } from '../lib/urls.ts';
import { isOn } from '../state/filters.ts';
import { membersByUnion, type ResolvedMembership, type UnionMember } from '../lib/memberOf.ts';

type Sort = 'date' | 'date-desc' | 'title';

interface Props {
  data: Dataset;
  /** The events that pass Filters, resolved under the reader's chronologies (the zoom's key-events-only rule doesn't apply). */
  events: ResolvedEvent[];
  /** How many events Filters hide, to say so. */
  hiddenCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** A search pick or "Go to year": scroll to and focus the event, row or year. */
  focus: FocusRequest | null;
  /** Rows' lifespans and phases, resolved under the reader's chronologies (as the chart draws them). */
  spans: Map<string, ResolvedSpan[]>;
  phases: Map<string, ResolvedPhase[]>;
  /** Rows' dated memberships in other rows (Track.memberOf): a Memberships column in the rows tables when any row has one. */
  memberOf?: Map<string, ResolvedMembership[]>;
  /** Every row of the timeline, when `data` holds only some (a comparison): memberships name their unions and members from these. */
  allTracks?: Track[];
  /** Filters' row switches: a row hidden there (or under a hidden row) is left out. */
  visibleTracks: Record<string, boolean>;
  /** Each row's regions with their sources, on timelines with regions (a Regions column in the rows tables). */
  regionsOf?: Map<string, RowRegion[]>;
}

const SORTS: Record<Sort, { label: string; compare: (a: ResolvedEvent, b: ResolvedEvent) => number }> = {
  date: { label: 'Date, earliest first', compare: compareEvents },
  'date-desc': { label: 'Date, latest first', compare: (a, b) => compareEvents(b, a) },
  title: { label: 'Title, A to Z', compare: (a, b) => a.title.localeCompare(b.title) },
};

/**
 * The timeline as tables: the accessible equivalent of the chart (WCAG 2.2 AA; docs/feature-audit.md item 23b), and a
 * way for anyone to scan and check the data. Events are grouped by region (or listed in one table), with their dates
 * and source ranges in words, their rows, importance and sources. Selecting an event opens the same detail panel as
 * the timeline. Filters and the Dating choices apply; "Download CSV" saves what's listed.
 */
export function TableView(p: Props) {
  const { data } = p;
  const cal = data.meta.calendar;
  const rootRef = useRef<HTMLDivElement>(null);
  const [grouped, setGrouped] = useState(true);
  const [sort, setSort] = useState<Sort>('date');
  const names = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  const byId = useMemo(() => trackIndex(data.tracks), [data.tracks]);

  const visible = useMemo(() => {
    const tracksOn = p.visibleTracks;
    return (id: string) => trackPath(id, byId).every((t) => isOn(tracksOn, t.id));
  }, [p.visibleTracks, byId]);
  const regionsOf = p.regionsOf;
  const memberOf = p.memberOf?.size ? p.memberOf : undefined;
  // rows with regions are listed too, so every row's regions can be read here
  const hasRegions = useMemo(() => (regionsOf ? (id: string) => !!regionsOf.get(id)?.length : undefined), [regionsOf]);
  const bySection = useMemo(
    () => fullSections(data.tracks, p.events, p.spans, p.phases, visible, hasRegions),
    [data.tracks, p.events, p.spans, p.phases, visible, hasRegions],
  );
  // regions when the timeline has them (Ancient, Classical); else its top-level rows
  const unit = bySection.some((s) => s.group) ? 'region' : 'row';
  const sections: FullSection[] = useMemo(() => {
    const cmp = SORTS[sort].compare;
    if (!grouped)
      return [
        {
          track: { id: '', name: 'All rows and events', color: '' },
          events: [...p.events].sort(cmp),
          rows: sectionRows(data.tracks, undefined, p.spans, p.phases, visible, hasRegions),
        },
      ];
    return bySection.map((s) => ({ ...s, events: [...s.events].sort(cmp) }));
  }, [grouped, sort, bySection, p.events, data.tracks, p.spans, p.phases, visible, hasRegions]);

  // Opened from a link to an event (#kadesh): scroll to it, as the chart does. Focus stays put on page load.
  useEffect(() => {
    if (!p.selectedId) return;
    rootRef.current?.querySelector(`[data-event-id="${CSS.escape(p.selectedId)}"]`)?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A search pick or a year: bring it into view and put focus on it, so keyboard and screen-reader users land there.
  useEffect(() => {
    const f = p.focus;
    const root = rootRef.current;
    if (!f || !root) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let target: HTMLElement | null = null;
    if (p.selectedId) target = root.querySelector(`[data-event-id="${CSS.escape(p.selectedId)}"]`);
    if (!target && f.trackId) target = root.querySelector(`[data-row-id="${CSS.escape(f.trackId)}"]`);
    if (!target && f.trackId) {
      const path = trackPath(f.trackId, byId);
      const section = path[1] ?? path[0];
      if (section) target = root.querySelector(`[data-section="${CSS.escape(section.id)}"]`);
    }
    if (!target) {
      // the first event at or after the year, in reading order
      target = [...root.querySelectorAll<HTMLElement>('[data-event-id]')].find((el) => Number(el.dataset.start) >= f.year) ?? null;
    }
    target?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    target?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focus]);

  const downloadCsv = () => {
    const blob = new Blob([eventsCsv(data, p.events)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.meta.id}-events.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  let lastGroup: string | undefined;
  return (
    <div id="timeline" className="table-view" role="region" aria-label={`Table: ${data.meta.title}`} tabIndex={-1} ref={rootRef}>
      <div className="table-controls">
        <p className="muted">
          {p.events.length} events
          {p.hiddenCount > 0 && `; ${p.hiddenCount} more hidden by Filters`}. Dates follow your Dating choices; ranges are
          what the cited sources allow.
        </p>
        <label className="check">
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} /> Group by {unit}
        </label>
        <label>
          Sort{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={downloadCsv} title="Save the events listed here as a spreadsheet (CSV)">
          Download CSV
        </button>
      </div>

      {sections.map((s) => {
        const groupHeading = grouped && s.group && s.group.id !== lastGroup ? s.group : undefined;
        if (grouped && s.group) lastGroup = s.group.id;
        const HeadingTag = grouped && s.group ? 'h3' : 'h2';
        return (
          <section key={s.track.id || 'all'}>
            {groupHeading && <h2 className="table-group">{groupHeading.name}</h2>}
            <HeadingTag data-section={s.track.id} tabIndex={-1}>
              {s.track.name}{' '}
              <span className="muted small">
                ({[s.rows.length && `${s.rows.length} ${s.rows.length === 1 ? 'row' : 'rows'}`, `${s.events.length} ${s.events.length === 1 ? 'event' : 'events'}`]
                  .filter(Boolean)
                  .join(', ')}
                )
              </span>
            </HeadingTag>
            {s.rows.length > 0 && <RowsTable rows={s.rows} data={data} allTracks={p.allTracks} regionsOf={regionsOf} memberOf={memberOf} onSelect={p.onSelect} />}
            {s.events.length > 0 && (
              <table className="events-table">
                <caption>Events</caption>
                <thead>
                  <tr>
                    <th scope="col" aria-sort={sort === 'date' ? 'ascending' : sort === 'date-desc' ? 'descending' : undefined}>
                      Date
                    </th>
                    <th scope="col" aria-sort={sort === 'title' ? 'ascending' : undefined}>
                      Event
                    </th>
                    <th scope="col">Rows</th>
                    <th scope="col">Sources</th>
                  </tr>
                </thead>
                <tbody>
                  {s.events.map((e) => {
                    const d = datesInWords(e, cal);
                    const chron = chronologyName(data, e);
                    return (
                      <tr key={e.uuid} className={p.selectedId === e.uuid ? 'selected' : undefined}>
                        <td className="date">
                          {d.main}
                          {d.ranges.length > 0 && <div className="muted small">{d.ranges.join('; ')}</div>}
                          {chron && <div className="muted small">{chron}</div>}
                        </td>
                        <td className="event">
                          <button
                            className="linklike"
                            data-event-id={e.uuid}
                            data-start={e.start}
                            aria-pressed={p.selectedId === e.uuid}
                            onClick={() => p.onSelect(e.uuid)}
                          >
                            {e.title}
                          </button>
                          {e.importance === 1 && <span className="key-badge">Key event</span>}
                          {e.descr && <p className="small">{e.descr}</p>}
                        </td>
                        <td className="rows">{e.tracks.map((t) => names.get(t) ?? t).join(', ')}</td>
                        <td className="sources">
                          <ul>
                            {e.sources.map((src, i) => {
                              const source = data.sources[src.sourceKey];
                              const href = safeUrl(source?.url);
                              const name = source?.name ?? src.sourceKey;
                              return (
                                <li key={`${src.sourceKey}-${i}`}>
                                  {href ? (
                                    <a href={href} target="_blank" rel="noreferrer">
                                      {name}
                                    </a>
                                  ) : (
                                    name
                                  )}
                                  {src.sourceLocation && <span className="muted">, {src.sourceLocation}</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      {p.events.length === 0 && <p className="muted">No events: Filters hide them all.</p>}
    </div>
  );
}

/**
 * A section's rows with what the chart draws on their bars: the lifespan (shaded) and the phases (named periods),
 * each with its dates and the ranges its sources allow, in words.
 */
/** A row's name, linked to its page (Track.url) when it has one, and its Wikidata id. */
function RowName({ track }: { track: Track }) {
  const url = safeUrl(track.url);
  const qid = track.ids?.wikidata;
  return (
    <>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {track.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        track.name
      )}
      {qid && (
        <>
          {' '}
          <a className="muted small" href={`https://www.wikidata.org/wiki/${qid}`} target="_blank" rel="noopener noreferrer">
            <span className="sr-only">Wikidata </span>
            {qid}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      )}
    </>
  );
}

/** A row's regions, each with the regions containing it and the sources placing the row there (as events cite them). */
function RegionCell({ regions }: { regions: RowRegion[] }) {
  if (!regions.length) return <span className="muted">None</span>;
  return (
    <ul className="region-list">
      {regions.map((r) => (
        <li key={r.id}>
          <strong>{r.name}</strong>
          {r.within.length > 0 && <span className="muted small"> (in {r.within.join(', in ')})</span>}
          <ul className="source-list">
            {r.sources.map((s) => {
              const url = safeUrl(s.url);
              return (
                <li key={s.key}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    s.name
                  )}
                  {s.locations.length > 0 && <span className="muted">, {s.locations.join('; ')}</span>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/**
 * The events that began and ended a lifespan stretch or phase (startEvent, endEvent), each a button that opens the
 * event; nothing when it names none.
 */
function BeganEnded({ s, titles, onSelect, inline }: { s: { startEvent?: string; endEvent?: string }; titles: Map<string, string>; onSelect: (id: string) => void; inline?: boolean }) {
  const parts: [string, string][] = [];
  if (s.startEvent && titles.has(s.startEvent)) parts.push(['Began with', s.startEvent]);
  if (s.endEvent && titles.has(s.endEvent)) parts.push(['ended with', s.endEvent]);
  if (!parts.length) return null;
  const link = (id: string) => (
    <button type="button" className="linklike" onClick={() => onSelect(id)}>
      {titles.get(id)}
    </button>
  );
  // in a phase's line, one run of text; under a lifespan's dates (a narrow column), one line each
  if (inline)
    return (
      <span className="began-ended muted small">
        {parts.map(([label, id], i) => (
          <span key={label}>
            {i > 0 ? '; ' : ' '}
            {i === 0 ? label[0].toUpperCase() + label.slice(1) : label} {link(id)}
          </span>
        ))}
      </span>
    );
  return (
    <>
      {parts.map(([label, id]) => (
        <div key={label} className="began-ended muted small">
          {label[0].toUpperCase() + label.slice(1)} {link(id)}
        </div>
      ))}
    </>
  );
}

/**
 * A row's memberships in other rows ("in Soviet Union: 1922 CE – 1991 CE", with the ranges its sources allow, its
 * sources and the events that began and ended it), and, for a union, its members with their years.
 */
function MembershipCell({
  own,
  members,
  data,
  allTracks,
  titles,
  onSelect,
}: {
  own: ResolvedMembership[];
  members: UnionMember[];
  data: Dataset;
  /** Rows outside the shown set too, for the unions' and members' names. */
  allTracks?: Track[];
  titles: Map<string, string>;
  onSelect: (id: string) => void;
}) {
  const cal = data.meta.calendar;
  const name = (id: string) => (allTracks ?? data.tracks).find((t) => t.id === id)?.name ?? id;
  if (!own.length && !members.length) return <span className="muted">None</span>;
  return (
    <>
      {own.length > 0 && (
        <ul className="phase-list">
          {own.map((m, i) => {
            const w = spanInWords(m, cal, data.sources);
            return (
              <li key={`${m.row}-${i}`}>
                in <strong>{name(m.row)}</strong>: {w.main}
                {w.ranges.length > 0 && <span className="muted small"> ({w.ranges.join('; ')})</span>}
                <span className="muted small"> per {citationsInWords(m.sources, data.sources)}</span>
                <BeganEnded s={m} titles={titles} onSelect={onSelect} inline />
              </li>
            );
          })}
        </ul>
      )}
      {members.length > 0 && (
        <div>
          <span className="muted small">Members ({members.length}): </span>
          {members.map((u, i) => (
            <span key={`${u.member}-${i}`}>
              {i > 0 && ', '}
              {name(u.member)} <span className="muted small">({spanInWords(u.membership, cal).main})</span>
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function RowsTable({
  rows,
  data,
  allTracks,
  regionsOf,
  memberOf,
  onSelect,
}: {
  rows: TableRow[];
  data: Dataset;
  allTracks?: Track[];
  regionsOf?: Map<string, RowRegion[]>;
  memberOf?: Map<string, ResolvedMembership[]>;
  onSelect: (id: string) => void;
}) {
  const cal = data.meta.calendar;
  const titles = useMemo(() => new Map(data.events.map((e) => [e.uuid, e.title])), [data.events]);
  const unions = useMemo(() => (memberOf ? membersByUnion(memberOf) : undefined), [memberOf]);
  return (
    <table className="events-table rows-table">
      <caption>{`Rows: lifespans, phases${memberOf ? ', memberships' : ''}${regionsOf ? ' and regions' : ''}`.replace(/, (\w+)$/, ' and $1')}</caption>
      <thead>
        <tr>
          <th scope="col">Row</th>
          <th scope="col">Lifespan</th>
          <th scope="col">Phases</th>
          {memberOf && <th scope="col">Memberships</th>}
          {regionsOf && <th scope="col">Regions</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const life = r.spans.map((s) => spanInWords(s, cal, data.sources));
          const derived = r.spans.some((s) => s.derived);
          return (
            <tr key={r.track.id}>
              <th scope="row" data-row-id={r.track.id} tabIndex={-1}>
                <RowName track={r.track} />
                {r.parent && <span className="muted small"> (in {r.parent.name})</span>}
              </th>
              <td className="date">
                {life.length ? (
                  <>
                    {/* one line per stretch: a gap between them is a time the row didn't exist */}
                    {life.map((l, i) => (
                      <div key={i}>
                        {l.main}
                        {l.ranges.length > 0 && <div className="muted small">{l.ranges.join('; ')}</div>}
                        <BeganEnded s={r.spans[i]} titles={titles} onSelect={onSelect} />
                      </div>
                    ))}
                    {derived && <div className="muted small">From its phases</div>}
                  </>
                ) : (
                  <span className="muted">{regionsOf ? 'No lifespan' : 'Not dated'}</span>
                )}
              </td>
              <td>
                {r.phases.length > 0 ? (
                  <ol className="phase-list">
                    {r.phases.map((ph, i) => {
                      const w = spanInWords(ph, cal, data.sources);
                      return (
                        <li key={`${ph.name}-${i}`}>
                          <strong>{ph.name}</strong>: {w.main}
                          {w.ranges.length > 0 && <span className="muted small"> ({w.ranges.join('; ')})</span>}
                          <BeganEnded s={ph} titles={titles} onSelect={onSelect} inline />
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <span className="muted">None</span>
                )}
              </td>
              {memberOf && (
                <td>
                  <MembershipCell own={memberOf.get(r.track.id) ?? []} members={unions?.get(r.track.id) ?? []} data={data} allTracks={allTracks} titles={titles} onSelect={onSelect} />
                </td>
              )}
              {regionsOf && (
                <td>
                  <RegionCell regions={regionsOf.get(r.track.id) ?? []} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
