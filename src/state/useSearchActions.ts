import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { buildIndex, trackRange, type SearchEntry } from '../lib/search.ts';
import { ancestorIds } from '../lib/tracks.ts';
import { compareEvents, formatEventDates } from '../lib/years.ts';
import { formatYear, parseYear } from '../lib/calendar.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { isOn, type Filters } from './filters.ts';
import type { Notify } from './toast.ts';
import type { FocusRequest } from '../timeline/TimelineView.tsx';
import type { Dataset } from '../types.ts';

/**
 * Wires the toolbar search to the app: the index over rows and events, how each result's dates read, which
 * results Filters hide, and what picking one does (unfold the rows above it, scroll to it, select an event).
 */
export function useSearchActions(o: {
  data: Dataset;
  resolved: ResolvedEvent[];
  resolvedById: Map<string, ResolvedEvent>;
  spans: Map<string, ResolvedSpan>;
  phases: Map<string, ResolvedPhase[]>;
  visibleIds: Set<string>;
  filters: Filters;
  centerRef: RefObject<number>;
  setCollapsed: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSelectedId: (id: string) => void;
  setFocus: (f: FocusRequest) => void;
  notify: Notify;
}) {
  const { data, resolved, resolvedById, spans, phases, visibleIds, filters, centerRef, setCollapsed, setSelectedId, setFocus, notify } = o;
  const cal = data.meta.calendar;

  const index = useMemo(() => buildIndex(data.tracks, [...resolved].sort(compareEvents)), [data.tracks, resolved]);
  /** A phase result's resolved dates (under the selected dating systems). */
  const phaseOf = useCallback(
    (entry: SearchEntry) => phases.get(entry.trackId)?.[Number(entry.id.split('#').pop())],
    [phases],
  );
  const parseSearchYear = useCallback((text: string) => parseYear(text, cal), [cal]);
  const formatSearchYear = useCallback((y: number) => formatYear(y, cal), [cal]);
  const describeYears = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'event') {
        const e = resolvedById.get(entry.id);
        return e ? formatEventDates(e, cal, !!(e.circa || e.startWindow || e.endWindow)).replace(/ \(.*\)$/, '') : '';
      }
      if (entry.kind === 'phase') {
        const p = phaseOf(entry);
        return p ? `${formatYear(p.start, cal, !!p.startWindow)} – ${formatYear(p.end, cal, !!p.endWindow)}` : '';
      }
      const s = spans.get(entry.id);
      if (!s) return '';
      const approx = !!(s.startWindow || s.endWindow || data.tracks.find((t) => t.id === entry.id)?.span?.circa);
      return `${formatYear(s.start, cal, approx)} – ${formatYear(s.end, cal)}`;
    },
    [resolvedById, spans, cal, data.tracks, phaseOf],
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
      setFocus({ year: Math.round((start + end) / 2), range: [start, end], trackId: entry.trackId, nonce: Date.now() });
    } else if (entry.kind === 'track') {
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
      notify(
        entry.kind === 'phase'
          ? `“${entry.label}” is on a row hidden by Filters (${entry.path.at(-1)}). Open Filters to show it.`
          : `${entry.kind === 'track' ? 'The row ' : ''}“${entry.label}” is hidden by Filters. Open Filters to show it.`,
      );
  };

  return { index, parseYear: parseSearchYear, formatYear: formatSearchYear, describeYears, hiddenReason, onPick };
}
