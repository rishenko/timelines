import { describe, expect, it } from 'vitest';
import { buildLanes, layoutLanes, layoutPhaseStrips, placeMemberships, placePhases, STRIP_DEFAULTS } from './layout.ts';
import type { ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { buildScale } from './scale.ts';
import type { TimelineEvent, Track } from '../types.ts';
import data from '../../public/timelines/ancient-classical.json';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { presentYear } from '../lib/years.ts';

const tracks: Track[] = [
  { id: 'north', name: 'The North', color: '#ccc' },
  { id: 'north-coast', name: 'North Coast', color: '#aaa', parent: 'north' },
  { id: 'guild', name: 'Merchant Guild', color: '#0092A4' },
];

function ev(uuid: string, start: number, tracks: string[], end?: number): TimelineEvent {
  return { uuid, title: uuid, descr: '', start, end, tracks, sources: [] };
}

describe('buildLanes', () => {
  it('nests children after their parent', () => {
    const lanes = buildLanes(tracks, {}, {});
    expect(lanes.map((l) => `${l.id}:${l.depth}`)).toEqual(['north:0', 'north-coast:1', 'guild:0']);
  });

  it('merges children into a collapsed parent', () => {
    const lanes = buildLanes(tracks, {}, { north: true });
    expect(lanes.map((l) => l.id)).toEqual(['north', 'guild']);
    expect(lanes[0].members).toEqual(['north', 'north-coast']);
  });

  it('skips hidden tracks', () => {
    const lanes = buildLanes(tracks, { guild: false }, {});
    expect(lanes.map((l) => l.id)).toEqual(['north', 'north-coast']);
  });
});

describe('layoutLanes', () => {
  const scale = buildScale([0, 100], { increment: 10, tickPx: 80, compress: false });

  it('stacks overlapping spans into separate rows', () => {
    const events = [ev('a', 0, ['north'], 50), ev('b', 10, ['north'], 30), ev('c', 90, ['north'])];
    const { lanes } = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100);
    const north = lanes.find((l) => l.lane.id === 'north')!;
    const row = (id: string) => north.marks.find((m) => m.eventId === id)!.row;
    expect(row('a')).not.toBe(row('b'));
    expect(row('c')).toBe(0);
  });

  it('puts a multi-track event in every lane it belongs to, at the same x', () => {
    const events = [ev('war', 20, ['north', 'guild'], 25)];
    const { lanes } = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100);
    const marks = lanes.flatMap((l) => l.marks);
    expect(marks.map((m) => m.laneId).sort()).toEqual(['guild', 'north']);
    expect(new Set(marks.map((m) => m.x0)).size).toBe(1);
  });

  it('folds events beyond maxRows into a cluster mark, unless the lane is expanded', () => {
    const events = Array.from({ length: 6 }, (_, i) => ev(`e${i}`, 50, ['guild']));
    const lanes = buildLanes(tracks, {}, {});
    const capped = layoutLanes(lanes, events, scale, 100, { maxRows: 2 }).lanes.find((l) => l.lane.id === 'guild')!;
    expect(capped.marks.filter((m) => m.kind === 'event')).toHaveLength(2);
    const clusters = capped.marks.filter((m) => m.kind === 'cluster');
    expect(clusters).toHaveLength(1);
    expect(clusters[0].eventIds).toHaveLength(4);
    expect(capped.overflow).toBe(4);
    expect(capped.rows).toBe(3);

    const open = layoutLanes(lanes, events, scale, 100, { maxRows: 2, expanded: { guild: true } }).lanes.find(
      (l) => l.lane.id === 'guild',
    )!;
    expect(open.marks.every((m) => m.kind === 'event')).toBe(true);
    expect(open.rows).toBe(6);
  });

  it('by default holds five lines of events in a row before folding into "+N"', () => {
    const lanes = buildLanes(tracks, {}, {});
    const guild = (n: number) =>
      layoutLanes(lanes, Array.from({ length: n }, (_, i) => ev(`e${i}`, 50, ['guild'])), scale, 100).lanes.find((l) => l.lane.id === 'guild')!;
    expect(guild(5).overflow).toBe(0);
    expect(guild(5).rows).toBe(5);
    expect(guild(6).overflow).toBe(1);
  });

  it('keeps key events visible and folds the least important ones first', () => {
    const events = [
      { ...ev('minor-early', 50, ['guild']), importance: 3 as const },
      ev('normal', 50, ['guild']),
      { ...ev('key-late', 50, ['guild']), importance: 1 as const, order: 9 },
    ];
    const lanes = buildLanes(tracks, {}, {});
    const lane = layoutLanes(lanes, events, scale, 100, { maxRows: 2 }).lanes.find((l) => l.lane.id === 'guild')!;
    const shown = lane.marks.filter((m) => m.kind === 'event').map((m) => m.eventId);
    expect(shown).toEqual(['key-late', 'normal']);
    expect(lane.marks.find((m) => m.kind === 'cluster')!.eventIds).toEqual(['minor-early']);
  });

  it('names the earliest key event a "+N" pill holds, and makes room for its name', () => {
    // three key events at the same year overflow a one-row lane: the ones left over fold together
    const key = (id: string, start: number) => ({ ...ev(id, start, ['guild']), importance: 1 as const });
    const events = [key('shown', 49), key('late-key', 52), key('early-key', 50), ev('normal', 51, ['guild'])];
    const lane = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100, { maxRows: 1 }).lanes.find((l) => l.lane.id === 'guild')!;
    const pill = lane.marks.find((m) => m.kind === 'cluster')!;
    expect(pill.eventIds).toEqual(['early-key', 'normal', 'late-key']);
    expect(pill.keyEventId).toBe('early-key');
    expect(pill.footprintEnd - pill.x0).toBeGreaterThan(44);

    // a pill with no key event has no name and keeps its usual width
    const plain = layoutLanes(buildLanes(tracks, {}, {}), [ev('a', 50, ['guild']), ev('b', 50, ['guild'])], scale, 100, { maxRows: 1 })
      .lanes.find((l) => l.lane.id === 'guild')!
      .marks.find((m) => m.kind === 'cluster')!;
    expect(plain.keyEventId).toBeUndefined();
    expect(plain.footprintEnd - plain.x0).toBe(44);
  });

  it('makes room for a category glyph before a title, on marks and on a pill that names a key event', () => {
    const lanes = buildLanes(tracks, {}, {});
    const one = (opts: Parameters<typeof layoutLanes>[4]) => layoutLanes(lanes, [ev('a', 50, ['guild'])], scale, 100, opts).lanes.find((l) => l.lane.id === 'guild')!.marks[0];
    expect(one({ glyphs: new Set(['a']) }).footprintEnd - one({}).footprintEnd).toBe(15);
    const key = (id: string, start: number) => ({ ...ev(id, start, ['guild']), importance: 1 as const });
    const pill = (glyphs?: Set<string>) =>
      layoutLanes(lanes, [key('shown', 49), key('folded', 50)], scale, 100, { maxRows: 1, glyphs }).lanes.find((l) => l.lane.id === 'guild')!.marks.find((m) => m.kind === 'cluster')!;
    expect(pill(new Set(['folded'])).footprintEnd - pill().footprintEnd).toBe(15);
  });

  it('puts reigns on the top lines, then the period lane, then the rest; reigns never fold', () => {
    const lanes = buildLanes(tracks, {}, {});
    const events = [
      ev('normal', 50, ['guild']),
      ev('age', 30, ['guild'], 70),
      ev('reign1', 10, ['guild'], 40),
      ev('reign2', 43, ['guild'], 90),
      ev('corule', 20, ['guild'], 30),
      ev('both', 92, ['guild'], 99),
    ];
    const lane = layoutLanes(lanes, events, scale, 100, {
      reignLane: new Set(['reign1', 'reign2', 'corule', 'both']),
      periodLane: new Set(['age', 'both']),
      maxRows: 1,
    }).lanes.find((l) => l.lane.id === 'guild')!;
    const row = (id: string) => lane.marks.find((m) => m.eventId === id)?.row;
    // successive reigns share the top line; a co-ruler stacks onto a second
    expect(row('reign1')).toBe(0);
    expect(row('corule')).toBe(1);
    // an event in both lanes stays a reign
    expect(row('reign2')).toBe(0);
    expect(row('both')).toBe(0);
    expect(row('age')).toBe(2);
    expect(row('normal')).toBe(3);
    expect(lane.marks.some((m) => m.kind === 'cluster')).toBe(false);
    expect(lane.rows).toBe(4);
  });

  it('caps the reign lane at two lines; further reigns fold into "+N" unless the row is expanded', () => {
    const lanes = buildLanes(tracks, {}, {});
    // three overlapping reigns (a long label at this zoom makes each overlap the next)
    const events = [ev('r1', 10, ['guild'], 20), ev('r2', 12, ['guild'], 22), ev('r3', 14, ['guild'], 24)];
    const reignLane = new Set(['r1', 'r2', 'r3']);
    const lane = (expanded?: Record<string, boolean>) =>
      layoutLanes(lanes, events, scale, 100, { reignLane, expanded }).lanes.find((l) => l.lane.id === 'guild')!;
    expect(lane().marks.filter((m) => m.kind === 'event').length).toBe(2);
    expect(lane().marks.find((m) => m.kind === 'cluster')?.eventIds).toEqual(['r3']);
    expect(lane({ guild: true }).marks.filter((m) => m.kind === 'event').length).toBe(3);
  });

  it('puts period-lane events on lines of their own first, the other events below, never folded', () => {
    const lanes = buildLanes(tracks, {}, {});
    const events = [ev('normal', 50, ['guild']), ev('age', 30, ['guild'], 70), ev('normal2', 51, ['guild'])];
    const lane = layoutLanes(lanes, events, scale, 100, { periodLane: new Set(['age']), maxRows: 1 }).lanes.find((l) => l.lane.id === 'guild')!;
    const row = (id: string) => lane.marks.find((m) => m.eventId === id)?.row;
    expect(row('age')).toBe(0);
    expect(row('normal')).toBe(1);
    // the normal lines keep their own cap: the second normal event folds, the period line doesn't count
    expect(lane.marks.find((m) => m.kind === 'cluster')?.eventIds).toEqual(['normal2']);
    expect(lane.rows).toBe(3);
    // without the lane, the same events pack as before
    const plain = layoutLanes(lanes, events, scale, 100, { maxRows: 1 }).lanes.find((l) => l.lane.id === 'guild')!;
    expect(plain.marks.find((m) => m.eventId === 'age')?.row).toBe(0);
    expect(plain.rows).toBe(2);
  });

  it('fills gaps in a row left by events placed earlier', () => {
    // the key event sits at the right; a normal event placed after it still fits to its left in row 0
    const events = [{ ...ev('key', 80, ['guild']), importance: 1 as const }, ev('early', 5, ['guild'])];
    const lane = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100).lanes.find((l) => l.lane.id === 'guild')!;
    expect(lane.marks.map((m) => m.row)).toEqual([0, 0]);
    expect(lane.rows).toBe(1);
  });

  it('never overlaps footprints within a row on the real dataset', () => {
    const ds = data as unknown as Dataset;
    const present = presentYear(ds.events);
    for (const inc of [1, 10, 50, 100]) {
      const s = buildScale(anchorsFor(ds.events, present), { increment: inc });
      const { lanes } = layoutLanes(buildLanes(ds.tracks, {}, {}), ds.events, s, present);
      for (const l of lanes) {
        const byRow = new Map<number, typeof l.marks>();
        for (const m of l.marks) byRow.set(m.row, [...(byRow.get(m.row) ?? []), m]);
        for (const row of byRow.values()) {
          const sorted = [...row].sort((a, b) => a.x0 - b.x0);
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].x0).toBeGreaterThan(sorted[i - 1].footprintEnd - 8);
          }
        }
      }
    }
  });
});

