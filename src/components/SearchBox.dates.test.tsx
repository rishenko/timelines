// @vitest-environment jsdom
// Search results write a lifespan's or phase's dates the way the chart and the table do: "c." on both ends when
// the dates are approximate.
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { renderApp } from '../test/app.tsx';

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

function results(query: string): string[] {
  const { container } = renderApp('timeline=ancient-classical');
  const input = container.querySelector<HTMLInputElement>('input[placeholder="Row, event or year…"]')!;
  act(() => fireEvent.change(input, { target: { value: query } }));
  return [...container.querySelectorAll('[role="option"]')].map((o) => o.textContent ?? '');
}

it('a circa phase reads "c." on both ends', () => {
  const r = results('Prepalatial').find((t) => t.includes('Prepalatial'));
  expect(r).toMatch(/c\. 3100 BCE – c\. 1925 BCE/);
});

it('a circa lifespan reads "c." on both ends', () => {
  const r = results('Wilton culture').find((t) => t.includes('Wilton'));
  expect(r).toMatch(/c\. \d+ BCE – c\. \d+ (BCE|CE)/);
});

it('offers a typed year as before, and a date given in months or days', () => {
  expect(results('1274 BCE')[0]).toBe('Go to 1274 BCE');
  expect(results('15 March 44 BCE')[0]).toBe('Go to 15 March 44 BCE');
  expect(results('July 1916')[0]).toBe('Go to July 1916 CE');
  expect(results('1916-07-01')[0]).toBe('Go to 1 July 1916 CE');
  expect(results('31 February 1916').some((t) => t.startsWith('Go to'))).toBe(false);
});
