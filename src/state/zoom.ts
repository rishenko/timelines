import type { TimelineEvent } from '../types.ts';

/** The next finer zoom step (fewer years per tick) than `current`, if there is one. */
export function finerIncrement(increments: number[], current: number): number | undefined {
  const finer = increments.filter((i) => i < current);
  return finer.length ? Math.max(...finer) : undefined;
}

/** The next coarser zoom step (more years per tick) than `current`, if there is one. */
export function coarserIncrement(increments: number[], current: number): number | undefined {
  const coarser = increments.filter((i) => i > current);
  return coarser.length ? Math.min(...coarser) : undefined;
}

/**
 * At a timeline's coarsest zoom only its key events are drawn, so the whole range stays readable. This applies only
 * when the timeline has more than one zoom step and marks at least one event as key (importance 1); otherwise every
 * event is drawn at every zoom.
 */
export function keyEventsOnly(increments: number[], increment: number, events: Pick<TimelineEvent, 'importance'>[]): boolean {
  return increments.length > 1 && increment === Math.max(...increments) && events.some((e) => e.importance === 1);
}
