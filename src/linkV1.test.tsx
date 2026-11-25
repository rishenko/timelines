// @vitest-environment jsdom
// v1 links in the app (src/state/viewState.ts): an end-year window opens on the zoom that fits it and stays in the link
// until the reader zooms; links are written with v=1 first; a link naming ids the timeline doesn't have says so once.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp as render, SITE_DATASETS } from './test/app.tsx';
import modern from '../public/timelines/modern-states.json';
import type { Dataset } from './types.ts';

const renderApp = (q: string) => render(q, [...SITE_DATASETS, modern as unknown as Dataset]);
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1600 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const zoom = () => screen.getByRole('group', { name: 'Years per tick' });
const pressed = () => within(zoom()).getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true')!.textContent;
const param = (k: string) => new URLSearchParams(window.location.search).get(k);

describe('v1 links', () => {
  it('from/to opens on the finest zoom that fits the window, and the link keeps from/to until the reader zooms', async () => {
    window.innerWidth = 1280; // the chart is estimated as 1280 less the row labels: 13 ticks
    renderApp('timeline=modern-states&v=1&from=1914&to=1918');
    expect(pressed()).toBe('1');
    await waitFor(() => expect(window.location.search).toMatch(/^\?timeline=modern-states&v=1&from=1914&to=1918/));
    const ten = within(zoom()).getAllByRole('button').find((b) => b.textContent === '10')!;
    act(() => fireEvent.click(ten));
    // the zoomed chart renders after the click (deferred), not inside it, so the link's write (250 ms after it commits) can
    // take over a second under a full test run: the total from click to link is the same as before (about 1 s here)
    await waitFor(() => expect(param('inc')).toBe('10'), { timeout: 5000 });
    expect(param('from')).toBeNull();
    expect(param('v')).toBe('1');
  });

  it('a wider window opens further out', () => {
    window.innerWidth = 1280;
    renderApp('timeline=modern-states&v=1&from=1450&to=1750');
    expect(pressed()).toBe('25');
  });

  it('a link without v opens as before, and is written back as v=1 with the timeline first', async () => {
    renderApp('timeline=modern-states&inc=10&at=1900&cat=siege,rule');
    expect(pressed()).toBe('10');
    await waitFor(() => expect(window.location.search).toMatch(/^\?timeline=modern-states&v=1&inc=10&at=1900&cat=rule,siege$/));
  });

  it('ids the timeline doesn’t have are skipped and said once; a newer version is said in the same notice', () => {
    renderApp('timeline=modern-states&v=2&set=japan,atlantis,lemuria#no-such-event');
    const status = document.querySelector('[role="status"]')!.textContent!;
    expect(status).toContain('This link is from a newer version of the app');
    expect(status).toContain('This link names 2 rows and 1 event this timeline doesn’t have.');
  });
});
