// @vitest-environment jsdom
// Print and Export: ⌘P prints the view (the years and rows on screen) on one page; Export offers PNG and SVG.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from '../test/app.tsx';

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

const OPEN = 'timeline=ancient-classical&inc=100&at=-1400';
/** jsdom lays nothing out: put the scroller on screen, and these lanes in it (the rest below it). */
function onScreen(c: HTMLElement, ids: string[]) {
  const box = (top: number, h: number) => () => ({ top, bottom: top + h, left: 0, right: 1600, width: 1600, height: h, x: 0, y: top, toJSON() {} }) as DOMRect;
  c.querySelector<HTMLElement>('.tl-scroller')!.getBoundingClientRect = box(100, 800);
  for (const el of c.querySelectorAll<HTMLElement>('.tl-lane[data-lane]')) el.getBoundingClientRect = ids.includes(el.dataset.lane!) ? box(200, 80) : box(2000, 80);
}

describe('print', () => {
  it('prints only the rows on screen, on one page, when the browser prints', () => {
    const { container } = renderApp(OPEN);
    expect(document.querySelector('.print-layer')).toBeNull(); // nothing until the browser prints
    onScreen(container, ['africa', 'egypt']);
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const pages = document.querySelectorAll('.print-layer .print-page');
    expect(pages.length).toBe(1);
    const rows = [...pages[0].querySelectorAll('text.p-row')].map((t) => t.textContent);
    expect(rows).toEqual(['Africa', 'Egypt and Nubia']);
    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(document.querySelector('.print-layer')).toBeNull();
  });
});

describe('export', () => {
  it('offers PNG and SVG in the timeline view, and not in the table', () => {
    renderApp(OPEN);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByRole('button', { name: 'Image (PNG)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Image (SVG)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.queryByText('Export')).toBeNull();
  });
});
