// @vitest-environment jsdom
// Filters → Tracks and Sources as folding trees: a group's checkbox switches the whole group (mixed when only part is
// on), the find box narrows the list and says how many match, and ticked regions dim what lies outside them.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
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
const openFilters = () => {
  if (!screen.queryByRole('list', { name: 'Tracks' })) act(() => fireEvent.click(screen.getByRole('button', { name: /^Filters/ })));
};
const tracks = () => (openFilters(), screen.getByRole('list', { name: 'Tracks' }));
const sources = () => (openFilters(), screen.getByRole('list', { name: 'Sources' }));
const box = (list: HTMLElement, name: string) => within(list).getByRole('checkbox', { name: new RegExp(`^${name}`) }) as HTMLInputElement;
const laneIds = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lane[data-lane]')].map((l) => l.dataset.lane!);

describe('Filters → Tracks and Sources', () => {
  it('starts folded: only the areas show', () => {
    renderApp(OPEN);
    const items = within(tracks()).getAllByRole('checkbox');
    expect(items.length).toBe(7);
    expect(within(sources()).getAllByRole('checkbox').length).toBeLessThan(12);
  });

  it('a group\'s checkbox switches the whole group, and shows mixed when only part of it is on', () => {
    const { container: c } = renderApp(OPEN);
    const area = box(tracks(), 'Ancient Near East');
    act(() => fireEvent.click(area));
    expect(area.checked).toBe(false);
    expect(laneIds(c)).not.toContain('near-east');
    act(() => fireEvent.click(within(tracks()).getByRole('button', { name: 'Show what is in Ancient Near East' })));
    const anatolia = box(tracks(), 'Anatolia');
    act(() => fireEvent.click(anatolia));
    expect(box(tracks(), 'Ancient Near East').indeterminate).toBe(true);
    expect(laneIds(c)).toContain('anatolia');
  });

  it('finds rows by name, opening the groups above them', () => {
    renderApp(OPEN);
    openFilters();
    const find = screen.getByRole('searchbox', { name: 'Find a row' });
    act(() => fireEvent.change(find, { target: { value: 'hittit' } }));
    expect(box(tracks(), 'Hittites')).toBeTruthy();
    expect(within(tracks()).getAllByRole('checkbox').length).toBeLessThan(6);
    expect(document.querySelector('.filter-tree [aria-live]')!.textContent).toBe('1 row match');
  });

  it('dims rows and sources outside the ticked regions, folding the dimmed rows of an opened group', () => {
    renderApp(OPEN + '&regions=anatolia');
    openFilters();
    expect(screen.getByText(/rows are in the ticked regions; the rest are dimmed/)).toBeTruthy();
    const africa = box(tracks(), 'Africa');
    expect(africa.closest('li')!.className).toBe('dim');
    expect(africa.closest('label')!.textContent).toMatch(/outside the ticked regions/);
    expect(within(tracks()).getByRole('button', { name: /^\d+ more in Europe, outside the ticked regions$/ })).toBeTruthy();
    expect(box(sources(), 'Used by rows in the ticked regions')).toBeTruthy();
    expect(box(sources(), 'Other sources')).toBeTruthy();
  });

  it('splits into Visual filters and Data filters, both open on wide screens, and remembers the reader\'s choice', () => {
    renderApp(OPEN);
    openFilters();
    const visual = document.querySelector<HTMLDetailsElement>('details.filters-group.visual')!;
    const dataSection = document.querySelector<HTMLDetailsElement>('details.filters-group.data')!;
    expect(visual.open && dataSection.open).toBe(true);
    expect(within(visual).getByRole('checkbox', { name: 'Hide rows with nothing in view' })).toBeTruthy();
    expect(within(dataSection).getByRole('list', { name: 'Tracks' })).toBeTruthy();
    visual.open = false;
    act(() => fireEvent(visual, new Event('toggle')));
    expect(JSON.parse(localStorage.getItem('timelines:filters-open')!)).toEqual({ visual: false, data: true });
  });

  it('on a phone, starts with Visual filters folded', () => {
    const was = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} })) as never;
    try {
      renderApp(OPEN);
      openFilters();
      expect(document.querySelector<HTMLDetailsElement>('details.filters-group.visual')!.open).toBe(false);
      expect(document.querySelector<HTMLDetailsElement>('details.filters-group.data')!.open).toBe(true);
    } finally {
      window.matchMedia = was;
    }
  });
});
