import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimelineView, type FocusRequest } from './timeline/TimelineView.tsx';
import { downloadDataset, draftKey, parseUpload, useDataset } from './state/dataset.ts';
import { isEventVisible, useFilters } from './state/filters.ts';
import { DetailPanel } from './components/DetailPanel.tsx';
import { EventForm } from './components/EventForm.tsx';
import { newEvent } from './lib/newEvent.ts';
import { TrackForm } from './components/TrackForm.tsx';
import { SourceForm } from './components/SourceForm.tsx';
import { FiltersPanel } from './components/FiltersPanel.tsx';
import { ThemePanel } from './components/ThemePanel.tsx';
import { useTheme } from './state/theme.ts';
import { compareEvents, datasetPresent, formatEventDates } from './lib/years.ts';
import { ancestorIds, buildIndex, trackRange, type SearchEntry } from './lib/search.ts';
import { SearchBox } from './components/SearchBox.tsx';
import { formatYear, parseYear } from './lib/calendar.ts';
import {
  chronologyGroups,
  defaultSelection,
  resolveEvents,
  resolveSpan,
  type ChronologySelection,
  type ResolvedSpan,
} from './lib/chronology.ts';
import { allTimelines, BUNDLED, BUNDLED_IDS, findTimeline } from './timelines/index.ts';
import { addToLibrary, fetchTimeline, normalizeUrl, removeFromLibrary, type LibraryEntry } from './state/library.ts';
import { TimelinesPanel } from './components/TimelinesPanel.tsx';
import { LegendPanel } from './components/LegendPanel.tsx';
import { DatingMenu } from './components/DatingMenu.tsx';
import { keyEventsOnly } from './state/zoom.ts';
import { anyCollapsed, collapseAll, defaultCollapsed, parentIds, sameCollapsed } from './state/collapse.ts';
import { safeUrl } from './lib/urls.ts';
import type { Dataset, TimelineEvent, Track } from './types.ts';

type Editing =
  | { kind: 'event'; event: TimelineEvent; isNew: boolean }
  | { kind: 'track'; track: Track | null; parent?: string }
  | { kind: 'source'; key: string | null }
  | null;

function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const choice = findTimeline(q.get('timeline'));
  const published = choice.dataset;
  const { increments, defaultIncrement, calendar } = published.meta;
  const inc = Number(q.get('inc'));
  const at = q.get('at');
  return {
    published,
    library: choice.library,
    increment: increments.includes(inc) ? inc : defaultIncrement,
    at: at !== null ? parseYear(at, calendar) : null,
    compress: q.get('compress') !== '0',
    links: q.get('links') === '1',
    selected: decodeURIComponent(window.location.hash.slice(1)) || null,
  };
}

/** Set once the legend has been shown, so it opens by itself only on a first visit. */
const LEGEND_SEEN_KEY = "timelines:legend-seen";

function firstVisit(): boolean {
  try {
    return !localStorage.getItem(LEGEND_SEEN_KEY);
  } catch {
    return false;
  }
}

/** Picker entry that opens the library panel instead of a timeline. */
const MANAGE = "__manage__";

const goToTimeline = (id: string) => {
  window.location.href = `${window.location.pathname}?timeline=${encodeURIComponent(id)}`;
};

/** A link anyone can open: timelines from a URL travel as ?data=<url>; others by id (bundled, or in this browser's library). */
function shareSearch(id: string, library?: LibraryEntry): string {
  return library?.sourceUrl ? `?data=${encodeURIComponent(library.sourceUrl)}` : `?timeline=${encodeURIComponent(id)}`;
}

