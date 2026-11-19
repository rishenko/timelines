import { describe, expect, it } from 'vitest';
import { buildLanes, layoutLanes, placePhases } from './layout.ts';
import { buildScale } from './scale.ts';
import type { TimelineEvent, Track } from '../types.ts';
import data from '../timelines/classical.json';
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

  it("places only the row's own phases (a folded row doesn't gather its sub-rows')", () => {
    const placed = placePhases('north', phases);
    expect(placed.map((p) => p.name)).toEqual(['First', 'Second', 'Third']);
    expect(placed.every((p) => p.trackId === 'north')).toBe(true);
    expect(placePhases('nobody', phases)).toEqual([]);
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
