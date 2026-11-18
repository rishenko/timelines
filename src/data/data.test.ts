import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isV1Data, isV2Data, migrateV1, migrateV2, upgrade } from './migrate.ts';
import { validateDataset } from './validate.ts';
import REDACTED from '../timelines/REDACTED.json';
import ancient from '../timelines/ancient-near-east.json';
import classical from '../timelines/classical.json';
import example from '../../docs/examples/example-timeline.json';
import { resolveEvents, defaultSelection } from '../lib/chronology.ts';
import { relatedRegions, relatedSiblings, proximityParents, allowedDistance } from './proximity.ts';
import type { Dataset } from '../types.ts';
import { compileSource, compiledText } from '../../scripts/lib/compile.ts';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';

// Sibling checkouts, used when present: v1's data file and v2's (schema 2) data file. They test the converters for
// old REDACTED files (readers can still upload them); the bundled REDACTED data now lives here, in data-src/REDACTED.json.
const V1_PATH = '../REDACTED/src/data/REDACTED-timeline-data.json';
const V2_PATH = '../REDACTED/src/data/timeline.json';

function load(path: string) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const shipped: [string, Dataset][] = [
  ['REDACTED', REDACTED as Dataset],
  ['ancient-near-east', ancient as unknown as Dataset],
  ['classical', classical as unknown as Dataset],
];

describe('shipped timelines', () => {
  it('links between neighbouring timelines point at real timelines, and the ancient and Classical ones meet', () => {
    const ids = new Set(shipped.map(([id]) => id));
    for (const [, ds] of shipped) for (const c of ds.meta.continues ?? []) expect(ids.has(c.timeline), c.timeline).toBe(true);
    const a = (ancient as unknown as Dataset).meta.continues?.find((c) => c.timeline === 'classical');
    const b = (classical as unknown as Dataset).meta.continues?.find((c) => c.timeline === 'ancient-near-east');
    expect(a?.side).toBe('after');
    expect(b?.side).toBe('before');
    // the overlap: the Classical timeline opens the ancient one at its own start, which lies before the ancient end
    expect(b!.at).toBeLessThan(a!.at);
  });

  it('meta.continues entries are checked', () => {
    const d = structuredClone(ancient) as unknown as Dataset;
    d.meta.continues = [{ timeline: 'classical', at: -329, side: 'after' }];
    expect(validateDataset(d)).toEqual([]);
    d.meta.continues = [{ timeline: 'classical', at: 1.5, side: 'sideways' as 'after' }];
    expect(validateDataset(d).join()).toContain('meta.continues[0] needs');
  });
  for (const [id, ds] of shipped) {
    it(`${id} is valid`, () => {
      expect(validateDataset(ds)).toEqual([]);
      expect(ds.meta.id).toBe(id);
    });
  }

  // The historical timelines: every date is cited, and rows that interacted sit together.
  const historical: [string, Dataset][] = [
    ['ancient-near-east', ancient as unknown as Dataset],
    ['classical', classical as unknown as Dataset],
  ];
  for (const [id, ds] of historical) {
    it(`${id}: every event cites at least one source, and every claim has one`, () => {
      for (const e of ds.events) {
        expect(e.sources.length, e.title).toBeGreaterThan(0);
        for (const c of [...(e.startDates ?? []), ...(e.endDates ?? [])]) expect(c.source, e.title).toBeDefined();
      }
      for (const t of ds.tracks) for (const c of [...(t.span?.startDates ?? []), ...(t.span?.endDates ?? [])])
        expect(c.source, t.id).toBeDefined();
    });

    it(`${id}: groups, and the regions inside each group, that interacted sit near each other`, () => {
      // Rows run west to east so partners are close. If this fails after adding data, move the rows
      // listed (or their civilizations) closer together rather than loosening the limits.
      const far = proximityParents(ds, 2).flatMap((parent) =>
        relatedSiblings(ds, parent)
          .filter((p) => p.distance > allowedDistance(p.shared))
          .map((p) => `${parent ?? 'top level'}: ${p.a} and ${p.b}: ${p.shared} shared, ${p.distance} apart (max ${allowedDistance(p.shared)})`),
      );
      expect(far).toEqual([]);
    });
  }

  // A source file edited without `npm run data -- build <timeline>` would ship stale data.
  for (const t of SOURCE_TIMELINES) {
    it(`${t.compiled} is up to date with ${t.source}`, () => {
      const { dataset, errors } = compileSource(JSON.parse(readFileSync(t.source, 'utf8')));
      expect(errors).toEqual([]);
      // line endings may differ after a git checkout on Windows
      const shipped = readFileSync(t.compiled, 'utf8').replace(/\r\n/g, '\n');
      expect(compiledText(dataset) === shipped, `run: npm run data -- build ${t.short}`).toBe(true);
    });
  }
});

