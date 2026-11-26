// @vitest-environment jsdom
// Tools (plugin design §3) and the Keys tool (§4): the panel binds through the core, a binding of the chart's own keys
// outlives table view (where the chart's commands aren't registered), and a tool hears null before the next chart's api.
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderApp, SITE_DATASETS } from './test/app.tsx';
import { createCommandRegistry } from './commands/registry.ts';
import { createChartApiStore } from './plugins/chartApi.ts';
import type { LayerApi } from './plugins/layer.ts';

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

function open() {
  const commands = createCommandRegistry();
  const charts = createChartApiStore();
  renderApp('timeline=ancient-classical', SITE_DATASETS, commands, charts);
  return { commands, charts };
}
const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole('button', { name })));
const panelStatus = () => within(screen.getByRole('region', { name: 'Keys' })).getByRole('status');
const view = (name: 'Table' | 'Timeline') => act(() => fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent === name)!));

it('binds a key with a modifier through the Keys panel, and Escape there cancels', () => {
  const { commands } = open();
  click('Keys');
  click('Change the key for Move to the search box');
  const change = screen.getByRole('button', { name: 'Change the key for Move to the search box' });
  expect(document.activeElement).toBe(change);
  act(() => fireEvent.keyDown(change, { key: 'Control', ctrlKey: true }));
  act(() => fireEvent.keyDown(change, { key: 'k', ctrlKey: true }));
  expect(commands.keyFor('chart.search')).toBe('ctrl+k');
  expect(panelStatus().textContent).toBe('Move to the search box: Ctrl+K.');
  click('Change the key for Zoom in on the focused event');
  act(() => fireEvent.keyDown(screen.getByRole('button', { name: 'Change the key for Zoom in on the focused event' }), { key: 'Escape' }));
  expect(commands.keyFor('chart.zoom-in')).toBe('+');
  // the panel stays open after a cancel; Escape again closes it
  expect(screen.getByRole('region', { name: 'Keys' })).toBeTruthy();
});

it('refuses a key another command holds, and says so', () => {
  const { commands } = open();
  click('Keys');
  click('Change the key for Move to the search box');
  act(() => fireEvent.keyDown(screen.getByRole('button', { name: 'Change the key for Move to the search box' }), { key: '+' }));
  expect(panelStatus().textContent).toMatch(/\+ is taken by "Zoom in on the focused event"/);
  expect(commands.keyFor('chart.search')).toBe('/');
  // Escape and Tab keep their jobs: the cursor's Escape has no buttons
  expect(screen.queryByRole('button', { name: /Put the year cursor away/ })).toBe(null);
});

it("keeps a binding of the chart's keys through table view, where the panel still opens", () => {
  const { commands } = open();
  expect(commands.bind('chart.search', 'ctrl+k')).toBe(null);
  view('Table');
  expect(commands.keyFor('chart.search')).toBe(null);
  click('Keys');
  const note = screen.getByText('The chart’s own keys are listed while the chart is showing.');
  view('Timeline');
  expect(commands.keyFor('chart.search')).toBe('ctrl+k');
  // the open panel heard the new chart: the note is gone and the chart's keys are listed with the reader's binding
  expect(note.textContent).toBe('');
  expect(within(screen.getByRole('region', { name: 'Keys' })).getByText('Ctrl+K')).toBeTruthy();
});

it('a tool hears null, then the next chart’s api, which works', () => {
  const { charts } = open();
  const first = charts.get();
  expect(first).not.toBe(null);
  const heard: (LayerApi | null)[] = [];
  const off = charts.subscribe((api) => heard.push(api));
  view('Table');
  view('Timeline');
  off();
  expect(heard.length).toBe(2);
  expect(heard[0]).toBe(null);
  expect(heard[1]).not.toBe(first);
  expect(heard[1]!.formatYear(-499)).toBe('500 BCE');
});

it("the legend's Keyboard list shows the reader's key, or no key", () => {
  const { commands } = open();
  click(/^Legend/);
  // what a sighted reader sees (each keycap's shown text, or "no key"), and what a screen reader hears
  const item = (title: string) => screen.getByText(title, { selector: 'strong' }).closest('.lg-item')!.querySelector('.lg-sample')!;
  const sample = (title: string) => [...item(title).querySelectorAll('[aria-hidden="true"], .lg-nokey')].map((e) => e.textContent).join('');
  const spoken = (title: string) => [...item(title).querySelectorAll('.sr-only')].map((e) => e.textContent).join(', ');
  expect(sample('Search')).toBe('/');
  act(() => void commands.bind('chart.search', 'ctrl+k'));
  expect(sample('Search')).toBe('Ctrl+K');
  expect(spoken('Search')).toBe('Control plus K');
  act(() => void commands.bind('chart.search', null));
  expect(sample('Search')).toBe('no key');
  expect(sample('Zoom')).toBe('+−');
  expect(spoken('Zoom')).toBe('plus, minus');
  expect(spoken('Year cursor')).toBe('Y');
});

