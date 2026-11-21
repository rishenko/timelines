// @vitest-environment jsdom
// The reader's filters in the link: row and source switches, source tags, folded rows and Dating choices open from a
// link, are written back (only what differs from the defaults), and ids the timeline doesn't have are skipped and said.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp } from './test/app.tsx';

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

const OPEN = 'timeline=ancient-classical&inc=100&at=-1400&rows=all';
const laneIds = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lane[data-lane]')].map((l) => l.dataset.lane!);
const param = (k: string) => new URLSearchParams(window.location.search).get(k);

describe('filters in the link', () => {
  it('writes nothing extra for the timeline as it opens', async () => {
    renderApp(OPEN);
    await waitFor(() => expect(param('timeline')).toBe('ancient-classical'));
    for (const k of ['hide', 'show', 'hidetag', 'hidesrc', 'addsrc', 'src', 'fold', 'unfold', 'folded', 'dating']) expect(param(k)).toBeNull();
  });

  it('opens with rows switched off and folds from the link, and keeps them in the link', async () => {
    const { container: c } = renderApp(OPEN + '&unfold=anatolia,egypt&hide=hittites');
    const lanes = laneIds(c);
    expect(lanes).toContain('pharaonic-egypt');
    expect(lanes).not.toContain('hittites');
    await waitFor(() => expect(param('hide')).toBe('hittites'));
    expect(param('unfold')).toBe('anatolia,egypt');
    expect(window.location.search).toContain('unfold=anatolia,egypt'); // commas stay readable
  });

  it('a branch written as row* hides the row and every row below it', () => {
    const { container: c } = renderApp(OPEN + '&unfold=anatolia,egypt&hide=egypt*');
    const lanes = laneIds(c);
    expect(lanes).not.toContain('pharaonic-egypt');
    expect(lanes).toContain('hittites');
  });

  it('folded=all shows only the top-level rows; expanding all writes folded=none', async () => {
    const { container: c } = renderApp(OPEN + '&folded=all');
    const top = laneIds(c);
    expect(top).toContain('africa');
    expect(top).not.toContain('north-africa');
    await waitFor(() => expect(param('folded')).toBe('all'));
    act(() => fireEvent.click(screen.getByRole('button', { name: /Expand all/ })));
    await waitFor(() => expect(param('folded')).toBe('none'));
  });

  it('opens with a Dating choice and a source tag off, and keeps both', async () => {
    renderApp(OPEN + '&dating=low&hidetag=wikipedia');
    expect(screen.getByRole('button', { name: /Dating · 1 changed/ })).toBeTruthy();
    await waitFor(() => expect(param('dating')).toBe('low'));
    expect(param('hidetag')).toBe('wikipedia');
    expect(param('hidesrc')).toBeNull();
  });

  it('skips ids the timeline no longer has and says so', () => {
    const { container: c } = renderApp(OPEN + '&hide=hittites,atlantis&dating=lemuria');
    expect(laneIds(c)).not.toContain('hittites');
    expect(document.body.textContent).toContain("2 items in this link aren't in this timeline any more");
  });
});
