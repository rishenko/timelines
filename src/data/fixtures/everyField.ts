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
/** A source reference. */
function ref(sourceLocation: string, sourceKey: 'ledger' | 'logbook' = 'ledger') {
  return { sourceKey, sourceLocation };
}

/** A date claim with every field set. */
function claim(year: number, month: number, day: number, at: string) {
  return { year, month, day, margin: 0, chronology: 'court', source: ref(at), note: `As given, ${at}.` };
}

export const everyField = {
  schemaVersion: 4,
  meta: {
    id: 'every-field',
    title: 'Every Field',
    subtitle: 'The schema test timeline',
    description: 'A fictional timeline that uses every field of the format once.',
    credits: 'Made up for tests.',
    creditsImage: 'timelines/example/quay.svg',
    calendar: { before: 'BL', after: 'L', yearZero: true, aliases: { before: ['B.L.'], after: ['A.L.'] } },
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
        values: {
          coast: { name: 'The coast' },
          bay: { name: 'The bay', broader: ['coast'] },
        },
      },
    },
    continues: [{ timeline: 'harbor-towns', at: 300, side: 'after' }],
    range: { start: -100, end: 300 },
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
    },
    logbook: { name: "A Pilot's Logbook", tags: ['canon'], hiddenByDefault: true },
  },
  chronologies: {
    court: {
      name: 'Court annals',
      group: 'The North',
      default: true,
      description: 'The count kept at court.',
      source: { sourceKey: 'ledger', sourceLocation: 'p. 2' },
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
      memberships: [{ facet: 'region', value: 'bay', sources: [ref('p. 4')] }],
      memberOf: [
        {
          row: 'league',
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
      links: [{ to: 'founding', kind: 'succeeds' }],
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
      tracks: ['league', 'others'],
      sources: [ref('entry 50', 'logbook')],
    },
    { uuid: 'league-ends', title: 'The League ends', descr: 'Its last council.', start: 200, startMonth: 8, startDay: 1, tracks: ['league'], sources: [ref('p. 30')] },
  ],
} satisfies Dataset;

type Unset = UnsetPaths<Dataset, typeof everyField>;
/** Fails the build, naming the fields, when the fixture leaves a field of the schema unset. */
export const setsEveryField: [Unset] extends [never] ? true : Unset = true;
