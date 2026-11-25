import { useEffect, useState } from 'react';
import App from './App.tsx';
import { CommandsContext } from './commands/CommandsContext.ts';
import { createCommandRegistry } from './commands/registry.ts';
import type { Dataset } from './types.ts';
import type { TimelineIndexEntry } from './data/timelineIndex.ts';
import { addToLibrary, entryId, fetchTimeline, loadEntryDataset, loadLibrary, normalizeUrl, restoreBigCopy, sessionCopy, updateSummary, withTimeout, type LibraryEntry } from './state/library.ts';
import { fetchCollection, loadCollections, saveCollection, type Collection } from './state/collections.ts';
import {
  addFromLink,
  fetchIndex,
  findTimeline,
  listTimelines,
  loadSiteTimeline,
  reservedIds,
  type TimelineChoice,
} from './state/timelines.ts';
import { parseUpload, uploadError } from './state/dataset.ts';
import { newerMinor } from './data/migrate.ts';
import { goToTimeline } from './state/url.ts';
import { applyTheme, loadTheme, rememberThemeHint } from './lib/theme.ts';
import { TimelinesPanel } from './components/TimelinesPanel.tsx';
import { About } from './components/About.tsx';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; detail?: string }
  /** The site lists no timelines and the reader has none: a page to add one. */
  | { kind: 'welcome'; site: TimelineIndexEntry[] }
  | { kind: 'ready'; published: Dataset; library?: LibraryEntry; site: TimelineIndexEntry[]; notice?: string };

/** How long opening waits to hear whether a timeline or list from a link has changed, before using the saved copy. */
const CHECK_MS = 5000;

/**
 * Opens the page's timeline before the app starts:
 * - reads the site's list of timelines (timelines/index.json; the site may have none);
 * - `?data=<url>` fetches a timeline from the web, saves it to the reader's library and continues as
 *   `?timeline=<id>` (keeping the other settings and the selected event); if the fetch fails but the timeline was
 *   opened before, the saved copy is used;
 * - `?collection=<url>` fetches a shared list of timelines (the site index's format), saves it, and continues as
 *   `?timeline=<id>`: the one named, if the list has it, else the list's first; if the fetch fails but the list was
 *   added before, the saved copy is used;
 * - `?timeline=<id>` opens that timeline: one of the reader's own (saved in this browser) at once, or one of the
 *   site's or a shared list's, loaded now; an unknown or missing id opens the first one. A timeline from a link, or
 *   a shared list, is checked for a newer version first (for a few seconds at most; offline, the saved copy opens);
 * - with no timelines at all, a welcome page offers to add one.
 */
const replacePage = (url: string) => window.location.replace(url);

