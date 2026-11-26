import { useMemo, useState } from 'react';
import type { TimelineEvent, TimelineMeta } from '../types.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';
import { incrementYears } from '../lib/subYear.ts';
import { tooWideSteps } from '../timeline/width.ts';
import type { useFocusRequest } from './focus.ts';
import { keyEventsOnly, stepIncrement } from './zoom.ts';

/**
 * The zoom: the timeline's steps in years per tick (steps below a year are named in the data: "month", "day"), the
 * current one, the steps too wide to draw (day zoom over centuries: disabled, and left if on one), whether only key
 * events are drawn (a timeline's coarsest step, when it marks any), and one step finer or coarser.
 */
export function useZoomSteps(
  meta: TimelineMeta,
  initial: number,
  visibleEvents: ResolvedEvent[],
  allEvents: TimelineEvent[],
  present: number,
  spans: Map<string, ResolvedSpan[]>,
  compress: boolean,
  focusOn: ReturnType<typeof useFocusRequest>[1],
) {
  const increments = useMemo(() => meta.increments.map(incrementYears), [meta.increments]);
  const [increment, setIncrement] = useState(initial);
  const cal = meta.calendar;
  const range = meta.range;
  const tooWide = useMemo(
    () => tooWideSteps(increments, visibleEvents, present, [...spans.values()].flat(), { compress, calendar: cal, range }),
    [increments, visibleEvents, present, spans, compress, cal, range],
  );
  const drawable = useMemo(() => increments.filter((i) => !tooWide.has(i)), [increments, tooWide]);
  if (tooWide.has(increment) && drawable.length) setIncrement(drawable.find((i) => i > increment) ?? drawable[drawable.length - 1]);
  // At a timeline's coarsest zoom, draw only its key events (plus the selected one), if it marks any.
  const keyOnly = useMemo(() => keyEventsOnly(increments, increment, allEvents), [increments, increment, allEvents]);
  /**
   * One zoom step finer (1) or coarser (-1): centered on `year` if given (or placed `at` that share of the time axis),
   * else the view keeps its center year. False if there is no further step that way.
   */
  const zoomStep = (dir: 1 | -1, year?: number, at?: number): boolean => {
    const next = stepIncrement(drawable, increment, dir);
    if (next === undefined) return false;
    setIncrement(next);
    if (year !== undefined) focusOn(at === undefined ? { year } : { year, at });
    return true;
  };
  return { increments, increment, setIncrement, tooWide, drawable, keyOnly, zoomStep };
}
