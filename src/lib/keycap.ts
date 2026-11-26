/**
 * Keys as the app shows them (Kevin, 2026-11-25: one keycap wherever a key appears). A binding as `keyOf` writes it
 * ("shift+ArrowLeft", "ctrl+k", "y", "+") is shown as Shift+←, Ctrl+K, Y, + and spoken as "Shift plus Arrow Left".
 * `keycap()` builds the element for plain-DOM code (the Keys tool, the year cursor's hint); components/Keycap.tsx is
 * the same for React.
 */
const SHOWN: Record<string, string> = { ctrl: 'Ctrl', alt: 'Alt', meta: 'Meta', shift: 'Shift', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ' ': 'Space', '-': '−', PageUp: 'PgUp', PageDown: 'PgDn', Escape: 'Esc' };
const SPOKEN: Record<string, string> = {
  ctrl: 'Control', alt: 'Alt', meta: 'Command', shift: 'Shift', ArrowLeft: 'Arrow Left', ArrowRight: 'Arrow Right', ArrowUp: 'Arrow Up',
  ArrowDown: 'Arrow Down', ' ': 'Space', '+': 'plus', '-': 'minus', '=': 'equals', '/': 'slash', '?': 'question mark', PageUp: 'Page Up', PageDown: 'Page Down',
};

/** The modifiers, then the key ("ctrl++" is Ctrl and +). */
function parts(key: string): string[] {
  const out: string[] = [];
  let rest = key;
  for (let m = /^(ctrl|alt|meta|shift)\+(.+)$/.exec(rest); m; m = /^(ctrl|alt|meta|shift)\+(.+)$/.exec(rest)) {
    out.push(m[1]);
    rest = m[2];
  }
  return [...out, rest];
}

export const keyLabel = (key: string) => parts(key).map((p) => SHOWN[p] ?? (p.length === 1 ? p.toUpperCase() : p)).join('+');
export const keySpoken = (key: string) => parts(key).map((p) => SPOKEN[p] ?? (p.length === 1 ? p.toUpperCase() : p)).join(' plus ');

/** A keycap element: the key as shown, and its spoken form for screen readers. */
export function keycap(key: string): HTMLElement {
  const k = document.createElement('kbd');
  k.className = 'keycap';
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  shown.textContent = keyLabel(key);
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = keySpoken(key);
  k.append(shown, spoken);
  return k;
}
