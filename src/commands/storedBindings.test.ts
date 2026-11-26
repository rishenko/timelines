// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { createCommandRegistry } from './registry.ts';
import { keepBindings, loadBindings } from './storedBindings.ts';

const KEY = 'timelines:key-bindings';
afterEach(() => localStorage.clear());

it('loads only id → key or null, and nothing from bad storage', () => {
  localStorage.setItem(KEY, JSON.stringify({ 'chart.search': 'ctrl+k', 'cursor.place': null, bad: 3 }));
  expect(loadBindings()).toEqual({ 'chart.search': 'ctrl+k', 'cursor.place': null });
  for (const v of ['nope', '[1]', 'null']) {
    localStorage.setItem(KEY, v);
    expect(loadBindings()).toEqual({});
  }
});

it('applies the saved bindings and saves each change, keeping those of commands not registered now', () => {
  localStorage.setItem(KEY, JSON.stringify({ 'chart.search': 'ctrl+k' }));
  const r = createCommandRegistry();
  const off = keepBindings(r);
  r.register({ id: 'cursor.place', label: 'Place', scope: 'chart', key: 'y', run() {} });
  expect(r.bind('cursor.place', 'u')).toBe(null);
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ 'chart.search': 'ctrl+k', 'cursor.place': 'u' });
  r.reset('cursor.place');
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ 'chart.search': 'ctrl+k' });
  off();
});
