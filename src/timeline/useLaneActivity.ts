import { useMemo } from 'react';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import type { LaneDef } from './layout.ts';
import { laneActivity, rowActivity, type YearWindow } from './rowsInView.ts';

/**
 * Which lanes have anything in a stretch of years, for the chart (rowsInView.ts): the row index is rebuilt when the
 * events, lifespans or phases change (a filter that changes the events included); folding rows only re-maps lanes to rows.
 */
export function useLaneActivity(
  lanes: LaneDef[],
  events: ResolvedEvent[],
  spans: Map<string, ResolvedSpan[]>,
  phases: Map<string, ResolvedPhase[]>,
  present: number,
): (w: YearWindow) => Set<string> {
  const rows = useMemo(() => rowActivity(events, spans, phases, present), [events, spans, phases, present]);
  return useMemo(() => laneActivity(lanes, rows), [lanes, rows]);
}
