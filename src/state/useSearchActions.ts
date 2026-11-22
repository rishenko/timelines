import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { buildIndex, trackRange, type SearchEntry } from '../lib/search.ts';
import { ancestorIds } from '../lib/tracks.ts';
import { spanDates } from '../lib/lifespan.ts';
import { compareEvents, formatEventDates } from '../lib/years.ts';
import { formatDate, formatYear, parseFullDate, parseYear } from '../lib/calendar.ts';
import { endAt, startAt } from '../lib/subYear.ts';
import type { SearchDate } from '../components/SearchBox.tsx';
import { isApprox, type ResolvedEvent, type ResolvedPhase, type ResolvedSpan } from '../lib/chronology.ts';
import { isOn, type Filters } from './filters.ts';
import type { Notify } from './toast.ts';
import type { FocusRequest } from './focus.ts';
import type { Dataset } from '../types.ts';

/**
 * Wires the toolbar search to the app: the index over rows and events, how each result's dates read, which
 * results Filters hide, and what picking one does (unfold the rows above it, scroll to it, select an event).
 */
export function useSearchActions(o: {
  data: Dataset;
  resolved: ResolvedEvent[];
  resolvedById: Map<string, ResolvedEvent>;
  spans: Map<string, ResolvedSpan[]>;
  phases: Map<string, ResolvedPhase[]>;
  visibleIds: Set<string>;
  filters: Filters;
  centerRef: RefObject<number>;
  setCollapsed: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSelectedId: (id: string) => void;
  focusOn: (f: Omit<FocusRequest, 'nonce'>) => void;
  notify: Notify;
}) {
  const { data, resolved, resolvedById, spans, phases, visibleIds, filters, centerRef, setCollapsed, setSelectedId, focusOn, notify } = o;
  const cal = data.meta.calendar;

  const index = useMemo(() => buildIndex(data.tracks, [...resolved].sort(compareEvents)), [data.tracks, resolved]);
  /** A phase result's resolved dates (under the selected dating systems). */
  const phaseOf = useCallback(
    (entry: SearchEntry) => phases.get(entry.trackId)?.[Number(entry.id.split('#').pop())],
    [phases],
  );
  // a year as always ("1274 BCE"), or a date given in months or days ("July 1916", "1 July 1916", "1916-07-01")
  const parseSearchDate = useCallback((text: string): SearchDate | null => {
    const y = parseYear(text, cal);
    if (y !== null) return { at: y, label: formatYear(y, cal), unit: 'year' };
    const d = parseFullDate(text, cal);
    if (!d?.month) return null;
    // centered on the middle of its month or day, so the view's center reads as that date
    return { at: (startAt(d.year, d.month, d.day) + endAt(d.year, d.month, d.day)) / 2, label: formatDate(d.year, d.month, d.day, cal), unit: d.day ? 'day' : 'month' };
  }, [cal]);
  const describeYears = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'event') {
        const e = resolvedById.get(entry.id);
        return e ? formatEventDates(e, cal, isApprox(e)).replace(/ \(.*\)$/, '') : '';
      }
      if (entry.kind === 'phase') {
        const p = phaseOf(entry);
        return p ? spanDates(p, cal, isApprox(p)) : '';
      }
      // every stretch of its lifespan (typed, or worked out from its phases): "1569 – 1795, 1807 – 1915, 1918 – ongoing"
      return (spans.get(entry.id) ?? []).map((s) => spanDates(s, cal, isApprox(s))).join(', ');
    },
    [resolvedById, spans, cal, phaseOf],
  );
  const hiddenReason = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'track') return isOn(filters.tracks, entry.id) ? null : 'row hidden by Filters';
      if (entry.kind === 'phase') return isOn(filters.tracks, entry.trackId) ? null : 'row hidden by Filters';
      const e = resolvedById.get(entry.id);
      return e && !visibleIds.has(e.uuid) ? 'hidden by Filters' : null;
    },
    [filters.tracks, resolvedById, visibleIds],
  );

  /** Opens the folded rows above a row (and, for a row result, the row itself), so the target is on screen. */
  const reveal = (trackId: string, openSelf: boolean) =>
    setCollapsed((c) => {
      const next = { ...c };
      for (const id of ancestorIds(trackId, data.tracks)) delete next[id];
      if (openSelf) delete next[trackId];
      return next;
    });

  const onPick = (entry: SearchEntry) => {
    const hidden = hiddenReason(entry);
    if (entry.kind === 'phase') {
      // its row, scrolled to the phase's years (the row is opened only as far as needed to show it)
      reveal(entry.trackId, false);
      const p = phaseOf(entry);
      const start = p?.startWindow?.[0] ?? p?.start ?? entry.start ?? centerRef.current;
      const end = p?.endWindow?.[1] ?? p?.end ?? entry.end ?? start;
      focusOn({ year: Math.round((start + end) / 2), range: [start, end], trackId: entry.trackId });
    } else if (entry.kind === 'track') {
      reveal(entry.id, true);
      const r = trackRange(entry.id, data.tracks, resolved, spans);
      focusOn({
        year: r ? Math.round((r.start + r.end) / 2) : centerRef.current,
        range: r ? [r.start, r.end] : undefined,
        trackId: entry.id,
      });
    } else {
      const e = resolvedById.get(entry.id);
      if (!e) return;
      // the row to show it on: its first row that isn't filtered out
      const trackId = e.tracks.find((t) => isOn(filters.tracks, t)) ?? entry.trackId;
      reveal(trackId, false);
      setSelectedId(e.uuid);
      focusOn({ year: e.start, range: [e.start, e.end ?? e.start], trackId });
    }
    if (hidden)
      notify(
        entry.kind === 'phase'
          ? `“${entry.label}” is on a row hidden by Filters (${entry.path.at(-1)}). Open Filters to show it.`
          : `${entry.kind === 'track' ? 'The row ' : ''}“${entry.label}” is hidden by Filters. Open Filters to show it.`,
      );
  };

  return { index, parseDate: parseSearchDate, describeYears, hiddenReason, onPick };
}
