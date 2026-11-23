// @vitest-environment jsdom
// `meta.compress` (schema v10): a timeline can open with its shortened gaps off (deep time, until it has events); the
// reader's link (`compress=1`) and Filters still win.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { renderApp } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';
import type { Dataset, TimelineEvent } from './types.ts';

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
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

/** The Harbor Towns with one more event 2,000 years after the rest: a stretch long enough to be shortened. */
function withGap(compress?: boolean): Dataset {
  const d = plainTimeline();
  const far: TimelineEvent = { uuid: 'far-future', title: 'Far future', descr: '', start: 2400, tracks: [d.tracks[0].id], sources: [{ sourceKey: 'ledger', sourceLocation: '' }] };
  d.events = [...d.events, far];
  if (compress !== undefined) d.meta.compress = compress;
  return d;
}
const gaps = () => document.querySelectorAll('.tl-gap-label').length;

describe('meta.compress: the timeline opens with gaps on or off', () => {
  it('on by default: the long empty stretch is shortened', () => {
    renderApp('timeline=harbor-towns', [withGap()]);
    expect(gaps()).toBeGreaterThan(0);
  });

  it('compress: false opens without shortened gaps', () => {
    renderApp('timeline=harbor-towns', [withGap(false)]);
    expect(gaps()).toBe(0);
  });

  it('a link\'s compress=1 turns them on, compress=0 off, whatever the timeline says', () => {
    renderApp('timeline=harbor-towns&v=1&compress=1', [withGap(false)]);
    expect(gaps()).toBeGreaterThan(0);
    cleanup();
    renderApp('timeline=harbor-towns&v=1&compress=0', [withGap()]);
    expect(gaps()).toBe(0);
  });
});
