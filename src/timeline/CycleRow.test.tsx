// @vitest-environment jsdom
// Cycle rows (Track.cycle, draft v11): only the repeats in view are drawn, never more than CYCLE_MAX_TICKS, and a
// cycle too dense for the zoom (the 11-year solar cycle across deep time) becomes one density band.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CycleRow } from './CycleRow.tsx';
import { buildScale } from './scale.ts';
import { buildLanes, LAYOUT_DEFAULTS, layoutLanes } from './layout.ts';
import { CYCLE_MAX_TICKS, CYCLE_MIN_TICK_PX, cycleDrawing, cycleDrawings } from '../lib/cycles.ts';
import type { Calendar, Track, TrackCycle } from '../types.ts';

afterEach(cleanup);

const cal: Calendar = { before: 'BP', after: 'AP', yearZero: true, beforePresent: { present: 1950 } };
const src = [{ sourceKey: 's', sourceLocation: '' }];
const cycle = (period: number, anchor = 1950, extra: Partial<TrackCycle> = {}): TrackCycle => ({ period, anchor, sources: src, ...extra });
const row = (c: TrackCycle): Track => ({ id: 'c', name: 'Cycle', color: '#557799', kind: 'theme', cycle: c });

/** 4.6 billion years at 80 px per 100 million years (deep-time zoom): about 3,700 px wide. */
const deep = buildScale([-4_567_000_000, 1950], { increment: 100_000_000, tickPx: 80, compress: false });
/** 2 million years at 80 px per 100,000 years. */
const near = buildScale([-2_000_000, 1950], { increment: 100_000, tickPx: 80, compress: false });

describe('cycleDrawing', () => {
  it('draws ticks only in view, spaced by the period', () => {
    const d = cycleDrawing(cycle(25_772), near, 0, near.width);
    expect(d?.kind).toBe('ticks');
    if (d?.kind !== 'ticks') return;
    const [y0, y1] = [near.yearAt(0), near.yearAt(near.width)];
    expect(d.ticks.length).toBe(Math.floor((y1 - 1950) / 25_772) - Math.ceil((y0 - 1950) / 25_772) + 1);
    expect(d.ticks.every((t) => t.x >= 0 && t.x <= near.width)).toBe(true);
    expect(d.ticks[1].year - d.ticks[0].year).toBe(25_772);
    // a narrower window draws fewer
    const part = cycleDrawing(cycle(25_772), near, 0, 200);
    expect(part?.kind === 'ticks' && part.ticks.length).toBeLessThan(d.ticks.length);
  });

  it('numbers repeats from the anchor (n = 0 starts on it)', () => {
    const d = cycleDrawing(cycle(405_000, 1950), near, 0, near.width);
    expect(d?.kind === 'ticks' && d.ticks.at(-1)).toMatchObject({ n: 0, year: 1950 });
  });

  it('turns a cycle too dense for the zoom into one band: the solar cycle across deep time', () => {
    const d = cycleDrawing(cycle(11, 1755), deep, 0, deep.width);
    expect(d).toMatchObject({ kind: 'density', x0: 0, x1: deep.width });
    expect(d?.kind === 'density' && d.count).toBeGreaterThan(400_000_000);
  });

  it('never draws more than CYCLE_MAX_TICKS ticks, however wide the view', () => {
    // a period wide enough to pass the spacing test but with more repeats than the cap
    const wide = buildScale([0, 10_000_000], { increment: 1000, tickPx: 80, compress: false });
    const period = Math.ceil((CYCLE_MIN_TICK_PX * 1000) / 80);
    const d = cycleDrawing(cycle(period, 0), wide, 0, wide.width);
    expect(d?.kind).toBe('density');
    for (const p of [25_772, 100_000, 225_000_000, 11])
      for (const s of [deep, near]) {
        const r = cycleDrawing(cycle(p), s, 0, s.width);
        if (r?.kind === 'ticks') expect(r.ticks.length).toBeLessThanOrEqual(CYCLE_MAX_TICKS);
      }
  });

  it('is empty when no repeat starts in view', () => {
    expect(cycleDrawing(cycle(225_000_000, 1950 - 100_000_000), near, 0, near.width)).toBeNull();
  });

  it('with a lifespan, draws repeats only within it', () => {
    // 1,000 years at 8 px a year; an 11-year cycle from 1755 with a lifespan 1755–1950
    const recent = buildScale([1000, 1950], { increment: 10, tickPx: 80, compress: false });
    const all = cycleDrawings(cycle(11, 1755), recent, 0, recent.width);
    const lived = cycleDrawings(cycle(11, 1755), recent, 0, recent.width, [[1755, 1950]]);
    const ticks = (ds: typeof all) => ds.flatMap((d) => (d.kind === 'ticks' ? d.ticks : []));
    expect(ticks(all).some((t) => t.year < 1755)).toBe(true);
    expect(ticks(lived).length).toBe(Math.floor((1950 - 1755) / 11) + 1);
    expect(ticks(lived).every((t) => t.year >= 1755 && t.year <= 1950)).toBe(true);
    // a lifespan wholly out of view draws nothing
    expect(cycleDrawings(cycle(11, 1755), recent, 0, recent.x(1700), [[1755, 1950]])).toEqual([]);
  });
});

