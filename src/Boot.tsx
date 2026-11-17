import { useEffect, useState } from 'react';
import App from './App.tsx';
import { addToLibrary, fetchTimeline, loadLibrary, normalizeUrl } from './state/library.ts';
import { BUNDLED_IDS } from './timelines/index.ts';

/**
 * `?data=<url>` opens a timeline from the web: it's fetched, validated, saved to
 * the library, and the page continues as `?timeline=<id>` (keeping inc/at and the
 * selected event). If the fetch fails but the timeline was opened before, the
 * saved copy is used.
 */
export function Boot() {
  const [dataUrl] = useState(() => new URLSearchParams(window.location.search).get('data'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataUrl) return;
    const url = normalizeUrl(dataUrl);
    const go = (id: string) => {
      const q = new URLSearchParams(window.location.search);
      q.delete('data');
      q.set('timeline', id);
      window.location.replace(`${window.location.pathname}?${q}${window.location.hash}`);
    };
    fetchTimeline(url)
      .then((ds) => go(addToLibrary(ds, { sourceUrl: url, reservedIds: BUNDLED_IDS }).dataset.meta.id))
      .catch((e: Error) => {
        const cached = loadLibrary().find((x) => x.sourceUrl === url);
        if (cached) go(cached.dataset.meta.id);
        else setError(e.message);
      });
  }, [dataUrl]);

  if (!dataUrl) return <App />;
  return (
    <div className="boot">
      {error ? (
        <>
          <h1>Couldn't open that timeline</h1>
          <p>{error}</p>
          <p className="muted small">
            <code>{dataUrl}</code>
          </p>
          <a href={window.location.pathname}>Go to the included timelines</a>
        </>
      ) : (
        <p className="muted">Loading timeline…</p>
      )}
    </div>
  );
}
