import { useRef } from 'react';

interface Props {
  onAddEvent: () => void;
  onAddTrack: () => void;
  onAddSource: () => void;
  /** final: strip the `edited` markers, for publishing. */
  onDownload: (final: boolean) => void;
  onUpload: (file: File) => void;
  /** Shows "Discard local edits" when there is a draft. */
  dirty: boolean;
  onDiscard: () => void;
}

/** The second toolbar row in edit mode: add items, download and upload the file, discard the draft. */
export function EditBar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="editbar">
      <button onClick={p.onAddEvent}>+ Event</button>
      <button onClick={p.onAddTrack}>+ Track</button>
      <button onClick={p.onAddSource}>+ Source</button>
      <span className="sep" />
      <button onClick={() => p.onDownload(false)}>Download in-progress</button>
      <button onClick={() => p.onDownload(true)}>Download final</button>
      <button onClick={() => fileRef.current?.click()}>Upload JSON</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onUpload(f);
          e.target.value = '';
        }}
      />
      {p.dirty && (
        <button className="danger" onClick={p.onDiscard}>
          Discard local edits
        </button>
      )}
      <span className="muted small">
        Double-click an empty spot in a lane (or hold a finger there on a touch screen) to add an event there; use the lane
        buttons to edit, reorder or add sub-tracks. Edits stay in this browser until you discard them.
      </span>
    </div>
  );
}
