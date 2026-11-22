import type { Calendar } from '../types.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';
import { anchorsFor, keptStretches } from './anchors.ts';
import { buildScale } from './scale.ts';

/**
 * The widest chart drawn, px. The chart is one wide element, and browsers stop drawing past a limit (about 17.9
 * million px in Firefox, 33 million in Chrome and Safari); this keeps well inside it.
 */
export const MAX_CHART_PX = 10_000_000;

/**
 * Zoom steps below a year at which the chart would be wider than MAX_CHART_PX (day zoom over centuries of dated
 * events): the toolbar disables them. Measured with every lifespan, so a little wider than any view of it.
 */
export function tooWideSteps(
  increments: number[],
  events: ResolvedEvent[],
  present: number,
  spans: ResolvedSpan[],
  o: { compress: boolean; calendar: Calendar; range?: { start: number; end: number } },
): Set<number> {
  const out = new Set<number>();
  for (const inc of increments) {
    if (inc >= 1) continue;
    const scale = buildScale(anchorsFor(events, present, spans, o.range, true), {
      increment: inc,
      compress: o.compress,
      calendar: o.calendar,
      keep: keptStretches(events, present, o.range),
    });
    if (scale.width > MAX_CHART_PX) out.add(inc);
  }
  return out;
}