export function Boot({
  fetchImpl = fetch,
  navigate = replacePage,
}: {
  fetchImpl?: typeof fetch;
  /** Continues at another address (replaced for tests). */
  navigate?: (url: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [commands] = useState(createCommandRegistry);
  /** ?page=about is the About this data page: no timeline loads behind it. */
  const about = new URLSearchParams(window.location.search).get('page') === 'about';
  useEffect(() => {
    if (about) return;
    let cancelled = false;
    openPage(fetchImpl, navigate).then(
      (p) => !cancelled && setPhase(p),
      (e: Error) => !cancelled && setPhase({ kind: 'error', message: e.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [fetchImpl, navigate, about]);

  if (about) return <About />;
  if (phase.kind === 'ready')
    return (
      // the app's one command registry: the chart's keys, plugins' commands, the keys help and (step 4) the bindings
      <CommandsContext.Provider value={commands}>
        <App published={phase.published} library={phase.library} site={phase.site} notice={phase.notice} />
      </CommandsContext.Provider>
    );
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

async function openPage(fetchImpl: typeof fetch, navigate: (url: string) => void): Promise<Phase> {
  const site = await fetchIndex(fetchImpl);
  const q = new URLSearchParams(window.location.search);
  /** Continues at ?timeline=<id> with the other settings (a full load, so the app starts from that timeline). */
  const go = (id: string | undefined): Phase => {
    q.delete('data');
    q.delete('collection');
    if (id) q.set('timeline', id);
    else q.delete('timeline');
    navigate(`${window.location.pathname}?${q}${window.location.hash}`);
    return { kind: 'loading' };
  };

  const listUrl = q.get('collection');
  if (listUrl) {
    const url = normalizeUrl(listUrl);
    try {
      saveCollection(await fetchCollection(url, fetchImpl));
    } catch (e) {
      if (!loadCollections().some((c) => c.url === url))
        return { kind: 'error', message: `Couldn't open the shared list. ${(e as Error).message}`, detail: listUrl };
    }
    const ids = listTimelines(site)
      .filter((t) => t.collection?.url === url)
      .map((t) => t.summary.id);
    const want = q.get('timeline');
    return go(want && ids.includes(want) ? want : (ids[0] ?? want ?? undefined));
  }

  const dataUrl = q.get('data');
  if (dataUrl) {
    const url = normalizeUrl(dataUrl);
    try {
      return go((await addToLibrary(await fetchTimeline(url, fetchImpl), { sourceUrl: url, reservedIds: reservedIds(site) })).dataset.meta.id);
    } catch (e) {
      const cached = loadLibrary().find((x) => x.sourceUrl === url);
      if (cached) return go(entryId(cached));
      return { kind: 'error', message: (e as Error).message, detail: dataUrl };
    }
  }

  const id = q.get('timeline');
  let choice = findTimeline(listTimelines(site), id);
  if (!choice) return { kind: 'welcome', site };
  // the timeline's own theme as soon as its list says it, before its file (the larger part) loads
  applyTheme(loadTheme(choice.summary.defaultTheme).colors);
  let notice: string | undefined;
  if (choice.collection) {
    if (await recheckCollection(choice.collection, fetchImpl)) choice = findTimeline(listTimelines(site), id) ?? choice;
  } else if (choice.library?.sourceUrl && (choice.library.dataset || choice.library.big)) {
    // (a link-only entry is fetched below anyway)
    const updated = await recheckLinked(choice, site, fetchImpl);
    if (updated) {
      choice = { ...choice, library: updated };
      notice = `Updated "${updated.dataset.meta.title}" to the latest version from its link.`;
    }
  }
  let published: Dataset;
  let stored: Dataset | undefined;
  if (!choice.library) published = await loadSiteTimeline(choice.entry!, fetchImpl);
  else if (choice.library.dataset) published = choice.library.dataset;
  else if (choice.library.big && (stored = await loadEntryDataset(choice.library))) published = stored;
  else {
    // too large for localStorage: opened from its link each time (see LibraryEntry.linkOnly), or, for a large entry
    // IndexedDB no longer has, fetched again from its link
    const entry = choice.library;
    try {
      if (!entry.sourceUrl) throw new Error('its saved copy is missing or unreadable in this browser, and it has no link to fetch it again.');
      const fresh = sessionCopy(entry) ?? (await fetchTimeline(entry.sourceUrl, fetchImpl));
      published = { ...fresh, meta: { ...fresh.meta, id: entryId(entry) } };
      updateSummary(published); // the picker's title and description follow the timeline just read
      void restoreBigCopy(entry, published); // a large entry whose stored record was bad: keep the fresh copy, so the next open doesn't fetch it again
    } catch (e) {
      return {
        kind: 'error',
        message: `Couldn't open "${(entry.big ?? entry.linkOnly)!.title}". It's too large to keep in this browser, so it opens from its link, and that failed: ${(e as Error).message}`,
        detail: entry.sourceUrl,
      };
    }
  }
  // the reader's saved theme, else this timeline's own (the list's entry may have lacked it); remembered for next time
  applyTheme(loadTheme(published.meta.defaultTheme).colors);
  rememberThemeHint(id, published.meta.defaultTheme);
  // the newer-format notice (core 1.0, rule 1) from the timeline itself, so it shows however it was reached: file, link, shared list,
  // the library, a re-check, or the site's own files (a toast set before a page load is gone after it)
  const newer = newerMinor(published);
  return { kind: 'ready', published, library: choice.library, site, notice: [notice, newer].filter(Boolean).join(' ') || undefined };
}

/** Fetches a shared list again and saves it if it changed; true if it did. Unreachable: false (the saved copy stays). */
async function recheckCollection(c: Collection, fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const fresh = await fetchCollection(c.url, withTimeout(fetchImpl, CHECK_MS));
    if (JSON.stringify([fresh.title, fresh.entries]) === JSON.stringify([c.title, c.entries])) return false;
    saveCollection(fresh);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches a timeline from a link again and saves it if it changed; returns the updated entry. Unreachable or broken:
 * undefined (the saved copy opens). Reader's edits are kept on top of the new version (see restoreDraft).
 */
async function recheckLinked(choice: TimelineChoice, site: TimelineIndexEntry[], fetchImpl: typeof fetch) {
  const old = choice.library!;
  try {
    const fresh = await fetchTimeline(old.sourceUrl!, withTimeout(fetchImpl, CHECK_MS));
    // the saved copy may carry a different id (see addToLibrary); compare as it would be saved
    const same = { ...fresh, meta: { ...fresh.meta, id: entryId(old) } };
    const had = await loadEntryDataset(old);
    if (had && JSON.stringify(same) === JSON.stringify(had)) return undefined;
    return await addToLibrary(fresh, { sourceUrl: old.sourceUrl, reservedIds: reservedIds(site) });
  } catch {
    return undefined;
  }
}

/** A site with no timelines of its own, and a reader with none yet: add one from a link or a file. */
function Welcome({ site, fetchImpl }: { site: TimelineIndexEntry[]; fetchImpl: typeof fetch }) {
  return (
    <main className="boot welcome">
      <h1>Timelines</h1>
      <p>
        This site has no timelines of its own yet. Open one from a link (a timeline file or a list of them), or add a timeline file from your computer. See{' '}
        <a href="https://github.com/rishenko/timelines/blob/main/docs/data-format.md">the timeline format</a> to make your
        own. <a href="?page=about">About this data</a>.
      </p>
      <TimelinesPanel
        timelines={[]}
        currentId=""
        onOpen={goToTimeline}
        onAddUrl={async (raw) => goToTimeline(await addFromLink(raw, site, fetchImpl))}
        onAddFile={async (file) => {
          const { dataset, errors } = parseUpload(await file.text());
          if (!dataset) throw new Error(uploadError(file.name, errors));
          goToTimeline((await addToLibrary(dataset, { reservedIds: reservedIds(site) })).dataset.meta.id);
        }}
        onRefresh={async () => {}}
        onRemove={() => {}}
        onCopyShareLink={() => {}}
      />
    </main>
  );
}
