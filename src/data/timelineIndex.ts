import type { Calendar, Dataset } from '../types.ts';
import { isSafeUrl } from '../lib/urls.ts';
import { ID_RE } from './validate.ts';

/**
 * The site's list of timelines: `timelines/index.json`, next to the timeline files. The app reads it when it opens,
 * so a host can add, replace or remove timelines by changing files, without building the app again.
 *
 *   { "timelines": [ { "id": "my-world", "title": "My World", "file": "my-world.json" }, … ] }
 *
 * The first entry opens by default. `file` is a path relative to index.json, or a full http(s) address (the server
 * must let other sites read it). Everything but `id`, `title` and `file` is optional: it lets the picker and links
 * show more before the timeline itself is loaded. `npm run data -- index` writes it for the files in public/timelines.
 */
export interface TimelineIndexEntry {
  /** The timeline's meta.id (used in ?timeline= links and browser storage). Must match the file. */
  id: string;
  title: string;
  file: string;
  subtitle?: string;
  /** Shown in Customize → Timelines. */
  eventCount?: number;
  /** For links from other timelines (meta.continues): the year they open at is written in this calendar. */
  calendar?: Calendar;
  /** Theme preset to use when the reader hasn't picked one. */
  defaultTheme?: string;
}

export interface TimelineIndex {
  timelines: TimelineIndexEntry[];
}

/** Where the site's index is, relative to the page. */
export const INDEX_PATH = 'timelines/index.json';

/** What the picker and links need to know about a timeline, without its events. */
export type TimelineSummary = Omit<TimelineIndexEntry, 'file'>;

/** A loaded timeline's summary (its index entry, as `npm run data -- index` writes it). */
export function summarize(d: Dataset): TimelineSummary {
  const m = d.meta;
  return {
    id: m.id,
    title: m.title,
    ...(m.subtitle ? { subtitle: m.subtitle } : {}),
    eventCount: d.events.length,
    calendar: m.calendar,
    ...(m.defaultTheme ? { defaultTheme: m.defaultTheme } : {}),
  };
}

const isCalendar = (c: unknown): c is Calendar => {
  const k = c as Calendar | null;
  return !!k && typeof k.before === 'string' && typeof k.after === 'string' && typeof k.yearZero === 'boolean';
};

/**
 * Checks an index file. Returns its usable entries and a list of problems: an entry without a valid id, title or
 * file is left out; a malformed optional field is dropped from its entry.
 */
export function parseTimelineIndex(json: unknown): { entries: TimelineIndexEntry[]; errors: string[] } {
  const list = (json as TimelineIndex | null)?.timelines;
  if (!Array.isArray(list)) return { entries: [], errors: ['The index needs a "timelines" list.'] };
  const errors: string[] = [];
  const entries: TimelineIndexEntry[] = [];
  list.forEach((raw: unknown, i) => {
    const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const problem =
      typeof e.id !== 'string' || !ID_RE.test(e.id)
        ? 'needs an id of letters, digits and dashes'
        : entries.some((x) => x.id === e.id)
          ? `repeats the id "${e.id}"`
          : typeof e.title !== 'string' || !e.title
            ? 'needs a title'
            : typeof e.file !== 'string' || !e.file || !isSafeUrl(e.file)
              ? 'needs a file: a relative path or an http(s) address'
              : null;
    if (problem) return void errors.push(`timelines[${i}] ${problem}.`);
    const entry: TimelineIndexEntry = { id: e.id as string, title: e.title as string, file: e.file as string };
    if (typeof e.subtitle === 'string') entry.subtitle = e.subtitle;
    if (Number.isInteger(e.eventCount) && (e.eventCount as number) >= 0) entry.eventCount = e.eventCount as number;
    if (isCalendar(e.calendar)) entry.calendar = e.calendar;
    if (typeof e.defaultTheme === 'string') entry.defaultTheme = e.defaultTheme;
    entries.push(entry);
  });
  return { entries, errors };
}
