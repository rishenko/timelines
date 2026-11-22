import type { Dispatch } from 'react';
import type { EventCategories } from '../state/categoryFilter.ts';
import { DetailPanel } from './DetailPanel.tsx';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { SourceForm } from './SourceForm.tsx';
import type { DatasetAction } from '../state/dataset.ts';
import type { Notify } from '../state/toast.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';
import type { Dataset, TimelineEvent, Track } from '../types.ts';

/** What the side panel is editing, if anything. */
export type Editing =
  | { kind: 'event'; event: TimelineEvent; isNew: boolean }
  | { kind: 'track'; track: Track | null; parent?: string }
  | { kind: 'source'; key: string | null }
  | null;

interface Props {
  data: Dataset;
  dispatch: Dispatch<DatasetAction>;
  notify: Notify;
  editing: Editing;
  setEditing: (e: Editing) => void;
  editMode: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  resolvedById: Map<string, ResolvedEvent>;
  visibleIds: Set<string>;
  /** Selects an event and scrolls to it (a link in the detail panel). */
  onSelectAndFocus: (id: string) => void;
  onCopyLink: (eventId: string) => void;
  /** The timeline's map file, if it has one (shown in event details). */
  mapUrl?: string;
  /** Each event's categories, for the event panel's Category line. */
  categoriesOf?: Map<string, EventCategories>;
}

/**
 * The panel beside the timeline: an editor (event, track or source) while editing, else the selected event's
 * details. Renders nothing when there is neither. Every change goes through `dispatch` and is announced by `notify`.
 */
export function SidePanel(p: Props) {
  const { data, dispatch, notify, editing, setEditing, selectedId, setSelectedId } = p;

  if (editing?.kind === 'event')
    return (
      <EventForm
        key={editing.event.uuid}
        initial={editing.event}
        isNew={editing.isNew}
        data={data}
        onCancel={() => setEditing(null)}
        onCreateTrack={(t) => {
          dispatch({ type: 'upsertTrack', track: t });
          notify(`Row "${t.name}" created.`);
        }}
        onCreateSource={(key, src) => {
          dispatch({ type: 'upsertSource', key, source: src });
          notify(`Source "${src.name}" created.`);
        }}
        onSave={(e) => {
          dispatch({ type: 'upsertEvent', event: e });
          setEditing(null);
          setSelectedId(e.uuid);
          notify(editing.isNew ? 'Event created.' : 'Event saved.');
        }}
      />
    );

  if (editing?.kind === 'track')
    return (
      <TrackForm
        key={editing.track?.id ?? 'new'}
        initial={editing.track}
        defaultParent={editing.parent}
        data={data}
        onCancel={() => setEditing(null)}
        onSave={(t, previousId) => {
          dispatch({ type: 'upsertTrack', track: t, previousId });
          setEditing(null);
          notify(previousId ? 'Row saved.' : `Row "${t.name}" created.`);
        }}
        onDelete={(id) => {
          const sel = selectedId ? data.events.find((e) => e.uuid === selectedId) : undefined;
          if (sel && sel.tracks.every((t) => t === id)) setSelectedId(null);
          dispatch({ type: 'removeTrack', id });
          setEditing(null);
          notify('Row deleted.');
        }}
      />
    );

  if (editing?.kind === 'source')
    return (
      <SourceForm
        key={editing.key ?? 'new'}
        sourceKey={editing.key}
        data={data}
        onCancel={() => setEditing(null)}
        onSave={(key, src, previousKey) => {
          dispatch({ type: 'upsertSource', key, source: src, previousKey });
          setEditing(null);
          notify(previousKey ? 'Source saved.' : `Source "${src.name}" created.`);
        }}
        onDelete={(key) => {
          dispatch({ type: 'removeSource', key });
          setEditing(null);
          notify('Source deleted.');
        }}
      />
    );

  const selected = selectedId ? data.events.find((e) => e.uuid === selectedId) : undefined;
  const resolved = selectedId ? p.resolvedById.get(selectedId) : undefined;
  if (!selected || !resolved) return null;
  return (
    <DetailPanel
      event={selected}
      resolved={resolved}
      resolvedById={p.resolvedById}
      visibleIds={p.visibleIds}
      data={data}
      editMode={p.editMode}
      onClose={() => setSelectedId(null)}
      onSelect={p.onSelectAndFocus}
      onCopyLink={() => p.onCopyLink(selected.uuid)}
      mapUrl={p.mapUrl}
      category={p.categoriesOf?.get(selected.uuid)}
      onEdit={() => setEditing({ kind: 'event', event: selected, isNew: false })}
      onDelete={() => {
        if (!window.confirm(`Delete "${selected.title}"?`)) return;
        dispatch({ type: 'removeEvent', uuid: selected.uuid });
        setSelectedId(null);
        notify('Event deleted.');
      }}
    />
  );
}
