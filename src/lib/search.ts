import type { TimelineEvent, Track } from '../types.ts';
import { subtreeIds, trackPath } from './tracks.ts';

/**
 * Search over a timeline's rows (tracks: groups, regions, civilizations, periods) and events.
 * Matching ignores case, accents and apostrophe-like marks (ʻ ’ ʾ), so "hawaii" finds "Hawaiʻi" and
 * "hattusa" finds "Ḫattuša". There is no typo tolerance: with many similar names (dynasties, -ites,
 * -ids) fuzzy matching would bury the right answer.
 */

export interface SearchEntry {
  kind: 'track' | 'event';
  id: string;
  label: string;
  /** Ancestor row names, outermost first. For an event: its first row and that row's ancestors. */
  path: string[];
  /** For an event: its first row. For a row: itself. */
  trackId: string;
  start?: number;
  end?: number;
  importance?: number;
  /** Normalized label words, and normalized path words. */
  words: string[];
  pathWords: string[];
  norm: string;
}

export interface SearchHit {
  entry: SearchEntry;
  /** Lower is better. */
  score: number;
}

/** Lowercase, strip accents and apostrophe-like marks, turn other punctuation into spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʻʼʾʿ'’‘`´]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** "hittites" also finds "Hittite"; short words are left alone ("mars", "ur"). */
const stem = (w: string) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);

export type EventLike = Pick<TimelineEvent, 'uuid' | 'title' | 'start' | 'end' | 'tracks' | 'importance'>;

export function buildIndex(tracks: Track[], events: EventLike[]): SearchEntry[] {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const entry = (e: Omit<SearchEntry, 'words' | 'pathWords' | 'norm'>): SearchEntry => {
    const norm = normalize(e.label);
    return {
      ...e,
      norm,
      words: norm.split(' ').filter(Boolean),
      pathWords: normalize(e.path.join(' ')).split(' ').filter(Boolean),
    };
  };
  const out: SearchEntry[] = [];
  for (const t of tracks) {
    out.push(
      entry({
        kind: 'track',
        id: t.id,
        label: t.name,
        path: trackPath(t.id, byId)
          .slice(0, -1)
          .map((a) => a.name),
        trackId: t.id,
        start: t.span?.start,
        end: t.span?.end,
      }),
    );
  }
  for (const e of events) {
    const first = e.tracks.find((id) => byId.has(id)) ?? e.tracks[0];
    out.push(
      entry({
        kind: 'event',
        id: e.uuid,
        label: e.title,
        path: trackPath(first, byId).map((a) => a.name),
        trackId: first,
        start: e.start,
        end: e.end,
        importance: e.importance,
      }),
    );
  }
  return out;
}

/** Does every query token start some word (stemmed tokens match too)? */
const tokensPrefix = (tokens: string[], words: string[]) =>
  tokens.every((tk) => words.some((w) => w.startsWith(tk) || w.startsWith(stem(tk))));

function score(e: SearchEntry, q: string, tokens: string[]): number | null {
  if (e.norm === q || e.norm === stem(q)) return 0;
  if (e.norm.startsWith(q) || e.norm.startsWith(stem(q))) return 1;
  // the query as a phrase starting at a word boundary: "kingdom of k" in "Middle Kingdom of Kush"
  if (` ${e.norm}`.includes(` ${q}`)) return 2;
  if (tokensPrefix(tokens, e.words)) return 3;
  // mid-word matches only for longer queries: "han" in "Zhangzhung" is noise
  if (q.length >= 4 && e.norm.includes(q)) return 4;
  // some words name the row it sits in: "egypt pyramid", "hittite treaty"
  if (tokensPrefix(tokens, [...e.words, ...e.pathWords]) && tokens.some((tk) => tokensPrefix([tk], e.words)))
    return 5;
  return null;
}

/**
 * Best matches for a query: exact, then prefix, then phrase, then all words, then substring, then words
 * spread across the name and its row. Ties put rows before events, key events before others, shorter
 * names first, then earlier dates.
 */
export function search(index: SearchEntry[], query: string, limit = 20): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const hits: SearchHit[] = [];
  for (const entry of index) {
    const s = score(entry, q, tokens);
    if (s !== null) hits.push({ entry, score: s });
  }
  const kindRank = (e: SearchEntry) => (e.kind === 'track' ? 0 : 1);
  hits.sort(
    (a, b) =>
      a.score - b.score ||
      kindRank(a.entry) - kindRank(b.entry) ||
      (a.entry.importance ?? 2) - (b.entry.importance ?? 2) ||
      a.entry.label.length - b.entry.label.length ||
      (a.entry.start ?? Infinity) - (b.entry.start ?? Infinity),
  );
  return hits.slice(0, limit);
}

/**
 * The years a row covers: its lifespan if it has one, else the earliest start to the latest end of the
 * events on it and its sub-rows. Undefined for an empty row.
 */
export function trackRange(
  trackId: string,
  tracks: Track[],
  events: EventLike[],
  spans?: Map<string, { start: number; end: number }>,
): { start: number; end: number } | undefined {
  const span = spans?.get(trackId) ?? tracks.find((t) => t.id === trackId)?.span;
  if (span) return { start: span.start, end: span.end };
  const ids = subtreeIds(trackId, tracks);
  let start = Infinity;
  let end = -Infinity;
  for (const e of events) {
    if (!e.tracks.some((t) => ids.has(t))) continue;
    start = Math.min(start, e.start);
    end = Math.max(end, e.end ?? e.start);
  }
  return start <= end ? { start, end } : undefined;
}
