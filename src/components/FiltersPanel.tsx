import type { ReactNode } from 'react';
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
  /** Long stretches with no events are squeezed into gap breaks. */
  compress: boolean;
  onCompress: (on: boolean) => void;
  /** Arrows between every pair of connected events, and the lines joining a shared event's rows, not only the selected one's. */
  showLinks: boolean;
  onShowLinks: (on: boolean) => void;
  /** Rows with nothing near the view are hidden. */
  hideOutOfView: boolean;
  onHideOutOfView: (on: boolean) => void;
  /** Hidden rows are drawn as thin lines in their place rather than taken out. */
  thinRows: boolean;
  onThinRows: (thin: boolean) => void;
  editMode: boolean;
  onEditTrack: (id: string) => void;
  onEditSource: (key: string) => void;
  /** The Regions section (RegionFilter), on timelines whose rows have regions. */
  regions?: ReactNode;
}

export function FiltersPanel(p: Props) {
  const { data, filters, isOn } = p;
  const custom = data.meta.customSourceTag;
  return (
    <div className={`filters-panel${p.regions ? ' has-regions' : ''}`}>
      <section>
        <h3>Chart</h3>
        <label className="check" title="Collapse long stretches with no events">
          <input type="checkbox" checked={p.compress} onChange={(e) => p.onCompress(e.target.checked)} /> Shorten gaps with no events
        </label>
        <label className="check" title="Arrows between connected events, and the lines joining a shared event’s rows; off, only the selected event’s show">
          <input type="checkbox" checked={p.showLinks} onChange={(e) => p.onShowLinks(e.target.checked)} /> Show all event connections
        </label>
        <h3>Rows</h3>
        <label className="check">
          <input type="checkbox" checked={p.hideOutOfView} onChange={(e) => p.onHideOutOfView(e.target.checked)} />
          Hide rows with nothing in view
        </label>
        <fieldset className="rows-look" disabled={!p.hideOutOfView}>
          <legend className="sr-only">Hidden rows</legend>
          <label className="check">
            <input type="radio" name="rows-look" checked={!p.thinRows} onChange={() => p.onThinRows(false)} /> Take them out
          </label>
          <label className="check">
            <input type="radio" name="rows-look" checked={p.thinRows} onChange={() => p.onThinRows(true)} /> Show them as thin lines
          </label>
        </fieldset>
        <p className="muted small">
          Rows come back as you scroll to their years. Groups stay and say how many rows are hidden below them. Thin lines keep every row in its place.
          {p.editMode && ' Off while editing, so every row can be reached.'}
        </p>
      </section>
      {p.regions}
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
                <button className="icon small" aria-label={`Edit ${t.name}`} title={`Edit ${t.name}`} onClick={() => p.onEditTrack(t.id)}>
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
                <button className="icon small" aria-label={`Edit ${s.name}`} title={`Edit ${s.name}`} onClick={() => p.onEditSource(k)}>
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
