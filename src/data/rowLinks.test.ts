import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateDataset } from './validate.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { applyRowLinks, pageUrl, type RowLinkPlan } from '../../scripts/lib/row-links.ts';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import { eventsCsv } from '../lib/table.ts';
import type { Dataset } from '../types.ts';

const withRow = (patch: Record<string, unknown>) => {
  const d = plainTimeline();
  d.tracks[0] = { ...d.tracks[0], ...patch };
  return d;
};

describe('row links in the data format', () => {
  it('accepts a page link and a Wikidata id', () => {
    expect(validateDataset(withRow({ url: 'https://en.wikipedia.org/wiki/Harbor', ids: { wikidata: 'Q283202' } }))).toEqual([]);
  });

  it('refuses unsafe links and malformed ids', () => {
    expect(validateDataset(withRow({ url: 'javascript:alert(1)' })).join(' ')).toMatch(/url must be an http\(s\) link/);
    expect(validateDataset(withRow({ ids: { wikidata: 'Egypt' } })).join(' ')).toMatch(/ids\.wikidata must be a Wikidata item id/);
    expect(validateDataset(withRow({ ids: 'Q1' })).join(' ')).toMatch(/ids must be an object/);
  });
});

describe('applying a row-links plan', () => {
  const tracks = () => [
    { id: 'a', name: 'A', color: '#111', span: { start: 1, end: 2 } },
    { id: 'b', name: 'B', color: '#222', url: 'https://example.org/b', ids: { wikidata: 'Q2', other: 'x' } },
    { id: 'c', name: 'C', color: '#333' },
  ];
  const plan: RowLinkPlan = { a: { page: 'Ancient A', wikidata: 'Q1' }, b: null };

  it('puts url and ids next to the name, before the lifespan; null removes them; unlisted rows are left alone', () => {
    const t: Record<string, unknown>[] = tracks();
    applyRowLinks(t, plan);
    expect(Object.keys(t[0])).toEqual(['id', 'name', 'color', 'url', 'ids', 'span']);
    expect(t[0]).toMatchObject({ url: pageUrl('Ancient A'), ids: { wikidata: 'Q1' } });
    expect(t[1]).toEqual({ id: 'b', name: 'B', color: '#222', ids: { other: 'x' } });
    expect(t[2]).toEqual(tracks()[2]);
  });

  it('gives the same result when run twice', () => {
    const once: Record<string, unknown>[] = tracks();
    applyRowLinks(once, plan);
    const twice = structuredClone(once);
    applyRowLinks(twice, plan);
    expect(twice).toEqual(once);
  });

  it('writes Wikipedia addresses the way Wikipedia does', () => {
    expect(pageUrl('Jin dynasty (266–420)')).toBe('https://en.wikipedia.org/wiki/Jin_dynasty_(266%E2%80%93420)');
    expect(pageUrl('AC/DC')).toBe('https://en.wikipedia.org/wiki/AC/DC');
  });
});

describe('the included timelines', () => {
  for (const t of SOURCE_TIMELINES.filter((x) => x.rowLinks)) {
    it(`${t.short}: every row is decided in ${t.rowLinks}, and the data matches the plan`, () => {
      const plan: RowLinkPlan = JSON.parse(readFileSync(t.rowLinks!, 'utf8'));
      const d = JSON.parse(readFileSync(t.compiled, 'utf8')) as Dataset;
      expect(d.tracks.filter((r) => !(r.id in plan)).map((r) => r.id)).toEqual([]);
      for (const r of d.tracks) {
        const p = plan[r.id];
        expect(r.url, r.id).toBe(p ? pageUrl(p.page) : undefined);
        expect(r.ids?.wikidata, r.id).toBe(p?.wikidata);
      }
    });
  }
});

describe('the CSV download', () => {
  it("lists each event's rows' Wikidata ids, in the same order as its rows", () => {
    const d = withRow({ ids: { wikidata: 'Q283202' } });
    const lines = eventsCsv(d, d.events).trim().split('\n');
    const head = lines[0].split(',');
    const col = head.indexOf('rows_wikidata');
    expect(col).toBe(head.indexOf('rows') + 1);
    const first = d.tracks[0].id;
    const e = [...d.events].find((x) => x.tracks[0] === first)!;
    const line = lines.find((l) => l.startsWith(`${e.uuid},`))!;
    expect(line).toContain('Q283202');
  });
});
