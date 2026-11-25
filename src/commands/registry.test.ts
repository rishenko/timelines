import { describe, expect, it, vi } from 'vitest';
import { createCommandRegistry, keyOf, type KeyEventLike } from './registry.ts';
import { registerCursorCommands } from '../cursor/cursorCommands.ts';

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
    expect(() => r.register({ id: 'a.one', label: 'Again', scope: 'chart', run() {} })).toThrow(/already/);
    expect(r.list()).toEqual([{ id: 'a.one', owner: 'a', label: 'One', scope: 'chart', key: 'p' }]);
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
  it('registers Y on the chart and the chip keys, reads the latest actions, and goes away with off()', () => {
    const r = createCommandRegistry();
    const a = { place: vi.fn(), step: vi.fn(), close: vi.fn() };
    const off = registerCursorCommands(r, () => a);
    expect(r.list().map((c) => [c.id, c.scope, c.key])).toEqual([
      ['cursor.place', 'chart', 'y'],
      ['cursor.step-back', 'cursor', 'ArrowLeft'],
      ['cursor.step-forward', 'cursor', 'ArrowRight'],
      ['cursor.step-back-fine', 'cursor', 'shift+ArrowLeft'],
      ['cursor.step-forward-fine', 'cursor', 'shift+ArrowRight'],
      ['cursor.close', 'cursor', 'Escape'],
    ]);
    r.dispatch(ev('y'), 'chart', { year: 1066 });
    r.dispatch(ev('ArrowRight', { shiftKey: true }), 'cursor');
    r.dispatch(ev('Escape'), 'cursor');
    expect(a.place).toHaveBeenCalledWith(1066);
    expect(a.step).toHaveBeenCalledWith(1, true);
    expect(a.close).toHaveBeenCalled();
    off();
    expect(r.list()).toEqual([]);
  });
});
