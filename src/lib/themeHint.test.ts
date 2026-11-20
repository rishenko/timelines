// @vitest-environment jsdom
// Theme hints: the theme a page opened with, so the next visit paints it before the timeline loads.
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET, rememberThemeHint, themeHint } from './theme.ts';

afterEach(() => localStorage.clear());

describe('theme hints', () => {
  it("remembers each ?timeline= value's theme, and '' for a page without one", () => {
    rememberThemeHint('classical', 'parchment');
    rememberThemeHint(null, 'parchment');
    expect(themeHint('classical')).toBe('parchment');
    expect(themeHint(null)).toBe('parchment');
    expect(themeHint('other')).toBeUndefined();
  });

  it('records the app default for a timeline without its own theme, and ignores unknown presets', () => {
    rememberThemeHint('a', undefined);
    rememberThemeHint('b', 'no-such-preset');
    expect([themeHint('a'), themeHint('b')]).toEqual([DEFAULT_PRESET, DEFAULT_PRESET]);
    localStorage.setItem('timelines:theme-hints', JSON.stringify({ c: 'no-such-preset' }));
    expect(themeHint('c')).toBeUndefined();
  });

  it('keeps only the most recent 20, and survives unreadable storage', () => {
    for (let i = 0; i < 25; i++) rememberThemeHint(`t${i}`, 'parchment');
    expect(themeHint('t4')).toBeUndefined();
    expect(themeHint('t5')).toBe('parchment');
    localStorage.setItem('timelines:theme-hints', '{oops');
    expect(themeHint('t5')).toBeUndefined();
    rememberThemeHint('t5', 'parchment');
    expect(themeHint('t5')).toBe('parchment');
  });
});