describe('nesting', () => {
  const tree: Track[] = [
    { id: 'egypt', name: 'Egypt', color: '#000' },
    { id: 'nk', name: 'New Kingdom', color: '#000', parent: 'egypt' },
    { id: 'd18', name: '18th Dynasty', color: '#000', parent: 'nk' },
    { id: 'd19', name: '19th Dynasty', color: '#000', parent: 'nk' },
    { id: 'aegean', name: 'Aegean', color: '#000' },
  ];

  it('lists any depth: a group above regions adds a level', () => {
    const grouped: Track[] = [{ id: 'ane', name: 'Ancient Near East', color: '#000' }, ...tree.map((t) => (t.parent ? t : { ...t, parent: 'ane' }))];
    expect(buildLanes(grouped, {}, {}).map((l) => `${l.id}:${l.depth}`)).toEqual(['ane:0', 'egypt:1', 'nk:2', 'd18:3', 'd19:3', 'aegean:1']);
    const folded = buildLanes(grouped, {}, { ane: true });
    expect(folded.map((l) => l.id)).toEqual(['ane']);
    expect(folded[0].members).toEqual(['ane', 'egypt', 'nk', 'd18', 'd19', 'aegean']);
  });

  it('lists grandchildren at depth 2', () => {
    expect(buildLanes(tree, {}, {}).map((l) => `${l.id}:${l.depth}`)).toEqual([
      'egypt:0', 'nk:1', 'd18:2', 'd19:2', 'aegean:0',
    ]);
  });

  it('collapsing a grandparent absorbs every visible descendant', () => {
    const lanes = buildLanes(tree, { d19: false }, { egypt: true });
    expect(lanes.map((l) => l.id)).toEqual(['egypt', 'aegean']);
    expect(lanes[0].members).toEqual(['egypt', 'nk', 'd18']);
  });

  it('collapsing a middle level keeps its parent separate', () => {
    const lanes = buildLanes(tree, {}, { nk: true });
    expect(lanes.map((l) => l.id)).toEqual(['egypt', 'nk', 'aegean']);
    expect(lanes[1].members).toEqual(['nk', 'd18', 'd19']);
  });

  it('a hidden middle track still shows its children', () => {
    expect(buildLanes(tree, { nk: false }, {}).map((l) => l.id)).toEqual(['egypt', 'd18', 'd19', 'aegean']);
  });
});

