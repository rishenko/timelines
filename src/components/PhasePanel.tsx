import type { Dataset, RowMembership, Track, TrackPhase } from '../types.ts';
import { allClaims, trackChronology, type ResolvedSpan } from '../lib/chronology.ts';
import { spanInWords } from '../lib/table.ts';
import { ClaimRows, Cite, DetailsFrame } from './DetailPanel.tsx';

/** A phase or membership opened from a row's strip (Enter on its cell): the row, what it is, as stored and as drawn. */
export interface SelectedPhase {
  /** Its PlacedPhase.ref: the strip cell to put focus back on. */
  ref: string;
  track: Track;
  /** Its name ("New Kingdom"), or for a membership the union's name. */
  name: string;
  /** Set for a membership: the union's row. */
  union?: Track;
  stored: TrackPhase | RowMembership;
  resolved: ResolvedSpan;
}

/**
 * A row's phase (or its membership in another row) in the side panel, as an age's or event's details are: its dates,
 * each date's claims with their sources, the events that began and ended it, and its sources. Opened from the
 * keyboard on its strip cell; it never moves the chart.
 */
export function PhasePanel({ phase, data, onClose }: { phase: SelectedPhase; data: Dataset; onClose: () => void }) {
  const { ref, track, name, union, stored, resolved } = phase;
  const dates = spanInWords(resolved, data.meta.calendar, data.sources);
  const chron = trackChronology(data.tracks, track.id);
  const startClaims = allClaims(data, stored.start, stored.startDates, chron);
  const endClaims = stored.end !== undefined ? allClaims(data, stored.end, stored.endDates, chron) : [];
  const eventTitle = (id?: string) => (id ? data.events.find((e) => e.uuid === id)?.title : undefined);
  const began = eventTitle(stored.startEvent);
  const ended = eventTitle(stored.endEvent);
  // every source it cites: its own (a membership's), its date claims', and those saying it's still going
  const seen = new Set<string>();
  const refs = [...('sources' in stored ? stored.sources : []), ...[...startClaims, ...endClaims].flatMap((c) => (c.source ? [c.source] : [])), ...(stored.ongoingSources ?? [])].filter((s) => {
    const k = `${s.sourceKey}\n${s.sourceLocation}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  // a membership names its union (`name`: the union row's name, or its id when that row isn't in this timeline)
  const member = 'row' in stored;
  const title = member ? `${track.name} in ${name}` : name;
  return (
    <DetailsFrame openKey={`phase:${ref}`} dates={dates.main} title={title} returnTo={`[data-phase-ref="${CSS.escape(ref)}"]`} onClose={onClose}>
      <div className="track-chips">
        <span className="track-chip" style={{ '--track-color': track.color } as React.CSSProperties}>
          {track.name}
        </span>
        {union && (
          <span className="track-chip" style={{ '--track-color': union.color } as React.CSSProperties}>
            {union.name}
          </span>
        )}
      </div>
      <p className="muted small">
        {member ? `Membership of ${name}` : `Phase of ${track.name}`}
        {resolved.ongoing && ', still going'}
        {dates.ranges.length > 0 && `: ${dates.ranges.join('; ')}`}
      </p>
      {(startClaims.length > 0 || endClaims.length > 0) && (
        <section>
          <h3>Dating</h3>
          <ClaimRows data={data} claims={startClaims} label="Start" window={resolved.startWindow} days={resolved.startDays} />
          <ClaimRows data={data} claims={endClaims} label="End" window={resolved.endWindow} days={resolved.endDays} />
        </section>
      )}
      {(began || ended) && (
        <section>
          <h3>Events</h3>
          <ul className="claims-list">
            {began && (
              <li>
                Began with <strong>{began}</strong>
              </li>
            )}
            {ended && (
              <li>
                Ended with <strong>{ended}</strong>
              </li>
            )}
          </ul>
        </section>
      )}
      <section>
        <h3>Sources</h3>
        {refs.length === 0 && <p className="muted">No source listed.</p>}
        <ul className="sources">
          {refs.map((s, i) => (
            <li key={`${s.sourceKey}-${i}`}>
              <Cite data={data} s={s} />
            </li>
          ))}
        </ul>
      </section>
    </DetailsFrame>
  );
}
