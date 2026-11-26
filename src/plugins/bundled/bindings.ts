/**
 * Key bindings as a bundled tool (plugin design §4): every command with its key, and for each a way to change the key
 * (press the new one), unbind it (the way to turn off a single-character key, WCAG 2.1.4) or go back to the default.
 * The core keeps the rules and the bindings (saved in this browser); this panel only asks and shows. Escape and Tab
 * keep their jobs: Escape while waiting for a key cancels. It uses only the tool `api` (and the app's keycap,
 * lib/keycap.ts), like a plugin from the site's folder.
 */
import type { ToolApi, ToolPlugin } from '../tool.ts';
import { keycap, keyLabel } from '../../lib/keycap.ts';
import '../tools.css';

const FIXED = new Set(['Escape', 'Tab']);
/** Keys that are only half a binding: wait for the key they modify. */
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
};

/** The row buttons' glyphs and what they do (the legend at the top says it once). */
const ACTIONS = [
  ['✎', 'change'],
  ['⊘', 'unbind'],
  ['↺', 'default'],
] as const;

/** A small button showing a glyph; its name (and tooltip) says the action and the command; data-id/-act find it again. */
const iconButton = (glyph: string, name: string, id: string, act: string) => {
  const b = node('button', glyph, 'icon');
  b.dataset.id = id;
  b.dataset.act = act;
  b.setAttribute('aria-label', name);
  b.title = name;
  return b;
};

function mount(el: HTMLElement, api: ToolApi): () => void {
  const list = node('ul', '', 'bindings');
  const status = node('p', '', 'muted small');
  status.setAttribute('role', 'status');
  const resetAll = node('button', 'Reset all to defaults');
  resetAll.onclick = () => (api.commands.reset(), (status.textContent = 'All keys are back to their defaults.'));
  const chartNote = node('p', '', 'muted small');
  // the actions' legend, once: each row is then the command, its key and three small buttons (their names say the rest)
  const legend = node('p', '', 'bindings-legend muted small');
  for (const [icon, text] of ACTIONS) legend.append(node('span', icon, 'b-icon'), ` ${text} `);
  el.append(legend, chartNote, list, status, resetAll);
  let waiting: string | null = null;

  const draw = () => {
    // the list is rebuilt on every change: remember which row button had focus, to put focus back on its new copy
    const had = document.activeElement instanceof HTMLElement && list.contains(document.activeElement) ? document.activeElement.dataset : null;
    chartNote.textContent = api.chart() ? '' : 'The chart’s own keys are listed while the chart is showing.';
    list.replaceChildren(
      ...api.commands.list().map((c) => {
        const li = node('li');
        const actions = node('span', '', 'b-actions');
        li.append(node('span', c.label, 'b-name'), waiting === c.id ? node('kbd', 'press a key…', 'keycap waiting') : c.key ? keycap(c.key) : node('kbd', 'none', 'keycap none'), actions);
        if (c.defaultKey && FIXED.has(c.defaultKey)) return li;
        const change = iconButton(ACTIONS[0][0], `Change the key for ${c.label}`, c.id, 'change');
        change.onclick = () => ((waiting = c.id), (status.textContent = `Press the new key for ${c.label}, or Escape to cancel.`), draw());
        change.onkeydown = (ev) => {
          if (waiting !== c.id || MODIFIERS.has(ev.key) || ev.key === 'Tab') return;
          ev.preventDefault();
          waiting = null;
          status.textContent = ev.key === 'Escape' ? 'Not changed.' : (api.commands.bind(c.id, api.commands.keyOf(ev)) ?? `${c.label}: ${keyLabel(api.commands.keyOf(ev))}.`);
          draw();
        };
        const off = iconButton(ACTIONS[1][0], `Unbind ${c.label}`, c.id, 'unbind');
        off.disabled = c.key === null;
        off.onclick = () => (status.textContent = api.commands.bind(c.id, null) ?? `${c.label} has no key now.`);
        const back = iconButton(ACTIONS[2][0], `Default key for ${c.label}`, c.id, 'default');
        back.disabled = c.key === c.defaultKey;
        back.onclick = () => (api.commands.reset(c.id), (status.textContent = `${c.label}: back to ${c.defaultKey ? keyLabel(c.defaultKey) : 'no key'}.`));
        actions.append(change, off, back);
        return li;
      }),
    );
    // focus stays where it was (WCAG 2.4.3): on the same button, or on the row's Change when that one is now disabled
    // (Default after a reset, Unbind after unbinding); while waiting for a key, on the row's Change
    const id = waiting ?? had?.id;
    if (!id) return;
    const button = (act: string) => list.querySelector<HTMLButtonElement>(`button[data-id="${id}"][data-act="${act}"]`);
    const same = !waiting && had?.act ? button(had.act) : null;
    (same && !same.disabled ? same : button('change'))?.focus();
  };
  draw();
  // the chart's keys work from the panel too, so a reader can try one (Y places the year cursor, and its keys follow);
  // not while a new key is being captured: the row's Change takes that keydown first and prevents its default
  const offs = [api.commands.subscribe(draw), api.onChart(draw), api.commands.keys(el)];
  return () => offs.forEach((off) => off());
}

export const bindingsTool: ToolPlugin = { id: 'bindings', name: 'Keys', apiVersion: 1, tool: { mount } };
