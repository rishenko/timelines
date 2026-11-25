// @vitest-environment jsdom
// The chart draws only the rows near the screen (a screen above, two and a half below), replacing the rest with
// empty space of the same height, so long timelines scroll smoothly. Rows still stripe as if all were drawn, the
// row holding the chart's Tab stop is always drawn, and the arrow keys reach rows far off screen.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { renderApp, SITE_DATASETS } from './test/app.tsx';
import { childrenMap } from './lib/tracks.ts';
import type { Dataset } from './types.ts';

const SCREEN_H = 900;

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
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => SCREEN_H });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const drawn = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lane')];
const skipped = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-rows-skipped')].map((s) => parseFloat(s.style.height));
/** Every row, unfolded and shown, so the chart is far taller than the screen. */
const open = () => {
  const r = renderApp('timeline=ancient-classical&inc=100&at=-500&rows=all');
  const all = [...r.container.querySelectorAll<HTMLButtonElement>('button')].find((x) => /Expand all/.test(x.textContent ?? ''))!;
  act(() => fireEvent.click(all));
  return r.container;
};
/** jsdom doesn't scroll: give the chart a scroll position and tell it it moved. */
const scrollTo = async (c: Element, top: number) => {
  const el = c.querySelector<HTMLElement>('.tl-scroller')!;
  Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top, set() {} });
  await act(async () => {
    fireEvent.scroll(el);
    await new Promise((r) => requestAnimationFrame(r));
  });
};

describe('rows far off screen', () => {
  it('are left out, with their height kept as empty space', () => {
    const c = open();
    const lanes = drawn(c);
    expect(lanes.length).toBeGreaterThan(5);
    expect(lanes.length).toBeLessThan(150);
    // the rows drawn plus the space left for the others fill the chart's full height
    const total = lanes.reduce((h, l) => h + parseFloat(l.style.height), 0) + skipped(c).reduce((a, b) => a + b, 0);
    const chart = parseFloat(c.querySelector<HTMLElement>('.tl-lanes')!.style.height);
    expect(chart).toBeGreaterThan(SCREEN_H * 6);
    // only the space below the last row drawn is left out of the flow (outside edit mode, nothing follows the rows)
    expect(total).toBeLessThanOrEqual(chart);
  });

  it('keep their DOM nodes when rows above them are left out (no remount per scroll step)', async () => {
    const c = open();
    const before = new Map(drawn(c).map((l) => [l.dataset.lane, l]));
    await scrollTo(c, SCREEN_H * 2.5);
    expect(skipped(c).length).toBeGreaterThan(0); // rows at the top were left out
    const kept = drawn(c).filter((l) => before.has(l.dataset.lane));
    expect(kept.length).toBeGreaterThan(5);
    // each row still drawn is the same element, not a new one (an unkeyed list remounted every row below a culled one)
    expect(kept.filter((l) => before.get(l.dataset.lane) !== l).map((l) => l.dataset.lane)).toEqual([]);
  });

  it('are drawn as the chart scrolls to them, still striped every other row overall', async () => {
    const c = open();
    const first = drawn(c).map((l) => l.dataset.lane);
    expect(drawn(c)[0].classList.contains('stripe')).toBe(false);
    expect(drawn(c)[1].classList.contains('stripe')).toBe(true);
    await scrollTo(c, SCREEN_H * 6);
    const later = drawn(c);
    expect(later.some((l) => !first.includes(l.dataset.lane))).toBe(true);
    expect(later.length).toBeLessThan(150);
    // a space stands in for the rows above (the row holding the Tab stop, near the top, stays drawn above it)
    expect(Math.max(...skipped(c))).toBeGreaterThan(SCREEN_H * 4);
    // striping follows each row's place among all rows, whichever are drawn
    const stripes = later.map((l) => l.classList.contains('stripe'));
    expect(stripes.some(Boolean) && stripes.some((s) => !s)).toBe(true);
  });

  it('are reached by the arrow keys, and the row holding the Tab stop stays drawn', async () => {
    const c = open();
    const first = new Set(drawn(c).map((l) => l.dataset.lane));
    const stop = c.querySelector<HTMLElement>('.tl-lanes [data-stop][tabindex="0"]')!;
    act(() => stop.focus());
    for (let i = 0; i < 150; i++) act(() => fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' }));
    const now = document.activeElement as HTMLElement;
    expect(now.getAttribute('data-stop')).toBeTruthy();
    const lane = now.closest<HTMLElement>('[data-lane]')!.dataset.lane!;
    expect(first.has(lane)).toBe(false);
    expect(now.tabIndex).toBe(0);
    // jsdom doesn't scroll to it, so the chart is still at the top: the row is drawn because it holds the Tab stop
    await scrollTo(c, 0);
    expect(c.querySelector('.tl-lanes [data-stop][tabindex="0"]')?.closest<HTMLElement>('[data-lane]')?.dataset.lane).toBe(lane);
  });
});

describe('a chart a few screens tall', () => {
  it('draws every row (leaving rows out would only add work as it scrolls)', () => {
    // the bundled timeline cut to its first three regions, so the chart is a few screens tall whatever the full data
    // grows to (the full timeline is over six screens, where rows far off screen are left out)
    const full = SITE_DATASETS[0];
    const kids = childrenMap(full.tracks);
    const keep = new Set<string>();
    const add = (id: string) => (keep.add(id), (kids.get(id) ?? []).forEach((k) => add(k.id)));
    (kids.get(undefined) ?? []).slice(0, 3).forEach((t) => add(t.id));
    const small: Dataset = {
      ...full,
      tracks: full.tracks.filter((t) => keep.has(t.id)),
      events: full.events.filter((e) => e.tracks.every((t) => keep.has(t))),
    };
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-500', [small]);
    const h = parseFloat(c.querySelector<HTMLElement>('.tl-lanes')!.style.height);
    expect(h).toBeGreaterThan(SCREEN_H * 2);
    expect(h).toBeLessThan(SCREEN_H * 6);
    expect(c.querySelectorAll('.tl-rows-skipped').length).toBe(0);
  });
});
