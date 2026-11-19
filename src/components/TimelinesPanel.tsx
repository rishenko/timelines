import { useRef, useState } from 'react';
import type { TimelineChoice } from '../state/timelines.ts';
import type { LibraryEntry } from '../state/library.ts';

interface Props {
  timelines: TimelineChoice[];
  currentId: string;
  onOpen: (id: string) => void;
  /** Resolves when done; rejects with a readable Error. */
  onAddUrl: (url: string) => Promise<void>;
  onAddFile: (file: File) => Promise<void>;
  onRefresh: (entry: LibraryEntry) => Promise<void>;
  onRemove: (entry: LibraryEntry) => void;
  onCopyShareLink: (entry: LibraryEntry) => void;
}

const day = (iso: string) => iso.slice(0, 10);

export function TimelinesPanel(p: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const bundled = p.timelines.filter((t) => !t.library);
  const library = p.timelines.filter((t) => t.library);

  return (
    <div className="timelines-panel">
      <section>
        <h3>Open a timeline from a link</h3>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) void run('url', () => p.onAddUrl(url.trim()));
          }}
        >
          <input
            type="url"
            aria-label="Timeline link"
            placeholder="https://… link to a timeline .json file (GitHub links work)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="primary" disabled={!url.trim() || !!busy}>
            {busy === 'url' ? 'Loading…' : 'Open'}
          </button>
        </form>
        <div className="row">
          <button onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'file' ? 'Loading…' : 'Add from a file…'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void run('file', () => p.onAddFile(f));
            }}
          />
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted small">
          Timelines you add are kept in this browser. Links work for anyone: share a timeline that was opened from a link
          with <em>Copy share link</em>. Timelines added from a file stay on this computer.
        </p>
      </section>

      <section>
        <h3>Your timelines</h3>
        {library.length === 0 && <p className="muted small">None yet.</p>}
        <ul className="timeline-list">
          {library.map(({ summary: d, library: entry }) => (
            <li key={d.id} className={d.id === p.currentId ? 'current' : ''}>
              <div className="info">
                <strong>{d.title}</strong>
                {d.subtitle && <span className="muted"> {d.subtitle}</span>}
                <div className="muted small">
                  {d.eventCount} events ·{' '}
                  {entry!.sourceUrl ? (
                    <span title={entry!.sourceUrl}>from a link, updated {day(entry!.updatedAt)}</span>
                  ) : (
                    <>added from a file {day(entry!.addedAt)}</>
                  )}
                </div>
              </div>
              <div className="actions">
                {d.id !== p.currentId && <button onClick={() => p.onOpen(d.id)}>Open</button>}
                {entry!.sourceUrl && (
                  <>
                    <button
                      disabled={!!busy}
                      title="Download the latest version from its link"
                      onClick={() => void run(`refresh-${d.id}`, () => p.onRefresh(entry!))}
                    >
                      {busy === `refresh-${d.id}` ? 'Updating…' : 'Update'}
                    </button>
                    <button onClick={() => p.onCopyShareLink(entry!)}>Copy share link</button>
                  </>
                )}
                <button className="danger" onClick={() => p.onRemove(entry!)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {bundled.length > 0 && (
        <section>
          <h3>Included</h3>
          <ul className="timeline-list">
            {bundled.map(({ summary: d }) => (
              <li key={d.id} className={d.id === p.currentId ? 'current' : ''}>
                <div className="info">
                  <strong>{d.title}</strong>
                  {d.subtitle && <span className="muted"> {d.subtitle}</span>}
                  {d.eventCount !== undefined && <div className="muted small">{d.eventCount} events</div>}
                </div>
                <div className="actions">
                  {d.id !== p.currentId && <button onClick={() => p.onOpen(d.id)}>Open</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
