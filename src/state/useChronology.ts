import { useMemo, useState } from 'react';
import type { Dataset } from '../types.ts';
import {
  chronologyGroups,
  defaultSelection,
  resolveEvents,
  resolveSpan,
  type ChronologySelection,
  type ResolvedPhase,
  type ResolvedSpan,
} from '../lib/chronology.ts';

/**
 * Dating systems: readers pick one chronology per group (e.g. Mesopotamia: High / Middle / Low), and every event,
 * lifespan and phase is re-plotted under the choice. `initial` holds choices from the link. `groups` lists only groups with a real choice (two or more).
 */
export function useChronology(data: Dataset, initial: ChronologySelection = {}) {
  const [selection, setSelection] = useState<ChronologySelection>(() => ({ ...defaultSelection(data), ...initial }));
  const defaults = useMemo(() => defaultSelection(data), [data]);
  const groups = useMemo(() => [...chronologyGroups(data)].filter(([, list]) => list.length > 1), [data]);
  const resolved = useMemo(() => resolveEvents(data, selection), [data, selection]);
  const resolvedById = useMemo(() => new Map(resolved.map((e) => [e.uuid, e])), [resolved]);
  const spans = useMemo(() => {
    const m = new Map<string, ResolvedSpan>();
    for (const t of data.tracks) if (t.span) m.set(t.id, resolveSpan(data, t.id, t.span, selection));
    return m;
  }, [data, selection]);
  const phases = useMemo(() => {
    const m = new Map<string, ResolvedPhase[]>();
    for (const t of data.tracks)
      if (t.phases?.length) m.set(t.id, t.phases.map((p) => ({ name: p.name, ...resolveSpan(data, t.id, p, selection) })));
    return m;
  }, [data, selection]);

  const choose = (group: string, id: string) => setSelection((s) => ({ ...s, [group]: id }));
  const reset = () => setSelection(defaults);
  return { selection, defaults, groups, choose, reset, resolved, resolvedById, spans, phases };
}
