// Kevin's rule: never cite a Wikipedia page flagged for AI-generated text. data-src/ai-flagged-pages.txt lists those
// pages and the redirects to them (pipelines/extract/ai_flagged.py writes it from the dump), so this works without the
// dump, in CI too. It finds every English Wikipedia link in data-src/ (sources, urls, notes: any string) and names the
// ones on the list.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AI_LIST = 'data-src/ai-flagged-pages.txt';

/** The flagged titles, and the dump the list was made from. */
export function loadFlagged(path = AI_LIST): { titles: Set<string>; dump: string } {
  const lines = readFileSync(path, 'utf8').split('\n');
  const dump = lines.find((l) => l.startsWith('# Dump '))?.match(/^# Dump (\S+?)\./)?.[1] ?? '?';
  return { titles: new Set(lines.filter((l) => l && !l.startsWith('#'))), dump };
}

/** A Wikipedia link's article title as the dump writes it ("Callisto (mythology)"), or null if it isn't one. */
export function wikiTitle(url: string): string | null {
  const m = url.match(/^https?:\/\/en\.(?:m\.)?wikipedia\.org\/(?:wiki\/([^?#]+)|w\/index\.php\?(?:[^#]*&)?title=([^&#]+))/);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  let t: string;
  try {
    t = decodeURIComponent(raw.replace(/\+/g, m?.[2] ? ' ' : '+'));
  } catch {
    t = raw;
  }
  t = t.replace(/_/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : null;
}

/** A link found in prose, without the sentence's closing punctuation or a parenthesis it sits in ("(see …)."); a
 * title's own parentheses ("Callisto_(mythology)") are balanced, so they stay. */
export function trimProse(url: string): string {
  let u = url;
  for (;;) {
    const next = u.replace(/[.,;:!?]+$/, '');
    const open = (next.match(/\(/g) ?? []).length;
    const close = (next.match(/\)/g) ?? []).length;
    const trimmed = next.endsWith(')') && close > open ? next.slice(0, -1) : next;
    if (trimmed === u) return u;
    u = trimmed;
  }
}

export interface FlaggedCite {
  file: string;
  /** Where in the file, as a JSON path (events[12].sources[0].url). */
  at: string;
  title: string;
}

/** Every link in the JSON files under `dir` to a flagged page. */
export function flaggedCitations(titles: Set<string>, dir = 'data-src'): FlaggedCite[] {
  const out: FlaggedCite[] = [];
  const visit = (file: string, v: unknown, at: string) => {
    if (typeof v === 'string') {
      // a whole-string link as it is; a link inside prose without the sentence's closing punctuation
      const links = /^https?:\/\/\S+$/.test(v)
        ? [v]
        : (v.match(/https?:\/\/en\.(?:m\.)?wikipedia\.org\/[^\s"'<>\]]+/g) ?? []).map(trimProse);
      for (const url of links) {
        const title = wikiTitle(url);
        if (title && titles.has(title)) out.push({ file, at, title });
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => visit(file, x, `${at}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(file, x, at ? `${at}.${k}` : k);
  };
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) visit(p, JSON.parse(readFileSync(p, 'utf8')), '');
    }
  };
  walk(dir);
  return out;
}
