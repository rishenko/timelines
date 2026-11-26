import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CommandRegistry } from '../commands/registry.ts';

/** A text field takes its own keys: typing "y" or "/" there is typing (the search box is an input with role combobox). */
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || /^(combobox|searchbox|textbox)$/.test(t.getAttribute('role') ?? ''));
/** A dialog keeps its keys too (the Cite dialog, the Dating menu's popover): it's a place of its own, not the page. */
const inDialog = (t: EventTarget | null) => t instanceof Element && !!t.closest('dialog, [role="dialog"]');
/** Keys the page never takes: focus and exit must always work (the registry refuses binding them too). */
const NEVER = new Set(['Escape', 'Tab']);

/**
 * The chart's keys from anywhere on the page (Kevin, 2026-11-25: Y did nothing after a click on empty chart space):
 * a keydown nothing else took (the chart's events, the year cursor's chip, the Keys tool waiting for a new key all
 * prevent the default) goes to the chart's commands, with the year under the pointer while it's over the chart, else the
 * view's centre. Not from a text field or a dialog. These are single-key shortcuts that work without focus on the chart, so they
 * rest on the reader being able to unbind or remap them, with a modifier too (the Keys tool; WCAG 2.1.4).
 */
export function usePageKeys(commands: CommandRegistry, year: () => number) {
  const latest = useRef(year);
  useLayoutEffect(() => {
    latest.current = year;
  });
  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      // a key the chart's own handler (or the cursor's chip, or the Keys tool capturing a key) took isn't run again
      if (ev.defaultPrevented || NEVER.has(ev.key) || isTyping(ev.target) || inDialog(ev.target)) return;
      if (commands.dispatch(ev, 'chart', { year: latest.current() })) ev.preventDefault();
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [commands]);
}
