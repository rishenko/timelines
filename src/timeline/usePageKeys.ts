import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CommandRegistry } from '../commands/registry.ts';

/** A text field takes its own keys: typing "y" or "/" there is typing. */
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * The chart's keys from anywhere on the page (Kevin, 2026-11-25: Y did nothing after a click on empty chart space):
 * a keydown nothing else took (the chart's events, the year cursor's chip, the Keys tool waiting for a new key all
 * prevent the default) goes to the chart's commands, with the year under the pointer while it's over the chart, else the
 * view's centre. Not from a text field. These are single-key shortcuts that work without focus on the chart, so they
 * rest on the reader being able to unbind or remap them, with a modifier too (the Keys tool; WCAG 2.1.4).
 */
export function usePageKeys(commands: CommandRegistry, year: () => number) {
  const latest = useRef(year);
  useLayoutEffect(() => {
    latest.current = year;
  });
  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || isTyping(ev.target)) return;
      if (commands.dispatch(ev, 'chart', { year: latest.current() })) ev.preventDefault();
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [commands]);
}
