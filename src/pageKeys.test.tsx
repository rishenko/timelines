// @vitest-environment jsdom
// The chart's keys from anywhere on the page (timeline/usePageKeys.ts): real keydowns on document.body and on the
// chart's scroller (where a click on empty chart space leaves focus), not calls to the commands.
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import App from './App.tsx';
import { renderApp, SITE, SITE_DATASETS } from './test/app.tsx';
import { createCommandRegistry } from './commands/registry.ts';
import { CommandsContext } from './commands/CommandsContext.ts';

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

it('a key the reader rebound works from the page under its new key only, and a bare key bound to nothing does nothing', () => {
  const commands = createCommandRegistry();
  commands.setBindings({ 'chart.search': 'ctrl+k' });
  renderApp('timeline=ancient-classical', SITE_DATASETS, commands);
  const search = screen.getByRole('combobox', { name: /Search rows and events/ });
  press(document.body, '/');
  expect(document.activeElement).not.toBe(search);
  act(() => void fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true }));
  expect(document.activeElement).toBe(search);
  search.blur();
  const start = zoomOn();
  let taken = true;
  act(() => void (taken = !fireEvent.keyDown(document.body, { key: 'q' })));
  expect(taken).toBe(false);
  expect(zoomOn()).toBe(start);
  expect(chip()).toBe(null);
});

it('never takes Escape or Tab at the page level', () => {
  renderApp('timeline=ancient-classical');
  for (const key of ['Escape', 'Tab']) {
    let prevented = true;
    act(() => void (prevented = !fireEvent.keyDown(document.body, { key })));
    expect(prevented).toBe(false);
  }
});

it('adds one keydown listener on the document, and removes it on unmount, under StrictMode too', () => {
  const add = vi.spyOn(document, 'addEventListener');
  const remove = vi.spyOn(document, 'removeEventListener');
  const keydowns = (spy: typeof add) => spy.mock.calls.filter(([t]) => t === 'keydown').map(([, fn]) => fn);
  const r = render(
    <StrictMode>
      <CommandsContext.Provider value={createCommandRegistry()}>
        <App published={SITE_DATASETS[0]} site={SITE} />
      </CommandsContext.Provider>
    </StrictMode>,
  );
  const live = () => keydowns(add).filter((fn) => !keydowns(remove).includes(fn));
  expect(live().length).toBeGreaterThan(0);
  // a duplicate page listener would zoom two steps for one +
  const steps = [...screen.getByRole('group', { name: 'Years per tick' }).querySelectorAll('button')];
  const at = () => steps.findIndex((b) => b.classList.contains('on'));
  const start = at();
  press(document.body, '+');
  expect(Math.abs(at() - start)).toBe(1);
  const before = live().length;
  r.unmount();
  expect(live().length).toBeLessThan(before);
  expect(live()).toEqual(keydowns(add).filter((fn) => !keydowns(remove).includes(fn)));
  add.mockRestore();
  remove.mockRestore();
});

it('Y puts the cursor at the year under the pointer while it is over the chart, else at the view’s centre', async () => {
  renderApp('timeline=ancient-classical');
  const scroller = document.querySelector<HTMLElement>('.tl-scroller')!;
  // no pointer: the view's centre
  press(document.body, 'y');
  const centre = chip()!.textContent;
  press(chip()!, 'Escape');
  // the pointer over the chart, near its left: its year, not the centre's
  act(() => void fireEvent.pointerMove(scroller, { clientX: 400, pointerType: 'mouse' }));
  await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
  const under = chip()?.textContent;
  expect(under).toBeTruthy();
  expect(under).not.toBe(centre);
  press(document.body, 'y');
  expect(document.activeElement).toBe(chip());
  expect(chip()!.textContent).toBe(under);
});

it('runs a command once for one key, from a focused event and from the page', () => {
  const commands = createCommandRegistry();
  renderApp('timeline=ancient-classical', SITE_DATASETS, commands);
  let runs = 0;
  const off = commands.register({ id: 'test.count', label: 'Count', scope: 'chart', key: 'j', run: () => runs++ });
  act(() => document.querySelector<HTMLElement>('button.tl-mark[tabindex="0"]')!.focus());
  press(document.activeElement!, 'j');
  expect(runs).toBe(1);
  press(document.body, 'j');
  expect(runs).toBe(2);
  off();
});

it('a dialog keeps its keys: / or y from the Cite dialog’s Close button does nothing to the page', () => {
  renderApp('timeline=ancient-classical');
  act(() => void fireEvent.click(document.querySelector<HTMLButtonElement>('button.timeline-picker')!));
  act(() => void fireEvent.click(screen.getByRole('button', { name: 'Cite this timeline…' })));
  // (jsdom doesn't open a modal dialog, so it can't focus inside it; the keydown's target is what the rule reads)
  const close = document.querySelector<HTMLElement>('dialog.cite-dialog button')!;
  press(close, '/');
  expect(document.activeElement).not.toBe(screen.getByRole('combobox', { name: /Search rows and events/ }));
  press(close, 'y');
  expect(chip()).toBe(null);
});
