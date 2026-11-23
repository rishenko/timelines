import { useEffect, useMemo, useRef } from 'react';
import type { Dataset, SourceRef, TimelineEvent } from '../types.ts';
import { compareEvents, formatEventDates } from '../lib/years.ts';
import { formatDate, formatYear } from '../lib/calendar.ts';
import { durationText, type DayWindow } from '../lib/subYear.ts';
import { allClaims, datingChronology, eventChronology, isApprox, type Claim, type ResolvedEvent, type Window } from '../lib/chronology.ts';
import { LINK_LABEL } from './linkLabels.ts';
import { safeUrl } from '../lib/urls.ts';
import { citeEvent, reportUrl } from '../lib/cite.ts';
import { CiteBox } from './CiteBox.tsx';
import { EventMap } from './EventMap.tsx';
import { CategoryGlyph } from './CategoryGlyph.tsx';
import type { EventCategories } from '../state/categoryFilter.ts';
import { edgeKind, edgeName, successionIndex, type SuccessionEdge } from '../lib/succession.ts';

interface Props {
  /** The event as stored (best estimates and claims). */
  event: TimelineEvent;
  /** The event as plotted under the selected chronologies, with error windows. */
  resolved: ResolvedEvent;
  resolvedById: Map<string, ResolvedEvent>;
  /** Events that pass the current filters. Connections to other events are counted, not named (spoilers). */
  visibleIds: ReadonlySet<string>;
  data: Dataset;
  editMode: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  /** The event's link: what "Cite this" cites, and what a problem report names. */
  link: string;
  /** The timeline's map file, when it has one: the panel then shows the event's rows on a map of its year. */
  mapUrl?: string;
  /** Its categories, main first (a line under its rows). */
  category?: EventCategories;
}

export function Cite({ data, s }: { data: Dataset; s: SourceRef }) {
  const src = data.sources[s.sourceKey];
  const name = src?.name ?? s.sourceKey;
  const href = safeUrl(src?.url);
  return (
    <>
      {src?.author && <span>{src.author}, </span>}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          <cite>{name}</cite>
        </a>
      ) : (
        <cite>{name}</cite>
      )}
      {src?.year && <span> ({src.year})</span>}
      {s.sourceLocation && <span className="muted">, {s.sourceLocation}</span>}
      {src?.accessed && <span className="muted"> (read {src.accessed})</span>}
    </>
  );
}

