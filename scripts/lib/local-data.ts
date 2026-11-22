// Local datasets: timelines kept outside this repo (in a private folder of your own) that the tests and the dev
// server can load, so the app is checked against more than the timelines it ships.
//
// Set TIMELINES_LOCAL_DATA to one or more folders, separated like PATH (":" on macOS and Linux, ";" on Windows):
//   TIMELINES_LOCAL_DATA=~/data/my-timelines/compiled:~/data/my-timelines/public/timelines npm test
// Every *.json directly in a listed folder with a `schemaVersion` is a compiled timeline. Other files in the folders
// (images such as row logos) are served by the dev server under /timelines/. Nothing here is built or deployed.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

export const LOCAL_DATA_ENV = 'TIMELINES_LOCAL_DATA';

/** The folders listed in TIMELINES_LOCAL_DATA that exist ("~" expanded). */
export function localDataDirs(value = process.env[LOCAL_DATA_ENV]): string[] {
  if (!value) return [];
  return value
    .split(delimiter)
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => resolve(d.replace(/^~(?=$|[\\/])/, homedir())))
    .filter((d) => existsSync(d) && statSync(d).isDirectory());
}

export interface LocalTimelineFile {
  /** The file name, as served under /timelines/. */
  file: string;
  path: string;
}

/** The compiled timelines in the local folders (a file name listed twice: the first folder wins). */
export function localTimelineFiles(dirs = localDataDirs()): LocalTimelineFile[] {
  const out: LocalTimelineFile[] = [];
  for (const dir of dirs)
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith('.json') || file === 'index.json' || out.some((f) => f.file === file)) continue;
      const path = join(dir, file);
      try {
        const data = JSON.parse(readFileSync(path, 'utf8')) as { schemaVersion?: unknown };
        if (data && typeof data === 'object' && 'schemaVersion' in data) out.push({ file, path });
      } catch {
        // not JSON: ignore
      }
    }
  return out;
}

/** The first local folder that has this path (under /timelines/), for the dev server. */
export function localAsset(rel: string, dirs = localDataDirs()): string | undefined {
  if (rel.includes('..')) return undefined;
  for (const dir of dirs) {
    const p = join(dir, rel);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return undefined;
}
