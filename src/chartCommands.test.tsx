// @vitest-environment jsdom
// The chart's own keys as commands (plugin design, split step 4): + and = zoom in, − and _ zoom out, / moves to the
// search box, ? opens the keys. a11y.test.tsx pins + ? and / as they were before the move; this pins the rest, and that
// a reader's binding (with a modifier, which the chart used to drop) takes the key over.
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp, SITE_DATASETS } from './test/app.tsx';
import { createCommandRegistry } from './commands/registry.ts';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

function open() {
  const commands = createCommandRegistry();
  const { container } = renderApp('timeline=ancient-classical', SITE_DATASETS, commands);
  container.querySelector<HTMLElement>('.tl-mark[tabindex="0"]')!.focus();
  return commands;
}
/** Presses a key on the focused control; true if the chart took it (prevented the default). */
const press = async (key: string, mods: { ctrlKey?: boolean; shiftKey?: boolean } = {}) => {
  let taken = false;
  await act(async () => {
    taken = !fireEvent.keyDown(document.activeElement!, { key, ...mods });
  });
  return taken;
};
const zoomOn = () => screen.getByRole('group', { name: 'Years per tick' }).querySelector('.on')?.textContent;

it('lists the chart keys as commands, with their default keys', () => {
  const commands = open();
  const chart = commands.list().filter((c) => c.owner === 'chart');
  expect(chart.map((c) => [c.id, c.key])).toEqual([
    ['chart.zoom-in', '+'],
    ['chart.zoom-out', '-'],
    ['chart.search', '/'],
    ['chart.keys', '?'],
  ]);
  expect(commands.notices()).toEqual([]);
});

it('zooms in with = as with +, and out with _ as with −; Ctrl with them is left to the browser', async () => {
  open();
  const start = zoomOn();
  expect(await press('=')).toBe(true);
  const zoomedIn = zoomOn();
  expect(zoomedIn).not.toBe(start);
  expect(document.activeElement?.closest('.tl-lanes')).toBeTruthy();
  expect(await press('_', { shiftKey: true })).toBe(true);
  expect(zoomOn()).toBe(start);
  expect(await press('=', { ctrlKey: true })).toBe(false); // the browser's own zoom
  expect(zoomOn()).toBe(start);
});

it("moves a key to the reader's binding, with a modifier: search on Ctrl+K, and / then does nothing", async () => {
  const commands = open();
  const mark = document.activeElement;
  expect(commands.setBindings({ 'chart.search': 'ctrl+k' })).toEqual([]);
  expect(await press('/')).toBe(false);
  expect(document.activeElement).toBe(mark);
  expect(await press('k', { ctrlKey: true })).toBe(true);
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: /^Search rows and events/ }));
});
