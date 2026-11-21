import { useMemo, useState, type ReactNode } from 'react';
import type { Dataset, Track } from '../types.ts';
import type { Filters } from '../state/filters.ts';
import { childrenMap } from '../lib/tracks.ts';
import { FilterTree, type FilterNode } from './FilterTree.tsx';
import { spanStretches } from '../lib/lifespan.ts';

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

const OPEN_KEY = 'timelines:filters-open';
/**
 * Which of the two sections are open: the reader's last choice, else both on wide screens and only Data filters on
 * phones (the chart options are the ones readers change least).
 */
function initialOpen(): { visual: boolean; data: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? 'null') as { visual?: unknown; data?: unknown } | null;
    if (saved && typeof saved.visual === 'boolean' && typeof saved.data === 'boolean') return { visual: saved.visual, data: saved.data };
  } catch {
    // unreadable: use the defaults
  }
  const phone = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 640px)').matches;
  return { visual: !phone, data: true };
}

export function FiltersPanel(p: Props) {
  const { data, filters, isOn } = p;
  const [open, setOpenState] = useState(initialOpen);
  const setOpen = (which: 'visual' | 'data', on: boolean) =>
    setOpenState((o) => {
      if (o[which] === on) return o;
      const next = { ...o, [which]: on };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        // storage off: the choice lasts until the page closes
      }
      return next;
    });
  const custom = data.meta.customSourceTag;
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

  // Sources grouped by where they are used: the areas (top-level rows) of the rows whose events, dates or regions cite
  // them; while regions are ticked, the sources those rows use first (open), every other one folded below
  const sourceNodes = useMemo(() => {
    const byId = new Map(data.tracks.map((t) => [t.id, t]));
    const areaOf = (id: string) => {
      let t = byId.get(id);
      const seen = new Set<string>();
      while (t?.parent && !seen.has(t.id)) {
        seen.add(t.id);
        t = byId.get(t.parent);
      }
      return t?.id;
    };
    const rowsOf = new Map<string, Set<string>>();
    const use = (key: string | undefined, row: string) => {
      if (!key) return;
      if (!rowsOf.has(key)) rowsOf.set(key, new Set());
      rowsOf.get(key)!.add(row);
    };
    for (const e of data.events)
      for (const src of [...e.sources, ...[...(e.startDates ?? []), ...(e.endDates ?? [])].flatMap((c) => (c.source ? [c.source] : []))])
        for (const t of e.tracks) use(src.sourceKey, t);
    for (const t of data.tracks) {
      for (const c of [...spanStretches(t.span).flatMap((s) => [...(s.startDates ?? []), ...(s.endDates ?? [])]), ...(t.phases ?? []).flatMap((ph) => [...(ph.startDates ?? []), ...(ph.endDates ?? [])])])
        use(c.source?.sourceKey, t.id);
      for (const s of [...spanStretches(t.span), ...(t.phases ?? [])]) for (const r of s.ongoingSources ?? []) use(r.sourceKey, t.id);
      for (const m of t.memberships ?? []) for (const src of m.sources) use(src.sourceKey, t.id);
    }
    const leaf = (group: string, k: string, dim: boolean): FilterNode => {
      const src = data.sources[k];
      return {
        key: `${group}:${k}`,
        name: src.name,
        label: (
          <span title={src.tags.map((a) => data.tags[a]?.name ?? a).join(', ')}>
            {src.name}
            {src.hiddenByDefault && <span className="tag">spoilers</span>}
            {custom && src.tags.includes(custom) && <span className="tag custom">{data.tags[custom]?.name ?? custom}</span>}
          </span>
        ),
        ids: [k],
        dim,
        extra: p.editMode ? (
          <button className="icon small" aria-label={`Edit ${src.name}`} title={`Edit ${src.name}`} onClick={() => p.onEditSource(k)}>
            ✎
          </button>
        ) : undefined,
      };
    };
    const byName = (a: string, b: string) => data.sources[a].name.localeCompare(data.sources[b].name);
    const group = (key: string, name: string, keys: string[], dim: boolean, children?: FilterNode[]): FilterNode => ({
      key,
      name,
      ids: keys,
      count: keys.length,
      children: children ?? [...keys].sort(byName).map((k) => leaf(key, k, dim)),
    });
    const keys = Object.keys(data.sources);
    const areasOf = (k: string) => new Set([...(rowsOf.get(k) ?? [])].map(areaOf).filter((a): a is string => !!a));
    const byArea = (list: string[], prefix: string, dim: boolean) => {
      const roots = data.tracks.filter((t) => !t.parent);
      const out = roots
        .map((r) => group(`${prefix}${r.id}`, r.name, list.filter((k) => areasOf(k).has(r.id)), dim))
        .filter((g) => g.ids.length);
      const unused = list.filter((k) => !areasOf(k).size);
      if (unused.length) out.push(group(`${prefix}unused`, 'Not cited by any row', unused, dim));
      return out;
    };
    if (!p.regionRows) return byArea(keys, 'src:', false);
    const inside = keys.filter((k) => [...(rowsOf.get(k) ?? [])].some((r) => p.regionRows!.has(r)));
    const others = keys.filter((k) => !inside.includes(k));
    return [
      group('src:in-regions', 'Used by rows in the ticked regions', inside, false),
      group('src:others', 'Other sources', others, true, byArea(others, 'src:other:', true)),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, p.regionRows, p.editMode, custom]);
  return (
    <div className="filters-panel">
      <details className="filters-group visual" open={open.visual} onToggle={(e) => setOpen('visual', e.currentTarget.open)}>
        <summary>
          <span className="filters-title">Visual filters</span> <span className="muted small">how the chart draws</span>
        </summary>
        <div className="filters-group-body">
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
        </div>
      </details>
      <details className="filters-group data" open={open.data} onToggle={(e) => setOpen('data', e.currentTarget.open)}>
        <summary>
          <span className="filters-title">Data filters</span> <span className="muted small">what it shows</span>
        </summary>
        <div className={`filters-group-body data-body${p.regions ? ' has-regions' : ''}`}>
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
            <h3>
              Sources
              <span className="bulk">
                <button onClick={() => p.setSources(Object.keys(data.sources), true)}>all</button>
                <button onClick={() => p.setSources(Object.keys(data.sources), false)}>none</button>
              </span>
            </h3>
            <FilterTree
              nodes={sourceNodes}
              label="Sources"
              noun="source"
              isOn={(k) => isOn(filters.sources, k)}
              setMany={p.setSources}
              dimNote="not used by rows in the ticked regions"
            />
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
      </details>
    </div>
  );
}
