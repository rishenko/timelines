import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../types.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';
import type { FocusRequest } from '../timeline/TimelineView.tsx';
import { chronologyName, datesInWords, eventsCsv, tableSections, type TableSection } from '../lib/table.ts';
import { compareEvents } from '../lib/years.ts';
import { trackIndex, trackPath } from '../lib/tracks.ts';
import { safeUrl } from '../lib/urls.ts';

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

  const bySection = useMemo(() => tableSections(data.tracks, p.events), [data.tracks, p.events]);
  // regions when the timeline has them (Ancient, Classical); else its top-level rows (REDACTED's factions)
  const unit = bySection.some((s) => s.group) ? 'region' : 'row';
  const sections: TableSection[] = useMemo(() => {
    const cmp = SORTS[sort].compare;
    if (!grouped) return [{ track: { id: '', name: 'All events', color: '' }, events: [...p.events].sort(cmp) }];
    return bySection.map((s) => ({ ...s, events: [...s.events].sort(cmp) }));
  }, [grouped, sort, bySection, p.events]);

  // A search pick or a year: bring it into view and put focus on it, so keyboard and screen-reader users land there.
  useEffect(() => {
    const f = p.focus;
    const root = rootRef.current;
    if (!f || !root) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let target: HTMLElement | null = null;
    if (p.selectedId) target = root.querySelector(`[data-event-id="${CSS.escape(p.selectedId)}"]`);
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
        const headingId = `table-${s.track.id || 'all'}`;
        return (
          <section key={s.track.id || 'all'}>
            {groupHeading && <h2 className="table-group">{groupHeading.name}</h2>}
            <HeadingTag id={headingId} data-section={s.track.id} tabIndex={-1}>
              {s.track.name} <span className="muted small">({s.events.length})</span>
            </HeadingTag>
            <table className="events-table" aria-labelledby={headingId}>
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
          </section>
        );
      })}
      {p.events.length === 0 && <p className="muted">No events: Filters hide them all.</p>}
    </div>
  );
}
