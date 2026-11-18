import { useEffect, useMemo, useState } from 'react';
import { TimelineView, type FocusRequest } from './timeline/TimelineView.tsx';
import { downloadDataset, unreadableDraftKey, useDataset } from './state/dataset.ts';
import { isEventVisible, useFilters } from './state/filters.ts';
import { useTheme } from './state/theme.ts';
import { useToast } from './state/toast.ts';
import { usePanels } from './state/panels.ts';
import { goToTimeline, readUrl, useUrlSync } from './state/url.ts';
import { useLibraryActions } from './state/useLibraryActions.ts';
import { useSearchActions } from './state/useSearchActions.ts';
import { coarserIncrement, finerIncrement, keyEventsOnly } from './state/zoom.ts';
import { anyCollapsed, collapseAll, defaultCollapsed, parentIds, sameCollapsed } from './state/collapse.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { TimelinePicker } from './components/TimelinePicker.tsx';
import { EditBar } from './components/EditBar.tsx';
import { SidePanel, type Editing } from './components/SidePanel.tsx';
import { SearchBox } from './components/SearchBox.tsx';
import { DatingMenu } from './components/DatingMenu.tsx';
import { FiltersPanel } from './components/FiltersPanel.tsx';
import { ThemePanel } from './components/ThemePanel.tsx';
import { TimelinesPanel } from './components/TimelinesPanel.tsx';
import { LegendPanel } from './components/LegendPanel.tsx';
import { Tour } from './components/Tour.tsx';
import { tourSteps } from './lib/tour.ts';
import { newEvent } from './lib/newEvent.ts';
import { datasetPresent } from './lib/years.ts';
import { formatYear } from './lib/calendar.ts';
import { safeUrl } from './lib/urls.ts';
import { chronologyGroups, defaultSelection, resolveEvents, resolveSpan, type ChronologySelection, type ResolvedPhase, type ResolvedSpan } from './lib/chronology.ts';
import { allTimelines } from './timelines/index.ts';

/**
 * The app shell: owns the open timeline's state (data and draft, chronology choices, zoom, folded rows, selection,
 * editing) and wires it to the toolbar, the timeline view and the side panels. The pieces live elsewhere:
 * state/ (url, toast, panels, library and search actions, zoom, collapse) and components/ (Toolbar, EditBar,
 * SidePanel and the panels).
 */
