import { describe, expect, it } from 'vitest';
import { explain, find, flagKind, openFlags, rulingsFor, type Timeline } from './why.ts';

const reign = { facet: 'category', value: 'reign' };
const tl: Timeline = {
  id: 'modern-states',
  data: {
    tracks: [{ id: 'asia' }, { id: 'japan', parent: 'asia' }, { id: 'korea', parent: 'asia' }],
    sources: { 'wp-ieyasu': { name: 'Tokugawa Ieyasu (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Tokugawa_Ieyasu' } },
    events: [
      { uuid: 'reign-ieyasu-japan', title: 'Reign of Tokugawa Ieyasu', start: 1603, end: 1605, tracks: ['japan'], memberships: [reign],
        sources: [{ sourceKey: 'wp-ieyasu', sourceLocation: 'infobox term_start: 1603 – 1605' }] },
      { uuid: 'sekigahara', title: 'Battle of Sekigahara', start: 1600, tracks: ['japan'], sources: [] },
      { uuid: 'reign-x-korea', title: 'Reign of X', start: 1600, end: 1610, tracks: ['korea'], memberships: [reign], sources: [] },
    ],
  },
  prov: {
    'reign-ieyasu-japan': { row: 'japan', person: 'Tokugawa Ieyasu', qid: 'Q171977', route: 'office: Shogun', cited: 'Tokugawa Ieyasu',
      toCheck: ['Wikidata differs: 1603 – 1605'] },
    'reign-x-korea': { row: 'korea', person: 'X', toCheck: ['no end read: shown as one year', 'Wikidata differs: 1601'] },
  },
};
const rulings = [
  { id: 'office-scope-japan-modern', kind: 'office-scope', subject: 'row:modern-states/japan', headline: 'yes', decided_by: 'crew', date: '2026-11-24' },
  { id: 'date-japan', kind: 'date', subject: 'row:japan', headline: '1603', decided_by: 'owner', date: '2026-11-24' },
];

describe('why', () => {
  it('finds by uuid, by row and year (reigns first), and by row and words of the title or the person', () => {
    expect(find([tl], ['sekigahara']).map((h) => h.ev.uuid)).toEqual(['sekigahara']);
    expect(find([tl], ['japan', '1603']).map((h) => h.ev.uuid)).toEqual(['reign-ieyasu-japan']);
    expect(find([tl], ['modern-states/japan', 'ieyasu']).map((h) => h.ev.uuid)).toEqual(['reign-ieyasu-japan']);
    expect(find([tl], ['medieval/japan', 'ieyasu'])).toEqual([]);
  });

  it('gives a reign its row\'s office-scope rulings, and no event its row\'s date ruling', () => {
    const [ieyasu, battle] = [tl.data.events[0], tl.data.events[1]];
    expect(rulingsFor(rulings, 'modern-states', ieyasu).map((r) => r.id)).toEqual(['office-scope-japan-modern']);
    expect(rulingsFor(rulings, 'modern-states', battle)).toEqual([]);
  });

  it('explains a reign: source and cited text, provenance with its open flags, rulings', () => {
    const lines = explain({ tl, ev: tl.data.events[0] }, rulings);
    expect(lines).toContain('    cites infobox term_start: 1603 – 1605');
    expect(lines).toContain('  provenance person Tokugawa Ieyasu (Q171977)');
    expect(lines).toContain('    open flag Wikidata differs: 1603 – 1605');
    expect(lines).toContain('  ruling office-scope-japan-modern (crew, 2026-11-24): yes');
  });

  it('lists open flags by region (a row and the rows under it) and by kind', () => {
    expect(openFlags([tl]).length).toBe(3);
    expect(openFlags([tl], 'korea').map((f) => f.flag)).toEqual(['no end read: shown as one year', 'Wikidata differs: 1601']);
    expect(openFlags([tl], 'asia', 'differs').map((f) => f.uuid)).toEqual(['reign-ieyasu-japan', 'reign-x-korea']);
    expect(flagKind('office noun unclear (shown as "Tenure of"): Governor')).toBe('office noun unclear');
  });
});
