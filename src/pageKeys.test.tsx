// @vitest-environment jsdom
// The chart's keys from anywhere on the page (timeline/usePageKeys.ts): real keydowns on document.body and on the
// chart's scroller (where a click on empty chart space leaves focus), not calls to the commands.
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
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

const chip = () => document.querySelector<HTMLElement>('.tl-cursor-chip');
const press = (el: Element, key: string, mods: { shiftKey?: boolean } = {}) => act(() => void fireEvent.keyDown(el, { key, ...mods }));
const zoomOn = () => screen.getByRole('group', { name: 'Years per tick' }).querySelector('.on')?.textContent;

for (const where of ['body', 'scroller'] as const) {
  it(`Y, then the cursor's keys and Escape, work with focus on the ${where}`, () => {
    renderApp('timeline=ancient-classical');
    const target = where === 'body' ? document.body : document.querySelector<HTMLElement>('.tl-scroller')!;
    act(() => target.focus());
    press(document.activeElement ?? document.body, 'y');
    expect(chip()?.isConnected).toBe(true);
    expect(document.activeElement).toBe(chip());
    const at = chip()!.textContent;
    press(chip()!, 'ArrowRight', { shiftKey: true });
    expect(chip()!.textContent).not.toBe(at);
    press(chip()!, 'ArrowLeft', { shiftKey: true });
    expect(chip()!.textContent).toBe(at);
    press(chip()!, 'Escape');
    expect(chip()?.isConnected ?? false).toBe(false);
  });
}

it('+ from the page zooms one step, not two (a key the chart took isn’t run again)', () => {
  renderApp('timeline=ancient-classical');
  const start = zoomOn();
  press(document.body, '+');
  const once = zoomOn();
  expect(once).not.toBe(start);
  press(document.body, '-');
  expect(zoomOn()).toBe(start);
  // from a focused event, the chart's own handler runs it; the page's doesn't run it again
  act(() => document.querySelector<HTMLElement>('button.tl-mark[tabindex="0"]')!.focus());
  press(document.activeElement!, '+');
  expect(zoomOn()).toBe(once);
});

it('a text field keeps its keys: typing y or / in the search box is typing', () => {
  renderApp('timeline=ancient-classical');
  const search = screen.getByRole('combobox', { name: /Search rows and events/ });
  act(() => search.focus());
  press(search, 'y');
  press(search, '/');
  expect(chip()).toBe(null);
  expect(document.activeElement).toBe(search);
});
