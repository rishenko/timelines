/**
 * App color theme. The user-facing colors map to CSS custom properties on
 * :root; every other shade in index.css is derived from them with
 * color-mix(), so a custom theme never leaves stray hard-coded colors behind.
 */

export interface ThemeColors {
  bg: string;
  panel: string;
  control: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  focus: string;
  link: string;
  danger: string;
  ok: string;
}

export type ThemeKey = keyof ThemeColors;

export const THEME_FIELDS: { key: ThemeKey; label: string; hint: string }[] = [
  { key: 'bg', label: 'Background', hint: 'Timeline and page background' },
  { key: 'panel', label: 'Panels', hint: 'Toolbar, side panel, lane labels, ruler' },
  { key: 'control', label: 'Controls', hint: 'Buttons and inputs' },
  { key: 'line', label: 'Borders', hint: 'Lane dividers and outlines' },
  { key: 'text', label: 'Text', hint: 'Main text' },
  { key: 'muted', label: 'Muted text', hint: 'Year labels, hints, secondary text' },
  { key: 'accent', label: 'Accent', hint: 'Selected increment, primary buttons, edit mode, year 0' },
  { key: 'focus', label: 'Highlight', hint: 'Selected event and the threads connected to it' },
  { key: 'link', label: 'Links', hint: 'Hyperlinks and connection arrows' },
  { key: 'danger', label: 'Danger', hint: 'Delete buttons and errors' },
  { key: 'ok', label: 'Success', hint: 'Edited badges and confirmations' },
];

const VAR: Record<ThemeKey, string> = {
  bg: '--bg',
  panel: '--bg-2',
  control: '--bg-3',
  line: '--line',
  text: '--text',
  muted: '--muted',
  accent: '--accent',
  focus: '--focus',
  link: '--link',
  danger: '--danger',
  ok: '--ok',
};

export const PRESETS: Record<string, { label: string; colors: ThemeColors }> = {
  dark: {
    label: 'Dark',
    colors: {
      bg: '#0f1216',
      panel: '#161a20',
      control: '#1e232b',
      line: '#2a313b',
      text: '#e3e7ec',
      muted: '#8b95a3',
      accent: '#e0583a',
      focus: '#ffd166',
      link: '#8ab4ff',
      danger: '#e5484d',
      ok: '#46a758',
    },
  },
  light: {
    label: 'Light',
    colors: {
      bg: '#f7f8fa',
      panel: '#eceff3',
      control: '#ffffff',
      line: '#d5dae1',
      text: '#1b1f24',
      muted: '#5d6773',
      accent: '#c4441f',
      focus: '#b7791f',
      link: '#2b63d9',
      danger: '#c62a2f',
      ok: '#2f855a',
    },
  },
  parchment: {
    label: 'Parchment',
    colors: {
      bg: '#f3ead8',
      panel: '#e8dcc3',
      control: '#fbf6ea',
      line: '#cdbb98',
      text: '#2e2416',
      muted: '#6e5c42',
      accent: '#8c3b1f',
      focus: '#a8710f',
      link: '#2f5a8a',
      danger: '#a1262b',
      ok: '#4d7a32',
    },
  },
  contrast: {
    label: 'High contrast',
    colors: {
      bg: '#000000',
      panel: '#0b0b0b',
      control: '#161616',
      line: '#5c5c5c',
      text: '#ffffff',
      muted: '#c8c8c8',
      accent: '#ff7a1a',
      focus: '#ffee00',
      link: '#66b3ff',
      danger: '#ff5c5c',
      ok: '#4ade80',
    },
  },
};

export const DEFAULT_PRESET = 'dark';

export interface ThemeSetting {
  /** Preset the colors started from; "custom" once any color is changed. */
  preset: string;
  colors: ThemeColors;
}

const HEX = /^#[0-9a-f]{6}$/i;
const STORAGE_KEY = 'timeline:theme';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function themeMode(colors: ThemeColors): 'dark' | 'light' {
  return luminance(colors.bg) < 0.4 ? 'dark' : 'light';
}

/** Readable text color (near-black or white) for a filled background. */
export function onColor(hex: string): string {
  return contrast(hex, '#ffffff') >= contrast(hex, '#111111') ? '#ffffff' : '#111111';
}

/** Pairs that should stay readable; returns human-readable warnings. */
export function readabilityWarnings(c: ThemeColors): string[] {
  const out: string[] = [];
  const check = (fg: string, bg: string, label: string, min: number) => {
    const r = contrast(fg, bg);
    if (r < min) out.push(`${label} is hard to read (contrast ${r.toFixed(1)}:1, aim for ${min}:1).`);
  };
  check(c.text, c.bg, 'Text on the background', 4.5);
  check(c.text, c.panel, 'Text on panels', 4.5);
  check(c.muted, c.bg, 'Muted text on the background', 3);
  check(c.link, c.panel, 'Links on panels', 3);
  check(c.focus, c.bg, 'The highlight color on the background', 2);
  return out;
}

/** Fills missing or invalid colors from the default preset. */
export function sanitize(input: unknown): ThemeSetting {
  const fallback = PRESETS[DEFAULT_PRESET].colors;
  if (!input || typeof input !== 'object') return { preset: DEFAULT_PRESET, colors: { ...fallback } };
  const raw = input as Partial<ThemeSetting>;
  const colors = { ...fallback };
  for (const { key } of THEME_FIELDS) {
    const v = raw.colors?.[key];
    if (typeof v === 'string' && HEX.test(v)) colors[key] = v.toLowerCase();
  }
  const preset = typeof raw.preset === 'string' && (raw.preset in PRESETS || raw.preset === 'custom') ? raw.preset : 'custom';
  return { preset, colors };
}

/** The reader's saved theme, else the timeline's default preset, else the app default. */
export function loadTheme(timelineDefault?: string): ThemeSetting {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    // unreadable setting: use the default
  }
  const preset = timelineDefault && PRESETS[timelineDefault] ? timelineDefault : DEFAULT_PRESET;
  return { preset, colors: { ...PRESETS[preset].colors } };
}

/** Forgets the reader's choice, so each timeline's own default applies again. */
export function clearTheme() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage disabled
  }
}

export function saveTheme(t: ThemeSetting) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    // storage full or disabled: the theme still applies for this visit
  }
}

/** Applies the colors to :root, plus derived values that need JS (mode, on-accent text). */
export function applyTheme(c: ThemeColors, root: HTMLElement = document.documentElement) {
  for (const { key } of THEME_FIELDS) root.style.setProperty(VAR[key], c[key]);
  const mode = themeMode(c);
  root.dataset.mode = mode;
  root.style.setProperty('--on-accent', onColor(c.accent));
  root.style.setProperty('--on-danger', onColor(c.danger));
  root.style.setProperty('--on-ok', onColor(c.ok));
  root.style.colorScheme = mode;
}
