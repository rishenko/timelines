/**
 * Key bindings as a bundled tool (plugin design §4): every command with its key, and for each a way to change the key
 * (press the new one), unbind it (the way to turn off a single-character key, WCAG 2.1.4) or go back to the default.
 * The core keeps the rules and the bindings (saved in this browser); this panel only asks and shows. Escape and Tab
 * keep their jobs: Escape while waiting for a key cancels. It uses only the tool `api`, like a plugin from the site's
 * folder.
 */
import type { ToolApi, ToolPlugin } from '../tool.ts';
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

function mount(el: HTMLElement, api: ToolApi): () => void {
  const list = node('ul', '', 'bindings');
  const status = node('p', '', 'muted small');
  status.setAttribute('role', 'status');
  const resetAll = node('button', 'Reset all to defaults');
  resetAll.onclick = () => (api.commands.reset(), (status.textContent = 'All keys are back to their defaults.'));
  const chartNote = node('p', '', 'muted small');
  el.append(chartNote, list, status, resetAll);
  let waiting: string | null = null;

  const draw = () => {
    chartNote.textContent = api.chart() ? '' : 'The chart’s own keys are listed while the chart is showing.';
    list.replaceChildren(
      ...api.commands.list().map((c) => {
        const li = node('li');
        li.append(node('span', c.label), ' ', node('kbd', waiting === c.id ? 'press a key…' : (c.key ?? 'none')));
        if (c.defaultKey && FIXED.has(c.defaultKey)) return li;
        const change = node('button', 'Change');
        change.dataset.id = c.id;
        change.setAttribute('aria-label', `Change the key for ${c.label}`);
        change.onclick = () => ((waiting = c.id), (status.textContent = `Press the new key for ${c.label}, or Escape to cancel.`), draw());
        change.onkeydown = (ev) => {
          if (waiting !== c.id || MODIFIERS.has(ev.key) || ev.key === 'Tab') return;
          ev.preventDefault();
          waiting = null;
          status.textContent = ev.key === 'Escape' ? 'Not changed.' : (api.commands.bind(c.id, api.commands.keyOf(ev)) ?? `${c.label}: ${api.commands.keyOf(ev)}.`);
          draw();
        };
        const off = node('button', 'Unbind');
        off.setAttribute('aria-label', `Unbind ${c.label}`);
        off.onclick = () => (status.textContent = api.commands.bind(c.id, null) ?? `${c.label} has no key now.`);
        const back = node('button', 'Default');
        back.setAttribute('aria-label', `Default key for ${c.label}`);
        back.disabled = c.key === c.defaultKey;
        back.onclick = () => (api.commands.reset(c.id), (status.textContent = `${c.label}: back to ${c.defaultKey ?? 'no key'}.`));
        li.append(' ', change, ' ', off, ' ', back);
        return li;
      }),
    );
    if (waiting) list.querySelector<HTMLButtonElement>(`button[data-id="${waiting}"]`)?.focus();
  };
  draw();
  const offs = [api.commands.subscribe(draw), api.onChart(draw)];
  return () => offs.forEach((off) => off());
}

export const bindingsTool: ToolPlugin = { id: 'bindings', name: 'Keys', apiVersion: 1, tool: { mount } };
