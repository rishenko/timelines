import { useSyncExternalStore } from 'react';
import { useCommands } from '../commands/CommandsContext.ts';
import type { Item } from './LegendPanel.tsx';

const kbd = (...keys: string[]) => (
  <span className="lg-keys">
    {keys.map((k) => (
      <kbd key={k}>{k}</kbd>
    ))}
  </span>
);

/**
 * The chart's keys (src/timeline/keyboard.ts). The whole chart is one Tab stop. `k(id, …shown)` is a command's key
 * from the registry: the usual glyphs while it has its default key, else the reader's own (or "no key").
 */
const keyItems = (k: (id: string, ...shown: string[]) => string[]): Item[] => [
  { readSample: true, sample: kbd('Tab'), title: 'Into the chart', text: 'The chart is one stop: Tab enters it at the event you last had (or one in view), and Tab again moves on.' },
  { readSample: true, sample: kbd('←', '→'), title: 'Along a row', text: 'The previous or next event in the row, by date; left of the first are the row’s fold buttons.' },
  { readSample: true, sample: kbd('↑', '↓'), title: 'Between rows', text: 'The nearest event in time in the row above or below, passing through a row’s phase strips (its phases, then its memberships), which sit above its events.' },
  { readSample: true, sample: kbd('Home', 'End'), title: 'Ends of a row', text: 'The first or last event in the row, or phase on a phase strip.' },
  { readSample: true, sample: kbd('PgUp', 'PgDn'), title: 'A screen at a time', text: 'Jump about a screen’s width earlier or later in the row.' },
  { readSample: true, sample: kbd(...k('chart.zoom-in', '+'), ...k('chart.zoom-out', '−')), title: 'Zoom', text: 'Zoom in or out around the focused event.' },
  { readSample: true, sample: kbd('Enter'), title: 'Open', text: 'Open the event’s or phase’s details (Esc closes them and comes back), zoom into a “+N” group, or fold a row.' },
  { readSample: true, sample: kbd('Tab'), title: 'Ages', text: 'Each line of the Ages strip, and of a row’s ages, is one stop: ← → and Home/End move along it, Enter opens the age’s details.' },
  { readSample: true, sample: kbd(...k('cursor.place', 'Y')), title: 'Year cursor', text: 'Put the year cursor on the focused event’s year: the band above the chart says what was going on then. ← → move it a step (Shift: a tenth of one), Esc puts it away.' },
  { readSample: true, sample: kbd(...k('chart.search', '/')), title: 'Search', text: 'Move to the search box, to find a row, an event or a year.' },
  { readSample: true, sample: kbd(...k('chart.keys', '?')), title: 'This list', text: 'Opens the legend from the chart.' },
];

/** The legend's Keyboard list, redrawn when a binding changes (the Keys tool can be open beside the legend). */
export function useKeyItems(): Item[] {
  const commands = useCommands();
  useSyncExternalStore(commands.subscribe, () => JSON.stringify(commands.bindings()));
  return keyItems((id, ...shown) => {
    const c = commands.list().find((x) => x.id === id);
    return !c || c.key === c.defaultKey ? shown : [c.key ?? 'no key'];
  });
}
