// Cite this (Chicago, BibTeX) and Report a problem (a pre-filled GitHub issue): docs/feature-audit.md items 6 and 3.
import { describe, expect, it } from 'vitest';
import { citeEvent, citeTimeline, DATA_VERSION, reportUrl } from './cite.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, TimelineEvent } from '../types.ts';

const now = new Date(Date.UTC(2026, 10, 23, 12));
const bundled = (): Dataset => {
  const d = plainTimeline();
  d.meta.id = 'ancient-classical';
  d.meta.title = 'Ancient and Classical World';
  d.sources = { ...d.sources, 'wp-x': { name: 'Wikipedia: X', url: 'https://en.wikipedia.org/wiki/X', tags: ['wikipedia'] } };
  return d;
};
const ev: TimelineEvent = { uuid: 'ramesses-ii', title: 'Reign of {Ramesses} II', descr: '', start: -1278, end: -1212, tracks: ['quay'], sources: [{ sourceKey: 'wp-x', sourceLocation: 'lead' }] };

describe('citations', () => {
  it('cite the timeline with the data version, the date accessed and the link', () => {
    const c = citeTimeline(bundled(), 'https://example.org/?timeline=ancient-classical', now);
    expect(c.chicago).toContain('“Ancient and Classical World.” Timelines, data version ' + DATA_VERSION.sha);
    expect(c.chicago).toContain('Accessed November 23, 2026. https://example.org/?timeline=ancient-classical.');
    expect(c.bibtex).toMatch(/^@misc\{rishenko-ancient-classical-\d{4}|^@misc\{rishenko-ancient-classical-/);
    expect(c.bibtex).toContain('note = {data version ' + DATA_VERSION.sha);
  });

  it('BibTeX escapes the TeX specials & % # _ $ in the title and howpublished, not in the url', () => {
    const d = bundled();
    d.meta.title = 'Wars & sieges';
    const c = citeEvent(d, { ...ev, title: 'Ghaznavid–Samanid war & 50% of #1_$x' }, 'https://example.org/?a=1&b=2#x_y', now);
    expect(c.bibtex).toContain('title = {Ghaznavid–Samanid war \\& 50\\% of \\#1\\_\\$x}');
    expect(c.bibtex).toContain('howpublished = {Wars \\& sieges, Timelines}');
    expect(c.bibtex).toContain('url = {https://example.org/?a=1&b=2#x_y}');
  });

  it('the BibTeX accessed date is the local day, the same as the Chicago one', () => {
    const late = new Date(2026, 10, 23, 23, 30); // 23:30 local
    const c = citeTimeline(bundled(), 'x', late);
    expect(c.chicago).toContain('Accessed November 23, 2026.');
    expect(c.bibtex).toContain('accessed 2026-11-23}');
  });

  it('cite an event within its timeline; BibTeX escapes braces', () => {
    const c = citeEvent(bundled(), ev, 'https://example.org/#ramesses-ii', now);
    expect(c.chicago).toContain('“Reign of {Ramesses} II.” In “Ancient and Classical World,” Timelines');
    expect(c.bibtex).toContain('title = {Reign of \\{Ramesses\\} II}');
  });
});

describe('report a problem', () => {
  it('opens an issue in the public repo, pre-filled with the timeline, event, dates, sources and link', () => {
    const u = new URL(reportUrl(bundled(), ev, 'https://example.org/#ramesses-ii')!);
    expect(u.origin + u.pathname).toBe('https://github.com/rishenko/timelines/issues/new');
    expect(u.searchParams.get('title')).toBe('Ancient and Classical World: Reign of {Ramesses} II');
    const body = u.searchParams.get('body')!;
    for (const s of ['(`ancient-classical`)', '(`ramesses-ii`)', '**Dates:** 1278 BL – 1212 BL', 'Wikipedia: X (lead): https://en.wikipedia.org/wiki/X', 'https://example.org/#ramesses-ii'])
      expect(body).toContain(s);
  });

  it('lists each source once, with its locators joined; no labels', () => {
    const many = { ...ev, sources: [{ sourceKey: 'wp-x', sourceLocation: 'lead' }, { sourceKey: 'wp-x', sourceLocation: 'infobox' }, { sourceKey: 'wp-x', sourceLocation: 'lead' }] };
    const u = new URL(reportUrl(bundled(), many, 'x')!);
    const lines = u.searchParams.get('body')!.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toEqual(['- Wikipedia: X (lead; infobox): https://en.wikipedia.org/wiki/X']);
    expect(u.searchParams.has('labels')).toBe(false);
  });

  it('gives no link for a timeline this site doesn’t ship (a reader’s own, or a local one)', () => {
    const d = bundled();
    d.meta.id = 'my-own-timeline';
    expect(reportUrl(d, ev, 'x')).toBeNull();
  });
});
