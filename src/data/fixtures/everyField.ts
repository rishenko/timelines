import type { Dataset } from '../../types.ts';
import type { UnsetPaths } from '../../test/schemaCoverage.ts';

/**
 * A small fictional timeline that sets every field of the current schema somewhere: the schema's test fixture
 * (schemaVersions.test.ts). It must stay valid, and it is frozen as `v<version>.json` beside this file, so each
 * released version keeps a file that later migrators are tested on.
 *
 * Adding a field to src/types.ts fails the build until it is set here. To see every unset field at once:
 * `npx tsc -p tsconfig.test.json --noEmit --noErrorTruncation`.
 */
type Loc =
  | { kind: 'infobox'; field: string; value?: string }
  | { kind: 'lead'; quote: string }
  | { kind: 'section'; heading: string; quote?: string }
  | { kind: 'category'; name: string }
  | { kind: 'page'; page: string };

/** A source reference, with a locator (a page number unless given). */
function ref(sourceLocation: string, sourceKey: 'ledger' | 'logbook' = 'ledger', locator?: Loc) {
  return { sourceKey, sourceLocation, locator: locator ?? { kind: 'page' as const, page: sourceLocation.replace(/^p\. /, '') } };
}

/** A date claim with every field set. */
function claim(year: number, month: number, day: number, at: string) {
  return { year, month, day, margin: 0, chronology: 'court', source: ref(at), note: `As given, ${at}.` };
}

