import { useSyncExternalStore } from 'react';
import { useCommands } from '../commands/CommandsContext.ts';
import { Keycap, withKeycaps } from './Keycap.tsx';
import type { Item } from './LegendPanel.tsx';

/** Keycaps for a list item's sample; null is a command the reader unbound. */
const keys = (...ks: (string | null)[]) => (
  <span className="lg-keys">{ks.map((k, i) => (k ? <Keycap key={k} k={k} /> : <span key={`none-${i}`} className="lg-nokey">no key</span>))}</span>
);

/**
 * The chart's keys (src/timeline/keyboard.ts), as keycaps. The whole chart is one Tab stop. `k(id, fallback)` is a
 * command's key from the registry (the reader's own if they rebound it, null if unbound), else `fallback` while the
 * command isn't registered (no chart).
 */
const keyItems = (k: (id: string, fallback: string) => string | null): Item[] => {
  const t = (s: string) => withKeycaps(s);
  // the cursor's own keys, as the reader has them (a pair left out when either is unbound)
  const pair = (a: string | null, b: string | null) => (a && b ? `[[${a}]] [[${b}]]` : '');
  const step = pair(k('cursor.step-back', 'ArrowLeft'), k('cursor.step-forward', 'ArrowRight'));
  const fine = pair(k('cursor.step-back-fine', 'shift+ArrowLeft'), k('cursor.step-forward-fine', 'shift+ArrowRight'));
  const moves = step ? `${step} move it a step${fine ? ` (${fine}: a tenth of one)` : ''}, ` : '';
  return [
    { readSample: true, sample: keys('Tab'), title: 'Into the chart', text: t('The chart is one stop: [[Tab]] enters it at the event you last had (or one in view), and [[Tab]] again moves on.') },
    { readSample: true, sample: keys('ArrowLeft', 'ArrowRight'), title: 'Along a row', text: 'The previous or next event in the row, by date; left of the first are the row’s fold buttons.' },
    { readSample: true, sample: keys('ArrowUp', 'ArrowDown'), title: 'Between rows', text: 'The nearest event in time in the row above or below, passing through a row’s phase strips (its phases, then its memberships), which sit above its events.' },
    { readSample: true, sample: keys('Home', 'End'), title: 'Ends of a row', text: 'The first or last event in the row, or phase on a phase strip.' },
    { readSample: true, sample: keys('PageUp', 'PageDown'), title: 'A screen at a time', text: 'Jump about a screen’s width earlier or later in the row.' },
    { readSample: true, sample: keys(k('chart.zoom-in', '+'), k('chart.zoom-out', '-')), title: 'Zoom', text: 'Zoom in or out around the focused event.' },
    { readSample: true, sample: keys('Enter'), title: 'Open', text: t('Open the event’s or phase’s details ([[Escape]] closes them and comes back), zoom into a “+N” group, or fold a row.') },
    { readSample: true, sample: keys('Tab'), title: 'Ages', text: t('Each line of the Ages strip, and of a row’s ages, is one stop: [[ArrowLeft]] [[ArrowRight]] and [[Home]]/[[End]] move along it, [[Enter]] opens the age’s details.') },
    { readSample: true, sample: keys(k('cursor.place', 'y')), title: 'Year cursor', text: t(`Put the year cursor on the focused event’s year: the band above the chart says what was going on then. ${moves}[[Escape]] puts it away.`) },
    { readSample: true, sample: keys(k('chart.search', '/')), title: 'Search', text: 'Move to the search box, to find a row, an event or a year.' },
    { readSample: true, sample: keys(k('chart.keys', '?')), title: 'This list', text: 'Opens the legend from the chart.' },
  ];
};

/** The legend's Keyboard list, redrawn when a binding changes (the Keys tool can be open beside the legend). */
export function useKeyItems(): Item[] {
  const commands = useCommands();
  useSyncExternalStore(commands.subscribe, () => JSON.stringify(commands.bindings()));
  return keyItems((id, fallback) => (commands.list().some((c) => c.id === id) ? commands.keyFor(id) : fallback));
}