describe('uncertain marks', () => {
  const scale = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false });
  const lanes = buildLanes(tracks, {}, {});

  it('widens a bar to its windows and fades across them', () => {
    const e = { ...ev('u', 50, ['guild'], 100), startWindow: [40, 60] as [number, number], endWindow: [95, 120] as [number, number] };
    const m = layoutLanes(lanes, [e], scale, 200).lanes.find((l) => l.lane.id === 'guild')!.marks[0];
    expect(m.x0).toBeCloseTo(scale.x(40));
    expect(m.x1).toBeCloseTo(scale.x(121));
    expect(m.fadeIn).toBeCloseTo(scale.x(60) - scale.x(40));
    expect(m.fadeOut).toBeCloseTo(scale.x(121) - scale.x(96));
  });

  it('when the start and end ranges overlap, the darker middle shows the event dates', () => {
    // a 42-year span whose start and end ranges are each 120 years wide (like Hammurabi under High/Middle/Low)
    const e = { ...ev('r', 100, ['guild'], 142), startWindow: [44, 164] as [number, number], endWindow: [86, 206] as [number, number] };
    const s = buildScale([0, 300], { increment: 10, tickPx: 80, compress: false });
    const m = layoutLanes(lanes, [e], s, 300).lanes.find((l) => l.lane.id === 'guild')!.marks[0];
    expect(m.x0).toBeCloseTo(s.x(44));
    expect(m.x1).toBeCloseTo(s.x(207));
    expect(m.fadeIn).toBeCloseTo(s.x(100) - s.x(44));
    expect(m.fadeOut).toBeCloseTo(s.x(207) - s.x(143));
  });

  it('gives a point event a whisker over its window', () => {
    const e = { ...ev('p', 50, ['guild']), startWindow: [30, 70] as [number, number] };
    const m = layoutLanes(lanes, [e], scale, 200).lanes.find((l) => l.lane.id === 'guild')!.marks[0];
    expect(m.whisker).toEqual([scale.x(30), scale.x(71)]);
    expect(m.fadeIn).toBeUndefined();
  });
});

