// @vitest-environment jsdom
// A row draws nothing past either end of the chart (the ruler): a lifespan or phase that runs on past its end is cut
// there and ends in an arrow, as a still-going one does; one that lies wholly past it isn't drawn.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PhaseStripCell, SpanBand } from './Bands.tsx';
import type { PhaseCell } from './layout.ts';
import type { Scale } from './scale.ts';
import type { Calendar, Track } from '../types.ts';

afterEach(cleanup);

/** A chart of the years 1000–1500, 2 px a year. */
const scale = { x: (y: number) => (y - 1000) * 2, width: 1000 } as Scale;
const cal: Calendar = { before: 'BCE', after: 'CE', yearZero: false };
const track: Track = { id: 'r', name: 'Row', color: '#336699' };
const common = { scale, cal, labelW: 0, inView: () => true };

const band = (start: number, end: number, ongoing = false) => {
  const { container } = render(<SpanBand track={track} span={{ start, end, ongoing }} {...common} />);
  return container.querySelector<HTMLElement>('.tl-span');
};

describe('a lifespan band at the ends of the chart', () => {
  it('within the chart: drawn as it is, with no arrow', () => {
    const b = band(1100, 1300)!;
    expect([parseFloat(b.style.left), parseFloat(b.style.width)]).toEqual([200, 402]);
    expect(b.querySelector('.tl-ongoing')).toBeNull();
  });

  it('running on past the end: cut at the end of the chart, ending in an arrow', () => {
    const b = band(1100, 1800)!;
    expect(parseFloat(b.style.left) + parseFloat(b.style.width)).toBe(1000);
    expect(b.querySelector('.tl-ongoing')).not.toBeNull();
  });

  it('still going: cut at the end of the chart too', () => {
    const b = band(1400, 2026, true)!;
    expect(parseFloat(b.style.left) + parseFloat(b.style.width)).toBe(1000);
    expect(b.querySelector('.tl-ongoing')).not.toBeNull();
  });

  it('wholly past the end: not drawn', () => {
    expect(band(1600, 1800)).toBeNull();
  });

  it('begun before the start: cut at the start of the chart', () => {
    expect(parseFloat(band(900, 1200)!.style.left)).toBe(0);
  });
});

describe('a phase cell at the end of the chart', () => {
  const cell = (x0: number, x1: number, endX: number | null): PhaseCell => ({
    phase: { name: 'Kingdom', start: 1100, end: 1800, trackId: 'r', level: 0, nameFrom: 1100, nameTo: 1800 } as PhaseCell['phase'],
    line: { top: 0, height: 16, named: true },
    alt: false,
    x0,
    x1,
    fadeIn: 0,
    fadeOut: 0,
    startX: x0,
    endX,
    name: { x0, x1, outside: false },
  });

  it('is cut at the end, loses its end line there, and ends in an arrow', () => {
    const { container } = render(<PhaseStripCell cell={cell(200, 1602, 1602)} color="#336699" {...common} />);
    const p = container.querySelector<HTMLElement>('.tl-phase')!;
    expect(parseFloat(p.style.left) + parseFloat(p.style.width)).toBe(1000);
    expect(p.querySelector('.tl-phase-edge.end')).toBeNull();
    expect(p.querySelector('.tl-ongoing')).not.toBeNull();
    expect(parseFloat(p.querySelector<HTMLElement>('.tl-phase-names')!.style.width)).toBe(800);
  });

  it('wholly past the end: not drawn', () => {
    const { container } = render(<PhaseStripCell cell={cell(1200, 1600, 1600)} color="#336699" {...common} />);
    expect(container.querySelector('.tl-phase')).toBeNull();
  });
});
