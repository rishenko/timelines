import { useEffect, useRef } from 'react';
import type { Dataset, SourceRef, TimelineEvent } from '../types.ts';
import { compareEvents, formatEventDates } from '../lib/years.ts';
import { formatYear } from '../lib/calendar.ts';
import { allClaims, datingChronology, eventChronology, isApprox, type Claim, type ResolvedEvent, type Window } from '../lib/chronology.ts';
import { LINK_LABEL } from './linkLabels.ts';
import { safeUrl } from '../lib/urls.ts';

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
}

function Cite({ data, s }: { data: Dataset; s: SourceRef }) {
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

function ClaimRows({ data, claims, label, window }: { data: Dataset; claims: Claim[]; label: string; window?: Window }) {
  const cal = data.meta.calendar;
  if (!claims.length && !window) return null;
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
      </h4>
      <ul className="claims-list">
        {claims.map((c, i) => (
          <li key={i}>
            <strong>
              {formatYear(c.year, cal)}
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

/** Puts focus back on an event's mark in the timeline, if it is drawn (after its detail panel closes). */
function focusEventMark(uuid: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(uuid)}"]`)?.focus());
}

export function DetailPanel(p: Props) {
  const { event: e, resolved: r, data } = p;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the panel when an event opens, so keyboard and screen-reader users land on it. Not on page load
  // (a deep link opens an event before the reader has done anything; focus stays where the browser put it).
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body) headingRef.current?.focus();
  }, [e.uuid]);
  const close = () => {
    p.onClose();
    focusEventMark(e.uuid);
  };
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

  const chron = eventChronology(data, e);
  // named only when a choice in the Dating menu can move this event
  const dating = datingChronology(data, e);
  const chronology = dating ? data.chronologies?.[dating] : undefined;
  const startClaims = allClaims(data, e.start, e.startDates, chron);
  const endClaims = e.end !== undefined ? allClaims(data, e.end, e.endDates, chron) : [];
  const approx = isApprox(r);
  const moved = r.start !== e.start || (r.end ?? r.start) !== (e.end ?? e.start);
  const hasDating = startClaims.length > 0 || endClaims.length > 0 || r.startWindow || r.endWindow || chronology;

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
        <div className="dates">{formatEventDates(r, cal, approx)}</div>
        <button className="icon" onClick={close} aria-label="Close details" title="Close (Esc)">
          ✕
        </button>
      </header>
      <h2 id="detail-title" ref={headingRef} tabIndex={-1}>
        {e.title}
      </h2>
      <div className="track-chips">
        {tracks.map((t) => (
          <span key={t.id} className="track-chip" style={{ '--track-color': t.color } as React.CSSProperties}>
            {t.name}
          </span>
        ))}
      </div>
      {e.descr && <p className="descr">{e.descr}</p>}

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
          <ClaimRows data={data} claims={startClaims} label={e.end !== undefined ? 'Start' : 'Date'} window={r.startWindow} />
          {e.end !== undefined && <ClaimRows data={data} claims={endClaims} label="End" window={r.endWindow} />}
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

      <footer>
        <button onClick={p.onCopyLink}>Copy link</button>
        {p.editMode && (
          <>
            <button onClick={p.onEdit}>Edit</button>
            <button className="danger" onClick={p.onDelete}>
              Delete
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}