describe('placePhases', () => {
  const phases = new Map([
    [
      'harbor',
      [
        { name: 'Free City', start: 289, end: 502 },
        { name: 'Old Republic', start: 199, end: 500, endWindow: [301, 500] as [number, number] },
      ],
    ],
    [
      'north',
      [
        { name: 'First', start: 0, end: 288 },
        { name: 'Second', start: 288, end: 459 },
        { name: 'Third', start: 460, end: 502 },
      ],
    ],
  ]);

  it('puts successive phases on one line, sharing a boundary year', () => {
    expect(placePhases('north', phases).map((p) => `${p.name}:${p.level}`)).toEqual(['First:0', 'Second:0', 'Third:0']);
  });

  it('moves an overlapping phase (a rival government) to the next line, in date order', () => {
    expect(placePhases('harbor', phases).map((p) => `${p.name}:${p.level}`)).toEqual(['Old Republic:0', 'Free City:1']);
  });

  it('keeps periods on one line when only their uncertainty windows overlap', () => {
    const egypt = new Map([
      [
        'egypt',
        [
          { name: 'Old Kingdom', start: -2685, end: -2180, endWindow: [-2180, -2117] as [number, number] },
          { name: 'First Intermediate', start: -2180, end: -2054, startWindow: [-2180, -2117] as [number, number] },
        ],
      ],
    ]);
    expect(placePhases('egypt', egypt).map((p) => p.level)).toEqual([0, 0]);
  });

  it("gives each name its own stretch: the whole band, split where it runs into the next phase's on its line", () => {
    const egypt = new Map([
      [
        'egypt',
        [
          { name: 'Old Kingdom', start: -2685, end: -2180, startWindow: [-2700, -2685] as [number, number], endWindow: [-2180, -2117] as [number, number] },
          { name: 'First Intermediate', start: -2150, end: -2054, startWindow: [-2180, -2150] as [number, number] },
        ],
      ],
    ]);
    const [old, first] = placePhases('egypt', egypt);
    // the Old Kingdom's band runs to -2117 through its uncertain end; its name stops where the next one starts
    expect([old.nameFrom, old.nameTo]).toEqual([-2700, -2150]);
    expect([first.nameFrom, first.nameTo]).toEqual([-2150, -2053]);
    expect(old.nameTo).toBeLessThanOrEqual(first.nameFrom);
  });

  it('splits names at a shared boundary year, and leaves phases on other lines alone', () => {
    const [a, b, c] = placePhases('north', phases);
    expect([a.nameFrom, a.nameTo, b.nameFrom, b.nameTo, c.nameFrom, c.nameTo]).toEqual([0, 288, 288, 460, 460, 503]);
    const [republic, freeCity] = placePhases('harbor', phases);
    expect([republic.nameFrom, republic.nameTo]).toEqual([199, 501]);
    expect([freeCity.nameFrom, freeCity.nameTo]).toEqual([289, 503]);
  });

  it("places only the row's own phases (a folded row doesn't gather its sub-rows')", () => {
    const placed = placePhases('north', phases);
    expect(placed.map((p) => p.name)).toEqual(['First', 'Second', 'Third']);
    expect(placed.every((p) => p.trackId === 'north')).toBe(true);
    expect(placePhases('nobody', phases)).toEqual([]);
  });
});

