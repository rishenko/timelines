// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AgeStrip } from './AgeStrip.tsx';
import { placeAges } from '../lib/eras.ts';
import { buildScale } from './scale.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Era } from '../types.ts';

afterEach(cleanup);

const cite = [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }];

function strip(eras: Era[], onSelect = vi.fn()) {
  const d = plainTimeline();
  d.meta.eras = eras;
  const ages = placeAges(d, {});
  // the chart runs from 0 to 200 L
  const scale = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false });
  const { container } = render(
    <AgeStrip ages={ages} lines={2} scale={scale} labelW={100} width={2000} viewLeft={0} cal={d.meta.calendar} sources={d.sources} onSelect={onSelect} />,
  );
  return [...container.querySelectorAll<HTMLButtonElement>('button.tl-age')];
}

describe('the Ages strip', () => {
  it('names each age with its dates for screen readers, gives dates and sources in its tooltip, and centres on click', () => {
    const onSelect = vi.fn();
    const [b] = strip([{ id: 'salt', name: 'Salt Years', start: 20, end: 60, circa: true, sources: cite }], onSelect);
    expect(b.getAttribute('aria-label')).toBe('Salt Years, c. 20 L – c. 60 L, age; centre the chart on it');
    expect(b.title).toContain('Salt Years, c. 20 L – c. 60 L');
    expect(b.title).toContain('from The Harbor Ledger');
    fireEvent.click(b);
    expect(onSelect).toHaveBeenCalledWith(40);
  });

  it('cuts an age at the chart’s ends with an open edge, and leaves out one wholly outside', () => {
    const buttons = strip([
      { id: 'long', name: 'Long Peace', start: -50, end: 120, sources: cite },
      { id: 'gone', name: 'Before Time', start: -300, end: -200, sources: cite },
    ]);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].classList.contains('cut-start')).toBe(true);
    expect(buttons[0].classList.contains('cut-end')).toBe(false);
    expect(buttons[0].title).toContain('Runs on past this timeline');
  });

  it('draws uncertain ends lighter, sized to their ranges', () => {
    const [b] = strip([
      { id: 'salt', name: 'Salt Years', start: 20, end: 60, startDates: [{ year: 10, source: cite[0] }, { year: 30, source: cite[0] }], sources: cite },
    ]);
    expect(b.classList.contains('uncertain')).toBe(true);
    // from 10 L (the start's earliest) to 30 L at 8 px a year
    expect(b.style.getPropertyValue('--fade-in')).toBe('160px');
  });
});
