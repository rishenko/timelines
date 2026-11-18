import type { Dataset } from '../types.ts';
import type { Filters } from '../state/filters.ts';
import { trackDepth, treeOrder } from '../lib/tracks.ts';

interface Props {
  data: Dataset;
  filters: Filters;
  isOn: (m: Record<string, boolean>, k: string) => boolean;
  toggleTrack: (id: string) => void;
  toggleSource: (k: string) => void;
  toggleTag: (k: string) => void;
  setAllTracks: (on: boolean) => void;
  editMode: boolean;
  onEditTrack: (id: string) => void;
  onEditSource: (key: string) => void;
}

export function FiltersPanel(p: Props) {
  const { data, filters, isOn } = p;
  const custom = data.meta.customSourceTag;
  return (
    <div className="filters-panel">
      <section>
        <h3>
          Tracks
          <span className="bulk">
            <button onClick={() => p.setAllTracks(true)}>all</button>
            <button onClick={() => p.setAllTracks(false)}>none</button>
          </span>
        </h3>
        <div className="toggles">
          {treeOrder(data.tracks).map((t) => (
            <span key={t.id} className="toggle-wrap">
              <button
                className={`toggle ${isOn(filters.tracks, t.id) ? 'on' : 'off'}${trackDepth(data.tracks, t.id) ? ' nested' : ''}${trackDepth(data.tracks, t.id) > 1 ? ' deep' : ''}`}
                style={{ '--track-color': t.color } as React.CSSProperties}
                onClick={() => p.toggleTrack(t.id)}
                aria-pressed={isOn(filters.tracks, t.id)}
              >
                <span className="chip" /> {t.name}
              </button>
              {p.editMode && (
                <button className="icon small" title={`Edit ${t.name}`} onClick={() => p.onEditTrack(t.id)}>
                  ✎
                </button>
              )}
            </span>
          ))}
        </div>
      </section>
      <section>
        <h3>Sources</h3>
        <div className="toggles">
          {Object.entries(data.sources).map(([k, s]) => (
            <span key={k} className="toggle-wrap">
              <button
                className={`toggle ${isOn(filters.sources, k) ? 'on' : 'off'}`}
                onClick={() => p.toggleSource(k)}
                aria-pressed={isOn(filters.sources, k)}
                title={s.tags.map((a) => data.tags[a]?.name ?? a).join(', ')}
              >
                {s.name}
                {s.hiddenByDefault && <span className="tag">spoilers</span>}
                {custom && s.tags.includes(custom) && <span className="tag custom">{data.tags[custom]?.name ?? custom}</span>}
              </button>
              {p.editMode && (
                <button className="icon small" title={`Edit ${s.name}`} onClick={() => p.onEditSource(k)}>
                  ✎
                </button>
              )}
            </span>
          ))}
        </div>
      </section>
      {Object.keys(data.tags).length > 0 && (
        <section>
          <h3>Source tags</h3>
          <div className="toggles">
            {Object.entries(data.tags).map(([k, a]) => (
              <button
                key={k}
                className={`toggle ${isOn(filters.tags, k) ? 'on' : 'off'}`}
                onClick={() => p.toggleTag(k)}
                aria-pressed={isOn(filters.tags, k)}
              >
                {a.name}
              </button>
            ))}
          </div>
          <p className="muted small">
            An event shows while at least one of its tracks and one of its sources are on. Sources marked as spoilers
            start hidden.
          </p>
        </section>
      )}
    </div>
  );
}
