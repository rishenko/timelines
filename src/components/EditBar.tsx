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
  /** Leave edit mode (it is turned on in Customize, Edit). */
  onDone: () => void;
}

/** The second toolbar row in edit mode: add items, download and upload the file, discard the draft. */
export function EditBar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="editbar">
      {/* on phones the buttons are one row that scrolls sideways (see .editbar-buttons in CSS) */}
      <div className="editbar-buttons">
        <button className="primary" onClick={p.onDone} title="Leave edit mode (your edits are kept)">
          Done editing
        </button>
        <span className="sep" />
        <button onClick={p.onAddEvent}>+ Event</button>
        <button onClick={p.onAddTrack}>+ Row</button>
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
      </div>
      <span className="muted small hint-wide">
        Double-click an empty spot in a row (or hold a finger there on a touch screen) to add an event there; use the row
        buttons to edit, reorder or add sub-rows. Edits stay in this browser until you discard them.
      </span>
      <span className="muted hint-narrow">Hold a finger on an empty spot in a row to add an event. Edits stay in this browser.</span>
    </div>
  );
}
