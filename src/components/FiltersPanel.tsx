import { useMemo, type ReactNode } from 'react';
import type { Dataset, Track } from '../types.ts';
import type { Filters } from '../state/filters.ts';
import { childrenMap } from '../lib/tracks.ts';
import { FilterTree, type FilterNode } from './FilterTree.tsx';

interface Props {
  data: Dataset;
  filters: Filters;
  isOn: (m: Record<string, boolean>, k: string) => boolean;
  toggleTrack: (id: string) => void;
  toggleSource: (k: string) => void;
  toggleTag: (k: string) => void;
  setAllTracks: (on: boolean) => void;
  /** Switches several rows or sources at once (a group's checkbox). */
  setTracks: (ids: string[], on: boolean) => void;
  setSources: (keys: string[], on: boolean) => void;
  /** While regions are ticked: the rows they show (the rest are dimmed in the lists), and the groups to open. */
  regionRows?: Set<string>;
  regionOpen?: string[];
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
  // Tracks as a tree: the row tree, each group switching everything below it, rows outside the ticked regions dimmed
  const { trackNodes, rowCount, inRegions } = useMemo(() => {
    const kids = childrenMap(data.tracks);
    const leaves = data.tracks.filter((t) => !kids.has(t.id));
    const build = (t: Track): FilterNode => {
      const children = (kids.get(t.id) ?? []).map(build);
      const ids = [t.id, ...children.flatMap((c) => c.ids)];
      const rows = children.length ? children.reduce((n, c) => n + (c.count ?? 1), 0) : undefined;
      return {
        key: t.id,
        name: t.name,
        label: (
          <>
            <span className="chip" style={{ '--track-color': t.color } as React.CSSProperties} /> {t.name}
          </>
        ),
        ids,
        children,
        count: rows,
        dim: !!p.regionRows && !p.regionRows.has(t.id),
        extra: p.editMode ? (
          <button className="icon small" aria-label={`Edit ${t.name}`} title={`Edit ${t.name}`} onClick={() => p.onEditTrack(t.id)}>
            ✎
          </button>
        ) : undefined,
      };
    };
    return {
      trackNodes: (kids.get(undefined) ?? []).map(build),
      rowCount: leaves.length,
      inRegions: p.regionRows ? leaves.filter((t) => p.regionRows!.has(t.id)).length : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tracks, p.regionRows, p.editMode]);
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
      <section className="tracks-filter">
        <h3>
          Tracks
          <span className="bulk">
            <button onClick={() => p.setAllTracks(true)}>all</button>
            <button onClick={() => p.setAllTracks(false)}>none</button>
          </span>
        </h3>
        {p.regionRows && (
          <p className="muted small">
            {inRegions} of {rowCount} rows are in the ticked regions; the rest are dimmed.
          </p>
        )}
        <FilterTree
          nodes={trackNodes}
          label="Tracks"
          noun="row"
          isOn={(id) => isOn(filters.tracks, id)}
          setMany={p.setTracks}
          dimNote="outside the ticked regions"
          openKeys={p.regionOpen}
        />
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
