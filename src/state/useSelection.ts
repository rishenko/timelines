import { useState } from 'react';
import type { Editing } from '../components/SidePanel.tsx';
import type { ResolvedEvent } from '../lib/chronology.ts';
import type { useFocusRequest } from './focus.ts';

/**
 * What the side panel shows: the selected event, or an age's details, or a row's phase or membership: one at a time,
 * so opening one closes the others. A phase is closed when an editor opens, since its ref is an index the editors can
 * move.
 */
export function useSelection(
  initialSelected: string | null,
  events: { uuid: string }[],
  editing: Editing,
  resolvedById: Map<string, ResolvedEvent>,
  focusOn: ReturnType<typeof useFocusRequest>[1],
) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialSelected && events.some((e) => e.uuid === initialSelected) ? initialSelected : null,
  );
  // an age's details (clicked in the strip or a band): one panel at a time, so opening it closes an event's and the
  // other way round
  const [selectedAgeId, setSelectedAgeId] = useState<string | null>(null);
  // likewise a row's phase or membership (Enter on its strip cell), by its PlacedPhase.ref
  const [selectedPhaseRef, setSelectedPhaseRef] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState(selectedId);
  if (selectedId !== lastSelectedId) {
    setLastSelectedId(selectedId);
    if (selectedId) {
      setSelectedAgeId(null);
      setSelectedPhaseRef(null);
    }
  }
  const openAge = (id: string) => {
    setSelectedId(null);
    setSelectedPhaseRef(null);
    setSelectedAgeId(id);
  };
  // refs are indexes into a row's phases and memberships, which the editors can reorder or delete: an editor opening
  // closes a phase's details
  if (editing && selectedPhaseRef) setSelectedPhaseRef(null);
  const openPhase = (ref: string) => {
    setSelectedId(null);
    setSelectedAgeId(null);
    setSelectedPhaseRef(ref);
  };
  const selectAndFocus = (id: string) => {
    const e = resolvedById.get(id);
    if (!e) return;
    setSelectedId(id);
    focusOn({ year: e.start });
  };
  return { selectedId, setSelectedId, selectedAgeId, setSelectedAgeId, selectedPhaseRef, setSelectedPhaseRef, openAge, openPhase, selectAndFocus };
}
