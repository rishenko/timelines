// @vitest-environment jsdom
// The year cursor's readout names the reign in force from the reigns that ruled (E1: `ReignLane.ruled`), not the whole reign
// lane: a consort's reign is drawn on the row but never answers "who ruled". Pins the chart's wiring of
// `timeline.ruledReigns` into the cursor layer (a regression here passes every unit test of reignLane and meanwhile).
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { renderApp, SITE } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';
import type { Dataset, Facet, TimelineEvent } from './types.ts';

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

const facet: Facet = {
  name: 'Category',
  applies: 'events',
  values: {
    rule: { name: 'Rulers' },
    reign: { name: 'Reign or term', broader: ['rule'] },
    consort: { name: 'Consort', broader: ['reign'] },
  },
};
const reign = (uuid: string, title: string, start: number, end: number, value: string): TimelineEvent => ({
  uuid,
  title,
  descr: '',
  start,
  end,
  tracks: ['quay'],
  sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }],
  memberships: [{ facet: 'category', value, sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }] }],
});

function open(): HTMLElement {
  const d: Dataset = plainTimeline();
  d.meta.facets = { category: facet };
  // both span year 140; the consort's starts later, so the whole lane would name it (the later reign wins when two meet)
  d.events = [reign('king', 'Reign of King Oar', 90, 300, 'reign'), reign('consort', 'Reign of Queen Tide', 100, 200, 'consort')];
  SITE.push({ id: d.meta.id, title: d.meta.title, file: 'harbor-towns.json' });
  try {
    return renderApp('timeline=harbor-towns&inc=50&at=100', [d]).container;
  } finally {
    SITE.pop();
  }
}

const press = async (key: string) =>
  act(async () => {
    fireEvent.keyDown(document.activeElement!, { key });
  });

describe('the year cursor names the reign that ruled', () => {
  it('skips a reign in the lane whose verdict does not answer who ruled', async () => {
    const c = open();
    act(() => c.querySelector<HTMLElement>('.tl-lanes [data-stop][tabindex="0"]')!.focus());
    await press('y'); // at the focused event's year: King Oar's start, 90
    await press('ArrowRight'); // one zoom step: 140, inside both reigns
    const chip = c.querySelector('.tl-cursor-chip[role="slider"]')!;
    expect(chip.getAttribute('aria-valuetext')).toMatch(/140/);
    const row = [...c.querySelectorAll('.cur-row')].find((r) => r.textContent!.startsWith('Quay Town'))!;
    // the reign in force comes first; the consort's reign is still listed among what was ongoing, after the phase
    expect(row.textContent).toMatch(/^Quay Town Reign of King Oar · /);
  });
});
