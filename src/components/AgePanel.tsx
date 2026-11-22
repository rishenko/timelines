import type { Dataset } from '../types.ts';
import type { PlacedAge } from '../lib/eras.ts';
import { spanInWords } from '../lib/table.ts';
import { hostOf, safeUrl } from '../lib/urls.ts';
import { Cite, DetailsFrame } from './DetailPanel.tsx';

/**
 * An age's details in the side panel, as an event's are: its dates, region, article and sources as links. Opened by
 * clicking an age in the strip or a band (or Enter on it); it never moves the chart.
 */
export function AgePanel({ age, data, onClose }: { age: PlacedAge; data: Dataset; onClose: () => void }) {
  const { era, span, lineName } = age;
  const dates = spanInWords(span, data.meta.calendar, data.sources);
  const url = safeUrl(era.url);
  const qid = era.ids?.wikidata;
  const rows = (era.tracks ?? []).map((id) => data.tracks.find((t) => t.id === id)).filter((t) => !!t);
  return (
    <DetailsFrame openKey={`age:${era.id}`} dates={dates.main} title={era.name} returnTo={`[data-age-id="${CSS.escape(era.id)}"]`} onClose={onClose}>
      <div className="track-chips">
        {rows.length ? (
          rows.map((t) => (
            <span key={t.id} className="track-chip" style={{ '--track-color': t.color } as React.CSSProperties}>
              {t.name}
              {lineName && ` · ${lineName}`}
            </span>
          ))
        ) : (
          <span className="track-chip">All regions</span>
        )}
      </div>
      <p className="muted small">Age{dates.ranges.length > 0 && `: ${dates.ranges.join('; ')}`}</p>
      {(url || qid) && (
        <section>
          <h3>Read more</h3>
          <ul className="sources">
            {url && (
              <li>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Article on {hostOf(url)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {qid && (
              <li>
                <a href={`https://www.wikidata.org/wiki/${qid}`} target="_blank" rel="noopener noreferrer">
                  Wikidata {qid}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
        </section>
      )}
      <section>
        <h3>Sources</h3>
        {era.sources.length === 0 && <p className="muted">No source listed.</p>}
        <ul className="sources">
          {era.sources.map((s, i) => (
            <li key={`${s.sourceKey}-${i}`}>
              <Cite data={data} s={s} />
            </li>
          ))}
        </ul>
      </section>
    </DetailsFrame>
  );
}
