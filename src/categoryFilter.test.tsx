// @vitest-environment jsdom
// Event categories in the reader: Filters → Categories shows only the ticked kinds' events (events with no category
// always), the link carries them, the Filters button says so; each event's main kind draws a glyph and both
// categories are in its accessible name; the table has a Category column; edit mode turns the filter off.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp as render, SITE_DATASETS } from './test/app.tsx';
import medieval from '../public/timelines/medieval.json';
import modern from '../public/timelines/modern-states.json';
import type { Dataset } from './types.ts';

const renderApp = (q: string) => render(q, [...SITE_DATASETS, medieval as unknown as Dataset, modern as unknown as Dataset]);

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
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 100_000 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

// Medieval's Mississippian row: Cahokia founded (statehood), at its peak (no category), the exodus (a place)
const OPEN = 'timeline=medieval&inc=50&at=1200&rows=all';
const shown = (c: Element, id: string) => !!c.querySelector(`.tl-mark[data-event-id="${id}"]`);
const filtersButton = () => screen.getByRole('button', { name: /^Filters/ });
const categoriesList = () => {
  if (!screen.queryByRole('list', { name: 'Categories' })) act(() => fireEvent.click(filtersButton()));
  return screen.getByRole('list', { name: 'Categories' });
};
const box = (name: string) => within(categoriesList()).getByRole('checkbox', { name: new RegExp(`^${name} \\(`) }) as HTMLInputElement;
const status = () => document.querySelector('[role="status"]')!.textContent;

describe('the category filter', () => {
  it('opens from a link with only those kinds’ events; events with no category stay; the Filters button says so', () => {
    const { container: c } = renderApp(OPEN + '&cat=statehood');
    expect(shown(c, 'cahokia-founded')).toBe(true);
    expect(shown(c, 'cahokia-at-its-peak')).toBe(true);
    expect(shown(c, 'exodus-from-cahokia')).toBe(false);
    expect(filtersButton().textContent).toMatch(/Filters · 1 category/);
  });

  it('ticking a kind shows its events, says so and goes into the link; clear brings every event back', async () => {
    const { container: c } = renderApp(OPEN);
    expect(shown(c, 'exodus-from-cahokia')).toBe(true);
    const places = box('Cities and places');
    act(() => fireEvent.click(places));
    expect(status()).toBe('Showing events in Cities and places');
    expect(shown(c, 'exodus-from-cahokia')).toBe(true);
    expect(shown(c, 'cahokia-founded')).toBe(false);
    expect(shown(c, 'cahokia-at-its-peak')).toBe(true);
    await waitFor(() => expect(window.location.search).toContain('cat=place'));
    const clear = within(categoriesList().closest('section')!).getByRole('button', { name: 'clear' });
    act(() => fireEvent.click(clear));
    expect(shown(c, 'cahokia-founded')).toBe(true);
    expect(status()).toBe('Category filter off: all events');
    await waitFor(() => expect(window.location.search).not.toContain('cat='));
  });

  it('ticking a kind includes its sub-kinds; kinds with no events on the timeline aren’t listed', () => {
    renderApp(OPEN);
    const fold = within(categoriesList()).getByRole('button', { name: 'Show the sub-kinds of Statehood' });
    act(() => fireEvent.click(fold));
    const statehood = box('Statehood');
    act(() => fireEvent.click(statehood));
    const sub = box('State founded');
    expect(sub.checked).toBe(true);
    expect(sub.disabled).toBe(true);
    // kinds and sub-kinds with no events here aren't listed: every box counts at least one
    const counts = within(categoriesList()).getAllByRole('checkbox').map((b) => Number(/\((\d+) events?\)/.exec(b.parentElement!.textContent!)![1]));
    expect(counts.length).toBeGreaterThan(9);
    expect(counts.every((n) => n > 0)).toBe(true);
  });

  it('leaves out a kind no event on the timeline has (Modern States has no archaeology)', () => {
    renderApp('timeline=modern-states&inc=50&at=1900');
    expect(within(categoriesList()).queryByRole('checkbox', { name: /^Archaeology/ })).toBeNull();
    expect(box('Wars and battles')).toBeTruthy();
  });

  it('draws the main kind’s glyph before the title, and names the categories in the accessible name', () => {
    const { container: c } = renderApp(OPEN);
    const mark = c.querySelector<HTMLElement>('.tl-mark[data-event-id="exodus-from-cahokia"]')!;
    expect(mark.querySelector('.label .cat-glyph')?.getAttribute('data-kind')).toBe('place');
    expect(mark.getAttribute('aria-label')).toMatch(/, Cities and places(,|$)/);
    // no category: no glyph, nothing added to its name
    const peak = c.querySelector<HTMLElement>('.tl-mark[data-event-id="cahokia-at-its-peak"]')!;
    expect(peak.querySelector('.cat-glyph')).toBeNull();
  });

  it('the table has a Category column naming the sub-kind, and "None" for an event without', () => {
    const { container: c } = renderApp(OPEN + '&view=table');
    const row = (id: string) => c.querySelector(`button[data-event-id="${id}"]`)!.closest('tr')!;
    expect(row('cahokia-founded').querySelector('td.category')!.textContent).toBe('Statehood: State founded');
    expect(row('cahokia-at-its-peak').querySelector('td.category')!.textContent).toBe('None');
  });
});
