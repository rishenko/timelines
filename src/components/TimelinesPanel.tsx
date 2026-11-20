import { useRef, useState } from 'react';
import type { TimelineChoice } from '../state/timelines.ts';
import type { LibraryEntry } from '../state/library.ts';
import { collectionName, type Collection } from '../state/collections.ts';

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
  /** Shared lists added in this browser, and what can be done with them (not on the welcome page). */
  collections?: Collection[];
  onRefreshList?: (c: Collection) => Promise<void>;
  onRemoveList?: (c: Collection) => void;
  onCopyListLink?: (c: Collection) => void;
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

  const bundled = p.timelines.filter((t) => t.entry && !t.collection);
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
            aria-label="Timeline or list link"
            placeholder="https://… link to a timeline .json file or a list of them (GitHub links work)"
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
          Timelines and lists you add are kept in this browser, and those from a link are checked for a newer version
          when they open. Links work for anyone: share one that was opened from a link with <em>Copy share link</em>.
          Timelines added from a file stay on this computer.
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

      <div>
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
        {(p.collections ?? []).map((c) => {
          const shown = p.timelines.filter((t) => t.collection?.url === c.url);
          const hidden = c.entries.length - shown.length;
          const name = collectionName(c);
          return (
            <section key={c.url} aria-label={`Shared list: ${name}`}>
              <h3>{name}</h3>
              <div className="row list-head">
                <span className="muted small" title={c.url}>
                  Shared list · updated {day(c.updatedAt)}
                  {hidden > 0 && ` · ${hidden} not shown (their ids are already in use here)`}
                </span>
              </div>
              <div className="row">
                {p.onRefreshList && (
                  <button
                    disabled={!!busy}
                    title="Download the latest version of the list"
                    onClick={() => void run(`list-${c.url}`, () => p.onRefreshList!(c))}
                  >
                    {busy === `list-${c.url}` ? 'Updating…' : 'Update list'}
                  </button>
                )}
                {p.onCopyListLink && <button onClick={() => p.onCopyListLink!(c)}>Copy link to list</button>}
                {p.onRemoveList && (
                  <button className="danger" onClick={() => p.onRemoveList!(c)}>
                    Remove list
                  </button>
                )}
              </div>
              <ul className="timeline-list">
                {shown.map(({ summary: d }) => (
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
          );
        })}
      </div>
    </div>
  );
}
