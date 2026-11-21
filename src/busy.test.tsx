// @vitest-environment jsdom
// The busy ring: after a sideways scroll that will change which rows show, the chart is marked busy and the ring
// shows until the rows are updated; a scroll that changes nothing shows nothing.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';
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

const chart = () => document.getElementById('timeline')!;
/** jsdom has no layout, so the chart's scroll position is kept by hand. */
const scrollBy = (px: number) =>
  act(() => {
    const el = chart() as HTMLElement & { _left?: number };
    if (el._left === undefined) {
      el._left = el.scrollLeft;
      Object.defineProperty(el, 'scrollLeft', { configurable: true, get: () => el._left, set: (v: number) => (el._left = v) });
    }
    el.scrollLeft += px;
    fireEvent.scroll(el);
  });

describe('the busy ring', () => {
  it('shows while the rows are about to change after a sideways scroll, and goes once they have', async () => {
    renderApp('timeline=ancient-classical&inc=100&at=-3000');
    await waitFor(() => expect(chart().getAttribute('aria-busy')).toBe('false'));
    scrollBy(4000);
    // the view updates on the next animation frame; the rows wait 200 ms for scrolling to settle
    await waitFor(() => expect(document.querySelector('.tl-busy.rows')).toBeTruthy(), { interval: 20 });
    expect(chart().getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(chart().getAttribute('aria-busy')).toBe('false'), { timeout: 2000 });
    expect(document.querySelector('.tl-busy')).toBeNull();
  });

  it('stays hidden for a scroll that changes no rows', async () => {
    renderApp('timeline=ancient-classical&inc=100&at=-3000');
    await waitFor(() => expect(chart().getAttribute('aria-busy')).toBe('false'));
    scrollBy(1);
    await new Promise((r) => setTimeout(r, 60)); // past the animation frame that moves the view
    expect(document.querySelector('.tl-busy')).toBeNull();
  });
});