it("the year cursor's hint and the search box's tooltip name the reader's keys", () => {
  const commands = createCommandRegistry();
  commands.setBindings({ 'cursor.place': 'u', 'chart.search': 'ctrl+k' });
  renderApp('timeline=ancient-classical', SITE_DATASETS, commands);
  const hint = document.querySelector('.cur-none')!;
  expect(hint.querySelector('kbd.keycap [aria-hidden="true"]')!.textContent).toBe('U');
  expect(hint.querySelector('kbd.keycap .sr-only')!.textContent).toBe('U');
  expect(screen.getByRole('combobox', { name: /Search rows and events/ }).title).toMatch(/Ctrl\+K comes here from anywhere but a text field\.$/);
});

it('keeps keyboard focus in the Keys panel after each action (WCAG 2.4.3)', () => {
  open();
  click('Keys');
  const btn = (name: string) => screen.getByRole('button', { name });
  const focused = () => (document.activeElement as HTMLElement).getAttribute('aria-label');
  // Change, then a new key: back on the row's Change
  act(() => btn('Change the key for Move to the search box').focus());
  act(() => fireEvent.click(document.activeElement!));
  act(() => fireEvent.keyDown(document.activeElement!, { key: 'k', ctrlKey: true }));
  expect(focused()).toBe('Change the key for Move to the search box');
  // Change, then Escape: still there, and the panel stays open
  act(() => fireEvent.click(document.activeElement!));
  act(() => fireEvent.keyDown(document.activeElement!, { key: 'Escape' }));
  expect(focused()).toBe('Change the key for Move to the search box');
  // Default: now disabled, so focus moves to the row's Change
  act(() => btn('Default key for Move to the search box').focus());
  act(() => fireEvent.click(document.activeElement!));
  expect(focused()).toBe('Change the key for Move to the search box');
  // Unbind: disabled after unbinding, so the row's Change too
  act(() => btn('Unbind Move to the search box').focus());
  act(() => fireEvent.click(document.activeElement!));
  expect(focused()).toBe('Change the key for Move to the search box');
  expect(screen.getByRole('region', { name: 'Keys' })).toBeTruthy();
});

it("the chart's keys work from the open Keys panel, except while it waits for a new key", () => {
  open();
  click('Keys');
  const row = screen.getByRole('button', { name: 'Default key for Move to the search box' });
  act(() => screen.getByRole('button', { name: 'Unbind Move to the search box' }).focus());
  const chip = () => document.querySelector<HTMLElement>('.tl-cursor-chip');
  // Y places the year cursor (at the view's centre) and focuses its chip
  act(() => void fireEvent.keyDown(document.activeElement!, { key: 'y' }));
  expect(chip()?.isConnected).toBe(true);
  expect(document.activeElement).toBe(chip());
  const at = chip()!.textContent;
  // the cursor's own keys: Shift+→ a tenth of a step, Shift+← back
  act(() => void fireEvent.keyDown(chip()!, { key: 'ArrowRight', shiftKey: true }));
  expect(chip()!.textContent).not.toBe(at);
  act(() => void fireEvent.keyDown(chip()!, { key: 'ArrowLeft', shiftKey: true }));
  expect(chip()!.textContent).toBe(at);
  // Escape puts it away and gives focus back to the panel's button
  act(() => void fireEvent.keyDown(chip()!, { key: 'Escape' }));
  expect(chip()?.isConnected ?? false).toBe(false);
  expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Unbind Move to the search box');
  expect(row).toBeTruthy();
  // while ✎ waits for a key, Y is the new key (refused here: Y is taken), not a command
  click('Change the key for Move to the search box');
  act(() => void fireEvent.keyDown(document.activeElement!, { key: 'y' }));
  expect(chip()?.isConnected ?? false).toBe(false);
  expect(within(screen.getByRole('region', { name: 'Keys' })).getByRole('status').textContent).toMatch(/is taken by "Place the year cursor"/);
});
