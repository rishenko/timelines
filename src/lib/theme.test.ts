// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyTheme, contrast, onColor, PRESETS, readabilityWarnings, sanitize, themeMode, THEME_FIELDS } from './theme.ts';

describe('theme', () => {
  it('every preset defines every color as 6-digit hex', () => {
    for (const p of Object.values(PRESETS))
      for (const { key } of THEME_FIELDS) expect(p.colors[key]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('every preset is readable', () => {
    for (const [name, p] of Object.entries(PRESETS)) expect(readabilityWarnings(p.colors), name).toEqual([]);
  });

  it('detects light and dark modes from the background', () => {
    expect(themeMode(PRESETS.dark.colors)).toBe('dark');
    expect(themeMode(PRESETS.light.colors)).toBe('light');
    expect(themeMode(PRESETS.parchment.colors)).toBe('light');
  });

  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(onColor('#ffd166')).toBe('#111111');
    expect(onColor('#1b1f24')).toBe('#ffffff');
  });

  it('warns about unreadable custom colors', () => {
    const w = readabilityWarnings({ ...PRESETS.dark.colors, text: '#1a1d22' });
    expect(w.join()).toMatch(/Text on the background/);
  });

  it('sanitizes stored settings', () => {
    expect(sanitize(null).colors).toEqual(PRESETS.dark.colors);
    const s = sanitize({ preset: 'bogus', colors: { bg: '#ABCDEF', text: 'red', accent: 42 } });
    expect(s.colors.bg).toBe('#abcdef');
    expect(s.colors.text).toBe(PRESETS.dark.colors.text);
    expect(s.colors.accent).toBe(PRESETS.dark.colors.accent);
    expect(s.preset).toBe('custom');
  });

  it('gives a saved preset its current colours, so a retune reaches readers who chose it', () => {
    const old = { ...PRESETS.parchment.colors, bg: '#f3ead8', line: '#cdbb98' };
    expect(sanitize({ preset: 'parchment', colors: old }).colors).toEqual(PRESETS.parchment.colors);
    // a customised theme keeps its own colours
    expect(sanitize({ preset: 'custom', colors: old }).colors.bg).toBe('#f3ead8');
  });

  it('marks the page with the preset its colours are, for preset-only CSS', () => {
    const root = document.createElement('div');
    applyTheme(PRESETS.parchment.colors, root);
    expect(root.dataset.preset).toBe('parchment');
    applyTheme({ ...PRESETS.parchment.colors, accent: '#123456' }, root);
    expect(root.dataset.preset).toBe('custom');
  });
});
