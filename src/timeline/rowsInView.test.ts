import { describe, expect, it } from 'vitest';
import type { TimelineEvent, Track } from '../types.ts';
import type { ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { buildLanes } from './layout.ts';
import { activeLanes, shownLanes } from './rowsInView.ts';

// A group with two regions; the first region has two rows, the second one.
const tracks: Track[] = [
  { id: 'world', name: 'World', color: '#000' },
  { id: 'north', name: 'North', color: '#111', parent: 'world' },
  { id: 'old', name: 'Old kingdom', color: '#222', parent: 'north' },
  { id: 'new', name: 'New kingdom', color: '#333', parent: 'north' },
  { id: 'south', name: 'South', color: '#444', parent: 'world' },
  { id: 'isles', name: 'Isles', color: '#555', parent: 'south' },
];
const byId = new Map(tracks.map((t) => [t.id, t]));
const ev = (uuid: string, start: number, trackIds: string[], o: Partial<TimelineEvent> = {}): TimelineEvent => ({
  uuid,
  title: uuid,
  descr: '',
  start,
  tracks: trackIds,
  sources: [],
  ...o,
});
const none = new Set<string>();
const lanes = buildLanes(tracks, {}, {});
const noSpans = new Map<string, ResolvedSpan>();
const noPhases = new Map<string, ResolvedPhase[]>();

describe('activeLanes', () => {
  it('counts events, lifespans and phases within the window, with their uncertainty ranges', () => {
    const w = { y0: 0, y1: 100 };
    expect([...activeLanes(lanes, [ev('a', 50, ['old'])], noSpans, noPhases, 2000, w)]).toEqual(['old']);
    // an event from before the window that runs into it
    expect([...activeLanes(lanes, [ev('a', -50, ['old'], { end: 10 })], noSpans, noPhases, 2000, w)]).toEqual(['old']);
    // an ongoing event runs to the present
    expect([...activeLanes(lanes, [ev('a', -500, ['old'], { ongoing: true })], noSpans, noPhases, 2000, w)]).toEqual(['old']);
    // an event whose start range reaches the window
    expect([...activeLanes(lanes, [{ ...ev('a', 120, ['old']), startWindow: [90, 150] }], noSpans, noPhases, 2000, w)]).toEqual(['old']);
    expect(activeLanes(lanes, [ev('a', 120, ['old'])], noSpans, noPhases, 2000, w).size).toBe(0);
    // a lifespan across the window, and a phase whose end range reaches into it
    const spans = new Map([['new', { start: -300, end: 300 }]]);
    const phases = new Map([['isles', [{ name: 'p', start: -300, end: -10, endWindow: [-20, 5] as [number, number] }]]]);
    expect([...activeLanes(lanes, [], spans, phases, 2000, w)].sort()).toEqual(['isles', 'new']);
  });

  it("a folded row is active when any row folded into it is", () => {
    const folded = buildLanes(tracks, {}, { north: true });
    expect([...activeLanes(folded, [ev('a', 50, ['new'])], noSpans, noPhases, 2000, { y0: 0, y1: 100 })]).toEqual(['north']);
  });
});

describe('shownLanes', () => {
  it('keeps the headers and the active rows, and counts the rest on their header', () => {
    const r = shownLanes(lanes, byId, new Set(['old']), none, none);
    expect(r.lanes.map((l) => l.id)).toEqual(['world', 'north', 'old', 'south']);
    expect(r.hiddenCount).toBe(2);
    expect([...r.inactiveBelow]).toEqual([
      ['north', 1],
      ['south', 1],
    ]);
  });

  it('keeps the rows asked for (the selected event, the focused row)', () => {
    expect(shownLanes(lanes, byId, none, new Set(['isles']), none).lanes.map((l) => l.id)).toEqual(['world', 'north', 'south', 'isles']);
  });

  it("shows a revealed header's rows, still counted so the button can hide them again", () => {
    const r = shownLanes(lanes, byId, new Set(['old']), none, new Set(['north']));
    expect(r.lanes.map((l) => l.id)).toEqual(['world', 'north', 'old', 'new', 'south']);
    expect(r.hiddenCount).toBe(1);
    expect(r.inactiveBelow.get('north')).toBe(1);
  });

  it('counts a row on its nearest drawn ancestor when its parent is filtered out', () => {
    const filtered = buildLanes(tracks, { south: false }, {});
    const r = shownLanes(filtered, byId, none, none, none);
    expect(r.inactiveBelow.get('world')).toBe(1);
  });
});
