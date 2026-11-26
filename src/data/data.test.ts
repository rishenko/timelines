import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateDataset } from './validate.ts';
import { plainTimeline } from '../test/fixtures.ts';
import combined from '../../public/timelines/ancient-classical.json';
import example from '../../docs/examples/example-timeline.json';
import ages from '../../docs/examples/named-ages-example.json';
import { validateStrict } from './strict.ts';
import { minorNeeded } from './migrate.ts';
import { formatYear } from '../lib/calendar.ts';
import { resolveEvents, defaultSelection } from '../lib/chronology.ts';
import { relatedRegions, relatedSiblings, proximityParents, allowedDistance } from './proximity.ts';
import type { Dataset } from '../types.ts';
import { compileSource, compiledText } from '../../scripts/lib/compile.ts';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import { spanStretches } from '../lib/lifespan.ts';

const shipped: [string, Dataset][] = [['ancient-classical', combined as unknown as Dataset]];

describe('shipped timelines', () => {
  it('meta.continues entries are checked', () => {
    const d = plainTimeline();
    d.meta.continues = [{ timeline: 'sequel', at: 100, side: 'after' }];
    expect(validateDataset(d)).toEqual([]);
    d.meta.continues = [{ timeline: 'sequel', at: 1.5, side: 'sideways' as 'after' }];
    expect(validateDataset(d).join()).toContain('meta.continues[0] needs');
  });
  for (const [id, ds] of shipped) {
    it(`${id} is valid`, () => {
      expect(validateDataset(ds)).toEqual([]);
      expect(ds.meta.id).toBe(id);
    });
  }

  // The historical timeline: every date is cited, and rows that interacted sit together.
  for (const [id, ds] of shipped) {
    it(`${id}: every event cites at least one source, and every claim has one`, () => {
      for (const e of ds.events) {
        expect(e.sources.length, e.title).toBeGreaterThan(0);
        for (const c of [...(e.startDates ?? []), ...(e.endDates ?? [])]) expect(c.source, e.title).toBeDefined();
      }
      for (const t of ds.tracks) for (const c of spanStretches(t.span).flatMap((s) => [...(s.startDates ?? []), ...(s.endDates ?? [])]))
        expect(c.source, t.id).toBeDefined();
    });

    it(`${id}: groups, and the regions inside each group, that interacted sit near each other`, () => {
      // Rows run west to east so partners are close. If this fails after adding data, move the rows
      // listed (or their civilizations) closer together rather than loosening the limits.
      // A thematic group (every row in it a `theme`, e.g. Religions and traditions) shares events with every region by
      // design: it isn't a geographic neighbour, so it is left out of this check.
      const thematic = (g: string) => {
        const kids = ds.tracks.filter((t) => t.parent === g);
        return kids.length > 0 && kids.every((t) => t.kind === 'theme');
      };
      const far = proximityParents(ds, 2).flatMap((parent) =>
        relatedSiblings(ds, parent)
          .filter((p) => !thematic(p.a) && !thematic(p.b))
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

describe('compileSource', () => {
  it('converts readable years in context spans (a v7 source file’s meta.eras), as in phases', () => {
    const raw = JSON.parse(readFileSync('data-src/ancient-classical.json', 'utf8'));
    const source = { sourceKey: Object.keys(raw.sources)[0], sourceLocation: 'lead' };
    delete raw.meta.eraGroups; // names the real eras' groups, which this test replaces
    raw.meta.eras = [{ id: 'test-era', name: 'Test era', start: 'c. 27 BCE', end: 180, startDates: [{ year: '27 BCE', source }], sources: [source] }];
    const { dataset, errors } = compileSource(raw);
    expect(errors).toEqual([]);
    // the source file is v7: its eras compile to the timeline's context spans (v8)
    const era = (dataset.meta as { context: Record<string, unknown>[] }).context[0];
    expect(era.kind).toBe('age');
    expect([era.start, era.end, era.circa]).toEqual([-26, 180, true]);
    expect((era.startDates as { year: number }[])[0].year).toBe(-26);
  });
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
    expect(ds.tracks.some((t) => spanStretches(t.span).some((s) => s.startDates))).toBe(true);
    expect(ds.tracks.some((t) => t.pinLast)).toBe(true);
    expect(ds.events.some((e) => e.ongoing)).toBe(true);
    expect(ds.events.some((e) => e.circa)).toBe(true);
    expect(Object.values(ds.chronologies ?? {}).some((c) => c.derive)).toBe(true);
    expect(ds.tracks.some((t) => t.phases?.length)).toBe(true);
    expect(ds.events.some((e) => e.importance === 1) && ds.events.some((e) => e.importance === 3)).toBe(true);
    expect(ds.meta.range && ds.meta.facets?.geography.values['north-bank'].broader).toEqual(['varn-valley']);
    // a region cited only to the spoiler source (hidden by default), so the region filter keeps it hidden at first
    const coast = ds.tracks.find((t) => t.memberships?.some((m) => m.value === 'coast'))!;
    expect(coast.memberships!.find((m) => m.value === 'coast')!.sources.every((s) => ds.sources[s.sourceKey].hiddenByDefault)).toBe(true);
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
  const base = (): Dataset => plainTimeline();

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
    const quay = d.tracks.find((t) => t.id === 'quay')!;
    expect(validateDataset(d)).toEqual([]);
    quay.phases = [
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
      { id: 'a', name: 'A', color: '#000', parent: 'quay' },
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

describe('calendar plugin example (docs/examples/named-ages-example.json)', () => {
  const ds = ages as unknown as Dataset;
  it('is valid, strict, and needs minor 4', () => {
    expect(validateDataset(ds)).toEqual([]);
    expect(validateStrict(ds)).toEqual([]);
    expect(minorNeeded(ds)).toBe(4);
    expect(ds.schemaMinor).toBe(4);
    const named = (system: unknown) => validateDataset({ ...ds, meta: { ...ds.meta, calendar: { ...ds.meta.calendar, system } } } as Dataset);
    expect(named('Lantern Ages')).toEqual(['meta.calendar.system must be a calendar plugin id: lowercase letters, digits and hyphens (e.g. "lantern-ages").']);
    expect(named('no-such-calendar')).toEqual([]); // an id no plugin answers to falls back to before/after
  });
  it('names its years by the lantern-ages calendar, and falls back to its labels without it', () => {
    const cal = ds.meta.calendar;
    expect(['first-landing', 'sea-wall', 'first-lantern', 'glass-beacon'].map((id) => formatYear(ds.events.find((e) => e.uuid === id)!.start, cal))).toEqual([
      '40 before the Age of Tides',
      'Age of Tides 1',
      'Age of Lanterns 1',
      'Age of Glass 1',
    ]);
    expect(formatYear(411, cal)).toBe('Age of Tides 411');
    expect(formatYear(411, { ...cal, system: undefined })).toBe('411 AT');
  });
});
