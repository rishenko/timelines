// @vitest-environment jsdom
// Opening the page: the site's list, loading only the opened timeline, the reader's own timelines, errors, and a
// site with no timelines; shared lists (?collection=) and checking timelines from links for a newer version.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Boot } from './Boot.tsx';
import { SITE, SITE_DATASETS } from './test/app.tsx';
import { addToLibrary, entrySummary, LIBRARY_KEY, loadLibrary, setBigStore, type BigStore } from './state/library.ts';
import { summarize } from './data/timelineIndex.ts';
import { loadCollections, parseCollection, saveCollection } from './state/collections.ts';
import { PRESETS, themeHint } from './lib/theme.ts';
import { plainTimeline } from './test/fixtures.ts';
import type { Dataset } from './types.ts';

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

/** A fake server for the site's files; records every path asked for. */
function server(files: Record<string, unknown | number>) {
  const asked: string[] = [];
  const fetchImpl = (async (url: string) => {
    const path = new URL(url).pathname.replace(/^\//, '');
    asked.push(path);
    const f = files[path];
    if (f === undefined) return json({}, 404);
    if (typeof f === 'number') return json({}, f);
    return json(f);
  }) as typeof fetch;
  return { fetchImpl, asked };
}

const siteFiles = () => ({
  'timelines/index.json': { timelines: SITE },
  'timelines/ancient-classical.json': SITE_DATASETS[0],
  'timelines/second-site.json': SITE_DATASETS[1],
});

function open(query: string, fetchImpl: typeof fetch) {
  window.history.replaceState(null, '', `/?${query}`);
  return render(<Boot fetchImpl={fetchImpl} />);
}

describe('Boot', () => {
  it('opens the named site timeline, loading only that file', async () => {
    const s = server(siteFiles());
    open('timeline=second-site', s.fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: A Second Timeline' })).toBeTruthy();
    expect(s.asked).toEqual(['timelines/index.json', 'timelines/second-site.json']);
  });

  it("paints the timeline's own theme from the site's list before its file arrives, and remembers it", async () => {
    let release = () => {};
    // a theme other than the app's default (dark), so painting it proves the site's list was read
    const files = siteFiles();
    files['timelines/index.json'] = { timelines: SITE.map((t, i) => (i === 0 ? { ...t, defaultTheme: 'parchment' } : t)) };
    files['timelines/ancient-classical.json'] = { ...SITE_DATASETS[0], meta: { ...SITE_DATASETS[0].meta, defaultTheme: 'parchment' } };
    const s = server(files);
    const slow = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('ancient-classical.json')) await new Promise<void>((r) => (release = r));
      return s.fetchImpl(url, init);
    }) as typeof fetch;
    const bg = () => document.documentElement.style.getPropertyValue('--bg');
    document.documentElement.style.removeProperty('--bg');
    open('timeline=ancient-classical', slow);
    for (let i = 0; i < 50 && !bg(); i++) await new Promise((r) => setTimeout(r, 10));
    expect(bg()).toBe(PRESETS.parchment.colors.bg);
    expect(screen.queryByRole('region')).toBeNull(); // the file hasn't loaded yet
    release();
    expect(await screen.findByRole('region', { name: 'Timeline: Ancient and Classical World' })).toBeTruthy();
    expect(themeHint('ancient-classical')).toBe('parchment');
  });

  it('ships Ancient and Classical with the dark theme by default', () => {
    expect(SITE[0].defaultTheme).toBe('dark');
  });

  it('opens the first site timeline for an unknown or missing id', async () => {
    const s = server(siteFiles());
    open('timeline=no-such-thing', s.fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: Ancient and Classical World' })).toBeTruthy();
  });

  it("opens one of the reader's own timelines at once, without loading any site timeline", async () => {
    await addToLibrary(plainTimeline(), { reservedIds: SITE.map((e) => e.id) });
    const s = server(siteFiles());
    open(`timeline=${plainTimeline().meta.id}`, s.fetchImpl);
    expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
    expect(s.asked).toEqual(['timelines/index.json']);
  });

  it('a site with no list and a reader with no timelines get the welcome page', async () => {
    const s = server({});
    open('', s.fetchImpl);
    expect(await screen.findByRole('heading', { name: 'Timelines' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Timeline or list link' })).toBeTruthy();
  });

  it('a site with no list still opens the reader’s own timelines', async () => {
    await addToLibrary(plainTimeline());
    const s = server({});
    open('', s.fetchImpl);
    expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
  });

  it('says so, with a Reload button, when the timeline file fails to load', async () => {
    const files = siteFiles();
    files['timelines/second-site.json'] = 500 as never;
    const s = server(files);
    open('timeline=second-site', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn't load "A Second Timeline"\. The server answered 500/);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('refuses a file that holds a different timeline than the list says', async () => {
    const files = siteFiles();
    files['timelines/second-site.json'] = SITE_DATASETS[0];
    const s = server(files);
    open('timeline=second-site', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/holds the timeline "ancient-classical"/);
  });

  it('says so when the list itself is broken', async () => {
    const s = server({ 'timelines/index.json': 500 });
    open('', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/server answered 500/);
  });
});

describe('Boot: shared lists and timelines from links', () => {
  const LIST = 'https://lists.example/club/list.json';
  const named = (id: string, title: string) => {
    const d = plainTimeline();
    return { ...d, meta: { ...d.meta, id, title } };
  };
  const remote = () => ({
    [LIST]: { title: 'Reading club', timelines: [{ id: 'club-a', title: 'Club A', file: 'a.json' }, { id: 'club-b', title: 'Club B', file: 'b.json' }] },
    'https://lists.example/club/a.json': named('club-a', 'Club A'),
    'https://lists.example/club/b.json': named('club-b', 'Club B'),
  });
  /** A fake web: the site's files by path, other sites by full address; `null` fails like a network error. */
  function web(other: Record<string, unknown>) {
    const asked: string[] = [];
    const site = server(siteFiles());
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (url.startsWith('http://localhost')) return site.fetchImpl(url, init);
      asked.push(url);
      if (!(url in other)) return json({}, 404);
      if (other[url] === null) throw new TypeError('Failed to fetch');
      return json(other[url]);
    }) as typeof fetch;
    return { fetchImpl, asked };
  }
  const go = (query: string, fetchImpl: typeof fetch) => {
    const went: string[] = [];
    window.history.replaceState(null, '', `/?${query}`);
    render(<Boot fetchImpl={fetchImpl} navigate={(u) => went.push(u)} />);
    return went;
  };
  const until = async (f: () => boolean) => {
    for (let i = 0; i < 50 && !f(); i++) await new Promise((r) => setTimeout(r, 10));
    expect(f()).toBe(true);
  };

  it("?collection= saves the list and continues at its first timeline, keeping the other settings", async () => {
    const w = web(remote());
    const went = go(`collection=${encodeURIComponent(LIST)}&inc=100`, w.fetchImpl);
    await until(() => went.length > 0);
    expect(went[0]).toBe('/?inc=100&timeline=club-a');
    expect(loadCollections().map((c) => [c.title, c.entries.map((e) => e.file)])).toEqual([
      ['Reading club', ['https://lists.example/club/a.json', 'https://lists.example/club/b.json']],
    ]);
    expect(w.asked).toEqual([LIST]); // the timelines themselves load when opened
  });

  it('?collection= with ?timeline= continues at that timeline when the list has it', async () => {
    const went = go(`collection=${encodeURIComponent(LIST)}&timeline=club-b`, web(remote()).fetchImpl);
    await until(() => went.length > 0);
    expect(went[0]).toBe('/?timeline=club-b');
  });

  it('?collection= uses the saved copy when the list is out of reach, and says so when there is none', async () => {
    const went = go(`collection=${encodeURIComponent(LIST)}`, web({ [LIST]: null }).fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn't open the shared list/);
    expect(went).toEqual([]);
    cleanup();
    saveCollection(parseCollection(remote()[LIST], LIST));
    const again = go(`collection=${encodeURIComponent(LIST)}`, web({ [LIST]: null }).fetchImpl);
    await until(() => again.length > 0);
    expect(again[0]).toBe('/?timeline=club-a');
  });

  it("opens a list's timeline from its own address, after checking the list for changes", async () => {
    saveCollection(parseCollection(remote()[LIST], LIST));
    const w = web(remote());
    go('timeline=club-b', w.fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: Club B' })).toBeTruthy();
    expect(w.asked).toEqual([LIST, 'https://lists.example/club/b.json']);
  });

  it('a list that changed is saved again as the timeline opens; out of reach, the saved list is used', async () => {
    saveCollection(parseCollection(remote()[LIST], LIST));
    const files = remote();
    files[LIST] = { ...files[LIST], title: 'Renamed club' };
    go('timeline=club-a', web(files).fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: Club A' })).toBeTruthy();
    expect(loadCollections()[0].title).toBe('Renamed club');
    cleanup();
    go('timeline=club-a', web({ ...files, [LIST]: null }).fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: Club A' })).toBeTruthy();
  });

  describe('a timeline from a link', () => {
    const LINK = 'https://files.example/harbor.json';
    const saved = () => addToLibrary(plainTimeline(), { sourceUrl: LINK, reservedIds: SITE.map((e) => e.id) });

    it('opens the newer version when its link has one, and says so', async () => {
      await saved();
      const newer = { ...plainTimeline(), meta: { ...plainTimeline().meta, title: 'The Harbor Towns, revised' } };
      go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: newer }).fetchImpl);
      expect(await screen.findByRole('region', { name: 'Timeline: The Harbor Towns, revised' })).toBeTruthy();
      expect(screen.getByRole('status').textContent).toMatch(/Updated "The Harbor Towns, revised" to the latest version/);
      expect(loadLibrary()[0].dataset!.meta.title).toBe('The Harbor Towns, revised');
    });

    it('opens the saved copy, without a message, when nothing changed or the link is out of reach', async () => {
      const before = (await saved()).updatedAt;
      for (const answer of [plainTimeline(), null]) {
        go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: answer }).fetchImpl);
        expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
        expect(screen.getByRole('status').textContent ?? '').not.toMatch(/Updated/);
        cleanup();
      }
      expect(loadLibrary()[0].updatedAt).toBe(before);
    });

    describe('too large to keep (link-only)', () => {
      const linkOnly = () =>
        localStorage.setItem(
          LIBRARY_KEY,
          JSON.stringify([{ linkOnly: summarize(plainTimeline()), sourceUrl: LINK, addedAt: '2026-11-24', updatedAt: '2026-11-24' }]),
        );
      it('opens from its link', async () => {
        linkOnly();
        const w = web({ [LINK]: plainTimeline() });
        go(`timeline=${plainTimeline().meta.id}`, w.fetchImpl);
        expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
        expect(w.asked).toEqual([LINK]);
      });
      it("shows the timeline's current title in the picker after it opens", async () => {
        linkOnly();
        const renamed = { ...plainTimeline(), meta: { ...plainTimeline().meta, title: 'The Harbor Towns, renamed' } };
        go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: renamed }).fetchImpl);
        expect(await screen.findByRole('region', { name: 'Timeline: The Harbor Towns, renamed' })).toBeTruthy();
        expect(entrySummary(loadLibrary()[0]).title).toBe('The Harbor Towns, renamed');
      });
      it('says why when the link fails', async () => {
        linkOnly();
        go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: null }).fetchImpl);
        expect(await screen.findByText(/too large to keep in this browser, so it opens from its link/)).toBeTruthy();
      });
    });

    describe('too large for localStorage (kept in IndexedDB)', () => {
      const mem = (): BigStore & { map: Map<string, Dataset> } => {
        const map = new Map<string, Dataset>();
        return { map, get: async (id) => map.get(id), put: async (id, d) => void map.set(id, d), delete: async (id) => void map.delete(id) };
      };
      const stored = (big: ReturnType<typeof mem>, withData: boolean) => {
        if (withData) big.map.set(plainTimeline().meta.id, plainTimeline());
        localStorage.setItem(
          LIBRARY_KEY,
          JSON.stringify([{ big: summarize(plainTimeline()), sourceUrl: LINK, addedAt: '2026-11-24', updatedAt: '2026-11-24' }]),
        );
        setBigStore(big);
      };
      afterEach(() => setBigStore(null));
      it('opens from IndexedDB; the link is only checked for a newer version', async () => {
        const big = mem();
        stored(big, true);
        const w = web({ [LINK]: plainTimeline() });
        go(`timeline=${plainTimeline().meta.id}`, w.fetchImpl);
        expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
        expect(w.asked).toEqual([LINK]); // the recheck, not a download to open it
      });
      it('fetches it again when the IndexedDB record does not validate', async () => {
        const big = mem();
        stored(big, false);
        big.map.set(plainTimeline().meta.id, { ...plainTimeline(), events: [{ nonsense: true }] } as unknown as Dataset);
        go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: plainTimeline() }).fetchImpl);
        expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
      });
      it('says so, and does not open it, when the record is unreadable and there is no link', async () => {
        const big = mem();
        big.map.set(plainTimeline().meta.id, { ...plainTimeline(), events: [{ nonsense: true }] } as unknown as Dataset);
        localStorage.setItem(LIBRARY_KEY, JSON.stringify([{ big: summarize(plainTimeline()), addedAt: '2026-11-24', updatedAt: '2026-11-24' }]));
        setBigStore(big);
        go(`timeline=${plainTimeline().meta.id}`, web({}).fetchImpl);
        expect(await screen.findByText(/missing or unreadable in this browser/)).toBeTruthy();
      });
      it('fetches it again from its link when IndexedDB no longer has it', async () => {
        const big = mem();
        stored(big, false);
        go(`timeline=${plainTimeline().meta.id}`, web({ [LINK]: plainTimeline() }).fetchImpl);
        expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
      });
    });
  });
});
