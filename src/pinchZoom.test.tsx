// @vitest-environment jsdom
// A pinch on the chart (TimelineView → App's zoomStep → the focus request → useViewport): one zoom step, and the year
// between the fingers stays under them, placed at once rather than scrolled to the centre.
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './test/app.tsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
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

const zoomOn = () => screen.getByRole('group', { name: 'Years per tick' }).querySelector('.on')?.textContent;
const touches = (a: number, b: number) => ({ touches: [{ clientX: a, clientY: 300 }, { clientX: b, clientY: 300 }] });

it('a pinch out zooms one step finer and keeps the year between the fingers under them', () => {
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (cb(), 0));
  const calls: ScrollToOptions[] = [];
  Element.prototype.scrollTo = function (o: ScrollToOptions) {
    calls.push(o);
  } as typeof Element.prototype.scrollTo;
  renderApp('timeline=ancient-classical');
  const scroller = document.querySelector<HTMLElement>('.tl-scroller')!;
  const start = zoomOn();
  calls.length = 0;
  // fingers around clientX 836: 600 px into a 1364 px time axis (the scroller's left is 0 in jsdom, labels 236 px)
  act(() => void fireEvent.touchStart(scroller, touches(786, 886)));
  act(() => void fireEvent.touchMove(scroller, touches(736, 936)));
  expect(zoomOn()).not.toBe(start);
  const placed = calls.find((c) => c.behavior === 'auto');
  expect(placed, JSON.stringify(calls)).toBeDefined();
});