describe('relatedSiblings', () => {
  it('scores the children of one parent; events outside it are ignored', () => {
    const ds = {
      tracks: [{ id: 'g' }, { id: 'a', parent: 'g' }, { id: 'a1', parent: 'a' }, { id: 'b', parent: 'g' }, { id: 'c', parent: 'g' }, { id: 'h' }],
      events: [
        { uuid: 'x', tracks: ['a1', 'c'] },
        { uuid: 'y', tracks: ['b', 'h'] },
      ],
    } as unknown as Dataset;
    expect(relatedSiblings(ds, 'g')).toEqual([{ a: 'a', b: 'c', shared: 1, distance: 2 }]);
    expect(relatedSiblings(ds)).toEqual([{ a: 'g', b: 'h', shared: 1, distance: 1 }]);
    expect(proximityParents(ds, 2)).toEqual([undefined, 'g']);
  });
});

describe('relatedRegions', () => {
  it('counts shared events and links between regions, at their distance in row order', () => {
    const ds = {
      tracks: [{ id: 'a' }, { id: 'a1', parent: 'a' }, { id: 'b' }, { id: 'c' }],
      events: [
        { uuid: 'x', tracks: ['a1', 'c'] },
        { uuid: 'y', tracks: ['b'], links: [{ to: 'x', kind: 'causes' }] },
        { uuid: 'z', tracks: ['a', 'a1'] },
      ],
    } as unknown as Dataset;
    expect(relatedRegions(ds)).toEqual([
      { a: 'a', b: 'c', shared: 1, distance: 2 },
      { a: 'a', b: 'b', shared: 1, distance: 1 },
    ]);
  });
  it('counts an event once per pair, even when it also links to one of its regions', () => {
    const ds = {
      tracks: [{ id: 'a' }, { id: 'b' }],
      events: [
        { uuid: 'x', tracks: ['a'] },
        { uuid: 'y', tracks: ['b', 'a'], links: [{ to: 'x', kind: 'part-of' }] },
      ],
    } as unknown as Dataset;
    expect(relatedRegions(ds)).toEqual([{ a: 'a', b: 'b', shared: 1, distance: 1 }]);
  });
});

describe('documented example (docs/examples/example-timeline.json)', () => {
  const ds = example as unknown as Dataset;
  it('is valid', () => {
    expect(validateDataset(ds)).toEqual([]);
  });
  it('shows the features the format doc describes', () => {
    expect(ds.meta.calendar.yearZero).toBe(false);
    expect(ds.tracks.some((t) => t.parent && ds.tracks.find((p) => p.id === t.parent)?.parent)).toBe(true); // 3 levels
    expect(ds.tracks.some((t) => t.span?.startDates)).toBe(true);
    expect(ds.tracks.some((t) => t.pinLast)).toBe(true);
    expect(ds.events.some((e) => e.ongoing)).toBe(true);
    expect(ds.events.some((e) => e.circa)).toBe(true);
    expect(Object.values(ds.chronologies ?? {}).some((c) => c.derive)).toBe(true);
    const byId = new Map(resolveEvents(ds, defaultSelection(ds)).map((e) => [e.uuid, e]));
    // claims give the First War a range; the circa flood gets ±circaFade
    // the First War's range: the chronicle's 85 ± 2, and the temple reckoning derived from the court date (88 - 12)
    expect(byId.get('first-war')!.startWindow).toEqual([76, 88]);
    expect(byId.get('great-flood')!.startWindow).toEqual([145, 155]);
    // the temple reckoning re-plots dates before the reform, not after
    const temple = new Map(resolveEvents(ds, { 'The North': 'temple' }).map((e) => [e.uuid, e]));
    expect(temple.get('founding')!.start).toBe(-11);
    expect(temple.get('calendar-reform')!.start).toBe(188);
    expect(temple.get('ilse-reign')!.start).toBe(321);
  });
});

