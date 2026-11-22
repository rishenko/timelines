import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { placeAges } from './lib/eras.ts';
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
import { useChronology } from './state/useChronology.ts';
import { useRegionFilter } from './state/regionFilter.ts';
import { useCategoryFilter } from './state/categoryFilter.ts';
import { useComparison } from './state/comparison.ts';
import { keyEventsOnly, stepIncrement } from './state/zoom.ts';
import { incrementSpoken, incrementYears, SUB_YEAR } from './lib/subYear.ts';
import { tooWideSteps } from './timeline/width.ts';
import { anyCollapsed, collapseAll, defaultCollapsed, parentIds, sameCollapsed } from './state/collapse.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { TimelinePicker } from './components/TimelinePicker.tsx';
import { EditBar } from './components/EditBar.tsx';
import { SidePanel, type Editing } from './components/SidePanel.tsx';
import { SEARCH_INPUT_ID, SearchBox } from './components/SearchBox.tsx';
import { DatingMenu } from './components/DatingMenu.tsx';
import { FiltersPanel } from './components/FiltersPanel.tsx';
import { RegionFilter } from './components/RegionFilter.tsx';
import { CategoryGlyph } from './components/CategoryGlyph.tsx';
import { ComparisonBar } from './components/ComparisonBar.tsx';
import { ThemePanel } from './components/ThemePanel.tsx';
import { TimelinesPanel } from './components/TimelinesPanel.tsx';
import { LegendPanel } from './components/LegendPanel.tsx';
import { Tour } from './components/Tour.tsx';
import { CustomizePanel, type CustomizeTab } from './components/CustomizePanel.tsx';
import { TableView } from './components/TableView.tsx';
import { Credits } from './components/Credits.tsx';
import { tourSteps } from './lib/tour.ts';
import { newEvent } from './lib/newEvent.ts';
import { datasetPresent } from './lib/years.ts';
import { formatYear } from './lib/calendar.ts';
import type { TimelineIndexEntry } from './data/timelineIndex.ts';
import { indexUrl } from './state/timelines.ts';
import type { LibraryEntry } from './state/library.ts';
import type { Dataset } from './types.ts';

/**
 * The app shell: owns the open timeline's state (data and draft, chronology choices, zoom, folded rows, selection,
 * editing) and wires it to the toolbar, the timeline view and the side panels. The pieces live elsewhere:
 * state/ (url, toast, panels, chronologies, focus requests, library and search actions, zoom, collapse) and
 * components/ (Toolbar, EditBar, SidePanel, Credits and the panels).
 */
interface Props {
  /** The opened timeline as published (loaded by Boot); the reader's saved edits go on top of it. */
  published: Dataset;
  /** Its library entry, when it is one of the reader's own timelines. */
  library?: LibraryEntry;
  /** The site's timelines (timelines/index.json). */
  site: TimelineIndexEntry[];
  /** A message for the first toast (e.g. that a timeline from a link was updated as it opened). */
  notice?: string;
}

