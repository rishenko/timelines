import { describe, expect, it } from 'vitest';
import type { Dataset, RowMembership } from '../types.ts';
import { validateDataset } from '../data/validate.ts';
import { defaultSelection } from './chronology.ts';
import { bestLifespan, membersByUnion, membersTip, membershipLabel, resolveMemberships, shortYears } from './memberOf.ts';
import { successionIndex, edgeName } from './succession.ts';

const CE = { before: 'BCE', after: 'CE', yearZero: false };
const cite = [{ sourceKey: 'wp', sourceLocation: 'infobox' }];

/** A union (1922–1991) with a parent group, and two members: one with phases, one with a typed lifespan. */
function union(memberOf: Partial<RowMembership>[] = [], on = 'ukraine'): Dataset {
  const d: Dataset = {
    schemaVersion: 8,
    meta: { id: 't', title: 'T', calendar: CE, increments: [10], defaultIncrement: 10 },
    present: 2026,
    tracks: [
      { id: 'east', name: 'East', color: '#777777' },
      { id: 'ussr', name: 'Soviet Union', color: '#b33a3a', parent: 'east', span: { start: 1922, end: 1991 } },
      { id: 'ussr-part', name: 'Part', color: '#b33a3a', parent: 'ussr', span: { start: 1922, end: 1991 } },
      {
        id: 'ukraine',
        name: 'Ukraine',
        color: '#3a6fb3',
        parent: 'east',
        phases: [
          { name: 'Hetmanate', start: 1648, end: 1764 },
          { name: 'Ukrainian SSR', start: 1919, end: 1991 },
          { name: 'Ukraine', start: 1991, ongoing: true },
        ],
      },
      { id: 'estonia', name: 'Estonia', color: '#3a8fb3', parent: 'east', span: { start: 1918, ongoing: true } },
    ],
    sources: { wp: { name: 'Wikipedia', tags: [] } },
    tags: {},
    events: [
      { uuid: 'founded', title: 'USSR founded', descr: '', start: 1922, tracks: ['ussr'], sources: [] },
      { uuid: 'dissolved', title: 'USSR dissolved', descr: '', start: 1991, tracks: ['ussr'], sources: [] },
    ],
  };
  d.tracks.find((t) => t.id === on)!.memberOf = memberOf.map((m) => ({ row: 'ussr', start: 1922, end: 1991, sources: cite, ...m }) as RowMembership);
  return d;
}

describe('validating memberships (memberOf)', () => {
  it('accepts a membership within both lifespans, with sources, claims and events', () => {
    expect(validateDataset(union([{ startDates: [{ year: 1922, source: cite[0] }], startEvent: 'founded', endEvent: 'dissolved' }]))).toEqual([]);
  });

  it('refuses an unknown row, the row itself, or its own sub-row', () => {
    expect(validateDataset(union([{ row: 'nowhere' }]))).toEqual(['Track "ukraine" membership 1 names unknown row "nowhere".']);
    expect(validateDataset(union([{ row: 'ussr' }], 'ussr'))[0]).toMatch(/names the row itself/);
    const d = union([{ row: 'ussr-part' }], 'ussr');
    expect(validateDataset(d)[0]).toMatch(/names "ussr-part", which sits under it/);
  });

  it('refuses years outside either row’s lifespan (best estimates), including a gap between phases', () => {
    expect(validateDataset(union([{ start: 1920 }]))).toEqual(['Track "ukraine" membership 1 (in "ussr") (1920 CE – 1991 CE) lies outside the lifespan of "ussr".']);
    // Ukraine's lifespan is worked out from its phases: blank 1765–1918
    const d = union([{ start: 1922, end: 1991 }]);
    d.tracks.find((t) => t.id === 'ussr')!.span = { start: 1900, end: 1991 };
    d.tracks.find((t) => t.id === 'ukraine')!.memberOf![0].start = 1900;
    expect(validateDataset(d)).toEqual(['Track "ukraine" membership 1 (in "ussr") (1900 CE – 1991 CE) lies outside the lifespan of "ukraine".']);
    // an ongoing membership runs to the present, past the union's end
    expect(validateDataset(union([{ start: 1940, end: undefined, ongoing: true }], 'estonia'))[0]).toMatch(/1940 CE – ongoing\) lies outside the lifespan of "ussr"/);
  });

  it('needs at least one known source, and dates like a phase', () => {
    expect(validateDataset(union([{ sources: [] }]))).toEqual(['Track "ukraine" membership 1 (in "ussr") cites no source.']);
    expect(validateDataset(union([{ sources: [{ sourceKey: 'nope', sourceLocation: '' }] }]))).toEqual([
      'Track "ukraine" membership 1 (in "ussr") cites unknown source "nope".',
    ]);
    expect(validateDataset(union([{ end: 1900 }]))[0]).toMatch(/membership 1 \(in "ussr"\) ends before it starts/);
    expect(validateDataset(union([{ startDates: [{ year: 1930 }] }]))[0]).toMatch(/best estimate \(1922\) lies outside its claims/);
  });

  it('checks its events like a phase’s', () => {
    expect(validateDataset(union([{ startEvent: 'dissolved' }]))[0]).toMatch(/membership 1 \(in "ussr"\) starts in 1922 CE, but its startEvent "USSR dissolved"/);
    expect(validateDataset(union([{ endEvent: 'gone' }]))).toEqual(['Track "ukraine" membership 1 (in "ussr") endEvent names unknown event "gone".']);
  });

  it('old files without memberOf load unchanged', () => {
    const d = union();
    delete d.tracks.find((t) => t.id === 'ukraine')!.memberOf;
    expect(validateDataset(d)).toEqual([]);
  });
});