describe('layoutPhaseStrips', () => {
  const strips = (list: ResolvedPhase[], pxPerYear: number) =>
    layoutPhaseStrips(placePhases('row', new Map([['row', list]])), (y) => y * pxPerYear);
  const { namedPx, thinPx } = STRIP_DEFAULTS;

  it('draws a change once: no end line where the next phase on the line begins', () => {
    const { cells } = strips(
      [
        { name: 'First Council', start: 0, end: 100 },
        { name: 'Second Council', start: 100, end: 200 },
      ],
      2,
    );
    expect(cells.map((c) => [c.x0, c.x1, c.startX, c.endX])).toEqual([
      [0, 200, 0, null],
      [200, 402, 200, 402],
    ]);
  });

  it('ends a phase visibly at a gap, and gives a still-going phase no end line (it gets an arrow)', () => {
    const { cells } = strips(
      [
        { name: 'Old Kingdom', start: 0, end: 50 },
        { name: 'New Kingdom', start: 80, end: 300, ongoing: true },
      ],
      2,
    );
    expect(cells[0].endX).toBe(102);
    expect(cells[1].endX).toBeNull();
  });

  it('puts rivals on a second line, each line named or thin by what fits at this zoom', () => {
    const list = [
      { name: 'Republic', start: 0, end: 400 },
      { name: 'Rebel Republic', start: 100, end: 400 },
    ];
    const near = strips(list, 2);
    // a named line has 2 px of room under its names (Kevin, 2026-11-22)
    const named = namedPx + STRIP_DEFAULTS.padBottomPx;
    expect(near.lines).toEqual([
      { top: 0, height: named, named: true },
      { top: named, height: named, named: true },
    ]);
    expect(near.height).toBe(2 * named);
    expect(near.cells.map((c) => c.line.top)).toEqual([0, named]);
    // zoomed far out nothing fits: both lines thin, and the row is shorter than with names
    const far = strips(list, 0.01);
    expect(far.lines.map((l) => [l.height, l.named])).toEqual([
      [thinPx, false],
      [thinPx, false],
    ]);
    expect(far.cells.every((c) => c.name === null)).toBe(true);
  });

  it('names a phase too short for its name in the blank strip after it, pointing back at it', () => {
    const list = [
      { name: 'Long Reign', start: 0, end: 300 },
      { name: 'Hundred Days', start: 50, end: 50 },
      { name: 'Rival Council', start: 200, end: 300 },
    ];
    const short = strips(list, 2).cells.find((c) => c.phase.name === 'Hundred Days')!;
    expect(short.name).toMatchObject({ x0: 102, outside: 'after' });
    // only on a line that has names: alone on a thin line, the tooltip names it
    expect(strips(list.slice(0, 2), 2).cells[1].name).toBeNull();
  });

  it('or before it when the strip after it is taken, and never over another phase', () => {
    const { cells } = strips(
      [
        { name: 'People’s Republic', start: 0, end: 100 },
        { name: 'State', start: 60, end: 60 },
        { name: 'Soviet Republic', start: 61, end: 100 },
      ],
      2,
    );
    const state = cells.find((c) => c.phase.name === 'State')!;
    expect(state.name).toMatchObject({ x1: 120, outside: 'before' });
    // squeezed between phases on both sides: only the tooltip names it
    const boxed = strips(
      [
        { name: 'A long first phase', start: 0, end: 59 },
        { name: 'Interregnum', start: 60, end: 60 },
        { name: 'A long last phase', start: 61, end: 120 },
      ],
      2,
    ).cells.find((c) => c.phase.name === 'Interregnum')!;
    expect(boxed.name).toBeNull();
  });

  it("never places a name beside its phase over years where the row didn't exist (outside its lifespan)", () => {
    // a rival government of one year at the very start of the row (Ukrainian State 1918, the row from 1917), with the
    // strip after it taken: the room before it is blank strip but no lifespan, so only the tooltip names it
    const list: ResolvedPhase[] = [
      { name: 'People’s Republic', start: 1917, end: 1921 },
      { name: 'Ukrainian State', start: 1918, end: 1918 },
      { name: 'Soviet Republic', start: 1919, end: 1991 },
    ];
    const at = (lifespan?: ResolvedSpan[]) =>
      layoutPhaseStrips(placePhases('row', new Map([['row', list]])), (y) => (y - 1800) * 2, {}, lifespan).cells.find(
        (c) => c.phase.name === 'Ukrainian State',
      )!.name;
    // unbounded, it goes before the phase, across 1880–1917
    expect(at()).toMatchObject({ outside: 'before', x1: 236 });
    expect(at([{ start: 1917, end: 1991, derived: true }])).toBeNull();
    // a lifespan that reaches back far enough leaves room again, cut at the lifespan's start
    expect(at([{ start: 1860, end: 1991 }])).toMatchObject({ outside: 'before', x0: 120, x1: 236 });
    // after its end: bounded by the end of the lifespan stretch it lies in (here one ending the year after)
    const after = layoutPhaseStrips(
      placePhases('row', new Map([['row', [{ name: 'Long reign', start: 0, end: 99 }, { name: 'Hundred Days', start: 100, end: 100 }]]])),
      (y) => y * 2,
      {},
      [{ start: 0, end: 100 }],
    ).cells[1].name;
    expect(after).toBeNull();
  });

  it('cuts an uncertain end where the next phase on the line begins (its fade ends there)', () => {
    const { cells } = strips(
      [
        { name: 'Old', start: 0, end: 100, endWindow: [100, 140] },
        { name: 'New', start: 120, end: 200, startWindow: [100, 120] },
      ],
      1,
    );
    expect([cells[0].x1, cells[0].fadeOut, cells[0].endX]).toEqual([120, 19, 101]);
    expect([cells[1].x0, cells[1].fadeIn]).toEqual([120, 0]);
  });
});