export default function App() {
  const [initialUrl] = useState(readUrl);
  const [{ data, dirty, published, updatedUnderDraft }, dispatch] = useDataset(initialUrl.published);
  const meta = data.meta;
  const cal = meta.calendar;
  const present = datasetPresent(data);
  const { filters, toggleTrack, toggleSource, toggleTag, setAllTracks, isOn } = useFilters(data);

  useEffect(() => {
    document.title = meta.subtitle ? `${meta.title} (${meta.subtitle})` : meta.title;
  }, [meta.title, meta.subtitle]);

  // Chronologies: readers pick one per group (e.g. Mesopotamia: High / Middle / Low).
  const [chronSel, setChronSel] = useState<ChronologySelection>(() => defaultSelection(data));
  const chronDefaults = useMemo(() => defaultSelection(data), [data]);
  // on phones the credits note is clamped to two lines; a tap opens it (see .legal in CSS)
  const [creditsOpen, setCreditsOpen] = useState(false);
  const groups = useMemo(() => [...chronologyGroups(data)].filter(([, list]) => list.length > 1), [data]);
  const resolved = useMemo(() => resolveEvents(data, chronSel), [data, chronSel]);
  const resolvedById = useMemo(() => new Map(resolved.map((e) => [e.uuid, e])), [resolved]);
  const visibleEvents = useMemo(() => resolved.filter((e) => isEventVisible(e, filters)), [resolved, filters]);
  const visibleIds = useMemo(() => new Set(visibleEvents.map((e) => e.uuid)), [visibleEvents]);
  const spans = useMemo(() => {
    const m = new Map<string, ResolvedSpan>();
    for (const t of data.tracks) if (t.span) m.set(t.id, resolveSpan(data, t.id, t.span, chronSel));
    return m;
  }, [data, chronSel]);

  const [increment, setIncrement] = useState(initialUrl.increment);
  const [compress, setCompress] = useState(initialUrl.compress);
  const [showLinks, setShowLinks] = useState(initialUrl.links);
  const openingCollapsed = useMemo(() => defaultCollapsed(meta.collapsed), [meta.collapsed]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => defaultCollapsed(meta.collapsed));
  const hasSubRows = useMemo(() => parentIds(data.tracks).length > 0, [data.tracks]);
  const someCollapsed = useMemo(() => anyCollapsed(data.tracks, collapsed), [data.tracks, collapsed]);
  // "Default view" restores the rows the timeline opens with; only useful when that isn't simply "all open".
  const canReset = useMemo(
    () => anyCollapsed(data.tracks, openingCollapsed) && !sameCollapsed(data.tracks, collapsed, openingCollapsed),
    [data.tracks, collapsed, openingCollapsed],
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showTimelines, setShowTimelines] = useState(false);
  const [showLegend, setShowLegend] = useState(firstVisit);
  useEffect(() => {
    try {
      localStorage.setItem(LEGEND_SEEN_KEY, "1");
    } catch {
      // storage disabled: the legend just opens on every visit
    }
  }, []);
  const [timelines, setTimelines] = useState(allTimelines);
  const [theme, setTheme, resetTheme] = useTheme(meta.defaultTheme);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  // on opening, readers with a saved draft hear if the published timeline changed underneath it
  const [toast, setToast] = useState<{ text: string; kind: 'info' | 'error'; n: number } | null>(() =>
    updatedUnderDraft
      ? { text: 'The published timeline has been updated. Your local edits are kept on top of the new version.', kind: 'info', n: 0 }
      : null,
  );
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialUrl.selected && data.events.some((e) => e.uuid === initialUrl.selected) ? initialUrl.selected : null,
  );
  // At a timeline's coarsest zoom, draw only its key events (plus the selected one), if it marks any.
  const keyOnly = useMemo(() => keyEventsOnly(meta.increments, increment, data.events), [meta.increments, increment, data.events]);
  const drawnEvents = useMemo(
    () => (keyOnly ? visibleEvents.filter((e) => e.importance === 1 || e.uuid === selectedId) : visibleEvents),
    [keyOnly, visibleEvents, selectedId],
  );
  // Links to neighbouring timelines (meta.continues), for the ends of the ruler; unknown timelines are skipped.
  const edgeLinks = useMemo(
    () =>
      (meta.continues ?? []).flatMap((c) => {
        const target = allTimelines().find((t) => t.dataset.meta.id === c.timeline)?.dataset;
        if (!target) return [];
        const at = formatYear(c.at, target.meta.calendar);
        return [
          {
            side: c.side,
            year: c.at,
            label: c.side === 'before' ? `Earlier: ${target.meta.title}` : `Continues in ${target.meta.title}`,
            title: `Open ${target.meta.title} at ${at}`,
            href: `?timeline=${encodeURIComponent(c.timeline)}&at=${encodeURIComponent(at)}`,
          },
        ];
      }),
    [meta.continues],
  );
  const [initialCenter] = useState(() => {
    if (initialUrl.at !== null) return initialUrl.at;
    const sel = resolved.find((e) => e.uuid === selectedId);
    if (sel) return sel.start;
    // historical timelines open where most of their events are (the median start); fictional ones on their
    // "present". The median, not the midpoint of the range, so a few very early events don't pull the opening
    // view into a near-empty stretch.
    if (data.present === undefined && resolved.length) {
      const ys = resolved.map((e) => e.start).sort((a, b) => a - b);
      return ys[Math.floor(ys.length / 2)];
    }
    return present;
  });

  const notify = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    setToast({ text, kind, n: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // URL sync: view settings in the query string, selected event in the hash.
  const centerRef = useRef(initialCenter);
  const urlTimer = useRef(0);
  const writeUrl = useCallback(() => {
    clearTimeout(urlTimer.current);
    urlTimer.current = window.setTimeout(() => {
      const q = new URLSearchParams();
      q.set('timeline', published.meta.id);
      q.set('inc', String(increment));
      q.set('at', String(centerRef.current));
      if (!compress) q.set('compress', '0');
      if (showLinks) q.set('links', '1');
      const hash = selectedId ? `#${selectedId}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}?${q}${hash}`);
    }, 250);
  }, [published.meta.id, increment, compress, showLinks, selectedId]);
  useEffect(writeUrl, [writeUrl]);
  const onCenterYearChange = useCallback(
    (y: number) => {
      centerRef.current = y;
      writeUrl();
    },
    [writeUrl],
  );

  const selected = selectedId ? data.events.find((e) => e.uuid === selectedId) : undefined;
  const selectedResolved = selectedId ? resolvedById.get(selectedId) : undefined;

  const selectAndFocus = (id: string) => {
    const e = resolvedById.get(id);
    if (!e) return;
    setSelectedId(id);
    setFocus({ year: e.start, nonce: Date.now() });
  };

  // ---- search: rows and events ----
  const searchIndex = useMemo(() => buildIndex(data.tracks, [...resolved].sort(compareEvents)), [data.tracks, resolved]);
  const parseSearchYear = useCallback((text: string) => parseYear(text, cal), [cal]);
  const formatSearchYear = useCallback((y: number) => formatYear(y, cal), [cal]);
  const describeYears = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'event') {
        const e = resolvedById.get(entry.id);
        return e ? formatEventDates(e, cal, !!(e.circa || e.startWindow || e.endWindow)).replace(/ \(.*\)$/, '') : '';
      }
      const s = spans.get(entry.id);
      if (!s) return '';
      const approx = !!(s.startWindow || s.endWindow || data.tracks.find((t) => t.id === entry.id)?.span?.circa);
      return `${formatYear(s.start, cal, approx)} – ${formatYear(s.end, cal)}`;
    },
    [resolvedById, spans, cal, data.tracks],
  );
  const searchHidden = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'track') return isOn(filters.tracks, entry.id) ? null : 'row hidden by Filters';
      const e = resolvedById.get(entry.id);
      return e && !visibleIds.has(e.uuid) ? 'hidden by Filters' : null;
    },
    [filters.tracks, isOn, resolvedById, visibleIds],
  );
  /** Opens the folded rows above a row (and, for a row result, the row itself), so the target is on screen. */
  const reveal = (trackId: string, openSelf: boolean) =>
    setCollapsed((c) => {
      const next = { ...c };
      for (const id of ancestorIds(trackId, data.tracks)) delete next[id];
      if (openSelf) delete next[trackId];
      return next;
    });
  const onSearchPick = (entry: SearchEntry) => {
    const hidden = searchHidden(entry);
    if (entry.kind === 'track') {
      reveal(entry.id, true);
      const r = trackRange(entry.id, data.tracks, resolved, spans);
      setFocus({
        year: r ? Math.round((r.start + r.end) / 2) : centerRef.current,
        range: r ? [r.start, r.end] : undefined,
        trackId: entry.id,
        nonce: Date.now(),
      });
    } else {
      const e = resolvedById.get(entry.id);
      if (!e) return;
      // the row to show it on: its first row that isn't filtered out
      const trackId = e.tracks.find((t) => isOn(filters.tracks, t)) ?? entry.trackId;
      reveal(trackId, false);
      setSelectedId(e.uuid);
      setFocus({ year: e.start, range: [e.start, e.end ?? e.start], trackId, nonce: Date.now() });
    }
    if (hidden)
      notify(`${entry.kind === 'track' ? 'The row ' : ''}“${entry.label}” is hidden by Filters. Open Filters to show it.`);
  };

  const fileRef = useRef<HTMLInputElement>(null);
  /**
   * Opens a timeline file. The current timeline's own file loads as edits to it; a file for another
   * bundled timeline opens there as its edits; anything else is added to the library and opened.
   * Throws an Error with a readable message.
   */
  const importFile = async (file: File) => {
    const { dataset, errors, migratedFrom } = parseUpload(await file.text());
    if (!dataset) {
      console.error(errors);
      throw new Error(
        `Couldn't load ${file.name}: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more; see console)` : ''}`,
      );
    }
    const id = dataset.meta.id;
    if (id === published.meta.id) {
      dispatch({ type: 'load', dataset });
      notify(`Loaded ${file.name}${migratedFrom ? ` (converted from the v${migratedFrom} format)` : ''}.`);
      return;
    }
    if (BUNDLED_IDS.includes(id)) {
      // a whole file for another bundled timeline: that timeline applies it in full (see restoreDraft)
      localStorage.setItem(draftKey(id), JSON.stringify({ format: 'replace', data: dataset }));
      goToTimeline(id);
      return;
    }
    goToTimeline(addToLibrary(dataset, { reservedIds: BUNDLED_IDS }).dataset.meta.id);
  };
  const onUpload = (file: File) => importFile(file).catch((e: Error) => notify(e.message, 'error'));

  const addFromUrl = async (raw: string) => {
    const url = normalizeUrl(raw);
    const dataset = await fetchTimeline(url);
    goToTimeline(addToLibrary(dataset, { sourceUrl: url, reservedIds: BUNDLED_IDS }).dataset.meta.id);
  };

  const refreshEntry = async (entry: LibraryEntry) => {
    const dataset = await fetchTimeline(entry.sourceUrl!);
    const updated = addToLibrary(dataset, { sourceUrl: entry.sourceUrl, reservedIds: BUNDLED_IDS });
    if (updated.dataset.meta.id === published.meta.id) window.location.reload();
    else {
      setTimelines(allTimelines());
      notify(`Updated "${updated.dataset.meta.title}".`);
    }
  };

  const removeEntry = (entry: LibraryEntry) => {
    const d = entry.dataset;
    if (!window.confirm(`Remove "${d.meta.title}" from this browser? Any edits you made to it are deleted too.`)) return;
    removeFromLibrary(d.meta.id);
    if (d.meta.id === published.meta.id) goToTimeline(BUNDLED[0].meta.id);
    else {
      setTimelines(allTimelines());
      notify(`Removed "${d.meta.title}".`);
    }
  };

  const shareBase = (library?: LibraryEntry) =>
    `${window.location.origin}${window.location.pathname}${shareSearch(published.meta.id, library)}`;

  const copyShareLink = async (entry: LibraryEntry) => {
    await navigator.clipboard.writeText(shareBase(entry));
    notify('Share link copied.');
  };

  const copyLink = async (id: string) => {
    // a URL timeline shares as ?data=…, so the link works in any browser; view settings ride along
    const q = new URLSearchParams(window.location.search);
    const extra = ['inc', 'at', 'compress', 'links']
      .filter((k) => q.has(k))
      .map((k) => `&${k}=${encodeURIComponent(q.get(k)!)}`)
      .join('');
    await navigator.clipboard.writeText(`${shareBase(initialUrl.library)}${extra}#${id}`);
    notify('Link copied.');
  };

  const sidePanel = (() => {
    if (editing?.kind === 'event')
      return (
        <EventForm
          key={editing.event.uuid}
          initial={editing.event}
          isNew={editing.isNew}
          data={data}
          onCancel={() => setEditing(null)}
          onCreateTrack={(t) => {
            dispatch({ type: 'upsertTrack', track: t });
            notify(`Track "${t.name}" created.`);
          }}
          onCreateSource={(key, src) => {
            dispatch({ type: 'upsertSource', key, source: src });
            notify(`Source "${src.name}" created.`);
          }}
          onSave={(e) => {
            dispatch({ type: 'upsertEvent', event: e });
            setEditing(null);
            setSelectedId(e.uuid);
            notify(editing.isNew ? 'Event created.' : 'Event saved.');
          }}
        />
      );
    if (editing?.kind === 'track')
      return (
        <TrackForm
          key={editing.track?.id ?? 'new'}
          initial={editing.track}
          defaultParent={editing.parent}
          data={data}
          onCancel={() => setEditing(null)}
          onSave={(t, previousId) => {
            dispatch({ type: 'upsertTrack', track: t, previousId });
            setEditing(null);
            notify(previousId ? 'Track saved.' : `Track "${t.name}" created.`);
          }}
          onDelete={(id) => {
            const sel = selectedId ? data.events.find((e) => e.uuid === selectedId) : undefined;
            if (sel && sel.tracks.every((t) => t === id)) setSelectedId(null);
            dispatch({ type: 'removeTrack', id });
            setEditing(null);
            notify('Track deleted.');
          }}
        />
      );
    if (editing?.kind === 'source')
      return (
        <SourceForm
          key={editing.key ?? 'new'}
          sourceKey={editing.key}
          data={data}
          onCancel={() => setEditing(null)}
          onSave={(key, src, previousKey) => {
            dispatch({ type: 'upsertSource', key, source: src, previousKey });
            setEditing(null);
            notify(previousKey ? 'Source saved.' : `Source "${src.name}" created.`);
          }}
          onDelete={(key) => {
            dispatch({ type: 'removeSource', key });
            setEditing(null);
            notify('Source deleted.');
          }}
        />
      );
    if (selected && selectedResolved)
      return (
        <DetailPanel
          event={selected}
          resolved={selectedResolved}
          resolvedById={resolvedById}
          visibleIds={visibleIds}
          data={data}
          editMode={editMode}
          onClose={() => setSelectedId(null)}
          onSelect={selectAndFocus}
          onCopyLink={() => void copyLink(selected.uuid)}
          onEdit={() => setEditing({ kind: 'event', event: selected, isNew: false })}
          onDelete={() => {
            if (!window.confirm(`Delete "${selected.title}"?`)) return;
            dispatch({ type: 'removeEvent', uuid: selected.uuid });
            setSelectedId(null);
            notify('Event deleted.');
          }}
        />
      );
    return null;
  })();

  const exampleYear = formatYear(cal.yearZero ? 4500 : -1273, cal);

  return (
    <div className="app">
      <header className="toolbar">
        <h1>
          <select
            className="timeline-picker"
            aria-label="Timeline"
            value={published.meta.id}
            onChange={(e) => {
              if (e.target.value === MANAGE) setShowTimelines(true);
              else goToTimeline(e.target.value);
            }}
          >
            <optgroup label="Included">
              {timelines
                .filter((t) => !t.library)
                .map(({ dataset: t }: { dataset: Dataset }) => (
                  <option key={t.meta.id} value={t.meta.id}>
                    {t.meta.title}
                  </option>
                ))}
            </optgroup>
            {timelines.some((t) => t.library) && (
              <optgroup label="Your timelines">
                {timelines
                  .filter((t) => t.library)
                  .map(({ dataset: t }) => (
                    <option key={t.meta.id} value={t.meta.id}>
                      {t.meta.title}
                    </option>
                  ))}
              </optgroup>
            )}
            <option value={MANAGE}>Add or manage timelines…</option>
          </select>
          {meta.subtitle && <span className="muted"> {meta.subtitle}</span>}
        </h1>
        <div className="group" role="group" aria-label="Years per tick">
          {meta.increments.map((inc) => (
            <button key={inc} className={`seg ${increment === inc ? 'on' : ''}`} onClick={() => setIncrement(inc)}>
              {inc} yr
            </button>
          ))}
        </div>
        {keyOnly && (
          <span className="muted small" title="At the widest zoom only key events are drawn; zoom in to see them all">
            Key events only
          </span>
        )}
        <DatingMenu
          groups={groups}
          selection={chronSel}
          defaults={chronDefaults}
          onChange={(g, id) => setChronSel((s) => ({ ...s, [g]: id }))}
          onReset={() => setChronSel(chronDefaults)}
        />
        <label className="check" title="Collapse long stretches with no events">
          <input type="checkbox" checked={compress} onChange={(e) => setCompress(e.target.checked)} /> Compress gaps
        </label>
        <label className="check" title="Show arrows between connected events">
          <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} /> Connections
        </label>
        {hasSubRows && (
          <button
            onClick={() => setCollapsed(someCollapsed ? {} : collapseAll(data.tracks))}
            title={
              someCollapsed
                ? 'Open every row, down to the smallest sub-row'
                : 'Fold every row into its parent, leaving only the top-level rows; open them again one level at a time'
            }
          >
            {someCollapsed ? '▾ Expand all' : '▸ Collapse all'}
          </button>
        )}
        {canReset && (
          <button onClick={() => setCollapsed(openingCollapsed)} title="Fold and open rows the way this timeline opens">
            ↺ Default view
          </button>
        )}
        <SearchBox
          index={searchIndex}
          placeholder={`Find a row or event, or a year (${exampleYear})`}
          parseYear={parseSearchYear}
          formatYear={formatSearchYear}
          describeYears={describeYears}
          hiddenReason={searchHidden}
          onPick={onSearchPick}
          onYear={(y) => setFocus({ year: y, nonce: Date.now() })}
        />
        <span className="spacer" />
        <button className={showFilters ? 'on' : ''} onClick={() => setShowFilters((s) => !s)}>
          Filters
        </button>
        <button
          className={showLegend ? 'on' : ''}
          onClick={() => setShowLegend((s) => !s)}
          title="What the bars, diamonds, colors and lines mean"
        >
          Legend
        </button>
        <button
          className={showTimelines ? 'on' : ''}
          onClick={() => setShowTimelines((s) => !s)}
          title="Open a timeline from a link or file, or manage the ones you've added"
        >
          Timelines
        </button>
        <button className={showTheme ? 'on' : ''} onClick={() => setShowTheme((s) => !s)} title="Colors and theme">
          Theme
        </button>
        <button
          className={editMode ? 'on edit' : ''}
          onClick={() => {
            setEditMode((m) => !m);
            setEditing(null);
          }}
        >
          Edit mode
        </button>
      </header>

      {editMode && (
        <div className="editbar">
          <button
            onClick={() => setEditing({ kind: 'event', event: newEvent(undefined, centerRef.current), isNew: true })}
          >
            + Event
          </button>
          <button onClick={() => setEditing({ kind: 'track', track: null })}>+ Track</button>
          <button onClick={() => setEditing({ kind: 'source', key: null })}>+ Source</button>
          <span className="sep" />
          <button onClick={() => downloadDataset(data, false)}>Download in-progress</button>
          <button onClick={() => downloadDataset(data, true)}>Download final</button>
          <button onClick={() => fileRef.current?.click()}>Upload JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.target.value = '';
            }}
          />
          {dirty && (
            <button
              className="danger"
              onClick={() => {
                if (window.confirm('Discard all local edits and reload the published timeline?')) {
                  dispatch({ type: 'reset' });
                  setEditing(null);
                  notify('Reset to the published timeline.');
                }
              }}
            >
              Discard local edits
            </button>
          )}
          <span className="muted small">
            Double-click an empty spot in a lane (or hold a finger there on a touch screen) to add an event there; use the lane buttons to edit, reorder or add
            sub-tracks. Edits stay in this browser until you discard them.
          </span>
        </div>
      )}

      {dirty && !editMode && (
        <div className="draft-banner">
          You're viewing local edits, not the published timeline.{' '}
          {updatedUnderDraft && 'The published timeline has been updated since you made them; your edits are kept on top of it. '}
          <button className="linklike" onClick={() => setEditMode(true)}>
            Open edit mode
          </button>{' '}
          to download or discard them.
        </div>
      )}

      {showLegend && <LegendPanel data={data} onClose={() => setShowLegend(false)} />}

      {showTimelines && (
        <TimelinesPanel
          timelines={timelines}
          currentId={published.meta.id}
          onOpen={goToTimeline}
          onAddUrl={addFromUrl}
          onAddFile={importFile}
          onRefresh={refreshEntry}
          onRemove={removeEntry}
          onCopyShareLink={(e) => void copyShareLink(e)}
        />
      )}

      {showTheme && <ThemePanel theme={theme} onChange={setTheme} onReset={resetTheme} />}

      {showFilters && (
        <FiltersPanel
          data={data}
          filters={filters}
          isOn={isOn}
          toggleTrack={toggleTrack}
          toggleSource={toggleSource}
          toggleTag={toggleTag}
          setAllTracks={setAllTracks}
          editMode={editMode}
          onEditTrack={(id) => setEditing({ kind: 'track', track: data.tracks.find((t) => t.id === id) ?? null })}
          onEditSource={(key) => setEditing({ kind: 'source', key })}
        />
      )}

      <main className={sidePanel ? 'with-panel' : ''}>
        <TimelineView
          data={data}
          events={drawnEvents}
          eventsById={resolvedById}
          spans={spans}
          visibleTracks={filters.tracks}
          collapsed={collapsed}
          onToggleCollapsed={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          increment={increment}
          compress={compress}
          showLinks={showLinks}
          present={present}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (editing?.kind === 'event' && id) setEditing(null);
          }}
          editMode={editMode}
          onCreateAt={(trackId, year) => setEditing({ kind: 'event', event: newEvent(trackId, year), isNew: true })}
          onEditTrack={(id) => setEditing({ kind: 'track', track: data.tracks.find((t) => t.id === id) ?? null })}
          onAddTrack={(parent) => setEditing({ kind: 'track', track: null, parent })}
          onMoveTrack={(id, dir) => dispatch({ type: 'moveTrack', id, dir })}
          focus={focus}
          initialCenterYear={initialCenter}
          onCenterYearChange={onCenterYearChange}
          onZoomIn={(year) => {
            const finer = [...meta.increments].reverse().find((i) => i < increment);
            if (finer === undefined) return false;
            setIncrement(finer);
            setFocus({ year, nonce: Date.now() });
            return true;
          }}
          onPinchZoom={(dir) => {
            const steps = meta.increments;
            const next = dir === 1 ? [...steps].reverse().find((i) => i < increment) : steps.find((i) => i > increment);
            if (next !== undefined) setIncrement(next);
          }}
          edgeLinks={edgeLinks}
        />
        {sidePanel}
      </main>

      {(meta.credits || meta.creditsImage) && (
        <footer
          className={`legal${creditsOpen ? ' open' : ''}`}
          onClick={() => setCreditsOpen((o) => !o)}
          title={creditsOpen ? undefined : 'Tap to read the full note'}
        >
          {safeUrl(meta.creditsImage) && <img src={safeUrl(meta.creditsImage)} alt="" />}
          {meta.credits && <p>{meta.credits}</p>}
        </footer>
      )}

      {toast && (
        <div key={toast.n} className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