describe('resolving and naming memberships', () => {
  it('resolves memberships per member and lists each union’s members', () => {
    const d = union([{ endEvent: 'dissolved' }]);
    d.tracks.find((t) => t.id === 'estonia')!.memberOf = [{ row: 'ussr', start: 1940, end: 1991, sources: cite }];
    const m = resolveMemberships(d, defaultSelection(d));
    expect(m.get('ukraine')).toEqual([{ start: 1922, end: 1991, row: 'ussr', sources: cite, endEvent: 'dissolved', startWindow: undefined, endWindow: undefined, index: 0 }]);
    const members = membersByUnion(m).get('ussr')!;
    expect(members.map((u) => u.member)).toEqual(['ukraine', 'estonia']);
    expect(membersTip(members, (id) => d.tracks.find((t) => t.id === id)!.name, CE)).toBe('Members (2): Ukraine 1922–91, Estonia 1940–91');
  });

  it('writes short years: the shared century left out, full years across centuries or eras, "since" when ongoing', () => {
    expect(shortYears({ start: 1922, end: 1991 }, CE)).toBe('1922–91');
    expect(shortYears({ start: 1517, end: 1914 }, CE)).toBe('1517–1914');
    expect(shortYears({ start: 3055, end: 3057 }, CE)).toBe('3055–57');
    expect(shortYears({ start: 1958, end: 1958 }, CE)).toBe('1958');
    expect(shortYears({ start: 1991, end: 2026, ongoing: true }, CE)).toBe('since 1991');
    expect(shortYears({ start: -99, end: 50 }, CE, true)).toBe('c. 100 BCE–50 CE');
    expect(membershipLabel({ start: 1922, end: 1991, row: 'ussr', sources: [], index: 0 }, 'Soviet Union', CE)).toBe('in Soviet Union, 1922–91');
  });

  it('names the phase that held a membership, on the strip and in the union\'s list of members', () => {
    const west = { start: 1955, end: 1990, row: 'nato', phase: 'West Germany', sources: [], index: 0 };
    expect(membershipLabel(west, 'NATO', CE)).toBe('West Germany in NATO, 1955–90');
    expect(membersTip([{ member: 'germany', membership: west }], () => 'Germany', CE)).toBe('Members (1): Germany (West Germany) 1955–90');
  });

  it('works out a lifespan from best estimates, as the validator reads it', () => {
    expect(bestLifespan(union().tracks.find((t) => t.id === 'ukraine')!, 2026)).toEqual([
      { start: 1648, end: 1764 },
      { start: 1919, end: 2026 },
    ]);
  });

  it('lists memberships begun and ended by an event', () => {
    const d = union([{ startEvent: 'founded', endEvent: 'dissolved' }]);
    const s = successionIndex(d.tracks).get('dissolved')!;
    expect(s.ended.map((e) => edgeName(e, d))).toEqual(['Ukraine in Soviet Union']);
  });
});
