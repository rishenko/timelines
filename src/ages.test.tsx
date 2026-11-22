// @vitest-environment jsdom
// Ages (meta.eras) in the app: the strip under the ruler in the chart, and the Ages table in the table view.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { renderApp } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';

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

const withAges = () => {
  const d = plainTimeline();
  d.meta.eras = [
    { id: 'salt-years', name: 'Salt Years', group: 'trade', start: 20, end: 60, sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 3' }] },
    { id: 'long-calm', name: 'Long Calm', group: 'weather', start: 0, end: 30, circa: true, sources: [{ sourceKey: 'logbook', sourceLocation: '' }] },
  ];
  return d;
};

describe('ages', () => {
  it('the chart draws them in the Ages strip, one button each', () => {
    renderApp(`timeline=harbor-towns&inc=10&at=30`, [withAges()]);
    const strip = screen.getByRole('group', { name: 'Ages' });
    expect(within(strip).getByRole('button', { name: /^Salt Years, 20 L – 60 L, age/ })).toBeTruthy();
    expect(within(strip).getByRole('button', { name: /^Long Calm, c\. 0 L – c\. 30 L, age/ })).toBeTruthy();
  });

  it('the table view lists them, earliest first, with dates and sources', () => {
    renderApp(`timeline=harbor-towns&view=table`, [withAges()]);
    const table = screen.getByRole('table', { name: /^Ages/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Long Calm', 'Salt Years']);
    expect(rows[1].textContent).toContain('The Harbor Ledger');
  });

  it('a timeline without ages has no strip', () => {
    renderApp(`timeline=harbor-towns`, [plainTimeline()]);
    expect(screen.queryByRole('group', { name: 'Ages' })).toBeNull();
  });
});