/** The rows' lifespans, phases and memberships an event started or ended (startEvent, endEvent). */
function SuccessionList({ data, label, edges }: { data: Dataset; label: string; edges: SuccessionEdge[] }) {
  if (!edges.length) return null;
  const cal = data.meta.calendar;
  return (
    <div className="claim-group">
      <h4>{label}</h4>
      <ul className="claims-list">
        {edges.map((x) => (
          <li key={`${x.trackId}-${x.phase ?? ''}-${x.member ?? ''}-${x.side}`}>
            <strong>{edgeName(x, data)}</strong>
            <span className="muted">
              {' '}
              ({edgeKind(x)}, {x.side === 'start' ? 'from' : 'to'} {formatYear(x.year, cal)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A date's claims (each source's year, with its margin and chronology), under a heading with its range. */
export function ClaimRows({ data, claims, label, window, days }: { data: Dataset; claims: Claim[]; label: string; window?: Window; days?: DayWindow }) {
  const cal = data.meta.calendar;
  if (!claims.length && !window && !days) return null;
  return (
    <div className="claim-group">
      <h4>
        {label}
        {window && (
          <span className="muted">
            {' '}
            · range {formatYear(window[0], cal)} – {formatYear(window[1], cal)} ({window[1] - window[0]} yrs)
          </span>
        )}
        {days && (
          <span className="muted">
            {' '}
            · range {formatDate(days.lo.year, days.lo.month, days.lo.day, cal)} – {formatDate(days.hi.year, days.hi.month, days.hi.day, cal)} (
            {durationText({ start: days.lo.year, startMonth: days.lo.month, startDay: days.lo.day, end: days.hi.year, endMonth: days.hi.month, endDay: days.hi.day })})
          </span>
        )}
      </h4>
      <ul className="claims-list">
        {claims.map((c, i) => (
          <li key={i}>
            <strong>
              {formatDate(c.year, c.month, c.day, cal)}
              {c.margin ? ` ± ${c.margin}` : ''}
            </strong>
            {c.chronology && <span className="chron"> {data.chronologies?.[c.chronology]?.name ?? c.chronology}</span>}
            {c.derived && <span className="muted"> (shifted from the best estimate)</span>}
            {c.source && (
              <>
                {' — '}
                <Cite data={data} s={c.source} />
              </>
            )}
            {c.note && <div className="muted small">{c.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Puts focus back on what opened a panel in the timeline (an event's mark, an age's bar), if it is drawn. */
function focusInChart(selector: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

/**
 * The details panel's frame, for everything you click in the chart (events, ages): dates over the title, a close
 * button, and its keyboard and focus behaviour. Opening moves focus to the title (not on page load: a deep link opens
 * details before the reader has done anything); Escape anywhere in it, or the close button, closes it and puts focus
 * back on `returnTo` (a CSS selector for what opened it).
 */
export function DetailsFrame({
  openKey,
  dates,
  title,
  returnTo,
  onClose,
  children,
}: {
  /** Focus moves to the title when this changes. */
  openKey: string;
  dates: React.ReactNode;
  title: React.ReactNode;
  returnTo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body) headingRef.current?.focus();
  }, [openKey]);
  const close = () => {
    onClose();
    focusInChart(returnTo);
  };
  return (
    // Escape anywhere in the panel closes it
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      className="side-panel detail"
      aria-labelledby="detail-title"
      onKeyDown={(ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          close();
        }
      }}
    >
      <header>
        <div className="dates">{dates}</div>
        <button className="icon" onClick={close} aria-label="Close details" title="Close (Esc)">
          ✕
        </button>
      </header>
      <h2 id="detail-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      {children}
    </aside>
  );
}

export function DetailPanel(p: Props) {
  const { event: e, resolved: r, data } = p;
  const cal = data.meta.calendar;
  const tracks = e.tracks.map((id) => data.tracks.find((t) => t.id === id)).filter((t) => !!t);
  const byId = p.resolvedById;
  const outgoing = (e.links ?? []).map((l) => ({ label: LINK_LABEL[l.kind].out, ev: byId.get(l.to) }));
  const incoming = data.events.flatMap((x) =>
    (x.links ?? []).filter((l) => l.to === e.uuid).map((l) => ({ label: LINK_LABEL[l.kind].in, ev: byId.get(x.uuid) })),
  );
  const all = [...outgoing, ...incoming].filter((l) => l.ev);
  const links = all.filter((l) => p.visibleIds.has(l.ev!.uuid)).sort((a, b) => compareEvents(a.ev!, b.ev!));
  const hiddenLinks = all.length - links.length;
  const report = reportUrl(data, e, p.link);

  const chron = eventChronology(data, e);
  // named only when a choice in the Dating menu can move this event
  const dating = datingChronology(data, e);
  const chronology = dating ? data.chronologies?.[dating] : undefined;
  const startClaims = allClaims(data, e.start, e.startDates, chron);
  const endClaims = e.end !== undefined ? allClaims(data, e.end, e.endDates, chron) : [];
  const approx = isApprox(r);
  const moved = r.start !== e.start || (r.end ?? r.start) !== (e.end ?? e.start);
  const succession = useMemo(() => successionIndex(data.tracks), [data.tracks]).get(e.uuid);
  const hasDating = startClaims.length > 0 || endClaims.length > 0 || r.startWindow || r.endWindow || r.startDays || r.endDays || chronology;

  return (
    <DetailsFrame
      openKey={e.uuid}
      dates={formatEventDates(r, cal, approx)}
      title={e.title}
      returnTo={`[data-event-id="${CSS.escape(e.uuid)}"]`}
      onClose={p.onClose}
    >
      <div className="track-chips">
        {tracks.map((t) => (
          <span key={t.id} className="track-chip" style={{ '--track-color': t.color } as React.CSSProperties}>
            {t.name}
          </span>
        ))}
      </div>
      {p.category && (
        <p className="category-line small">
          <CategoryGlyph kind={p.category.kind} />
          <span className="muted">{p.category.labels.length > 1 ? 'Categories' : 'Category'}</span> {p.category.labels.join('; ')}
        </p>
      )}
      {e.descr && <p className="descr">{e.descr}</p>}
      {p.mapUrl && <EventMap url={p.mapUrl} tracks={e.tracks} start={r.start} end={r.end} data={data} />}

      {succession && (
        <section className="succession">
          <h3>Began and ended</h3>
          <SuccessionList data={data} label="Ended" edges={succession.ended} />
          <SuccessionList data={data} label="Began" edges={succession.started} />
        </section>
      )}

      {hasDating && (
        <section className="dating">
          <h3>Dating</h3>
          {chronology && (
            <p className="small">
              Dated by the <strong>{chronology.name}</strong>
              {moved && (
                <>
                  {' '}
                  (best estimate {formatEventDates(e, cal, approx)}; shown here under the chronology you selected)
                </>
              )}
              .
            </p>
          )}
          <ClaimRows data={data} claims={startClaims} label={e.end !== undefined ? 'Start' : 'Date'} window={r.startWindow} days={r.startDays} />
          {e.end !== undefined && <ClaimRows data={data} claims={endClaims} label="End" window={r.endWindow} days={r.endDays} />}
          {e.circa && !startClaims.length && <p className="muted small">Approximate; no source gives a margin.</p>}
        </section>
      )}

      {all.length > 0 && (
        <section>
          <h3>Connections</h3>
          <ul className="links">
            {links.map(({ label, ev }) => (
              <li key={`${label}-${ev!.uuid}`}>
                <span className="kind">{label}</span>{' '}
                <button className="linklike" onClick={() => p.onSelect(ev!.uuid)}>
                  {ev!.title}
                </button>{' '}
                <span className="muted">{formatEventDates(ev!, cal, !!(ev!.circa || ev!.startWindow))}</span>
              </li>
            ))}
          </ul>
          {hiddenLinks > 0 && (
            <p className="muted">
              {hiddenLinks} more {hiddenLinks === 1 ? 'connection is' : 'connections are'} hidden by your filters.
            </p>
          )}
        </section>
      )}

      <section>
        <h3>Sources</h3>
        {e.sources.length === 0 && <p className="muted">No source listed.</p>}
        <ul className="sources">
          {e.sources.map((s, i) => (
            <li key={`${s.sourceKey}-${i}`}>
              <Cite data={data} s={s} />
            </li>
          ))}
        </ul>
      </section>

      <details className="cite-details">
        <summary>Cite this event</summary>
        <CiteBox cite={citeEvent(data, e, p.link)} />
      </details>

      <footer>
        <button onClick={p.onCopyLink}>Copy link</button>
        {/* only the timelines this site ships: a reader's own or a local timeline never names itself in a public issue */}
        {report && (
          <a className="report" href={report} target="_blank" rel="noreferrer">
            Report a problem<span className="sr-only"> with this event (opens a GitHub issue in a new tab)</span>
          </a>
        )}
        {p.editMode && (
          <>
            <button onClick={p.onEdit}>Edit</button>
            <button className="danger" onClick={p.onDelete}>
              Delete
            </button>
          </>
        )}
      </footer>
    </DetailsFrame>
  );
}
