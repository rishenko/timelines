// @vitest-environment jsdom
// The chart re-measures its width when it changes without the window resizing (a side panel opening beside it), so
// everything sized from the view, the overview strip's outline among them, follows (WCAG 2.5.8: the outline used to run
// under the side panel's Close button).
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, screen } from '@testing-library/react';
import { renderApp } from '../test/app.tsx';

const observers: ResizeObserverCallback[] = [];
let width = 1600;
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  observers.length = 0;
  width = 1600;
});
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      observers.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

describe('the chart narrowing without a window resize', () => {
  it('shrinks the overview outline with it', () => {
    renderApp('timeline=ancient-classical&inc=100&at=-1400');
    const outline = screen.getByRole('slider', { name: 'Years in view' });
    const before = parseFloat(outline.style.width);
    width = 900; // a side panel takes 700 px
    act(() => observers.forEach((cb) => cb([], {} as ResizeObserver)));
    expect(parseFloat(outline.style.width)).toBeLessThan(before * 0.6);
  });
});
