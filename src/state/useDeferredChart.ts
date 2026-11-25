import { useDeferredValue } from 'react';
import type { Dataset } from '../types.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import type { ResolvedMembership } from '../lib/memberOf.ts';

interface Inputs {
  data: Dataset;
  events: ResolvedEvent[];
  listEvents: ResolvedEvent[];
  spans: Map<string, ResolvedSpan[]>;
  phases: Map<string, ResolvedPhase[]>;
  memberOf: Map<string, ResolvedMembership[]>;
  rows: Record<string, boolean>;
  collapsed: Record<string, boolean>;
  compress: boolean;
  hide: boolean;
  thin: boolean;
}

/**
 * What the chart and table draw, deferred: a click (a filter, region, comparison, dating or fold change) updates its own
 * control at once, and the chart and table redraw in the background; `busy` (the busy ring) while they lag. Zoom stays
 * immediate: its scroll anchoring needs the new scale at once.
 */
export function useDeferredChart(now: Inputs): Inputs & { busy: boolean } {
  const shown: Inputs = {
    data: useDeferredValue(now.data),
    events: useDeferredValue(now.events),
    listEvents: useDeferredValue(now.listEvents),
    spans: useDeferredValue(now.spans),
    phases: useDeferredValue(now.phases),
    memberOf: useDeferredValue(now.memberOf),
    rows: useDeferredValue(now.rows),
    collapsed: useDeferredValue(now.collapsed),
    compress: useDeferredValue(now.compress),
    hide: useDeferredValue(now.hide),
    thin: useDeferredValue(now.thin),
  };
  const busy = (Object.keys(now) as (keyof Inputs)[]).some((k) => shown[k] !== now[k]);
  return { ...shown, busy };
}
