import type { Dataset } from '../types.ts';

/**
 * A small fictional timeline for tests that need a plain one: top-level rows only (no regions), a calendar with a
 * year 0, phases on a row (one with two dates for its end), a row image, spans, an uncertain date, a "leads to"
 * link and a source tag for reader additions; and none of typed lifespans (Quay Town's is worked out from its
 * phases), dating systems, key events, "conquers" or "succeeds".
 */
export function plainTimeline(): Dataset {
  return {
    schemaVersion: 5,
    meta: {
      id: 'harbor-towns',
      title: 'The Harbor Towns',
      description: 'A fictional test timeline.',
      calendar: { before: 'BL', after: 'L', yearZero: true },
      increments: [1, 10, 50, 100],
      defaultIncrement: 10,
      customSourceTag: 'homebrew',
    },
    tags: { canon: { name: 'Canon' }, homebrew: { name: 'Homebrew' } },
    sources: {
      ledger: { name: 'The Harbor Ledger', tags: ['canon'] },
      logbook: { name: "A Pilot's Logbook", tags: ['canon'], url: 'https://example.com/logbook' },
    },
    chronologies: {},
    tracks: [
      {
        id: 'quay',
        name: 'Quay Town',
        color: '#4a86c8',
        image: 'timelines/example/quay.svg',
        phases: [
          { name: 'First Council', start: -40, end: 59 },
          { name: 'Second Council', start: 60, end: 179 },
          {
            name: 'Third Council',
            start: 180,
            end: 260,
            endDates: [
              { year: 255, source: { sourceKey: 'ledger', sourceLocation: 'p. 12' } },
              { year: 260, source: { sourceKey: 'logbook', sourceLocation: 'entry 40' } },
            ],
          },
        ],
      },
      { id: 'saltmarsh', name: 'Saltmarsh', color: '#c8643f' },
      { id: 'lighthouse', name: 'The Lighthouse Guild', color: '#6a8f4e' },
      { id: 'others', name: 'Other ports', color: '#7c8591', pinLast: true },
    ],
    events: [
      {
        uuid: 'founding',
        title: 'Quay Town founded',
        descr: 'The first pier is built.',
        start: -40,
        tracks: ['quay'],
        sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }],
      },
      {
        uuid: 'year-zero',
        title: 'The Lighthouse is lit',
        descr: 'The calendar counts from this year: 0 L.',
        start: 0,
        tracks: ['lighthouse', 'quay'],
        sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 3' }],
        links: [{ to: 'guild-charter', kind: 'causes' }],
      },
      {
        uuid: 'guild-charter',
        title: 'The Guild receives its charter',
        descr: 'The keepers form a guild.',
        start: 12,
        tracks: ['lighthouse'],
        sources: [{ sourceKey: 'logbook', sourceLocation: 'entry 2' }],
      },
      {
        uuid: 'salt-war',
        title: 'The Salt War',
        descr: 'Quay Town and Saltmarsh fight over the flats.',
        start: 95,
        end: 110,
        circa: true,
        startDates: [
          { year: 93, source: { sourceKey: 'ledger', sourceLocation: 'p. 7' } },
          { year: 97, source: { sourceKey: 'logbook', sourceLocation: 'entry 19' } },
        ],
        tracks: ['quay', 'saltmarsh'],
        sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 7' }],
      },
      {
        uuid: 'great-storm',
        title: 'The Great Storm',
        descr: 'Half the fleet is lost.',
        start: 150,
        tracks: ['saltmarsh'],
        sources: [{ sourceKey: 'logbook', sourceLocation: 'entry 31' }],
      },
      {
        uuid: 'trade-years',
        title: 'The Trade Years',
        descr: 'Ships from the other ports call weekly.',
        start: 200,
        end: 240,
        tracks: ['others', 'quay'],
        sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 11' }],
      },
    ],
  };
}

/** A second timeline for the test site (src/test/app.tsx), so tests can switch timelines and clash with ids. */
export function secondSiteTimeline(): Dataset {
  const d = plainTimeline();
  d.meta = { ...d.meta, id: 'second-site', title: 'A Second Timeline' };
  return d;
}
