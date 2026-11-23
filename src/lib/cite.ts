import type { Dataset, TimelineEvent } from '../types.ts';
import { formatEventDates } from './years.ts';
import siteTimelines from '../../data-src/site-timelines.json' with { type: 'json' };

/**
 * Citing a timeline or an event (docs/feature-audit.md item 6), and reporting a problem with an event (item 3).
 * The data version is the commit the site was built from: the deploy workflow writes the same commit to version.txt.
 */
export const REPO = 'https://github.com/rishenko/timelines';
/** The author named in citations. */
export const AUTHOR = 'rishenko';
const SITE = 'Timelines';

declare const __DATA_VERSION__: { sha: string; date: string } | undefined;
/** The data version: the build's commit (short) and its date; "dev" in a local build without git. */
export const DATA_VERSION: { sha: string; date: string } =
  typeof __DATA_VERSION__ !== 'undefined' && __DATA_VERSION__ ? __DATA_VERSION__ : { sha: 'dev', date: '' };

/** The timelines this site ships (data-src/site-timelines.json): only these get a link to the public repo's issues. */
const BUNDLED = new Set<string>(siteTimelines.timelines);
export const isBundled = (id: string) => BUNDLED.has(id);

const accessedOn = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const versionText = () => `data version ${DATA_VERSION.sha}${DATA_VERSION.date ? ` (${DATA_VERSION.date})` : ''}`;
/** A BibTeX key: letters and digits only. */
const bibKey = (...parts: string[]) => parts.join('-').replace(/[^A-Za-z0-9-]+/g, '').slice(0, 60);
/** BibTeX text: braces and backslashes escaped, so a title can't break the entry. */
const bib = (s: string) => s.replace(/[\\{}]/g, (c) => `\\${c}`);

export interface Citation {
  chicago: string;
  bibtex: string;
}

/** A timeline's citation (Chicago, web page; and BibTeX @misc). */
export function citeTimeline(ds: Dataset, url: string, now = new Date()): Citation {
  const title = ds.meta.title;
  const year = DATA_VERSION.date.slice(0, 4) || String(now.getFullYear());
  return {
    chicago: `${AUTHOR}. “${title}.” ${SITE}, ${versionText()}. Accessed ${accessedOn(now)}. ${url}.`,
    bibtex: [
      `@misc{${bibKey(AUTHOR, ds.meta.id, year)},`,
      `  author = {${bib(AUTHOR)}},`,
      `  title = {${bib(title)}},`,
      `  howpublished = {${SITE}},`,
      `  year = {${year}},`,
      `  note = {${versionText()}; accessed ${isoDay(now)}},`,
      `  url = {${url}}`,
      `}`,
    ].join('\n'),
  };
}

/** An event's citation: the event as an entry in the timeline. */
export function citeEvent(ds: Dataset, e: TimelineEvent, url: string, now = new Date()): Citation {
  const year = DATA_VERSION.date.slice(0, 4) || String(now.getFullYear());
  return {
    chicago: `${AUTHOR}. “${e.title}.” In “${ds.meta.title},” ${SITE}, ${versionText()}. Accessed ${accessedOn(now)}. ${url}.`,
    bibtex: [
      `@misc{${bibKey(AUTHOR, e.uuid, year)},`,
      `  author = {${bib(AUTHOR)}},`,
      `  title = {${bib(e.title)}},`,
      `  howpublished = {${bib(`${ds.meta.title}, ${SITE}`)}},`,
      `  year = {${year}},`,
      `  note = {${versionText()}; accessed ${isoDay(now)}},`,
      `  url = {${url}}`,
      `}`,
    ].join('\n'),
  };
}

/** A new GitHub issue about an event, pre-filled with what identifies it; null for a timeline this site doesn't ship. */
export function reportUrl(ds: Dataset, e: TimelineEvent, url: string): string | null {
  if (!isBundled(ds.meta.id)) return null;
  const sources = e.sources.map((s) => {
    const src = ds.sources[s.sourceKey];
    return `- ${src?.name ?? s.sourceKey}${s.sourceLocation ? ` (${s.sourceLocation})` : ''}${src?.url ? `: ${src.url}` : ''}`;
  });
  const body = [
    `**Timeline:** ${ds.meta.title} (\`${ds.meta.id}\`)`,
    `**Event:** ${e.title} (\`${e.uuid}\`)`,
    `**Dates:** ${formatEventDates(e, ds.meta.calendar)}`,
    `**Link:** ${url}`,
    `**Data version:** ${DATA_VERSION.sha}`,
    '',
    '**Sources:**',
    ...(sources.length ? sources : ['- none listed']),
    '',
    "**What's wrong** (a date, a description, a source, a missing event…), and where you read otherwise:",
    '',
  ].join('\n');
  const q = new URLSearchParams({ title: `${ds.meta.title}: ${e.title}`, body, labels: 'data' });
  return `${REPO}/issues/new?${q.toString()}`;
}
