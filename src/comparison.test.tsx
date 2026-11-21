// @vitest-environment jsdom
// Comparison sets: rows picked from anywhere shown side by side, from a link, a row's compare button, the "Add a row"
// box or the region filter; the order switch; back to the whole timeline; off in edit mode; the table follows.
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
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const OPEN = 'timeline=ancient-classical&inc=100&at=-1400&rows=all';
const laneIds = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lane[data-lane]')].map((l) => l.dataset.lane!);
const expandAll = () => {
  const b = screen.queryByRole('button', { name: /Expand all/ });
  if (b) act(() => fireEvent.click(b));
};
const bar = () => screen.getByRole('region', { name: 'Comparison' });
const status = () => document.querySelector('[role="status"]')!.textContent;

describe('comparison sets', () => {
  it('opens from a link with only the picked rows, in the picked order, each with its broad region', () => {
    const { container: c } = renderApp(OPEN + '&set=hittites,pharaonic-egypt,han');
    expect(laneIds(c)).toEqual(['hittites', 'pharaonic-egypt', 'han']);
    expect(within(bar()).getByText('Comparing 3 rows')).toBeTruthy();
    const tag = (id: string) => c.querySelector(`.tl-lane[data-lane="${id}"] .row-tag`)?.textContent;
    expect([tag('hittites'), tag('pharaonic-egypt'), tag('han')]).toEqual(['Near East', 'Africa', 'East Asia']);
    expect(screen.getByRole('button', { name: /^Filters · comparison/ })).toBeTruthy();
  });

  it('changes the order, and goes back to the whole timeline keeping the set', async () => {
    const { container: c } = renderApp(OPEN + '&set=han,hittites,pharaonic-egypt');
    const order = within(bar()).getByRole('combobox', { name: 'Order' });
    act(() => fireEvent.change(order, { target: { value: 'start' } }));
    expect(laneIds(c)).toEqual(['pharaonic-egypt', 'hittites', 'han']);
    expect(status()).toBe('Comparing 3 rows, by start date');
    await waitFor(() => expect(window.location.search).toContain('order=start'));
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Show the whole timeline' })));
    expect(laneIds(c)[0]).toBe('africa');
    expect(within(bar()).getByText('Comparison: 3 rows')).toBeTruthy();
    await waitFor(() => expect(window.location.search).not.toContain('set='));
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Show the comparison' })));
    expect(laneIds(c)).toEqual(['pharaonic-egypt', 'hittites', 'han']);
  });

  it('a row\'s compare button adds it; the set shows when asked', async () => {
    const { container: c } = renderApp(OPEN);
    expandAll();
    const compare = screen.getByRole('button', { name: 'Compare Hittites' });
    expect(compare.getAttribute('aria-pressed')).toBe('false');
    act(() => fireEvent.click(compare));
    expect(screen.getByRole('button', { name: 'Compare Hittites' }).getAttribute('aria-pressed')).toBe('true');
    expect(status()).toBe('1 row in the comparison; showing the whole timeline');
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Show the comparison' })));
    expect(laneIds(c)).toEqual(['hittites']);
    await waitFor(() => expect(window.location.search).toContain('set=hittites'));
  });

  it('adds a row by name, and says so when there is no such row', () => {
    const { container: c } = renderApp(OPEN + '&set=hittites');
    const box = within(bar()).getByRole('combobox', { name: 'Add a row' });
    act(() => fireEvent.change(box, { target: { value: 'han dynasty' } }));
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Add' })));
    expect(laneIds(c)).toEqual(['hittites', 'han']);
    act(() => fireEvent.change(box, { target: { value: 'Atlantis' } }));
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Add' })));
    expect(within(bar()).getByRole('alert').textContent).toMatch(/No row is called “Atlantis”/);
    act(() => fireEvent.click(within(bar()).getByRole('button', { name: 'Remove Hittites' })));
    expect(laneIds(c)).toEqual(['han']);
  });

  it('starts from the region filter, related rows together', async () => {
    const { container: c } = renderApp(OPEN + '&regions=japan');
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Filters/ })));
    const make = screen.getByRole('button', { name: /^Compare these \d+ rows$/ });
    act(() => fireEvent.click(make));
    const ids = laneIds(c);
    expect(ids.length).toBeGreaterThan(2);
    expect(ids).toContain('kofun');
    expect(ids.every((id) => !['east-asia', 'korea-japan'].includes(id))).toBe(true); // flat: no headers
    await waitFor(() => expect(window.location.search).toContain('order=related'));
  });

  it('the table view follows it', () => {
    renderApp(OPEN + '&set=hittites,han&view=table');
    const rows = [...document.querySelectorAll<HTMLElement>('[data-row-id]')].map((r) => r.dataset.rowId);
    expect(rows).toEqual(['hittites', 'han']);
  });

  it('is off in edit mode', () => {
    const { container: c } = renderApp(OPEN + '&set=hittites,han');
    fireEvent.click(screen.getByRole('button', { name: /^Customize/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on edit mode' }));
    expect(laneIds(c)[0]).toBe('africa');
    expect(screen.queryByRole('region', { name: 'Comparison' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Compare / })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(laneIds(c)).toEqual(['hittites', 'han']);
  });
});
