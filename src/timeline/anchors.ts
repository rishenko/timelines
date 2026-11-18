import { effectiveEnd } from '../lib/years.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';

/** Years that must stay uncompressed on the axis: every event start and end, the edges of their error windows, and track lifespans. */
/** A timeline's stated range (meta.range): anchors outside it are clamped to its ends, so long-running rows or wide
 * uncertainty ranges don't stretch the ruler far past the period the timeline is about. */
export function anchorsFor(
  events: ResolvedEvent[],
  present: number,
  spans: ResolvedSpan[] = [],
  range?: { start: number; end: number },
): number[] {
  const out: number[] = [];
  for (const e of events) {
    out.push(e.start);
    const end = effectiveEnd(e, present);
    if (end !== e.start) out.push(end);
    if (e.startWindow) out.push(...e.startWindow);
    if (e.endWindow) out.push(...e.endWindow);
  }
  for (const s of spans) {
    out.push(s.start, s.end);
    if (s.startWindow) out.push(...s.startWindow);
    if (s.endWindow) out.push(...s.endWindow);
  }
  return range ? out.map((y) => Math.min(Math.max(y, range.start), range.end)) : out;
}