describe('memberships as strip lines (placeMemberships)', () => {
  const { namedPx, thinPx } = STRIP_DEFAULTS;
  const phases: ResolvedPhase[] = [
    { name: 'Ukrainian People’s Republic', start: 1917, end: 1921 },
    { name: 'Ukrainian State', start: 1918, end: 1918 },
    { name: 'Ukrainian SSR', start: 1919, end: 1991 },
    { name: 'Ukraine', start: 1991, end: 2026, ongoing: true },
  ];
  const label = (m: { start: number; end: number; row: string }) => `in ${m.row}, ${m.start}–${m.end}`;
  const layout = (memberships: (ResolvedSpan & { row: string })[], pxPerYear: number, lifespan?: ResolvedSpan[]) => {
    const own = placePhases('ukraine', new Map([['ukraine', phases]]));
    const lines = Math.max(...own.map((p) => p.level)) + 1;
    return layoutPhaseStrips([...own, ...placeMemberships('ukraine', memberships, lines, label)], (y) => (y - 1800) * pxPerYear, {}, lifespan);
  };

  it('adds one line per membership after the phase lines, named with the union and its years', () => {
    const st = layout([{ row: 'USSR', start: 1922, end: 1991 }], 4);
    // rivals 1917–21 take two phase lines; the membership is the third
    expect(st.lines).toHaveLength(3);
    const m = st.cells.find((c) => c.phase.member === 'USSR')!;
    expect(m.phase.level).toBe(2);
    expect(m.line).toBe(st.lines[2]);
    expect(m.phase.name).toBe('in USSR, 1922–1991');
    expect(m.name).toMatchObject({ outside: false, x0: (1922 - 1800) * 4 });
    expect(st.height).toBe(st.lines.reduce((n, l) => n + l.height, 0));
  });

  it('memberships that overlap take a line each; ones that follow each other share one', () => {
    const one = layout(
      [
        { row: 'A', start: 1922, end: 1940 },
        { row: 'B', start: 1940, end: 1991 },
      ],
      4,
    );
    expect(one.lines).toHaveLength(3);
    const two = layout(
      [
        { row: 'A', start: 1922, end: 1991 },
        { row: 'B', start: 1950, end: 1960 },
      ],
      4,
    );
    expect(two.lines).toHaveLength(4);
  });

  it('is thin when zoomed out so far that its name does not fit, as a phase line is', () => {
    // ...and no room beside it within the member's lifespan
    const st = layout([{ row: 'USSR', start: 1922, end: 1991 }], 0.5, [{ start: 1917, end: 2026 }]);
    expect(st.lines[2]).toMatchObject({ named: false, height: thinPx });
    expect(layout([{ row: 'USSR', start: 1922, end: 1991 }], 4).lines[2]).toMatchObject({ named: true, height: namedPx });
  });

  it('names a short membership beside it even alone on its line, when there is room', () => {
    // Syria in the UAR 1958–61 at 4 px a year: 16 px, too short for its name, and no other name on its line
    const st = layout([{ row: 'UAR', start: 1958, end: 1961 }], 4);
    expect(st.cells.find((c) => c.phase.member)!.name).toMatchObject({ outside: 'after', x0: (1962 - 1800) * 4 });
    expect(st.lines[2]).toMatchObject({ named: true, height: namedPx });
  });

  it("places a short membership's name beside it only within the member's lifespan", () => {
    // a two-year membership on a line with names: too short for its own at 4 px a year, so it goes after it
    const short = [
      { row: 'A', start: 1922, end: 1923 },
      { row: 'B', start: 1960, end: 1991 },
    ];
    const nameOfA = (lifespan?: ResolvedSpan[]) => layout(short, 4, lifespan).cells.find((c) => c.phase.member === 'A')!.name;
    expect(nameOfA()).toMatchObject({ outside: 'after', x0: (1924 - 1800) * 4 });
    // ...but never past the stretch of the member's lifespan it lies in (here ending the year after), nor before it
    expect(nameOfA([{ start: 1922, end: 1924 }, { start: 1960, end: 1991 }])).toBeNull();
  });
});

