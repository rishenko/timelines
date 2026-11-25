import { describe, expect, it, vi } from 'vitest';
import { createCommandRegistry, keyOf, type KeyEventLike } from './registry.ts';
import { cursorCommands } from '../plugins/bundled/cursor.ts';
import type { LayerApi } from '../plugins/layer.ts';

const ev = (key: string, m: Partial<KeyEventLike> = {}): KeyEventLike => ({ key, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...m });

describe('keyOf', () => {
  it('writes a printed character in lower case, with Shift already in it; other keys by name with their modifiers', () => {
    expect(keyOf(ev('Y', { shiftKey: true }))).toBe('y');
    expect(keyOf(ev('?', { shiftKey: true }))).toBe('?');
    expect(keyOf(ev('ArrowLeft', { shiftKey: true }))).toBe('shift+ArrowLeft');
    expect(keyOf(ev('k', { ctrlKey: true }))).toBe('ctrl+k');
    expect(keyOf(ev('Escape'))).toBe('Escape');
  });
});

describe('the command registry', () => {
  it('runs the command bound to a key in its scope only, with the context', () => {
    const r = createCommandRegistry();
    const run = vi.fn();
    r.register({ id: 'demo.go', label: 'Go', scope: 'chart', key: 'g', run });
    expect(r.dispatch(ev('g'), 'cursor')).toBe(false);
    expect(r.dispatch(ev('g', { ctrlKey: true }), 'chart')).toBe(false);
    expect(r.dispatch(ev('G', { shiftKey: true }), 'chart', { year: 1453 })).toBe(true);
    expect(run).toHaveBeenCalledWith({ year: 1453 });
  });

  it('answers to its other default keys too, until a reader binds it to one key', () => {
    const r = createCommandRegistry();
    const run = vi.fn();
    r.register({ id: 'chart.zoom-in', label: 'Zoom in', scope: 'chart', key: '+', also: ['='], run });
    r.register({ id: 'a.eq', label: 'Equals', scope: 'chart', key: '=', run() {} });
    expect(r.dispatch(ev('='), 'chart')).toBe(true);
    expect(r.keyFor('chart.zoom-in')).toBe('+');
    expect(r.notices()).toEqual(['"Equals" (a.eq) has no key: = is taken by chart.zoom-in.']);
    r.setBindings({ 'chart.zoom-in': 'i' });
    expect(r.dispatch(ev('+'), 'chart')).toBe(false);
    expect(r.keyFor('a.eq')).toBe('=');
    expect(r.dispatch(ev('i'), 'chart')).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('leaves a later command unbound when its key is taken, with a notice, and binds it once the holder goes', () => {
    const r = createCommandRegistry();
    const off = r.register({ id: 'a.one', label: 'One', scope: 'chart', key: 'p', run() {} });
    r.register({ id: 'b.two', label: 'Two', scope: 'chart', key: 'p', run() {} });
    r.register({ id: 'c.three', label: 'Three', scope: 'cursor', key: 'p', run() {} });
    expect(r.keyFor('a.one')).toBe('p');
    expect(r.keyFor('b.two')).toBeNull();
    expect(r.keyFor('c.three')).toBe('p'); // another scope
    expect(r.notices()).toEqual(['"Two" (b.two) has no key: p is taken by a.one.']);
    off();
    expect(r.keyFor('b.two')).toBe('p');
    expect(r.notices()).toEqual([]);
  });

  it("lets the reader's bindings win over defaults, and unbind with null", () => {
    const r = createCommandRegistry();
    r.register({ id: 'a.one', label: 'One', scope: 'chart', key: 'p', run() {} });
    r.register({ id: 'b.two', label: 'Two', scope: 'chart', key: 'q', run() {} });
    expect(r.setBindings({ 'b.two': 'p', 'a.one': null })).toEqual([]);
    expect(r.keyFor('b.two')).toBe('p');
    expect(r.keyFor('a.one')).toBeNull();
    r.setBindings({ 'b.two': 'p' });
    expect(r.keyFor('b.two')).toBe('p');
    expect(r.keyFor('a.one')).toBeNull(); // the reader's binding took its default key
    expect(r.notices()).toEqual(['"One" (a.one) has no key: p is taken by b.two.']);
  });

  it('refuses to bind Escape or Tab, or to move a command off them (WCAG 2.1.1, 2.1.2)', () => {
    const r = createCommandRegistry();
    r.register({ id: 'a.close', label: 'Close', scope: 'cursor', key: 'Escape', run() {} });
    r.register({ id: 'a.other', label: 'Other', scope: 'chart', key: 'o', run() {} });
    expect(r.setBindings({ 'a.close': 'x', 'a.other': 'shift+Tab' })).toEqual([
      'a.close keeps Escape: it always moves focus or exits.',
      "shift+Tab can't be given to a.other: it always moves focus or exits.",
    ]);
    expect(r.keyFor('a.close')).toBe('Escape');
    expect(r.keyFor('a.other')).toBe('o');
  });

  it('wants ids as <owner>.<name>, once each, and lists commands with their owner and key', () => {
    const r = createCommandRegistry();
    expect(() => r.register({ id: 'nodot', label: 'x', scope: 'chart', run() {} })).toThrow(/<owner>\.<name>/);
    r.register({ id: 'a.one', label: 'One', scope: 'chart', key: 'p', run() {} });
    expect(r.list()).toEqual([{ id: 'a.one', owner: 'a', label: 'One', scope: 'chart', key: 'p' }]);
  });

  it("lets the same id again stand in for the first until its off() (a second chart's layer)", () => {
    const r = createCommandRegistry();
    const first = vi.fn();
    const second = vi.fn();
    const off1 = r.register({ id: 'cursor.place', label: 'Place', scope: 'chart', key: 'y', run: first });
    const off2 = r.register({ id: 'cursor.place', label: 'Place', scope: 'chart', key: 'y', run: second });
    expect(r.list()).toHaveLength(1);
    r.dispatch(ev('y'), 'chart');
    expect(second).toHaveBeenCalledTimes(1);
    off2();
    r.dispatch(ev('y'), 'chart');
    expect(first).toHaveBeenCalledTimes(1);
    expect(r.notices()).toEqual([]);
    off1();
    expect(r.list()).toEqual([]);
    // an older one going first leaves the newest in place
    const offA = r.register({ id: 'x.go', label: 'Go', scope: 'chart', key: 'g', run: first });
    r.register({ id: 'x.go', label: 'Go', scope: 'chart', key: 'g', run: second });
    offA();
    r.dispatch(ev('g'), 'chart');
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('tells subscribers when commands or bindings change', () => {
    const r = createCommandRegistry();
    const fn = vi.fn();
    const unsub = r.subscribe(fn);
    const off = r.register({ id: 'a.one', label: 'One', scope: 'chart', key: 'p', run() {} });
    r.setBindings({});
    off();
    expect(fn).toHaveBeenCalledTimes(3);
    unsub();
    r.register({ id: 'a.two', label: 'Two', scope: 'chart', run() {} });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("the year cursor's commands", () => {
  it('registers Y on the chart and the chip keys through the layer api, and goes away with off()', () => {
    const r = createCommandRegistry();
    let at: { year: number; keyboard: boolean } | null = null;
    const set = vi.fn((year: number | null, keyboard = false) => (at = year === null ? null : { year, keyboard }));
    const command: LayerApi['command'] = (id, label, run, o) => r.register({ id, label, run, scope: o.scope, key: o.key });
    const api = {
      command,
      cursor: { get: () => at, set, subscribe: () => () => {} },
      scale: { step: 50 },
    } as unknown as LayerApi;
    const offs = cursorCommands(api);
    expect(r.list().map((c) => [c.id, c.scope, c.key])).toEqual([
      ['cursor.place', 'chart', 'y'],
      ['cursor.step-back', 'cursor', 'ArrowLeft'],
      ['cursor.step-forward', 'cursor', 'ArrowRight'],
      ['cursor.step-back-fine', 'cursor', 'shift+ArrowLeft'],
      ['cursor.step-forward-fine', 'cursor', 'shift+ArrowRight'],
      ['cursor.close', 'cursor', 'Escape'],
    ]);
    r.dispatch(ev('y'), 'chart', { year: 1066 });
    expect(set).toHaveBeenLastCalledWith(1066, true);
    r.dispatch(ev('ArrowRight', { shiftKey: true }), 'cursor');
    expect(set).toHaveBeenLastCalledWith(1071, true);
    r.dispatch(ev('ArrowLeft'), 'cursor');
    expect(set).toHaveBeenLastCalledWith(1021, true);
    r.dispatch(ev('Escape'), 'cursor');
    expect(set).toHaveBeenLastCalledWith(null);
    offs.forEach((off) => off());
    expect(r.list()).toEqual([]);
  });
});
