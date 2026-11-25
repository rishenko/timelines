// laneActivity (the indexed "which rows have anything in these years", rowsInView.ts) must answer exactly as the plain
// scan it replaced: the scan below is the old activeLanes, kept as the oracle. Both run on every bundled timeline, with
// rows open and folded, over seeded random windows of every width and over sliding windows, plus the odd cases the index
// handles apart (NaN bounds, an extent that ends before it starts, intervals that only touch).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSelection, resolveEvents, resolveSpan, type ResolvedEvent, type ResolvedPhase, type ResolvedSpan } from '../lib/chronology.ts';
import { resolveLifespan } from '../lib/lifespan.ts';
import { effectiveEnd, presentYear } from '../lib/years.ts';
import type { Dataset, Track } from '../types.ts';
import { buildLanes, type LaneDef } from './layout.ts';
import { laneActivity, rowActivity, type YearWindow } from './rowsInView.ts';

// ---- the oracle: activeLanes as it was before the index ----
const overlaps = (a0: number, a1: number, w: YearWindow) => a1 >= w.y0 && a0 <= w.y1;
function extent(s: { start: number; end: number; startWindow?: [number, number]; endWindow?: [number, number] }): [number, number] {
  return [Math.min(s.start, s.startWindow?.[0] ?? s.start), Math.max(s.end, s.endWindow?.[1] ?? s.end)];
}
function scan(lanes: LaneDef[], events: ResolvedEvent[], spans: Map<string, ResolvedSpan[]>, phases: Map<string, ResolvedPhase[]>, present: number, w: YearWindow) {
  const activeRows = new Set<string>();
  for (const e of events) {
    const [a, b] = extent({ ...e, end: effectiveEnd(e, present) });
    if (overlaps(a, b, w)) for (const t of e.tracks) activeRows.add(t);
  }
  for (const [id, list] of spans) if (list.some((s) => overlaps(...extent(s), w))) activeRows.add(id);
  for (const [id, list] of phases) if (list.some((p) => overlaps(...extent(p), w))) activeRows.add(id);
  return new Set(lanes.filter((l) => l.members.some((m) => activeRows.has(m))).map((l) => l.id));
}

/** The data a timeline's chart works from, resolved as useChronology does under the default dating. */
function resolved(ds: Dataset) {
  const sel = defaultSelection(ds);
  const events = resolveEvents(ds, sel);
  const phases = new Map<string, ResolvedPhase[]>();
  for (const t of ds.tracks) if (t.phases?.length) phases.set(t.id, t.phases.map((p) => ({ name: p.name, ...resolveSpan(ds, t.id, p, sel) })));
  const spans = new Map<string, ResolvedSpan[]>();
  for (const t of ds.tracks) {
    const list = resolveLifespan(ds, t, sel, phases.get(t.id));
    if (list.length) spans.set(t.id, list);
  }
  return { events, phases, spans, present: ds.present ?? presentYear(ds.events) };
}

/** A small seeded generator (mulberry32), so a failure names a window that can be replayed. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sorted = (s: Set<string>) => [...s].sort();
const TIMELINES = ['ancient-classical', 'medieval', 'modern-states', 'earth-life'];

describe('laneActivity answers as the plain scan did', () => {
  for (const id of TIMELINES) {
    it(`${id}: random and sliding windows, rows open and folded`, () => {
      const ds = JSON.parse(readFileSync(new URL(`../../public/timelines/${id}.json`, import.meta.url), 'utf8')) as Dataset;
      const { events, phases, spans, present } = resolved(ds);
      const parents = new Set(ds.tracks.map((t) => t.parent).filter(Boolean) as string[]);
      const layouts = [buildLanes(ds.tracks, {}, {}), buildLanes(ds.tracks, {}, Object.fromEntries([...parents].map((p) => [p, true])))];
      const r0 = Math.min(...events.map((e) => e.start), ds.meta.range?.start ?? Infinity);
      const r1 = Math.max(present, ds.meta.range?.end ?? -Infinity);
      const span = r1 - r0;
      const next = rng(20261124);
      const windows: YearWindow[] = [];
      for (let i = 0; i < 150; i++) {
        const width = Math.exp(next() * Math.log(span + 1)); // 1 year to the whole range, evenly on a log scale
        const y0 = Math.floor(r0 - width / 2 + next() * (span + width));
        windows.push({ y0, y1: Math.ceil(y0 + width) });
      }
      for (const width of [1, 25, span / 20])
        for (let y0 = r0 - width; y0 <= r1; y0 += Math.max(1, Math.floor(span / 60))) windows.push({ y0: Math.floor(y0), y1: Math.ceil(y0 + width) });
      let checked = 0;
      for (const lanes of layouts) {
        const index = laneActivity(lanes, rowActivity(events, spans, phases, present));
        for (const w of windows) {
          expect(sorted(index(w)), `${id} window ${w.y0}..${w.y1}`).toEqual(sorted(scan(lanes, events, spans, phases, present, w)));
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(400);
    });
  }

  it('the odd cases: NaN bounds, an extent that ends before it starts, intervals that only touch, windows on the bounds', () => {
    const tracks: Track[] = ['a', 'b', 'c', 'd'].map((t) => ({ id: t, name: t, color: '#000' }));
    const lanes = buildLanes(tracks, {}, {});
    const ev = (uuid: string, start: number, track: string, o: Partial<ResolvedEvent> = {}) =>
      ({ uuid, title: uuid, descr: '', start, tracks: [track], sources: [], ...o }) as ResolvedEvent;
    const events = [
      ev('nan', Number.NaN, 'a'),
      ev('nan-end', 10, 'a', { end: Number.NaN }),
      ev('touch1', 0, 'b', { end: 10 }),
      ev('touch2', 10, 'b', { end: 20 }),
      ev('gap', 40, 'b', { end: 50 }),
      ev('ongoing', 90, 'c', { ongoing: true }),
      ev('window', 200, 'c', { startWindow: [150, 210] }),
    ];
    const phases = new Map<string, ResolvedPhase[]>([['d', [{ name: 'inverted', start: 30, end: 10 }]]]);
    const spans = new Map<string, ResolvedSpan[]>([['d', [{ start: 60, end: 60 }]]]);
    const present = 100;
    const index = laneActivity(lanes, rowActivity(events, spans, phases, present));
    for (let y0 = -5; y0 <= 230; y0 += 1)
      for (const width of [0, 1, 4, 15, 40]) {
        const w = { y0, y1: y0 + width };
        expect(sorted(index(w)), `window ${w.y0}..${w.y1}`).toEqual(sorted(scan(lanes, events, spans, phases, present, w)));
      }
  });
});
