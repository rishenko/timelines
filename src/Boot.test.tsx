// @vitest-environment jsdom
// Opening the page: the site's list, loading only the opened timeline, the reader's own timelines, errors, and a
// site with no timelines.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Boot } from './Boot.tsx';
import { SITE, SITE_DATASETS } from './test/app.tsx';
import { addToLibrary } from './state/library.ts';
import { plainTimeline } from './test/fixtures.ts';

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
  'timelines/ancient-near-east.json': SITE_DATASETS[0],
  'timelines/classical.json': SITE_DATASETS[1],
});

function open(query: string, fetchImpl: typeof fetch) {
  window.history.replaceState(null, '', `/?${query}`);
  return render(<Boot fetchImpl={fetchImpl} />);
}

describe('Boot', () => {
  it('opens the named site timeline, loading only that file', async () => {
    const s = server(siteFiles());
    open('timeline=classical', s.fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: The Classical World' })).toBeTruthy();
    expect(s.asked).toEqual(['timelines/index.json', 'timelines/classical.json']);
  });

  it('opens the first site timeline for an unknown or missing id', async () => {
    const s = server(siteFiles());
    open('timeline=no-such-thing', s.fetchImpl);
    expect(await screen.findByRole('region', { name: 'Timeline: Ancient Civilizations' })).toBeTruthy();
  });

  it("opens one of the reader's own timelines at once, without loading any site timeline", async () => {
    addToLibrary(plainTimeline(), { reservedIds: SITE.map((e) => e.id) });
    const s = server(siteFiles());
    open(`timeline=${plainTimeline().meta.id}`, s.fetchImpl);
    expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
    expect(s.asked).toEqual(['timelines/index.json']);
  });

  it('a site with no list and a reader with no timelines get the welcome page', async () => {
    const s = server({});
    open('', s.fetchImpl);
    expect(await screen.findByRole('heading', { name: 'Timelines' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Timeline link' })).toBeTruthy();
  });

  it('a site with no list still opens the reader’s own timelines', async () => {
    addToLibrary(plainTimeline());
    const s = server({});
    open('', s.fetchImpl);
    expect(await screen.findByRole('region', { name: `Timeline: ${plainTimeline().meta.title}` })).toBeTruthy();
  });

  it('says so, with a Reload button, when the timeline file fails to load', async () => {
    const files = siteFiles();
    files['timelines/classical.json'] = 500 as never;
    const s = server(files);
    open('timeline=classical', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn't load "The Classical World"\. The server answered 500/);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('refuses a file that holds a different timeline than the list says', async () => {
    const files = siteFiles();
    files['timelines/classical.json'] = SITE_DATASETS[0];
    const s = server(files);
    open('timeline=classical', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/holds the timeline "ancient-near-east"/);
  });

  it('says so when the list itself is broken', async () => {
    const s = server({ 'timelines/index.json': 500 });
    open('', s.fetchImpl);
    expect((await screen.findByRole('alert')).textContent).toMatch(/server answered 500/);
  });
});
