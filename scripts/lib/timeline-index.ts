// Builds timelines/index.json, the site's list of timelines (format: src/data/timelineIndex.ts), from the files in
// public/timelines. It isn't committed: the dev server serves it and the build writes it into dist/
// (scripts/lib/timeline-index-plugin.ts), so it can't go stale or conflict between branches.
//
// The order comes from data-src/site-timelines.json (the first entry opens by default): a list of timeline ids in
// public/timelines, and whole entries for timelines on other sites (an http(s) `file`), kept as they are. Every entry
// for a file is made from the file itself (title, subtitle, event count, calendar, default theme, map). Timeline
// files the list doesn't name are added at the end, by file name; ids it names that have no file are dropped.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTimelineIndex, summarize, type TimelineIndexEntry } from '../../src/data/timelineIndex.ts';
import { validateDataset } from '../../src/data/validate.ts';
import type { Dataset } from '../../src/types.ts';

export const TIMELINES_DIR = 'public/timelines';
/** The order of the site's list, and its entries for timelines on other sites. */
export const SITE_ORDER = 'data-src/site-timelines.json';

/** data-src/site-timelines.json: `{ "timelines": [id | entry, …] }`. */
function readOrder(file: string, notes: string[]): (string | TimelineIndexEntry)[] {
  if (!existsSync(file)) return [];
  const list = (JSON.parse(readFileSync(file, 'utf8')) as { timelines?: unknown }).timelines;
  if (!Array.isArray(list)) {
    notes.push(`${file}: "timelines" isn't a list`);
    return [];
  }
  const out: (string | TimelineIndexEntry)[] = [];
  for (const x of list) {
    if (typeof x === 'string') out.push(x);
    else {
      // an entry for a timeline on another site, checked as the app checks the list
      const { entries, errors } = parseTimelineIndex({ timelines: [x] });
      notes.push(...errors.map((e) => `${file}: ${e}`));
      for (const e of entries)
        if (/^https?:\/\//i.test(e.file)) out.push(e);
        else notes.push(`${file}: ${e.id} left out: list a file in public/timelines by its id`);
    }
  }
  return out;
}

export function timelineIndexText(dir = TIMELINES_DIR, orderFile = SITE_ORDER): { text: string; notes: string[] } {
  const notes: string[] = [];
  const order = readOrder(orderFile, notes);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');

  const entryFor = (file: string): TimelineIndexEntry | null => {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Dataset;
    const problems = validateDataset(data);
    if (problems.length) {
      notes.push(`${file} left out: ${problems[0]}`);
      return null;
    }
    const { id, title, ...rest } = summarize(data);
    // a map file built by `npm run map:build` sits in public/maps/, next to this folder
    const map = existsSync(join(dir, '..', 'maps', `${id}.json`)) ? { map: `../maps/${id}.json` } : {};
    return { id, title, file, ...rest, ...map };
  };

  // every valid file's entry, by id
  const byId = new Map<string, TimelineIndexEntry>();
  for (const f of [...files].sort()) {
    const e = entryFor(f);
    if (e && byId.has(e.id)) notes.push(`${f} left out: the id "${e.id}" is already listed`);
    else if (e) byId.set(e.id, e);
  }
  const out: TimelineIndexEntry[] = [];
  for (const o of order) {
    if (typeof o !== 'string') out.push(o);
    else if (!byId.has(o)) notes.push(`dropped ${o}: no timeline file with that id`);
    else if (!out.some((e) => e.id === o)) out.push(byId.get(o)!);
  }
  for (const e of byId.values()) if (!out.some((x) => x.id === e.id)) out.push(e);
  return { text: JSON.stringify({ timelines: out }, null, 2) + '\n', notes };
}

/** The index as an object (the dev server, the build and the tests). */
export function timelineIndex(dir = TIMELINES_DIR, orderFile = SITE_ORDER): { timelines: TimelineIndexEntry[]; notes: string[] } {
  const { text, notes } = timelineIndexText(dir, orderFile);
  return { timelines: (JSON.parse(text) as { timelines: TimelineIndexEntry[] }).timelines, notes };
}
