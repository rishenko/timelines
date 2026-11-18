import type { TimelineEvent } from '../types.ts';

/**
 * At a timeline's coarsest zoom only its key events are drawn, so the whole range stays readable. This applies only
 * when the timeline has more than one zoom step and marks at least one event as key (importance 1); otherwise every
 * event is drawn at every zoom.
 */
export function keyEventsOnly(increments: number[], increment: number, events: Pick<TimelineEvent, 'importance'>[]): boolean {
  return increments.length > 1 && increment === Math.max(...increments) && events.some((e) => e.importance === 1);
}