describe('<CycleRow>', () => {
  it('renders a bounded number of ticks, with a summary for screen readers', () => {
    const { container, getByRole } = render(<CycleRow track={row(cycle(25_772))} scale={near} cal={cal} labelW={0} x0={0} x1={near.width} />);
    const n = container.querySelectorAll('.tl-cycle-tick').length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(CYCLE_MAX_TICKS);
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/^Cycle: repeats every about 25,772 years/);
  });

  it('renders a density band, not thousands of ticks, at deep-time zoom', () => {
    const { container } = render(<CycleRow track={row(cycle(11, 1755, { label: 'Solar cycle', anchorNumber: 1 }))} scale={deep} cal={cal} labelW={0} x0={0} x1={deep.width} />);
    expect(container.querySelectorAll('.tl-cycle-tick').length).toBe(0);
    expect(container.querySelector('.tl-cycle-density')?.getAttribute('aria-label')).toMatch(/^Solar cycle: repeats every about 11 years, counted from .*\(Solar cycle 1\)/);
  });

  it('names a period range when the sources give one', () => {
    const c = cycle(225_000_000, 1950, { periodClaims: [{ years: 225_000_000, min: 225_000_000, max: 250_000_000, source: src[0] }] });
    const { getByRole } = render(<CycleRow track={row(c)} scale={deep} cal={cal} labelW={0} x0={0} x1={deep.width} />);
    expect(getByRole('img').getAttribute('aria-label')).toContain('estimates run 225 million years to 250 million years');
  });
});

describe('cycle rows in the layout', () => {
  const tracks: Track[] = [
    { id: 'cycles', name: 'Cycles', color: '#777777', kind: 'theme' },
    { ...row(cycle(11, 1755)), id: 'solar', parent: 'cycles' },
  ];
  const lanes = buildLanes(tracks, {}, {});
  const height = (out: { lane: { id: string }; height: number }[], id: string) => out.find((l) => l.lane.id === id)!.height;

  it('a cycle row with no events is thinner than an empty row', () => {
    const { lanes: out } = layoutLanes(lanes, [], near, 1950);
    expect(height(out, 'solar')).toBe(LAYOUT_DEFAULTS.cyclePx);
    expect(height(out, 'cycles')).toBe(LAYOUT_DEFAULTS.rowH + 2 * LAYOUT_DEFAULTS.lanePad);
  });

  it('in edit mode a group row is tall enough for its wrapped edit buttons', () => {
    const { lanes: out } = layoutLanes(lanes, [], near, 1950, { groupMinPx: LAYOUT_DEFAULTS.editGroupPx });
    expect(height(out, 'cycles')).toBe(LAYOUT_DEFAULTS.editGroupPx);
    expect(height(out, 'solar')).toBe(LAYOUT_DEFAULTS.cyclePx);
  });
});
