import { useEffect, useMemo, useState } from 'react';
import { TimelineView } from './timeline/TimelineView.tsx';
import { useFocusRequest } from './state/focus.ts';
import { downloadDataset, unreadableDraftKey, useDataset } from './state/dataset.ts';
import { isEventVisible, useFilters } from './state/filters.ts';
import { useTheme } from './state/theme.ts';
import { useToast } from './state/toast.ts';
import { usePanels } from './state/panels.ts';
import { goToTimeline, readUrl, useUrlSync, type View } from './state/url.ts';
import { useLibraryActions } from './state/useLibraryActions.ts';
import { useSearchActions } from './state/useSearchActions.ts';
import { keyEventsOnly, stepIncrement } from './state/zoom.ts';
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
import { CustomizePanel, type CustomizeTab } from './components/CustomizePanel.tsx';
import { TableView } from './components/TableView.tsx';
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
  const [{ data, dirty, published, updatedUnderDraft, unreadableDraft }, dispatch, unsaved] = useDataset(initialUrl.published);
  const meta = data.meta;
  const cal = meta.calendar;
  const present = datasetPresent(data);
  const { filters, toggleTrack, toggleSource, toggleTag, setAllTracks, isOn } = useFilters(data);
  const panels = usePanels(initialUrl.view === 'timeline');
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

  // edits that can't be stored (storage full or turned off) last only until the page closes: say so when it starts
  // (the banner below stays up while it lasts)
  useEffect(() => {
    if (unsaved) notify("Your edits can't be saved in this browser. Download them to keep them.", 'error');
  }, [unsaved, notify]);

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
  const [view, setView] = useState<View>(initialUrl.view);
  const [customizeTab, setCustomizeTab] = useState<CustomizeTab>('appearance');
  // on phones the credits note is clamped to two lines; a tap opens it (see .legal in CSS)
  const [creditsOpen, setCreditsOpen] = useState(false);
  // One polite live region for screen readers: zoom changes, "Went to …" and toasts. Kept mounted, because a region
  // that appears together with its text is often not read out.
  const [announcement, setAnnouncement] = useState('');
  const [announcedIncrement, setAnnouncedIncrement] = useState(increment);
  if (increment !== announcedIncrement) {
    setAnnouncedIncrement(increment);
    setAnnouncement(`Zoom: ${increment} years per tick`);
  }

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
  const [focus, focusOn] = useFocusRequest();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialUrl.selected && data.events.some((e) => e.uuid === initialUrl.selected) ? initialUrl.selected : null,
  );
  const selectAndFocus = (id: string) => {
    const e = resolvedById.get(id);
    if (!e) return;
    setSelectedId(id);
    focusOn({ year: e.start });
  };

  /**
   * One zoom step finer (1) or coarser (-1): centered on `year` if given, else the view keeps its center year.
   * False if there is no further step that way.
   */
  const zoomStep = (dir: 1 | -1, year?: number): boolean => {
    const next = stepIncrement(meta.increments, increment, dir);
    if (next === undefined) return false;
    setIncrement(next);
    if (year !== undefined) focusOn({ year });
    return true;
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
    { timelineId: published.meta.id, increment, compress, showLinks, selectedId, view },
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
    focusOn,
    notify,
  });

  // edit mode is turned on in Customize, Edit, and off there or with the edit bar's Done editing
  const toggleEdit = () => {
    const on = !editMode;
    setEditMode(on);
    setEditing(null);
    setAnnouncement(on ? 'Edit mode on' : 'Edit mode off');
    // on: close the panel, so the edit bar and the timeline are in view
    if (on) panels.show('customize', false);
  };
  const editTrack = (id: string) => setEditing({ kind: 'track', track: data.tracks.find((t) => t.id === id) ?? null });
  const hasSidePanel = editing !== null || (!!selectedId && resolvedById.has(selectedId));

  return (
    <div className="app">
      <a href="#timeline" className="skip-link">
        {view === 'table' ? 'Skip to the table' : 'Skip to the timeline'}
      </a>
      <Toolbar
        view={view}
        onView={(v) => {
          setView(v);
          setAnnouncement(v === 'table' ? 'Table view' : 'Timeline view');
          // back on the chart, bring the selected event into view
          const sel = selectedId ? resolvedById.get(selectedId) : undefined;
          if (v === 'timeline' && sel) focusOn({ year: sel.start, range: [sel.start, sel.end ?? sel.start] });
        }}
        picker={
          <TimelinePicker
            timelines={library.timelines}
            currentId={published.meta.id}
            onOpen={goToTimeline}
            onManage={() => {
              setCustomizeTab('timelines');
              panels.show('customize', true);
            }}
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
            placeholder="Row, event or year…"
            example={formatYear(cal.yearZero ? 4500 : -1273, cal)}
            parseYear={search.parseYear}
            formatYear={search.formatYear}
            describeYears={search.describeYears}
            hiddenReason={search.hiddenReason}
            onPick={search.onPick}
            onYear={(y) => {
              focusOn({ year: y });
              setAnnouncement(`Went to ${formatYear(y, cal)}`);
            }}
          />
        }
        panels={panels.open}
        onTogglePanel={panels.toggle}
      />

      {editMode && (
        <EditBar
          onAddEvent={() => setEditing({ kind: 'event', event: newEvent(undefined, centerRef.current), isNew: true })}
          onAddTrack={() => setEditing({ kind: 'track', track: null })}
          onAddSource={() => setEditing({ kind: 'source', key: null })}
          onDownload={(final) => downloadDataset(data, final)}
          onUpload={(f) => void library.upload(f)}
          dirty={dirty}
          onDone={toggleEdit}
          onDiscard={() => {
            if (!window.confirm('Discard all local edits and reload the published timeline?')) return;
            dispatch({ type: 'reset' });
            setEditing(null);
            notify('Reset to the published timeline.');
          }}
        />
      )}

      {unsaved && (
        <div className="draft-banner unsaved">
          Your edits aren't being saved: this browser's storage is full or turned off. They last until you close this
          page.{' '}
          {editMode ? (
            'Use Download in-progress in the edit bar to keep them.'
          ) : (
            <>
              <button className="linklike" onClick={toggleEdit}>
                Open edit mode
              </button>{' '}
              to download them.
            </>
          )}
        </div>
      )}

      {dirty && !editMode && !unsaved && (
        <div className="draft-banner">
          You're viewing local edits, not the published timeline.{' '}
          {updatedUnderDraft && 'The published timeline has been updated since you made them; your edits are kept on top of it. '}
          <button className="linklike" onClick={toggleEdit}>
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
            setView('timeline'); // the tour is about the chart
            panels.show('tour', true);
          }}
        />
      )}

      {panels.open.tour && (
        <Tour steps={tourSteps(data, { hasDating: chronGroups.length > 0, hasSubRows })} onClose={() => panels.show('tour', false)} />
      )}

      {panels.open.customize && (
        <CustomizePanel
          tab={customizeTab}
          onTab={setCustomizeTab}
          onClose={() => panels.show('customize', false)}
          editMode={editMode}
          dirty={dirty}
          onToggleEdit={toggleEdit}
          appearance={<ThemePanel theme={theme} onChange={setTheme} onReset={resetTheme} />}
          timelines={
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
          }
        />
      )}

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
        {view === 'table' ? (
          <TableView
            data={data}
            events={visibleEvents}
            hiddenCount={resolved.length - visibleEvents.length}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (editing?.kind === 'event') setEditing(null);
            }}
            focus={focus}
            spans={spans}
            phases={phases}
            visibleTracks={filters.tracks}
          />
        ) : (
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
            onZoomIn={(year) => zoomStep(1, year)}
            onPinchZoom={(dir) => void zoomStep(dir)}
            edgeLinks={edgeLinks}
            keyEventsOnly={keyOnly}
            onKeyZoom={(dir, year) => {
              if (!zoomStep(dir, year)) setAnnouncement(dir === 1 ? 'Already at the closest zoom' : 'Already at the widest zoom');
            }}
            onShowKeys={() => panels.show('legend', true)}
          />
        )}
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
        // on phones the note is clamped to two lines: a tap anywhere on it opens it, and so does its More button
        // (shown only on narrow screens), which keyboard and screen-reader users reach
        // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <footer
          className={`legal${creditsOpen ? ' open' : ''}`}
          onClick={() => setCreditsOpen((o) => !o)}
          title={creditsOpen ? undefined : 'Tap to read the full note'}
        >
          {safeUrl(meta.creditsImage) && <img src={safeUrl(meta.creditsImage)} alt="" />}
          {meta.credits && <p id="credits-note">{meta.credits}</p>}
          <button
            className="legal-toggle linklike"
            aria-expanded={creditsOpen}
            aria-controls="credits-note"
            onClick={(ev) => {
              ev.stopPropagation();
              setCreditsOpen((o) => !o);
            }}
          >
            {creditsOpen ? 'Less' : 'More'}
          </button>
        </footer>
      )}

      {toast && (
        <div key={toast.n} className={`toast ${toast.kind}`} aria-hidden="true">
          {toast.text}
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {toast ? toast.text : announcement}
      </div>
    </div>
  );
}
