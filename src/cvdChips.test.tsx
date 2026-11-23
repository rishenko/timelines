// @vitest-environment jsdom
// The Colour-blind safe preset recolours rows for display, and every row chip follows: a chip in the Filters panel
// has its row's chart colour, so a colour-blind reader can match the two. Other presets keep the data's colours.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './test/app.tsx';
import { CVD_PALETTE } from './lib/cvdPalette.ts';

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
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 100_000 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const OPEN = 'timeline=ancient-classical&inc=100&at=-1400&rows=all';
const ROW = 'africa';
/** The row's colour in the chart, and the chip's beside its name in Filters → rows. */
function colours(c: HTMLElement) {
  const lane = c.querySelector<HTMLElement>(`.tl-lane[data-lane="${ROW}"]`)!;
  act(() => fireEvent.click(screen.getByRole('button', { name: /^Filters/ })));
  const name = lane.querySelector('.tl-lane-label .name')!.firstChild!.textContent!.trim();
  const chip = [...document.querySelectorAll<HTMLElement>('.tree-name .chip')].find((el) => el.parentElement?.textContent?.trim() === name)!;
  return { row: lane.style.getPropertyValue('--track-color'), chip: chip.style.getPropertyValue('--track-color') };
}

describe('row chips under the Colour-blind safe preset', () => {
  it('match the recoloured row', () => {
    localStorage.setItem('timeline:theme', JSON.stringify({ preset: 'cvd' }));
    const { container } = renderApp(OPEN);
    const { row, chip } = colours(container);
    expect(CVD_PALETTE).toContain(row);
    expect(chip).toBe(row);
  });

  it('keep the data colour under other presets', () => {
    const { container } = renderApp(OPEN);
    const { row, chip } = colours(container);
    expect(CVD_PALETTE).not.toContain(row);
    expect(chip).toBe(row);
  });
});