export const everyField = {
  schemaVersion: 9,
  meta: {
    id: 'every-field',
    title: 'Every Field',
    subtitle: 'The schema test timeline',
    description: 'A fictional timeline that uses every field of the format once.',
    credits: 'Made up for tests.',
    creditsImage: 'timelines/example/quay.svg',
    calendar: { before: 'BL', after: 'L', yearZero: true, aliases: { before: ['B.L.'], after: ['A.L.'] }, beforePresent: { present: 1950, circaShare: 0.01 } },
    increments: ['day', 'month', 1, 10, 100],
    defaultIncrement: 10,
    defaultTheme: 'parchment',
    customSourceTag: 'homebrew',
    circaFade: 5,
    collapsed: ['coast'],
    hideRowsOutOfView: false,
    facets: {
      region: {
        name: 'Region',
        applies: 'tracks',
        values: {
          coast: { name: 'The coast' },
          bay: { name: 'The bay', broader: ['coast'] },
        },
      },
      theme: { name: 'Theme', applies: 'events', values: { trade: { name: 'Trade' } } },
    },
    continues: [{ timeline: 'harbor-towns', at: 300, side: 'after' }],
    lines: { 'harbor-ages': { name: 'Harbor ages' } },
    range: { start: -100, end: 300 },
    context: [
      {
        id: 'long-harbor',
        name: 'The Long Harbor',
        url: 'https://example.com/long-harbor',
        ids: { wikidata: 'Q4243' },
        kind: 'age',
        color: '#8a9a5b',
        chronology: 'court',
        start: -40,
        startMonth: 3,
        startDay: 1,
        end: 59,
        endMonth: 12,
        endDay: 31,
        circa: true,
        startDates: [claim(-40, 3, 1, 'p. 1')],
        endDates: [claim(59, 12, 31, 'p. 9')],
        startEvent: 'founding',
        endEvent: 'council-falls',
        sources: [ref('p. 52')],
      },
      {
        id: 'age-of-leagues',
        name: 'The Age of Leagues',
        kind: 'golden-age',
        line: 'harbor-ages',
        start: 60,
        ongoing: true,
        ongoingSources: [ref('p. 51')],
        sources: [ref('p. 51')],
      },
    ],
  },
  present: 300,
  tags: { canon: { name: 'Canon' }, homebrew: { name: 'Homebrew' } },
  sources: {
    ledger: {
      name: 'The Harbor Ledger',
      tags: ['canon'],
      url: 'https://example.com/ledger',
      author: 'The Harbor Clerks',
      year: '2nd ed. 2007',
      accessed: '2026-11-01',
      dump: 'enwiki-20261101',
      revision: 1234567,
    },
    logbook: { name: "A Pilot's Logbook", tags: ['canon'], hiddenByDefault: true },
  },
  chronologies: {
    court: {
      name: 'Court annals',
      group: 'The North',
      default: true,
      description: 'The count kept at court.',
      source: ref('p. 2'),
    },
    temple: { name: 'Temple reckoning', group: 'The North', derive: { from: 'court', offset: -12, until: 200 } },
  },
  tracks: [
    { id: 'coast', name: 'The Coast', color: '#4a86c8' },
    {
      id: 'quay',
      name: 'Quay Town',
      color: '#3f7ab8',
      parent: 'coast',
      kind: 'polity',
      image: 'timelines/example/quay.svg',
      url: 'https://example.com/quay',
      ids: { wikidata: 'Q1' },
      chronology: 'court',
      span: {
        start: -40,
        startMonth: 3,
        startDay: 1,
        ongoing: true,
        ongoingSources: [ref('p. 40')],
        circa: true,
        startDates: [claim(-40, 3, 1, 'p. 1')],
        startEvent: 'founding',
      },
      phases: [
        {
          name: 'First Council',
          start: -40,
          end: 59,
          endMonth: 12,
          endDay: 31,
          endDates: [claim(59, 12, 31, 'p. 9')],
          endEvent: 'council-falls',
        },
        {
          name: 'Second Council',
          start: 60,
          startMonth: 1,
          startDay: 15,
          circa: true,
          startDates: [claim(60, 1, 15, 'p. 10')],
          ongoing: true,
          ongoingSources: [ref('p. 41')],
          startEvent: 'council-falls',
        },
      ],
      memberships: [{ facet: 'region', value: 'bay', sources: [ref('category "Bay towns"', 'ledger', { kind: 'category', name: 'Bay towns' })] }],
      memberOf: [
        {
          row: 'league',
          phase: 'Second Council',
          start: 131,
          startMonth: 4,
          startDay: 2,
          end: 150,
          endMonth: 6,
          endDay: 30,
          circa: true,
          startDates: [claim(131, 4, 2, 'p. 20')],
          endDates: [claim(150, 6, 30, 'p. 21')],
          startEvent: 'joins-league',
          endEvent: 'leaves-league',
          sources: [ref('p. 20')],
        },
        { row: 'bay-union', start: 210, ongoing: true, ongoingSources: [ref('p. 42')], sources: [ref('p. 42')] },
      ],
      context: [
        {
          id: 'age-of-piers',
          name: 'The Age of Piers',
          url: 'https://example.com/age-of-piers',
          ids: { wikidata: 'Q4242' },
          kind: 'age',
          line: 'harbor-ages',
          color: '#c8a24a',
          chronology: 'court',
          start: -40,
          startMonth: 3,
          startDay: 1,
          end: 59,
          endMonth: 12,
          endDay: 31,
          circa: true,
          startDates: [claim(-40, 3, 1, 'p. 1')],
          endDates: [claim(59, 12, 31, 'p. 9')],
          startEvent: 'founding',
          endEvent: 'council-falls',
          sources: [ref('p. 50')],
        },
        { id: 'quay-high-tide', name: 'High Tide', kind: 'golden-age', start: 60, ongoing: true, ongoingSources: [ref('p. 53')], sources: [ref('p. 53')] },
      ],
    },
    {
      id: 'league',
      name: 'The League',
      color: '#6a8f4e',
      span: [
        { start: 90, end: 120 },
        { start: 130, end: 200, endMonth: 8, endDay: 1, endDates: [claim(200, 8, 1, 'p. 30')], endEvent: 'league-ends' },
      ],
    },
    { id: 'bay-union', name: 'The Bay Union', color: '#8a5fb0', span: { start: 205, ongoing: true, ongoingSources: [ref('p. 43')] } },
    { id: 'salt-road', name: 'The Salt Road', color: '#b07a3f', kind: 'theme', span: { start: 100, end: 250 } },
    { id: 'others', name: 'Other ports', color: '#7c8591', pinLast: true },
  ],
  events: [
    {
      uuid: 'founding',
      title: 'Quay Town founded',
      descr: 'The first pier is built.',
      start: -40,
      startMonth: 3,
      startDay: 1,
      order: 1,
      importance: 1,
      tracks: ['quay'],
      sources: [ref('p. 1')],
    },
    {
      uuid: 'council-falls',
      title: 'The First Council falls',
      descr: 'The council is dissolved over the winter.',
      start: 59,
      startMonth: 12,
      startDay: 31,
      end: 60,
      endMonth: 1,
      endDay: 15,
      circa: true,
      chronology: 'court',
      startDates: [claim(59, 12, 31, 'p. 9')],
      endDates: [claim(60, 1, 15, 'p. 10')],
      tracks: ['quay'],
      sources: [ref('p. 12')],
      links: [{ to: 'founding', kind: 'succeeds' }, { to: 'founding', kind: 'with' }],
      edited: true,
    },
    { uuid: 'joins-league', title: 'Quay Town joins the League', descr: 'A treaty.', start: 131, startMonth: 4, startDay: 2, tracks: ['quay', 'league'], sources: [ref('p. 20')] },
    { uuid: 'leaves-league', title: 'Quay Town leaves the League', descr: 'A quarrel.', start: 150, startMonth: 6, startDay: 30, tracks: ['quay', 'league'], sources: [ref('p. 21')] },
    {
      uuid: 'long-watch',
      title: 'The Long Watch',
      descr: 'The League keeps a watch on the bay that has never been stood down.',
      start: 150,
      ongoing: true,
      ongoingSources: [ref('lead', 'ledger', { kind: 'lead', quote: 'the watch is kept to this day' })],
      tracks: ['league', 'others'],
      sources: [ref('entry 50', 'logbook', { kind: 'section', heading: 'The watch', quote: 'never stood down' })],
      memberships: [{ facet: 'theme', value: 'trade', sources: [ref('infobox purpose: trade', 'ledger', { kind: 'infobox', field: 'purpose', value: 'trade' })] }],
    },
    { uuid: 'league-ends', title: 'The League ends', descr: 'Its last council.', start: 200, startMonth: 8, startDay: 1, tracks: ['league'], sources: [ref('p. 30')] },
  ],
  redirects: { 'old-quay': 'quay', 'lost-storm': null },
} satisfies Dataset;

type Unset = UnsetPaths<Dataset, typeof everyField>;
/** Fails the build, naming the fields, when the fixture leaves a field of the schema unset. */
export const setsEveryField: [Unset] extends [never] ? true : Unset = true;
