import { describe, expect, it } from 'vitest';
import type { Dataset, Track } from '../types.ts';
import { buildIndex, normalize, search, trackRange, type EventLike } from './search.ts';
import { ancestorIds } from './tracks.ts';
import ancient from '../../public/timelines/ancient-near-east.json';
import classical from '../../public/timelines/classical.json';

const tracks: Track[] = [
  { id: 'ne', name: 'Near East', color: '#000' },
  { id: 'anatolia', name: 'Anatolia', color: '#000', parent: 'ne' },
  { id: 'hittites', name: 'Hittites', color: '#000', parent: 'anatolia', span: { start: -1649, end: -1179 } },
  { id: 'egypt', name: 'Egypt', color: '#000', parent: 'ne' },
  { id: 'pacific', name: 'Pacific', color: '#000' },
  { id: 'hawaii', name: 'Hawaiʻi', color: '#000', parent: 'pacific' },
];
const events: EventLike[] = [
  { uuid: 'kadesh', title: 'Battle of Kadesh', start: -1273, tracks: ['egypt', 'hittites'], importance: 1 },
  { uuid: 'treaty', title: 'Egyptian–Hittite peace treaty', start: -1258, tracks: ['egypt', 'hittites'] },
  { uuid: 'hattusa', title: 'Ḫattuša destroyed', start: -1179, tracks: ['hittites'] },
  { uuid: 'pyr', title: 'Great Pyramid', start: -2559, end: -2539, tracks: ['egypt'] },
];
const index = buildIndex(tracks, events);
const ids = (q: string) => search(index, q).map((h) => h.entry.id);

describe('normalize', () => {
  it('drops case, accents and apostrophe-like marks', () => {
    expect(normalize('Ḫattuša')).toBe('hattusa');
    expect(normalize('Hawaiʻi')).toBe('hawaii');
    expect(normalize('Egyptian–Hittite  peace')).toBe('egyptian hittite peace');
  });
});

describe('search', () => {
  it('finds rows, with their path', () => {
    const [hit] = search(index, 'hittites');
    expect(hit.entry).toMatchObject({ kind: 'track', id: 'hittites', path: ['Near East', 'Anatolia'] });
  });

  it('puts the row before events that mention it', () => {
    expect(ids('hittite')[0]).toBe('hittites');
    expect(ids('hittite')).toContain('treaty');
  });

  it('matches word starts anywhere in a name', () => {
    expect(ids('kadesh')).toEqual(['kadesh']);
    expect(ids('peace hit')).toEqual(['treaty']);
  });

  it('ignores accents and apostrophes', () => {
    expect(ids('hattusa')).toEqual(['hattusa']);
    expect(ids('hawaii')).toEqual(['hawaii']);
  });

  it('matches words spread across an event and its row, after direct matches', () => {
    expect(ids('egypt pyramid')).toEqual(['pyr']);
    expect(ids('egypt')[0]).toBe('egypt');
  });

  it('gives events the path of their first row', () => {
    expect(search(index, 'kadesh')[0].entry.path).toEqual(['Near East', 'Egypt']);
  });

  it('returns nothing for an empty query or a miss', () => {
    expect(ids('  ')).toEqual([]);
    expect(ids('zzz')).toEqual([]);
  });

  it('matches mid-word only for queries of four letters or more', () => {
    expect(ids('ttus')).toEqual(['hattusa']);
    expect(ids('ttu')).toEqual([]);
  });

  it('caps the result count', () => {
    const many = buildIndex([], Array.from({ length: 50 }, (_, i) => ({ uuid: `e${i}`, title: `Event ${i}`, start: i, tracks: [] })));
    expect(search(many, 'event', 20)).toHaveLength(20);
  });
});

describe('ancestorIds and trackRange', () => {
  it('lists ancestors outermost first', () => {
    expect(ancestorIds('hittites', tracks)).toEqual(['ne', 'anatolia']);
    expect(ancestorIds('ne', tracks)).toEqual([]);
  });

  it('uses a lifespan when there is one, else the events on the row and its sub-rows', () => {
    expect(trackRange('hittites', tracks, events)).toEqual({ start: -1649, end: -1179 });
    expect(trackRange('ne', tracks, events)).toEqual({ start: -2559, end: -1179 });
    expect(trackRange('pacific', tracks, events)).toBeUndefined();
  });
});

describe('on the bundled timelines', () => {
  for (const ds of [ancient, classical] as unknown as Dataset[]) {
    const idx = buildIndex(ds.tracks, ds.events);
    it(`${ds.meta.id}: every row finds itself first by its own name`, () => {
      // rows sharing a name with another row are allowed to tie
      const names = new Map<string, number>();
      for (const t of ds.tracks) names.set(normalize(t.name), (names.get(normalize(t.name)) ?? 0) + 1);
      for (const t of ds.tracks) {
        const hits = search(idx, t.name, 50).filter((h) => h.score === 0 && h.entry.kind === 'track');
        expect(hits.map((h) => h.entry.id), t.name).toContain(t.id);
        if (names.get(normalize(t.name)) === 1) expect(search(idx, t.name)[0].entry.id, t.name).toBe(t.id);
      }
    });
  }
});

describe('search phases', () => {
  const rows: Track[] = [
    { id: 'europe', name: 'Europe', color: '#000' },
    {
      id: 'france',
      name: 'France',
      color: '#000',
      parent: 'europe',
      phases: [
        { name: 'Second Republic', start: 1848, end: 1852 },
        { name: 'Second Empire', start: 1852, end: 1870 },
      ],
    },
  ];
  const idx = buildIndex(rows, [{ uuid: 'coup', title: 'Coup of the Second Empire', start: 1851, tracks: ['france'] }]);

  it('finds a phase by name, with its row as the path', () => {
    const [hit] = search(idx, 'second republic');
    expect(hit.entry).toMatchObject({ kind: 'phase', id: 'france#0', trackId: 'france', path: ['Europe', 'France'], start: 1848 });
  });

  it('ranks phases after rows and before events on a tie', () => {
    expect(search(idx, 'second').map((h) => h.entry.kind)).toEqual(['phase', 'phase', 'event']);
  });
});