describe('validateDataset', () => {
  const base = (): Dataset => structuredClone(REDACTED as Dataset);

  it('catches end before start', () => {
    const d = base();
    d.events[0].end = d.events[0].start - 5;
    expect(validateDataset(d).join()).toMatch(/ends .* before it starts/);
  });

  it('catches unknown tracks, sources and links', () => {
    const d = base();
    d.events[0].tracks = ['nope'];
    d.events[1].sources = [{ sourceKey: 'nope', sourceLocation: '' }];
    d.events[2].links = [{ to: 'missing', kind: 'causes' }];
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/unknown track "nope"/);
    expect(errs).toMatch(/unknown source "nope"/);
    expect(errs).toMatch(/unknown event "missing"/);
  });

  it('checks phases like lifespans', () => {
    const d = base();
    const union = d.tracks.find((t) => t.id === 'redacted')!;
    expect(union.phases?.map((p) => p.name)).toEqual(['First REDACTED', 'Second REDACTED', 'Third REDACTED']);
    union.phases = [
      { name: '', start: 0, end: 10 },
      { name: 'Backwards', start: 10, end: 5 },
      { name: 'Off claims', start: 20, end: 30, startDates: [{ year: 50 }] },
      { name: 'Bad source', start: 40, end: 50, endDates: [{ year: 50, source: { sourceKey: 'nope', sourceLocation: '' } }] },
    ];
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/phase 1 has no name/);
    expect(errs).toMatch(/phase "Backwards" ends before it starts/);
    expect(errs).toMatch(/phase "Off claims" start: the best estimate \(20\) lies outside its claims/);
    expect(errs).toMatch(/phase "Bad source" end: a date claim cites unknown source "nope"/);
  });

  it('catches duplicate ids', () => {
    const d = base();
    d.events[1].uuid = d.events[0].uuid;
    expect(validateDataset(d).join()).toMatch(/Duplicate event uuid/);
  });

  it('allows nesting to any depth', () => {
    const d = base();
    d.tracks.push(
      { id: 'a', name: 'A', color: '#000', parent: 'redacted' },
      { id: 'b', name: 'B', color: '#000', parent: 'a' },
      { id: 'c', name: 'C', color: '#000', parent: 'b' },
      { id: 'e', name: 'E', color: '#000', parent: 'c' },
    );
    expect(validateDataset(d)).toEqual([]);
  });

  it('catches parent cycles', () => {
    const d = base();
    d.tracks.push({ id: 'a', name: 'A', color: '#000', parent: 'b' }, { id: 'b', name: 'B', color: '#000', parent: 'a' });
    expect(validateDataset(d).join()).toMatch(/own ancestor/);
  });

  it('checks date claims: chronology, source, margin, and that the best estimate lies within them', () => {
    const d = base();
    d.chronologies = { mid: { name: 'Middle', group: 'g' } };
    d.events[0].startDates = [{ year: d.events[0].start + 10, margin: -1, chronology: 'nope', source: { sourceKey: 'x', sourceLocation: '' } }];
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/negative margin/);
    expect(errs).toMatch(/unknown chronology "nope"/);
    expect(errs).toMatch(/unknown source "x"/);
    expect(errs).toMatch(/outside its claims/);
  });

  it('requires defaultIncrement to be one of the increments', () => {
    const d = base();
    d.meta.defaultIncrement = 7;
    expect(validateDataset(d).join()).toMatch(/defaultIncrement/);
  });
});

describe('migration', () => {
  const v1 = load(V1_PATH);
  const v2 = load(V2_PATH);

  it.skipIf(!v1)('v1 → v3 keeps every non-marker entry', () => {
    expect(isV1Data(v1)).toBe(true);
    const { data, from } = upgrade(v1);
    expect(from).toBe(1);
    const ds = data as Dataset;
    const nonMarkers = v1.timeline.filter((e: { marker?: boolean }) => !e.marker);
    expect(ds.events).toHaveLength(nonMarkers.length);
    expect(validateDataset(ds)).toEqual([]);
    // BE years become negative; REDACTED has a year 0, so stored years equal the signed years
    expect(ds.events.find((e) => e.title === 'Beginning of The REDACTED')!.start).toBe(-5500);
    expect(ds.tracks.map((t) => t.id)).not.toContain('REDACTED');
    expect(Object.keys(ds.sources)).not.toContain('all-sources');
    expect(migrateV1(v1).schemaVersion).toBe(2);
  });

  it.skipIf(!v2)('v2 → v3 keeps every event and its years unchanged', () => {
    expect(isV2Data(v2)).toBe(true);
    const ds = migrateV2(v2);
    expect(validateDataset(ds)).toEqual([]);
    expect(ds.events).toHaveLength(v2.events.length);
    for (const [i, e] of v2.events.entries()) {
      expect(ds.events[i].uuid).toBe(e.uuid);
      expect(ds.events[i].start).toBe(e.start);
      expect(ds.events[i].end).toBe(e.end);
    }
    expect(ds.meta.calendar.yearZero).toBe(true);
    expect(ds.tracks.find((t) => t.id === 'REDACTED')!.pinLast).toBe(true);
    expect(ds.tracks.find((t) => t.id === 'redacted')!.image).toBe('timelines/REDACTED/logos/redacted.svg');
    expect(ds.sources.REDACTED.tags).toEqual(v2.sources.REDACTED.publishingAttributes);
  });

  it('leaves v3 data alone', () => {
    expect(upgrade(REDACTED).from).toBeUndefined();
  });
});