describe('layoutLanes header strip', () => {
  const scale = buildScale([0, 100], { increment: 10, tickPx: 80, compress: false });
  const lanes = buildLanes([{ id: 'a', name: 'A', color: '#000' }], {}, {});
  const events = [ev('x', 10, ['a'])].map((e) => ({ ...e }));

  it('pushes events down and grows the lane by the header height', () => {
    const plain = layoutLanes(lanes, events as never, scale, 100);
    const headed = layoutLanes(lanes, events as never, scale, 100, { headerPx: { a: 32 } });
    expect(headed.lanes[0].height).toBe(plain.lanes[0].height + 32);
    expect(headed.lanes[0].marks[0].cy).toBe(plain.lanes[0].marks[0].cy + 32);
  });
});

describe('a year-only end meeting a day-dated start (days and months)', () => {
  const px = 100;
  const strips = (list: ResolvedPhase[]) => layoutPhaseStrips(placePhases('germany', new Map([['germany', list]])), (y) => (y - 1900) * px);
  const nazi: ResolvedPhase = { name: 'Nazi Germany', start: 1933, startMonth: 1, startDay: 30, end: 1945, endMonth: 5, endDay: 23 };

  it('snaps the year-only end to the next start: one line, no rival strip', () => {
    const weimar: ResolvedPhase = { name: 'Weimar Republic', start: 1918, startMonth: 11, startDay: 9, end: 1933 };
    const s = strips([weimar, nazi]);
    expect(s.lines).toHaveLength(1);
    const [w, n] = s.cells;
    const naziStart = (1933 + 29 / 365 - 1900) * px;
    expect(n.startX).toBeCloseTo(naziStart, 6);
    expect(w.x1).toBeCloseTo(naziStart, 6);
    // the change is drawn once, by the next phase's start line
    expect(w.endX).toBeNull();
  });

  it('still shows a real overlap given in days as a rival strip', () => {
    const weimar: ResolvedPhase = { name: 'Weimar Republic', start: 1918, startMonth: 11, startDay: 9, end: 1933, endMonth: 3, endDay: 23 };
    expect(strips([weimar, nazi]).lines).toHaveLength(2);
  });

  it('does the same for memberships', () => {
    const m = (row: string, o: Partial<ResolvedSpan>) => ({ row, sources: [], start: 0, end: 0, ...o }) as ResolvedSpan & { row: string };
    const placed = placeMemberships('reach', [m('a', { start: 390, end: 398 }), m('b', { start: 398, startMonth: 8, startDay: 18, end: 399 })], 0, (x) => x.row);
    expect(new Set(placed.map((p) => p.level)).size).toBe(1);
  });
});
