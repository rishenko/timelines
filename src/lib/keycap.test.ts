// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { keycap, keyLabel, keySpoken } from './keycap.ts';

it('shows a binding as a keycap does, and says it in words', () => {
  expect(['shift+ArrowLeft', 'ctrl+k', 'y', '+', 'ctrl++', '-', 'Escape', 'alt+shift+ArrowUp'].map(keyLabel)).toEqual(['Shift+←', 'Ctrl+K', 'Y', '+', 'Ctrl++', '−', 'Esc', 'Alt+Shift+↑']);
  expect(['shift+ArrowRight', 'ctrl+k', '?', 'ctrl++', 'PageDown'].map(keySpoken)).toEqual(['Shift plus Arrow Right', 'Control plus K', 'question mark', 'Control plus plus', 'Page Down']);
});

it('builds a keycap whose shown text is hidden from screen readers and whose spoken text is not', () => {
  const k = keycap('shift+ArrowRight');
  expect(k.tagName).toBe('KBD');
  expect(k.querySelector('[aria-hidden="true"]')!.textContent).toBe('Shift+→');
  expect(k.querySelector('.sr-only')!.textContent).toBe('Shift plus Arrow Right');
});