export default function App({ published: opened, library: libraryEntry, site, notice }: Props) {
  const [initialUrl] = useState(() => readUrl(opened));
  const [{ data, dirty, published, updatedUnderDraft, unreadableDraft }, dispatch, unsaved] = useDataset(opened);
  const meta = data.meta;
  const cal = meta.calendar;
  const present = datasetPresent(data);
  // the site's own timelines may have a map file (timelines/index.json → map); readers' and listed ones don't
  const mapUrl = useMemo(() => {
    const m = libraryEntry ? undefined : site.find((x) => x.id === meta.id)?.map;
    return m ? new URL(m, indexUrl()).href : undefined;
  }, [libraryEntry, site, meta.id]);
  const { filters, toggleTrack, toggleSource, toggleTag, setAllTracks, setTracks, setSources, isOn } = useFilters(data);
  // edit mode is declared here because the region filter (below) is off while editing
  const [editMode, setEditMode] = useState(false);
  // ---- region filter: rows outside the ticked regions are hidden, on top of the reader's own row toggles ----
  const regions = useRegionFilter(data, initialUrl.regions, filters.sources, editMode);
  // ---- category filter: events outside the ticked categories are hidden (events with none always show) ----
  const categories = useCategoryFilter(data, initialUrl.cat, filters.sources, editMode);
  // ---- comparison set: the chart and table show only the picked rows (the region filter doesn't apply then) ----
  const comparison = useComparison(data, initialUrl, editMode);
  const rowsOn = useMemo(
    () =>
      comparison.active
        ? { ...filters.tracks, ...comparison.overlay }
        : regions.active
          ? { ...filters.tracks, ...regions.overlay }
          : filters.tracks,
    [comparison.active, comparison.overlay, regions.active, regions.overlay, filters.tracks],
  );
  /** The data the chart and table draw: the set's rows while a comparison is shown. */
  const viewData = useMemo(() => (comparison.tracks ? { ...data, tracks: comparison.tracks } : data), [comparison.tracks, data]);
  // in a comparison each row shows its broad region beside its name
  const rowTags = useMemo(() => {
    if (!comparison.active || !regions.regionsOf) return undefined;
    const tags = new Map<string, string>();
    for (const id of comparison.ordered) {
      const r = regions.regionsOf.get(id)?.[0];
      if (r) tags.set(id, r.within.at(-1) ?? r.name);
    }
    return tags;
  }, [comparison.active, comparison.ordered, regions.regionsOf]);
  const trackName = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  // in Filters, rows and sources outside the ticked regions are dimmed and the groups holding the ones inside open
  const regionRows = useMemo(
    () => (regions.active ? new Set(data.tracks.filter((t) => regions.overlay[t.id] !== false).map((t) => t.id)) : undefined),
    [regions.active, regions.overlay, data.tracks],
  );
  const regionOpen = useMemo(() => {
    if (!regions.active) return undefined;
    const byId = new Map(data.tracks.map((t) => [t.id, t]));
    const open = new Set<string>();
    for (const id of regions.rowsInPicked) for (let p = byId.get(id)?.parent; p && !open.has(p); p = byId.get(p)?.parent) open.add(p);
    return [...open];
  }, [regions.active, regions.rowsInPicked, data.tracks]);
  const shownFilters = useMemo(() => ({ ...filters, tracks: rowsOn }), [filters, rowsOn]);
  const panels = usePanels(initialUrl.view === 'timeline');
  const [theme, setTheme, resetTheme] = useTheme(meta.defaultTheme);
  // on opening, readers with a saved draft hear if the published timeline changed underneath it
  const [toast, notify] = useToast(
    unreadableDraft
      ? "Your saved edits to this timeline couldn't be opened. They are kept in this browser's storage as " +
          `"${unreadableDraftKey(opened.meta.id)}".`
      : updatedUnderDraft
        ? 'The published timeline has been updated. Your local edits are kept on top of the new version.'
        : // Boot's notice, then what the link names that this timeline can't open (one toast)
          [notice, initialUrl.notice].filter(Boolean).join(' ') || null,
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
  const chron = useChronology(data);
  // ages (meta.eras) under the reader's Dating choice, on their lines
  const ages = useMemo(() => placeAges(data, chron.selection), [data, chron.selection]);
  const { resolved, resolvedById, spans, phases, memberOf } = chron;
  const visibleEvents = useMemo(
    () => resolved.filter((e) => isEventVisible(e, shownFilters) && categories.shows(e)),
    [resolved, shownFilters, categories.shows],
  );
  const visibleIds = useMemo(() => new Set(visibleEvents.map((e) => e.uuid)), [visibleEvents]);

  // ---- view settings ----
  // zoom steps in years per tick (steps below a year are named in the data: "month", "day")
  const increments = useMemo(() => meta.increments.map(incrementYears), [meta.increments]);
  const [increment, setIncrement] = useState(initialUrl.increment);
  const [compress, setCompress] = useState(initialUrl.compress);
  // rows with nothing near the view are hidden (Filters); not while editing, where every row must be reachable
  const [hideOutOfView, setHideOutOfView] = useState(initialUrl.hideOutOfView);
  // ...taken out, or drawn as thin lines in their place
  const [thinRows, setThinRows] = useState(initialUrl.thinRows);
  const [view, setView] = useState<View>(initialUrl.view);
  const [customizeTab, setCustomizeTab] = useState<CustomizeTab>('appearance');
  // One polite live region for screen readers: zoom changes, "Went to …" and toasts. Kept mounted, because a region
  // that appears together with its text is often not read out.
  const [announcement, setAnnouncement] = useState('');
  const [announcedIncrement, setAnnouncedIncrement] = useState(increment);
  if (increment !== announcedIncrement) {
    setAnnouncedIncrement(increment);
    setAnnouncement(`Zoom: ${incrementSpoken(increment)}`);
  }
  const comparisonSays = comparison.active
    ? `Comparing ${comparison.ordered.length} ${comparison.ordered.length === 1 ? 'row' : 'rows'}${comparison.order === 'related' ? ', related rows together' : comparison.order === 'start' ? ', by start date' : ''}`
    : comparison.rows.length
      ? `${comparison.rows.length} ${comparison.rows.length === 1 ? 'row' : 'rows'} in the comparison; showing the whole timeline`
      : '';
  const [announcedComparison, setAnnouncedComparison] = useState(comparisonSays);
  if (comparisonSays !== announcedComparison) {
    setAnnouncedComparison(comparisonSays);
    setAnnouncement(comparisonSays || 'Comparison cleared');
  }
  const [announcedRegions, setAnnouncedRegions] = useState(regions.picked);
  if (regions.picked !== announcedRegions) {
    setAnnouncedRegions(regions.picked);
    setAnnouncement(regions.names.length ? `Showing rows in ${regions.names.join(', ')}` : 'Region filter off: all rows');
  }
  const [announcedCategories, setAnnouncedCategories] = useState(categories.picked);
  if (categories.picked !== announcedCategories) {
    setAnnouncedCategories(categories.picked);
    setAnnouncement(categories.names.length ? `Showing events in ${categories.names.join(', ')}` : 'Category filter off: all events');
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
    const next = stepIncrement(drawable, increment, dir);
    if (next === undefined) return false;
    setIncrement(next);
    if (year !== undefined) focusOn({ year });
    return true;
  };

  // zoom steps below a year too wide to draw for this timeline (day zoom over centuries): disabled, and left if on one
  const tooWide = useMemo(
    () =>
      tooWideSteps(increments, visibleEvents, present, [...spans.values()].flat(), { compress, calendar: cal, range: meta.range }),
    [increments, visibleEvents, present, spans, compress, cal, meta.range],
  );
  const drawable = useMemo(() => increments.filter((i) => !tooWide.has(i)), [increments, tooWide]);
  if (tooWide.has(increment) && drawable.length) setIncrement(drawable.find((i) => i > increment) ?? drawable[drawable.length - 1]);

  // At a timeline's coarsest zoom, draw only its key events (plus the selected one), if it marks any.
  const keyOnly = useMemo(() => keyEventsOnly(increments, increment, data.events), [increments, increment, data.events]);
  const drawnEvents = useMemo(
    () => (keyOnly ? visibleEvents.filter((e) => e.importance === 1 || e.uuid === selectedId) : visibleEvents),
    [keyOnly, visibleEvents, selectedId],
  );

  const library = useLibraryActions({ published, library: libraryEntry, site, dispatch, notify });

  // Links to neighbouring timelines (meta.continues), for the ends of the ruler; unknown timelines are skipped.
  const edgeLinks = useMemo(
    () =>
      (meta.continues ?? []).flatMap((c) => {
        const target = library.timelines.find((t) => t.summary.id === c.timeline)?.summary;
        if (!target) return [];
        // the year in the other timeline's calendar when the site's list gives it; else as a stored year
        const at = target.calendar ? formatYear(c.at, target.calendar) : String(c.at);
        return [
          {
            side: c.side,
            year: c.at,
            label: c.side === 'before' ? `Earlier: ${target.title}` : `Continues in ${target.title}`,
            title: target.calendar ? `Open ${target.title} at ${at}` : `Open ${target.title}`,
            href: `?timeline=${encodeURIComponent(c.timeline)}&at=${encodeURIComponent(at)}`,
          },
        ];
      }),
    [meta.continues, library.timelines],
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
    {
      timelineId: published.meta.id,
      increment,
      compress,
      selectedId,
      view,
      hideOutOfView,
      thinRows,
      regions: regions.picked,
      cat: categories.picked,
      set: comparison.active ? comparison.rows : [],
      order: comparison.order,
      openedWindow: initialUrl.window,
    },
    initialCenter,
    data,
  );

  const search = useSearchActions({
    data,
    resolved,
    resolvedById,
    spans,
    phases,
    visibleIds,
    filters: shownFilters,
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
  const switchHideOutOfView = (on: boolean) => {
    setHideOutOfView(on);
    setAnnouncement(on ? 'Rows with nothing in view are hidden' : 'All rows shown');
  };
  const hasSidePanel = editing !== null || (!!selectedId && resolvedById.has(selectedId));

  // ---- what the chart and table draw, deferred: a click (a filter, region, comparison, dating or fold change) updates
  // its own control at once, and the chart and table redraw in the background; the busy ring shows if that takes long.
  // Zoom stays immediate: its scroll anchoring needs the new scale at once.
  const shownData = useDeferredValue(viewData);
  const shownEvents = useDeferredValue(drawnEvents);
  const shownListEvents = useDeferredValue(visibleEvents);
  const shownSpans = useDeferredValue(spans);
  const shownPhases = useDeferredValue(phases);
  const shownMemberOf = useDeferredValue(memberOf);
  const shownRows = useDeferredValue(rowsOn);
  const shownCollapsed = useDeferredValue(collapsed);
  const shownCompress = useDeferredValue(compress);
  const shownHide = useDeferredValue(hideOutOfView && !editMode);
  const shownThin = useDeferredValue(thinRows);
  const busy =
    shownData !== viewData ||
    shownEvents !== drawnEvents ||
    shownListEvents !== visibleEvents ||
    shownSpans !== spans ||
    shownPhases !== phases ||
    shownMemberOf !== memberOf ||
    shownRows !== rowsOn ||
    shownCollapsed !== collapsed ||
    shownCompress !== compress ||
    shownHide !== (hideOutOfView && !editMode) ||
    shownThin !== thinRows;

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
            title={meta.title}
            subtitle={meta.subtitle}
            onManage={() => {
              setCustomizeTab('timelines');
              panels.show('customize', true);
            }}
          />
        }
        increments={increments}
        tooWide={tooWide}
        increment={increment}
        onIncrement={setIncrement}
        dating={
          <DatingMenu
            groups={chron.groups}
            selection={chron.selection}
            defaults={chron.defaults}
            onChange={chron.choose}
            onReset={chron.reset}
          />
        }
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
            placeholder="Row, event or date…"
            example={formatYear(cal.yearZero ? 4500 : -1273, cal)}
            parseDate={search.parseDate}
            describeYears={search.describeYears}
            hiddenReason={search.hiddenReason}
            onPick={search.onPick}
            onYear={(d) => {
              // a month or day zooms in to show it, where the timeline has such a step and the view is coarser:
              // a month to month zoom, a day to week zoom (the day and its neighbours)
              const want = d.unit === 'month' ? SUB_YEAR.month : d.unit === 'day' ? SUB_YEAR.week : undefined;
              if (want !== undefined && drawable.includes(want) && increment > want) setIncrement(want);
              focusOn({ year: d.at });
              setAnnouncement(`Went to ${d.label}`);
            }}
          />
        }
        panels={panels.open}
        onTogglePanel={panels.toggle}
        filtersNote={
          [
            comparison.active
              ? 'comparison'
              : regions.active
                ? `${regions.picked.length} ${regions.picked.length === 1 ? 'region' : 'regions'}`
                : '',
            categories.active ? `${categories.picked.length} ${categories.picked.length === 1 ? 'category' : 'categories'}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
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

      {!editMode && comparison.rows.length > 0 && (
        <ComparisonBar
          rows={comparison.ordered.map((id) => ({ id, name: trackName.get(id) ?? id }))}
          candidates={data.tracks.filter((t) => !comparison.inSet.has(t.id)).map((t) => ({ id: t.id, name: t.name }))}
          order={comparison.order}
          onOrder={comparison.setOrder}
          viewing={comparison.viewing}
          onView={comparison.setViewing}
          onAdd={comparison.add}
          onRemove={comparison.toggle}
          onClear={comparison.clear}
        />
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
        <Tour steps={tourSteps(data, { hasDating: chron.groups.length > 0, hasSubRows })} onClose={() => panels.show('tour', false)} />
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
              collections={library.collections}
              onRefreshList={library.refreshCollection}
              onRemoveList={library.removeList}
              onCopyListLink={(c) => void library.copyListLink(c)}
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
          setTracks={setTracks}
          setSources={setSources}
          regionRows={regionRows}
          regionOpen={regionOpen}
          compress={compress}
          onCompress={setCompress}
          hideOutOfView={hideOutOfView}
          onHideOutOfView={switchHideOutOfView}
          thinRows={thinRows}
          onThinRows={(thin) => {
            setThinRows(thin);
            setAnnouncement(thin ? 'Rows with nothing in view are drawn as thin lines' : 'Rows with nothing in view are taken out');
          }}
          editMode={editMode}
          onEditTrack={editTrack}
          onEditSource={(key) => setEditing({ kind: 'source', key })}
          regions={
            regions.tree.length > 0 && (
              <RegionFilter
                tree={regions.tree}
                picked={regions.picked}
                containing={regions.containing}
                editMode={editMode}
                onToggle={regions.toggle}
                onClear={regions.clear}
                rowCount={regions.rowsInPicked.length}
                paused={comparison.active}
                onMakeSet={regions.active ? () => comparison.replace(regions.rowsInPicked, 'related') : undefined}
              />
            )
          }
          categories={
            categories.tree.length > 0 && (
              <RegionFilter
                heading="Categories"
                noun={['event', 'events']}
                tree={categories.tree}
                picked={categories.picked}
                containing={categories.containing}
                editMode={editMode}
                onToggle={categories.toggle}
                onClear={categories.clear}
                icon={(id) => (categories.facet?.values[id]?.broader ? null : <CategoryGlyph kind={id} />)}
                foldName={(name) => `the sub-kinds of ${name}`}
                help={
                  'Tick kinds of event to show only their events; ▸ opens a kind’s sub-kinds. An event shows if either of ' +
                  'its categories is ticked. Events with no category always show.' +
                  (editMode ? ' Off while editing, so every event can be reached.' : '')
                }
              />
            )
          }
        />
      )}

      <main className={hasSidePanel ? 'with-panel' : ''}>
        {view === 'table' ? (
          <TableView
            data={shownData}
            events={shownListEvents}
            hiddenCount={resolved.length - visibleEvents.length}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (editing?.kind === 'event') setEditing(null);
            }}
            focus={focus}
            spans={shownSpans}
            phases={shownPhases}
            memberOf={shownMemberOf}
            allTracks={data.tracks}
            visibleTracks={shownRows}
            regionsOf={regions.regionsOf}
            categoriesOf={categories.info}
            ages={ages}
          />
        ) : (
          <TimelineView
            data={shownData}
            categories={categories.info}
            events={shownEvents}
            eventsById={resolvedById}
            spans={shownSpans}
            phases={shownPhases}
            memberOf={shownMemberOf}
            allTracks={data.tracks}
            visibleTracks={shownRows}
            busy={busy}
            regionTips={regions.regionTips}
            rowTags={rowTags}
            compareRows={comparison.inSet}
            onToggleCompare={comparison.toggle}
            collapsed={shownCollapsed}
            hideOutOfView={shownHide}
            thinRows={shownThin}
            onShowAllRows={() => switchHideOutOfView(false)}
            onRowsHidden={(n, year) => setAnnouncement(n ? `${n} rows with nothing near ${formatYear(year, cal)} hidden` : 'Every row has something in view')}
            onToggleCollapsed={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
            increment={increment}
            compress={shownCompress}
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
            ages={ages}
            onCenter={(year) => focusOn({ year })}
            onPinchZoom={(dir) => void zoomStep(dir)}
            edgeLinks={edgeLinks}
            keyEventsOnly={keyOnly}
            onKeyZoom={(dir, year) => {
              if (!zoomStep(dir, year)) setAnnouncement(dir === 1 ? 'Already at the closest zoom' : 'Already at the widest zoom');
            }}
            onShowKeys={() => panels.show('legend', true)}
            onSearchKey={() => document.getElementById(SEARCH_INPUT_ID)?.focus()}
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
          mapUrl={mapUrl}
          categoriesOf={categories.info}
        />
      </main>

      <Credits text={meta.credits} image={meta.creditsImage} />

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
