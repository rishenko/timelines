// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createViewportStore } from './viewportStore.ts';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AgeStrip } from './AgeStrip.tsx';
import { placeAges } from '../lib/eras.ts';
import { buildScale } from './scale.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { ContextSpan } from '../types.ts';

/** An age as the tests write it; render_ makes it a context span of kind `age` on the timeline. */
type Era = Omit<ContextSpan, 'kind'>;

afterEach(cleanup);

const cite = [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }];

function render_(eras: Era[], viewLeft = 0, onOpen = vi.fn()) {
  const d = plainTimeline();
  d.meta.context = eras.map((e) => ({ kind: 'age', ...e }));
  const ages = placeAges(d, {});
  // the chart runs from 0 to 200 L
  const scale = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false });
  const { container } = render(
    <AgeStrip ages={ages} lines={2} scale={scale} labelW={100} width={2000} viewStore={createViewportStore({ left: viewLeft, width: 1200 })} cal={d.meta.calendar} sources={d.sources} onOpen={onOpen} />,
  );
  return container;
}
const strip = (eras: Era[]) => [...render_(eras).querySelectorAll<HTMLButtonElement>('button.tl-age')];
const wiki = 'https://en.wikipedia.org/wiki/Salt_Years';

describe('the Ages strip', () => {
  it('names each age with its dates for screen readers, gives dates and sources in its tooltip', () => {
    const [b] = strip([{ id: 'salt', name: 'Salt Years', start: 20, end: 60, circa: true, sources: cite }]);
    expect(b.getAttribute('aria-label')).toBe('Salt Years, c. 20 L – c. 60 L, age: details, article and sources');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.title).toContain('Salt Years, c. 20 L – c. 60 L');
    expect(b.title).toContain('from The Harbor Ledger');
    expect(b.title).toContain('Click for its article and sources');
  });

  it('opens an age’s details on click (in the side panel; the chart never moves)', () => {
    const onOpen = vi.fn();
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 24, url: wiki, sources: cite }], 0, onOpen);
    const b = c.querySelector<HTMLButtonElement>('button.tl-age')!;
    expect(b.dataset.ageId).toBe('salt');
    fireEvent.click(b);
    expect(onOpen).toHaveBeenCalledWith('salt');
  });

  it('links an age with a page from a ↗ before its name, named for screen readers', () => {
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 60, url: wiki, sources: cite }]);
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
  });

  it('keeps the ↗ beside the name while the age starts off to the left', () => {
    // the view starts 20 years (160 px) into the age: the name and the link move along with it
    const x0 = buildScale([0, 200], { increment: 10, tickPx: 80, compress: false }).x(20);
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 100, url: wiki, sources: cite }], x0 + 160);
    const a = c.querySelector<HTMLAnchorElement>('a.tl-age-link')!;
    const name = c.querySelector<HTMLElement>('button.tl-age .name')!;
    expect(name.style.left).toBe('160px');
    expect(a.style.left).toBe(`${100 + x0 + 160}px`);
  });

  it('leaves the ↗ off a bar too short for two 24 px targets (its details still link the article)', () => {
    // 20 L – 24 L is 40 px at 8 px a year
    const c = render_([{ id: 'salt', name: 'Salt Years', start: 20, end: 24, url: wiki, sources: cite }]);
    expect(c.querySelector('a.tl-age-link')).toBeNull();
    expect(c.querySelector<HTMLButtonElement>('button.tl-age')!.title).not.toContain('↗');
  });

  it('has no link for an age without a page, or with an unsafe one', () => {
    const c = render_([
      { id: 'a', name: 'Plain', start: 20, end: 60, sources: cite },
      { id: 'b', name: 'Bad', start: 100, end: 160, url: 'javascript:alert(1)', sources: cite },
    ]);
    expect(c.querySelector('a.tl-age-link')).toBeNull();
    expect(c.querySelector<HTMLButtonElement>('button.tl-age')!.title).not.toContain('↗');
  });
});

describe('the Ages strip from the keyboard', () => {
  const eras: Era[] = [
    { id: 'a', name: 'Ash', start: 0, end: 40, line: 'g1', sources: cite },
    { id: 'b', name: 'Brine', start: 40, end: 90, line: 'g1', sources: cite },
    { id: 'c', name: 'Coral', start: 90, end: 150, line: 'g1', sources: cite, url: wiki },
    { id: 'd', name: 'Dune', start: 10, end: 120, line: 'g2', sources: cite },
  ];
  const stops = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[tabindex="0"]')].map((e) => e.dataset.ageId ?? e.tagName);

  it('is one Tab stop per line, at the first age in view; ↗ links are left to the panel', () => {
    const c = render_(eras);
    expect(stops(c)).toEqual(['a', 'd']);
    expect(c.querySelector('a.tl-age-link')!.getAttribute('tabindex')).toBe('-1');
    // scrolled on: the stop is the first age at or after the view's left edge
    expect(stops(render_(eras, 500))).toContain('c');
  });

  it('moves along a line with ←/→ and Home/End, and the stop follows focus', () => {
    const c = render_(eras);
    const btn = (id: string) => c.querySelector<HTMLButtonElement>(`button[data-age-id="${id}"]`)!;
    btn('a').focus();
    fireEvent.keyDown(btn('a'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('b'));
    fireEvent.keyDown(btn('b'), { key: 'End' });
    expect(document.activeElement).toBe(btn('c'));
    // past the end it stays put; never jumps to another line
    fireEvent.keyDown(btn('c'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('c'));
    fireEvent.keyDown(btn('c'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('a'));
    fireEvent.keyDown(btn('a'), { key: 'ArrowRight' });
    expect(stops(c)).toEqual(['b', 'd']);
  });

  it('opens the focused age with Enter (a button: Enter clicks it)', () => {
    const onOpen = vi.fn();
    const c = render_(eras, 0, onOpen);
    const b = c.querySelector<HTMLButtonElement>('button[data-age-id="d"]')!;
    expect(b.tagName).toBe('BUTTON');
    fireEvent.click(b);
    expect(onOpen).toHaveBeenCalledWith('d');
  });
});
