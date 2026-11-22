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

function render_(eras: Era[], onSelect = vi.fn(), viewLeft = 0) {
  const d = plainTimeline();
  d.meta.eras = eras;
  const ages = placeAges(d, {});
  // the chart runs from 0 to 200 L
  const scale = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false });
  const { container } = render(
    <AgeStrip ages={ages} lines={2} scale={scale} labelW={100} width={2000} viewLeft={viewLeft} cal={d.meta.calendar} sources={d.sources} onSelect={onSelect} />,
  );
  return container;
}
const strip = (eras: Era[], onSelect = vi.fn()) => [...render_(eras, onSelect).querySelectorAll<HTMLButtonElement>('button.tl-age')];
const wiki = 'https://en.wikipedia.org/wiki/Salt_Years';

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
    expect(buttons[0].querySelector('.bar')!.classList.contains('cut-start')).toBe(true);
    expect(buttons[0].querySelector('.bar')!.classList.contains('cut-end')).toBe(false);
    expect(buttons[0].title).toContain('Runs on past this timeline');
  });

  it('draws uncertain ends lighter, sized to their ranges', () => {
    const [b] = strip([
      { id: 'salt', name: 'Salt Years', start: 20, end: 60, startDates: [{ year: 10, source: cite[0] }, { year: 30, source: cite[0] }], sources: cite },
    ]);
    const bar = b.querySelector<HTMLElement>('.bar')!;
    expect(bar.classList.contains('uncertain')).toBe(true);
    // from 10 L (the start's earliest) to 30 L at 8 px a year
    expect(bar.style.getPropertyValue('--fade-in')).toBe('160px');
  });

  it('keeps a short age’s target at least 24 px wide, its bar at the age’s own width', () => {
    const [b] = strip([{ id: 'blip', name: 'Blip', start: 20, end: 20, sources: cite }]);
    expect(parseFloat(b.style.width)).toBe(24);
    expect(parseFloat(b.querySelector<HTMLElement>('.bar')!.style.width)).toBe(8);
  });

  it('links an age with a page from a ↗ before its name, named for screen readers; the bar still centres', () => {
    const onSelect = vi.fn();
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 60, url: wiki, sources: cite }], onSelect);
    const a = c.querySelector<HTMLAnchorElement>('a.tl-age-link')!;
    expect(a.getAttribute('href')).toBe(wiki);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('aria-label')).toBe('Salt Years: article on en.wikipedia.org (opens in a new tab)');
    // at the start of the bar, 24 px wide; the name moves over to make room
    expect(a.style.left).toBe(c.querySelector<HTMLButtonElement>('button.tl-age')!.style.left);
    expect(a.style.width).toBe('24px');
    const b = c.querySelector<HTMLButtonElement>('button.tl-age')!;
    expect(b.title).toContain('↗ opens its article on en.wikipedia.org');
    expect(parseFloat(b.querySelector<HTMLElement>('.name')!.style.paddingLeft)).toBeGreaterThanOrEqual(18);
    fireEvent.click(b);
    expect(onSelect).toHaveBeenCalledWith(40);
  });

  it('keeps the ↗ beside the name while the age starts off to the left', () => {
    // the view starts 20 years (160 px) into the age: the name and the link move along with it
    const x0 = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false }).x(20);
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 100, url: wiki, sources: cite }], vi.fn(), x0 + 160);
    const a = c.querySelector<HTMLAnchorElement>('a.tl-age-link')!;
    const name = c.querySelector<HTMLElement>('button.tl-age .name')!;
    expect(name.style.left).toBe('160px');
    expect(a.style.left).toBe(`${100 + x0 + 160}px`);
  });

  it('leaves the ↗ off a bar too short for two 24 px targets, and points to the Ages table instead', () => {
    // 20 L – 24 L is 40 px at 8 px a year
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 24, url: wiki, sources: cite }]);
    expect(c.querySelector('a.tl-age-link')).toBeNull();
    expect(c.querySelector<HTMLButtonElement>('button.tl-age')!.title).toContain('zoom in, or see the Ages table');
  });

  it('has no link for an age without a page, or with an unsafe one', () => {
    const c = render_([
      { id: 'a', name: 'Plain', start: 20, end: 60, sources: cite },
      { id: 'b', name: 'Bad', start: 100, end: 160, url: 'javascript:alert(1)', sources: cite },
    ]);
    expect(c.querySelector('a.tl-age-link')).toBeNull();
    expect(c.querySelector<HTMLButtonElement>('button.tl-age')!.title).not.toContain('article');
  });
});
