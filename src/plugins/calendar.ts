import { BUNDLED_CALENDARS } from './bundled/namedAges.ts';

/**
 * Calendars (plugin design §6): a plugin part that names and reads years for a timeline whose world counts time its own
 * way ("fictional universes have their own calendaring"). Stored years stay integers on one axis; a calendar only
 * names, parses and labels them, so the same file works with or without it. A timeline names its calendar in
 * `meta.calendar.system` (schema 11.4); the bundled ones (bundled/namedAges.ts) are always registered.
 *
 * lib/calendar.ts is the one choke point: formatYear, formatDate and the parsers hand over to the timeline's calendar
 * when one is registered under its id, and run as before otherwise. The ruler keeps the core's ticks, labelled by
 * `format`. A plugin's own ticks wait for a calendar that needs them.
 */
export interface CalendarSystem {
  /** The id a timeline names it by. */
  id: string;
  /** A stored year (with month and day, when known) as readable text: never glyphs alone, since the ruler and a11y labels use it. */
  format(year: number, month: number | undefined, day: number | undefined, opts: { circa: boolean }): string;
  /** What `format` writes, read back; null if it can't be read. Month and day are the file's numbers. */
  parse(text: string): { year: number; month?: number; day?: number; circa: boolean } | null;
}

const systems = new Map<string, CalendarSystem>(BUNDLED_CALENDARS.map((c) => [c.id, c]));

/** Makes a calendar available to timelines that name its id; returns `off()`. A second calendar with the same id replaces the first. */
export function registerCalendar(c: CalendarSystem): () => void {
  systems.set(c.id, c);
  return () => {
    if (systems.get(c.id) === c) systems.delete(c.id);
  };
}

/** The registered calendar with this id, if any (none: the timeline's before/after labels are used). */
export const calendarSystem = (id: string | undefined): CalendarSystem | undefined => (id ? systems.get(id) : undefined);
