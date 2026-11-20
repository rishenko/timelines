// Writes public/timelines/index.json, the site's list of timelines (format: src/data/timelineIndex.ts).
//
// It keeps the list's order (the first entry opens by default) and refreshes every entry for a file in the folder
// from the file itself (title, subtitle, event count, calendar, default theme), so the list can't go stale. Timeline
// files not yet listed are added at the end; entries whose file is gone are dropped; entries that point to other
// sites (http addresses) are kept as they are.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTimelineIndex, summarize, type TimelineIndexEntry } from '../../src/data/timelineIndex.ts';
import { validateDataset } from '../../src/data/validate.ts';
import type { Dataset } from '../../src/types.ts';

export const TIMELINES_DIR = 'public/timelines';

export function timelineIndexText(dir = TIMELINES_DIR): { text: string; notes: string[] } {
  const path = join(dir, 'index.json');
  const notes: string[] = [];
  const old = existsSync(path) ? parseTimelineIndex(JSON.parse(readFileSync(path, 'utf8'))) : { entries: [], errors: [] };
  notes.push(...old.errors);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
  const remote = (e: TimelineIndexEntry) => /^https?:\/\//i.test(e.file);

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

  const out: TimelineIndexEntry[] = [];
  for (const e of old.entries) {
    if (remote(e)) out.push(e);
    else if (!files.includes(e.file)) notes.push(`dropped ${e.id}: ${e.file} is gone`);
    else {
      const fresh = entryFor(e.file);
      if (fresh) out.push(fresh);
    }
  }
  for (const f of files.filter((f) => !out.some((e) => e.file === f)).sort()) {
    const fresh = entryFor(f);
    if (fresh && out.some((e) => e.id === fresh.id)) notes.push(`${f} left out: the id "${fresh.id}" is already listed`);
    else if (fresh) out.push(fresh);
  }
  return { text: JSON.stringify({ timelines: out }, null, 2) + '\n', notes };
}

/** Writes the index; returns notes on what was dropped or left out. */
export function writeTimelineIndex(dir = TIMELINES_DIR): string[] {
  const { text, notes } = timelineIndexText(dir);
  writeFileSync(join(dir, 'index.json'), text);
  return notes;
}
