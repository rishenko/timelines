// @vitest-environment jsdom
// The year cursor from the keyboard: Y on the chart places it at the focused event's year and focuses its chip (a
// slider named "Year cursor"); on the chip ←/→ move it one zoom step, Shift+←/→ a tenth of one, and Escape puts it away
// and returns focus. Since split step 2 these keys are commands in the registry; this test was written against main
// first, so it pins the behaviour the registry must keep.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { renderApp, SITE } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

function open(query = 'inc=50&at=100') {
  const d = plainTimeline();
  SITE.push({ id: d.meta.id, title: d.meta.title, file: 'harbor-towns.json' });
  try {
    return renderApp(`timeline=harbor-towns&${query}`, [d]);
  } finally {
    SITE.pop();
  }
}

const press = async (key: string, mods: { shiftKey?: boolean; ctrlKey?: boolean } = {}) =>
  act(async () => {
    fireEvent.keyDown(document.activeElement!, { key, ...mods });
  });
const chip = (c: Element) => c.querySelector<HTMLElement>('.tl-cursor-chip[role="slider"]');
/** The chip's year as a number (its text is the timeline's own year label). */
const year = (c: Element) => Number(/-?\d+/.exec(chip(c)!.getAttribute('aria-valuetext')!)![0]);
const tabStop = (c: Element) => c.querySelector<HTMLElement>('.tl-lanes [data-stop][tabindex="0"]')!;

describe('the year cursor from the keyboard', () => {
  it('Y places it and focuses its chip; arrows step it; Shift a tenth; Escape puts it away and returns focus', async () => {
    const { container: c } = open();
    const ev = tabStop(c);
    act(() => ev.focus());
    expect(chip(c)).toBeNull();
    await press('y');
    expect(chip(c)).not.toBeNull();
    expect(document.activeElement).toBe(chip(c));
    expect(chip(c)!.getAttribute('aria-label')).toBe('Year cursor');
    // step clear of the era boundary first (the fixture's first event is in 40 BL), so the years below are plain numbers
    await press('ArrowRight');
    await press('ArrowRight');
    const y0 = year(c);
    await press('ArrowRight');
    expect(year(c)).toBe(y0 + 50);
    await press('ArrowLeft');
    await press('ArrowLeft');
    expect(year(c)).toBe(y0 - 50);
    await press('ArrowRight', { shiftKey: true });
    expect(year(c)).toBe(y0 - 45);
    await press('ArrowLeft', { shiftKey: true });
    expect(year(c)).toBe(y0 - 50);
    await press('Escape');
    expect(chip(c)).toBeNull();
    expect(document.activeElement).toBe(ev);
  });

  it('takes Y in either case, but not with Ctrl, Alt or Cmd', async () => {
    const { container: c } = open();
    act(() => tabStop(c).focus());
    await press('y', { ctrlKey: true });
    expect(chip(c)).toBeNull();
    await press('Y', { shiftKey: true });
    expect(chip(c)).not.toBeNull();
  });
});
