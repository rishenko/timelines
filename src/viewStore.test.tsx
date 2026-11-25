// @vitest-environment jsdom
// Plugin design step 1b: the chart's sideways scroll lives in a store (timeline/viewportStore.ts) and React's view moves
// in half-screen bands. The chart's one Tab stop must still be the first event at or after the exact left edge, top to
// bottom, as it was when the view was state: placed by hand between renders (useRovingFocus), never two stops at once.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { renderApp } from './test/app.tsx';

const POINT_HALF = 7; // Marks.tsx

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

/** jsdom doesn't scroll: give the chart a sideways position and tell it it moved. */
const scrollLeft = async (c: Element, left: number) => {
  const el = c.querySelector<HTMLElement>('.tl-scroller')!;
  Object.defineProperty(el, 'scrollLeft', { configurable: true, get: () => left, set() {} });
  await act(async () => {
    fireEvent.scroll(el);
    await new Promise((r) => requestAnimationFrame(r));
  });
};
const labelW = (c: Element) => parseFloat(c.querySelector<HTMLElement>('.tl-corner')!.style.width);
/** The event marks drawn, in the keyboard grid's order: rows top to bottom, then by x (as keyboard.ts sorts them). */
const eventStops = (c: Element) =>
  [...c.querySelectorAll<HTMLElement>('.tl-lanes .tl-lane')].flatMap((lane) =>
    [...lane.querySelectorAll<HTMLElement>('.tl-mark[data-stop]')]
      .map((el) => ({ el, x: parseFloat(el.style.left) - labelW(c) + (el.classList.contains('span') ? 0 : POINT_HALF), y: parseFloat(el.style.top) }))
      .sort((a, b) => a.x - b.x || a.y - b.y),
  );
const tabStops = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lanes [tabindex="0"]')];

describe('the Tab stop follows the exact left edge (sideways scroll in a store)', () => {
  it('after sideways scrolls, Tab lands on the first event at or after the exact left edge, not the band\'s', async () => {
    // (bands are 800 px here, the screen being 1600: at 2200 and 2700 the band starts at 1600 and 2400, where the first
    // event is another one than at the exact edge)
    const c = renderApp('timeline=ancient-classical&inc=100&at=-1500').container;
    for (const left of [1000, 2200, 2700, 3700]) {
      await scrollLeft(c, left);
      const stops = tabStops(c);
      expect(stops, `one Tab stop at left ${left}`).toHaveLength(1);
      expect(stops[0].classList.contains('tl-mark')).toBe(true);
      const all = eventStops(c);
      const want = all.find((s) => s.x >= left);
      expect(want, `an event at or after ${left}`).toBeDefined();
      expect(stops[0].dataset.stop, `left ${left}`).toBe(want!.el.dataset.stop);
    }
  });

  it('once the reader has moved into the chart, scrolling leaves their stop where it is', async () => {
    const c = renderApp('timeline=ancient-classical&inc=100&at=-1500').container;
    const first = tabStops(c)[0];
    await act(async () => {
      first.focus();
    });
    await scrollLeft(c, 250);
    expect(tabStops(c)).toEqual([first]);
  });
});