export default function App() {
  const [initialUrl] = useState(readUrl);
  const [{ data, dirty, published, updatedUnderDraft, unreadableDraft }, dispatch] = useDataset(initialUrl.published);
  const meta = data.meta;
  const cal = meta.calendar;
  const present = datasetPresent(data);
  const { filters, toggleTrack, toggleSource, toggleTag, setAllTracks, isOn } = useFilters(data);
  const panels = usePanels();
  const [theme, setTheme, resetTheme] = useTheme(meta.defaultTheme);
  // on opening, readers with a saved draft hear if the published timeline changed underneath it
  const [toast, notify] = useToast(
    unreadableDraft
      ? "Your saved edits to this timeline couldn't be opened. They are kept in this browser's storage as " +
          `"${unreadableDraftKey(initialUrl.published.meta.id)}".`
      : updatedUnderDraft
        ? 'The published timeline has been updated. Your local edits are kept on top of the new version.'
        : null,
  );

  useEffect(() => {
    document.title = meta.subtitle ? `${meta.title} (${meta.subtitle})` : meta.title;
  }, [meta.title, meta.subtitle]);

  // ---- chronologies: readers pick one per group (e.g. Mesopotamia: High / Middle / Low) ----
  const [chronSel, setChronSel] = useState<ChronologySelection>(() => defaultSelection(data));
  const chronDefaults = useMemo(() => defaultSelection(data), [data]);
  const chronGroups = useMemo(() => [...chronologyGroups(data)].filter(([, list]) => list.length > 1), [data]);
  const resolved = useMemo(() => resolveEvents(data, chronSel), [data, chronSel]);
  const resolvedById = useMemo(() => new Map(resolved.map((e) => [e.uuid, e])), [resolved]);
  const visibleEvents = useMemo(() => resolved.filter((e) => isEventVisible(e, filters)), [resolved, filters]);
  const visibleIds = useMemo(() => new Set(visibleEvents.map((e) => e.uuid)), [visibleEvents]);
  const spans = useMemo(() => {
    const m = new Map<string, ResolvedSpan>();
    for (const t of data.tracks) if (t.span) m.set(t.id, resolveSpan(data, t.id, t.span, chronSel));
    return m;
  }, [data, chronSel]);
  const phases = useMemo(() => {
    const m = new Map<string, ResolvedPhase[]>();
    for (const t of data.tracks)
      if (t.phases?.length) m.set(t.id, t.phases.map((p) => ({ name: p.name, ...resolveSpan(data, t.id, p, chronSel) })));
    return m;
  }, [data, chronSel]);

  // ---- view settings ----
  const [increment, setIncrement] = useState(initialUrl.increment);
  const [compress, setCompress] = useState(initialUrl.compress);
  const [showLinks, setShowLinks] = useState(initialUrl.links);
  // on phones the credits note is clamped to two lines; a tap opens it (see .legal in CSS)
  const [creditsOpen, setCreditsOpen] = useState(false);

  // ---- folded rows ----
  const openingCollapsed = useMemo(() => defaultCollapsed(meta.collapsed), [meta.collapsed]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(openingCollapsed);
  const hasSubRows = useMemo(() => parentIds(data.tracks).length > 0, [data.tracks]);
  const someCollapsed = useMemo(() => anyCollapsed(data.tracks, collapsed), [data.tracks, collapsed]);
  // "Default view" restores the rows the timeline opens with; only useful when that isn't simply "all open".
  const hasDefaultView = useMemo(() => anyCollapsed(data.tracks, openingCollapsed), [data.tracks, openingCollapsed]);
  const canReset = useMemo(
    () => hasDefaultView && !sameCollapsed(data.tracks, collapsed, openingCollapsed),
    [hasDefaultView, data.tracks, collapsed, openingCollapsed],
  );

  // ---- selection and editing ----
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialUrl.selected && data.events.some((e) => e.uuid === initialUrl.selected) ? initialUrl.selected : null,
  );
  const selectAndFocus = (id: string) => {
    const e = resolvedById.get(id);
    if (!e) return;
    setSelectedId(id);
    setFocus({ year: e.start, nonce: Date.now() });
  };

  // At a timeline's coarsest zoom, draw only its key events (plus the selected one), if it marks any.
  const keyOnly = useMemo(() => keyEventsOnly(meta.increments, increment, data.events), [meta.increments, increment, data.events]);
  const drawnEvents = useMemo(
    () => (keyOnly ? visibleEvents.filter((e) => e.importance === 1 || e.uuid === selectedId) : visibleEvents),
    [keyOnly, visibleEvents, selectedId],
  );

  const library = useLibraryActions({ published, library: initialUrl.library, dispatch, notify });

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
  const { centerRef, onCenterYearChange } = useUrlSync(
    { timelineId: published.meta.id, increment, compress, showLinks, selectedId },
    initialCenter,
  );

  const search = useSearchActions({
    data,
    resolved,
    resolvedById,
    spans,
    phases,
    visibleIds,
    filters,
    centerRef,
    setCollapsed,
    setSelectedId,
    setFocus,
    notify,
  });

  const editTrack = (id: string) => setEditing({ kind: 'track', track: data.tracks.find((t) => t.id === id) ?? null });
  const hasSidePanel = editing !== null || (!!selectedId && resolvedById.has(selectedId));

  return (
    <div className="app">
      <Toolbar
        picker={
          <TimelinePicker
            timelines={library.timelines}
            currentId={published.meta.id}
            onOpen={goToTimeline}
            onManage={() => panels.show('timelines', true)}
          />
        }
        subtitle={meta.subtitle}
        increments={meta.increments}
        increment={increment}
        onIncrement={setIncrement}
        dating={
          <DatingMenu
            groups={chronGroups}
            selection={chronSel}
            defaults={chronDefaults}
            onChange={(g, id) => setChronSel((s) => ({ ...s, [g]: id }))}
            onReset={() => setChronSel(chronDefaults)}
          />
        }
        compress={compress}
        onCompress={setCompress}
        showLinks={showLinks}
        onShowLinks={setShowLinks}
        rows={
          hasSubRows
            ? {
                someCollapsed,
                onToggleAll: () => setCollapsed(someCollapsed ? {} : collapseAll(data.tracks)),
                hasDefaultView,
                canReset,
                onReset: () => setCollapsed(openingCollapsed),
              }
            : undefined
        }
        search={
          <SearchBox
            index={search.index}
            placeholder="Find a row, event or year…"
            example={formatYear(cal.yearZero ? 4500 : -1273, cal)}
            parseYear={search.parseYear}
            formatYear={search.formatYear}
            describeYears={search.describeYears}
            hiddenReason={search.hiddenReason}
            onPick={search.onPick}
            onYear={(y) => setFocus({ year: y, nonce: Date.now() })}
          />
        }
        panels={panels.open}
        onTogglePanel={panels.toggle}
        editMode={editMode}
        onToggleEdit={() => {
          setEditMode((m) => !m);
          setEditing(null);
        }}
      />

      {editMode && (
        <EditBar
          onAddEvent={() => setEditing({ kind: 'event', event: newEvent(undefined, centerRef.current), isNew: true })}
          onAddTrack={() => setEditing({ kind: 'track', track: null })}
          onAddSource={() => setEditing({ kind: 'source', key: null })}
          onDownload={(final) => downloadDataset(data, final)}
          onUpload={(f) => void library.upload(f)}
          dirty={dirty}
          onDiscard={() => {
            if (!window.confirm('Discard all local edits and reload the published timeline?')) return;
            dispatch({ type: 'reset' });
            setEditing(null);
            notify('Reset to the published timeline.');
          }}
        />
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

      {panels.open.legend && (
        <LegendPanel
          data={data}
          onClose={() => panels.show('legend', false)}
          onTour={() => {
            panels.show('legend', false);
            panels.show('tour', true);
          }}
        />
      )}

      {panels.open.tour && (
        <Tour steps={tourSteps(data, { hasDating: chronGroups.length > 0, hasSubRows })} onClose={() => panels.show('tour', false)} />
      )}

      {panels.open.timelines && (
        <TimelinesPanel
          timelines={library.timelines}
          currentId={published.meta.id}
          onOpen={goToTimeline}
          onAddUrl={library.addFromUrl}
          onAddFile={library.importFile}
          onRefresh={library.refreshEntry}
          onRemove={library.removeEntry}
          onCopyShareLink={(e) => void library.copyShareLink(e)}
        />
      )}

      {panels.open.theme && <ThemePanel theme={theme} onChange={setTheme} onReset={resetTheme} />}

      {panels.open.filters && (
        <FiltersPanel
          data={data}
          filters={filters}
          isOn={isOn}
          toggleTrack={toggleTrack}
          toggleSource={toggleSource}
          toggleTag={toggleTag}
          setAllTracks={setAllTracks}
          editMode={editMode}
          onEditTrack={editTrack}
          onEditSource={(key) => setEditing({ kind: 'source', key })}
        />
      )}

      <main className={hasSidePanel ? 'with-panel' : ''}>
        <TimelineView
          data={data}
          events={drawnEvents}
          eventsById={resolvedById}
          spans={spans}
          phases={phases}
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
          onEditTrack={editTrack}
          onAddTrack={(parent) => setEditing({ kind: 'track', track: null, parent })}
          onMoveTrack={(id, dir) => dispatch({ type: 'moveTrack', id, dir })}
          focus={focus}
          initialCenterYear={initialCenter}
          onCenterYearChange={onCenterYearChange}
          onZoomIn={(year) => {
            const finer = finerIncrement(meta.increments, increment);
            if (finer === undefined) return false;
            setIncrement(finer);
            setFocus({ year, nonce: Date.now() });
            return true;
          }}
          onPinchZoom={(dir) => {
            const next = dir === 1 ? finerIncrement(meta.increments, increment) : coarserIncrement(meta.increments, increment);
            if (next !== undefined) setIncrement(next);
          }}
          edgeLinks={edgeLinks}
          keyEventsOnly={keyOnly}
        />
        <SidePanel
          data={data}
          dispatch={dispatch}
          notify={notify}
          editing={editing}
          setEditing={setEditing}
          editMode={editMode}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          resolvedById={resolvedById}
          visibleIds={visibleIds}
          onSelectAndFocus={selectAndFocus}
          onCopyLink={(id) => void library.copyEventLink(id)}
        />
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
