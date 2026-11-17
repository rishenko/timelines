import { describe, expect, it } from 'vitest';
import { buildLanes, layoutLanes } from './layout.ts';
import { buildScale } from './scale.ts';
import type { TimelineEvent, Track } from '../types.ts';
import data from '../timelines/REDACTED.json';
import type { Dataset } from '../types.ts';
import { anchorsFor } from './anchors.ts';
import { presentYear } from '../lib/years.ts';

const tracks: Track[] = [
  { id: 'redacted', name: 'REDACTED', color: '#ccc' },
  { id: 'second-comm', name: 'Second REDACTED', color: '#aaa', parent: 'redacted' },
  { id: 'REDACTED', name: 'REDACTED', color: '#0092A4' },
];

function ev(uuid: string, start: number, tracks: string[], end?: number): TimelineEvent {
  return { uuid, title: uuid, descr: '', start, end, tracks, sources: [] };
}

describe('buildLanes', () => {
  it('nests children after their parent', () => {
    const lanes = buildLanes(tracks, {}, {});
    expect(lanes.map((l) => `${l.id}:${l.depth}`)).toEqual(['union:0', 'second-comm:1', 'REDACTED:0']);
  });

  it('merges children into a collapsed parent', () => {
    const lanes = buildLanes(tracks, {}, { redacted: true });
    expect(lanes.map((l) => l.id)).toEqual(['redacted', 'REDACTED']);
    expect(lanes[0].members).toEqual(['redacted', 'second-comm']);
  });

  it('skips hidden tracks', () => {
    const lanes = buildLanes(tracks, { REDACTED: false }, {});
    expect(lanes.map((l) => l.id)).toEqual(['redacted', 'second-comm']);
  });
});

describe('layoutLanes', () => {
  const scale = buildScale([0, 100], { increment: 10, tickPx: 80, compress: false });

  it('stacks overlapping spans into separate rows', () => {
    const events = [ev('a', 0, ['redacted'], 50), ev('b', 10, ['redacted'], 30), ev('c', 90, ['redacted'])];
    const { lanes } = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100);
    const union = lanes.find((l) => l.lane.id === 'redacted')!;
    const row = (id: string) => union.marks.find((m) => m.eventId === id)!.row;
    expect(row('a')).not.toBe(row('b'));
    expect(row('c')).toBe(0);
  });

  it('puts a multi-track event in every lane it belongs to, at the same x', () => {
    const events = [ev('war', 20, ['redacted', 'REDACTED'], 25)];
    const { lanes } = layoutLanes(buildLanes(tracks, {}, {}), events, scale, 100);
    const marks = lanes.flatMap((l) => l.marks);
    expect(marks.map((m) => m.laneId).sort()).toEqual(['REDACTED', 'redacted']);
    expect(new Set(marks.map((m) => m.x0)).size).toBe(1);
  });

  it('folds events beyond maxRows into a cluster mark, unless the lane is expanded', () => {
    const events = Array.from({ length: 6 }, (_, i) => ev(`e${i}`, 50, ['REDACTED']));
    const lanes = buildLanes(tracks, {}, {});
    const capped = layoutLanes(lanes, events, scale, 100, { maxRows: 2 }).lanes.find((l) => l.lane.id === 'REDACTED')!;
    expect(capped.marks.filter((m) => m.kind === 'event')).toHaveLength(2);
    const clusters = capped.marks.filter((m) => m.kind === 'cluster');
    expect(clusters).toHaveLength(1);
    expect(clusters[0].eventIds).toHaveLength(4);
    expect(capped.overflow).toBe(4);
    expect(capped.rows).toBe(3);

    const open = layoutLanes(lanes, events, scale, 100, { maxRows: 2, expanded: { REDACTED: true } }).lanes.find(
      (l) => l.lane.id === 'REDACTED',
    )!;
    expect(open.marks.every((m) => m.kind === 'event')).toBe(true);
    expect(open.rows).toBe(6);
  });

  it('never overlaps footprints within a row on the real dataset', () => {
    const ds = data as Dataset;
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

describe('three-level nesting', () => {
  const tree: Track[] = [
    { id: 'egypt', name: 'Egypt', color: '#000' },
    { id: 'nk', name: 'New Kingdom', color: '#000', parent: 'egypt' },
    { id: 'd18', name: '18th Dynasty', color: '#000', parent: 'nk' },
    { id: 'd19', name: '19th Dynasty', color: '#000', parent: 'nk' },
    { id: 'aegean', name: 'Aegean', color: '#000' },
  ];

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
    const e = { ...ev('u', 50, ['REDACTED'], 100), startWindow: [40, 60] as [number, number], endWindow: [95, 120] as [number, number] };
    const m = layoutLanes(lanes, [e], scale, 200).lanes.find((l) => l.lane.id === 'REDACTED')!.marks[0];
    expect(m.x0).toBeCloseTo(scale.x(40));
    expect(m.x1).toBeCloseTo(scale.x(121));
    expect(m.fadeIn).toBeCloseTo(scale.x(60) - scale.x(40));
    expect(m.fadeOut).toBeCloseTo(scale.x(121) - scale.x(96));
  });

  it('when the start and end ranges overlap, the darker middle shows the event dates', () => {
    // a 42-year span whose start and end ranges are each 120 years wide (like Hammurabi under High/Middle/Low)
    const e = { ...ev('r', 100, ['REDACTED'], 142), startWindow: [44, 164] as [number, number], endWindow: [86, 206] as [number, number] };
    const s = buildScale([0, 300], { increment: 10, tickPx: 80, compress: false });
    const m = layoutLanes(lanes, [e], s, 300).lanes.find((l) => l.lane.id === 'REDACTED')!.marks[0];
    expect(m.x0).toBeCloseTo(s.x(44));
    expect(m.x1).toBeCloseTo(s.x(207));
    expect(m.fadeIn).toBeCloseTo(s.x(100) - s.x(44));
    expect(m.fadeOut).toBeCloseTo(s.x(207) - s.x(143));
  });

  it('gives a point event a whisker over its window', () => {
    const e = { ...ev('p', 50, ['REDACTED']), startWindow: [30, 70] as [number, number] };
    const m = layoutLanes(lanes, [e], scale, 200).lanes.find((l) => l.lane.id === 'REDACTED')!.marks[0];
    expect(m.whisker).toEqual([scale.x(30), scale.x(71)]);
    expect(m.fadeIn).toBeUndefined();
  });
});
