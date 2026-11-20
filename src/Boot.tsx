import { useEffect, useState } from 'react';
import App from './App.tsx';
import type { Dataset } from './types.ts';
import type { TimelineIndexEntry } from './data/timelineIndex.ts';
import { addToLibrary, fetchTimeline, loadLibrary, normalizeUrl, type LibraryEntry } from './state/library.ts';
import { fetchIndex, findTimeline, listTimelines, loadSiteTimeline } from './state/timelines.ts';
import { parseUpload } from './state/dataset.ts';
import { goToTimeline } from './state/url.ts';
import { applyTheme, loadTheme } from './lib/theme.ts';
import { TimelinesPanel } from './components/TimelinesPanel.tsx';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; detail?: string }
  /** The site lists no timelines and the reader has none: a page to add one. */
  | { kind: 'welcome'; site: TimelineIndexEntry[] }
  | { kind: 'ready'; published: Dataset; library?: LibraryEntry; site: TimelineIndexEntry[] };

/**
 * Opens the page's timeline before the app starts:
 * - reads the site's list of timelines (timelines/index.json; the site may have none);
 * - `?data=<url>` fetches a timeline from the web, saves it to the reader's library and continues as
 *   `?timeline=<id>` (keeping the other settings and the selected event); if the fetch fails but the timeline was
 *   opened before, the saved copy is used;
 * - `?timeline=<id>` opens that timeline: one of the reader's own (saved in this browser) at once, or one of the
 *   site's, loaded now; an unknown or missing id opens the first one;
 * - with no timelines at all, a welcome page offers to add one.
 */
export function Boot({ fetchImpl = fetch }: { fetchImpl?: typeof fetch }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    openPage(fetchImpl).then(
      (p) => !cancelled && setPhase(p),
      (e: Error) => !cancelled && setPhase({ kind: 'error', message: e.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [fetchImpl]);

  if (phase.kind === 'ready') return <App published={phase.published} library={phase.library} site={phase.site} />;
  if (phase.kind === 'welcome') return <Welcome site={phase.site} fetchImpl={fetchImpl} />;
  if (phase.kind === 'error')
    return (
      <div className="boot" role="alert">
        <h1>Couldn't open the timeline</h1>
        <p>{phase.message}</p>
        {phase.detail && (
          <p className="muted small">
            <code>{phase.detail}</code>
          </p>
        )}
        <p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>{' '}
          <a href={window.location.pathname}>Go to the first timeline</a>
        </p>
      </div>
    );
  return (
    <div className="boot">
      <p className="muted loading">Loading timeline…</p>
    </div>
  );
}

async function openPage(fetchImpl: typeof fetch): Promise<Phase> {
  const site = await fetchIndex(fetchImpl);
  const siteIds = site.map((e) => e.id);
  const q = new URLSearchParams(window.location.search);

  const dataUrl = q.get('data');
  if (dataUrl) {
    const url = normalizeUrl(dataUrl);
    const go = (id: string): Phase => {
      q.delete('data');
      q.set('timeline', id);
      window.location.replace(`${window.location.pathname}?${q}${window.location.hash}`);
      return { kind: 'loading' };
    };
    try {
      return go(addToLibrary(await fetchTimeline(url, fetchImpl), { sourceUrl: url, reservedIds: siteIds }).dataset.meta.id);
    } catch (e) {
      const cached = loadLibrary().find((x) => x.sourceUrl === url);
      if (cached) return go(cached.dataset.meta.id);
      return { kind: 'error', message: (e as Error).message, detail: dataUrl };
    }
  }

  const choice = findTimeline(listTimelines(site), q.get('timeline'));
  if (!choice) return { kind: 'welcome', site };
  const published = choice.library ? choice.library.dataset : await loadSiteTimeline(choice.entry!, fetchImpl);
  // the reader's saved theme, else this timeline's own (main.tsx already applied the saved one, or the default)
  applyTheme(loadTheme(published.meta.defaultTheme).colors);
  return { kind: 'ready', published, library: choice.library, site };
}

/** A site with no timelines of its own, and a reader with none yet: add one from a link or a file. */
function Welcome({ site, fetchImpl }: { site: TimelineIndexEntry[]; fetchImpl: typeof fetch }) {
  const reservedIds = site.map((e) => e.id);
  return (
    <main className="boot welcome">
      <h1>Timelines</h1>
      <p>
        This site has no timelines of its own yet. Open one from a link, or add a timeline file from your computer. See{' '}
        <a href="https://github.com/rishenko/timelines/blob/main/docs/data-format.md">the timeline format</a> to make your
        own.
      </p>
      <TimelinesPanel
        timelines={[]}
        currentId=""
        onOpen={goToTimeline}
        onAddUrl={async (raw) => {
          const url = normalizeUrl(raw);
          goToTimeline(addToLibrary(await fetchTimeline(url, fetchImpl), { sourceUrl: url, reservedIds }).dataset.meta.id);
        }}
        onAddFile={async (file) => {
          const { dataset, errors } = parseUpload(await file.text());
          if (!dataset) throw new Error(`Couldn't load ${file.name}: ${errors[0]}`);
          goToTimeline(addToLibrary(dataset, { reservedIds }).dataset.meta.id);
        }}
        onRefresh={async () => {}}
        onRemove={() => {}}
        onCopyShareLink={() => {}}
      />
    </main>
  );
}
