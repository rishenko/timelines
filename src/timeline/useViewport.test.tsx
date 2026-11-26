// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useViewport } from './useViewport.ts';
import type { FocusRequest } from '../state/focus.ts';
import type { LaneLayout } from './layout.ts';
import type { Scale } from './scale.ts';

// A scale of 1 px per year from year 0, and a scroller 1000 px wide with a label column of `labelW`.
const scale = { width: 3000, increment: 10, x: (y: number) => y, yearAt: (x: number) => x } as unknown as Scale;
const lane = { lane: { id: 'row', members: ['row'] }, top: 1400, height: 40 } as unknown as LaneLayout;

describe('useViewport: a focus request (search, links)', () => {
  let el: HTMLDivElement;
  let lanes: HTMLDivElement;
  const calls: { left?: number; top?: number; behavior?: string }[] = [];
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (cb(), 0));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    el = document.createElement('div');
    lanes = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
    calls.length = 0;
    el.scrollTo = ((o: { left?: number; top?: number; behavior?: string }) => {
      calls.push(o);
      if (o.left !== undefined) el.scrollLeft = o.left;
      if (o.top !== undefined) el.scrollTop = o.top;
    }) as typeof el.scrollTo;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const setup = (labelW: number, focus: FocusRequest | null) =>
    renderHook((p: { labelW: number; focus: FocusRequest | null }) =>
      useViewport({
        scrollerRef: { current: el }, lanesRef: { current: lanes }, scale, lanes: [lane], labelW: p.labelW, focus: p.focus,
        selectedId: null, marksByEvent: new Map(), initialCenterYear: 2000, onCenterYearChange: () => {},
      }), { initialProps: { labelW, focus } });

  it('is not undone when the rows it unfolds widen the label column (the search bug)', () => {
    const focus: FocusRequest = { year: 500, range: [450, 550], trackId: 'row', nonce: 1 };
    const view = setup(120, null);
    el.scrollLeft = 1880; // the chart starts scrolled to the right, as Medieval does
    view.rerender({ labelW: 120, focus });
    expect(calls.at(-1)).toMatchObject({ behavior: 'smooth' }); // the request scrolled toward the row
    // the scroll handler records the first frame (still at the old place) as the center year ...
    act(() => view.result.current.onScroll());
    // ... and the unfolded rows then widen the label column, which re-creates the scale helpers
    view.rerender({ labelW: 168, focus });
    const last = calls.at(-1)!;
    // the last scroll is still toward year 500 and the row (top 1400), not back to the old center around 2000 + 880
    expect(last.left).toBeLessThan(900);
    expect(last.top).toBeGreaterThan(0);
  });

  it('places the year `at` a share of the time axis, at once (a pinch keeps the year under the fingers)', () => {
    const view = setup(200, null);
    view.rerender({ labelW: 200, focus: { year: 1500, at: 0.25, nonce: 2 } });
    // the time axis is 1000 − 200 = 800 px wide: year 1500 (x 1500) a quarter of the way in, 200 px from its left
    expect(calls.at(-1)).toMatchObject({ left: 1300, behavior: 'auto' });
    view.rerender({ labelW: 200, focus: { year: 1500, nonce: 3 } });
    expect(calls.at(-1)).toMatchObject({ left: 1100, behavior: 'smooth' }); // without `at`: centred, smoothly
  });

  it('keeps the center year when the scale changes without a focus request', () => {
    const view = setup(120, null);
    calls.length = 0;
    view.rerender({ labelW: 168, focus: null });
    expect(calls.at(-1)).toMatchObject({ behavior: 'instant' });
  });
});
