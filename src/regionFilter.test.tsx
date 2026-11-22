// @vitest-environment jsdom
// Filters → Regions: ticking regions shows only their rows (with their headers), the link carries them, the Filters
// button says a filter is on, the table view follows, and edit mode turns it off.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp } from './test/app.tsx';

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
  // a screen tall enough that the chart draws every row (it leaves out rows far off screen): these tests count and
  // find rows anywhere in the chart
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 100_000 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const OPEN = 'timeline=ancient-classical&inc=100&at=-1400&rows=all';
const laneIds = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lane[data-lane]')].map((l) => l.dataset.lane!);
const expandAll = () => {
  const b = screen.queryByRole('button', { name: /Expand all/ });
  if (b) act(() => fireEvent.click(b));
};
const filtersButton = () => screen.getByRole('button', { name: /^Filters/ });
/** The Regions list (opening the Filters panel first if needed; outside act, so it has rendered before it is searched). */
const regionsList = () => {
  if (!screen.queryByRole('list', { name: 'Regions' })) act(() => fireEvent.click(filtersButton()));
  return screen.getByRole('list', { name: 'Regions' });
};
const regionBox = (name: string) => within(regionsList()).getByRole('checkbox', { name: new RegExp(`^${name} \\(`) }) as HTMLInputElement;
const status = () => document.querySelector('[role="status"]')!.textContent;

describe('the region filter', () => {
  it('opens from a link with only that region’s rows, and the Filters button says so', () => {
    const { container: c } = renderApp(OPEN + '&regions=anatolia');
    expandAll();
    const ids = laneIds(c);
    expect(ids).toContain('hittites');
    expect(ids).toContain('near-east'); // headers stay over their rows
    expect(ids).not.toContain('han');
    expect(ids).not.toContain('sumer');
    expect(filtersButton().textContent).toMatch(/Filters · 1 region/);
  });

  it('ticking regions shows their rows, says so and goes into the link; clear brings every row back', async () => {
    const { container: c } = renderApp(OPEN);
    expandAll();
    const before = laneIds(c).length;
    const fold = within(regionsList()).getByRole('button', { name: 'Show the regions in East Asia' });
    act(() => fireEvent.click(fold));
    const box = regionBox('Japan');
    act(() => fireEvent.click(box));
    expect(status()).toBe('Showing rows in Japan');
    const ids = laneIds(c);
    expect(ids).toContain('kofun');
    expect(ids).not.toContain('hittites');
    await waitFor(() => expect(window.location.search).toContain('regions=japan'));
    const clear = within(regionsList().closest('section')!).getByRole('button', { name: 'clear' });
    act(() => fireEvent.click(clear));
    expect(laneIds(c).length).toBe(before);
    expect(status()).toBe('Region filter off: all rows');
  });

  it('ticking a broad region includes the regions inside it', () => {
    renderApp(OPEN);
    const fold = within(regionsList()).getByRole('button', { name: 'Show the regions in Near East' });
    act(() => fireEvent.click(fold));
    const box = regionBox('Near East');
    act(() => fireEvent.click(box));
    const anatolia = regionBox('Anatolia');
    expect(anatolia.checked).toBe(true);
    expect(anatolia.disabled).toBe(true);
  });

  it('the table view follows it', () => {
    renderApp(OPEN + '&regions=japan&view=table');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    // the Ages table (meta.eras) stays: ages run across regions, so the region filter leaves them alone
    expect(headings).toEqual(['Ages', 'East & Southeast Asia']);
  });

  it('is off in edit mode, where every row must be reachable', () => {
    const { container: c } = renderApp(OPEN + '&regions=japan');
    expandAll();
    expect(laneIds(c)).not.toContain('hittites');
    fireEvent.click(screen.getByRole('button', { name: /^Customize/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on edit mode' }));
    expandAll();
    expect(laneIds(c)).toContain('hittites');
    expect(filtersButton().textContent).toBe('Filters');
    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(laneIds(c)).not.toContain('hittites');
  });

  it('shows each row\'s regions with their sources: in the table, and in the row name\'s tooltip', () => {
    renderApp('timeline=ancient-classical&view=table');
    const hittites = document.querySelector<HTMLElement>('[data-row-id="hittites"]')!.closest('tr')!;
    const cells = within(hittites).getAllByRole('cell');
    const regions = cells[cells.length - 1];
    expect(regions.textContent).toMatch(/^Anatolia \(in Near East\)/);
    expect(within(regions).getByRole('link', { name: /Wikipedia: Hittites/ })).toBeTruthy();
    // a row with regions but no lifespan is listed too
    const libyans = document.querySelector<HTMLElement>('[data-row-id="libyans"]')!.closest('tr')!;
    expect(libyans.textContent).toMatch(/No lifespan/);
  });

  it('adds the regions to the row name\'s tooltip in the chart', () => {
    const { container: c } = renderApp(OPEN);
    expandAll();
    const name = c.querySelector<HTMLElement>('.tl-lane[data-lane="hittites"] .tl-lane-label .name')!;
    expect(name.getAttribute('title')).toMatch(/\nRegions: Anatolia \(Near East\) — from Wikipedia: Hittites/);
  });
});
