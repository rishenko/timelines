// @vitest-environment jsdom
// Succession in the app: the events that began and ended a lifespan or phase (startEvent, endEvent) show in its
// tooltip on the chart and in the table view's rows table, where each opens the event; the event lists what it began
// and ended.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, within } from '@testing-library/react';
import { renderApp, SITE } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';
import type { Dataset } from './types.ts';

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

/** The fictional timeline with began/ended events on a phase and two lifespans, as a site timeline. */
function open(query: string) {
  const d: Dataset = plainTimeline();
  const quay = d.tracks.find((t) => t.id === 'quay')!;
  quay.phases![0].startEvent = 'founding';
  d.tracks.find((t) => t.id === 'saltmarsh')!.span = { start: -10, end: 150, endEvent: 'great-storm' };
  d.tracks.find((t) => t.id === 'lighthouse')!.span = { start: 0, ongoing: true, startEvent: 'year-zero' };
  SITE.push({ id: d.meta.id, title: d.meta.title, file: 'harbor-towns.json' });
  try {
    return renderApp(`timeline=harbor-towns&${query}`, [d]);
  } finally {
    SITE.pop();
  }
}

describe('succession', () => {
  it("names a phase's and a lifespan's events in their tooltips on the chart", () => {
    // the whole range in view (jsdom doesn't scroll)
    const { container: c } = open('inc=50&at=100');
    const tips = [...c.querySelectorAll('.tl-phase-fill')].map((x) => x.getAttribute('title') ?? '');
    expect(tips.find((t) => t.startsWith('First Council:'))).toMatch(/\nBegan with: Quay Town founded$/);
    const salt = c.querySelector('[data-lane="saltmarsh"] .tl-span')!.getAttribute('title')!;
    expect(salt).toMatch(/\nEnded with: The Great Storm$/);
    const guild = c.querySelector('[data-lane="lighthouse"] .tl-span')!.getAttribute('title')!;
    expect(guild).toMatch(/\nBegan with: The Lighthouse is lit$/);
  });

  it("lists them in the table view's rows table, where each opens the event, and the event lists what it began and ended", () => {
    const { container: c } = open('view=table');
    const quay = [...c.querySelectorAll('table.rows-table tr')].find((tr) => tr.querySelector('th[data-row-id="quay"]'))!;
    const first = [...quay.querySelectorAll('.phase-list li')].find((li) => li.querySelector('strong')!.textContent === 'First Council')!;
    expect(first.querySelector('.began-ended')!.textContent).toBe(' Began with Quay Town founded');
    act(() => fireEvent.click(within(first as HTMLElement).getByRole('button', { name: 'Quay Town founded' })));
    const panel = c.querySelector('.side-panel.detail')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Quay Town founded');
    const section = panel.querySelector('section.succession')!;
    const items = (label: string) =>
      [...section.querySelectorAll('.claim-group')].find((g) => g.querySelector('h4')!.textContent === label)?.querySelectorAll('li strong') ?? [];
    expect([...items('Began')].map((li) => li.textContent)).toEqual(['Quay Town: First Council']);
    expect([...items('Ended')]).toEqual([]);
  });
});
