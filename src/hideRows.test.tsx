// @vitest-environment jsdom
// "Hide rows with nothing in view": on by default (a timeline can turn it off with meta.hideRowsOutOfView: false);
// the link and the Filters panel switch it; headers count the hidden rows and can show them.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp, SITE_DATASETS } from './test/app.tsx';
import type { Dataset } from './types.ts';

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

const lanes = (c: Element) => c.querySelectorAll('.tl-lane').length;
const hiddenButtons = (c: Element) => [...c.querySelectorAll<HTMLButtonElement>('button.hidden-rows')];
const expandAll = (c: Element) => {
  const b = [...c.querySelectorAll<HTMLButtonElement>('button')].find((x) => /Expand all/.test(x.textContent ?? ''))!;
  act(() => fireEvent.click(b));
};
/** The Filters panel's checkbox (opening the panel if it isn't: panels remember being open). */
const filtersCheckbox = () => {
  const name = 'Hide rows with nothing in view';
  if (!screen.queryByRole('checkbox', { name })) act(() => fireEvent.click(screen.getByRole('button', { name: 'Filters' })));
  return screen.getByRole('checkbox', { name }) as HTMLInputElement;
};

describe('hide rows with nothing in view', () => {
  it('is on in the combined timeline: headers count the hidden rows, and can show them', async () => {
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-2000');
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
    const before = lanes(c);
    const b = hiddenButtons(c)[0];
    const n = Number(b.textContent!.replace('+', ''));
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.getAttribute('aria-label')).toMatch(/^Show \d+ rows? in .+ with nothing in view$/);
    act(() => fireEvent.click(b));
    expect(lanes(c)).toBe(before + n);
    expect(hiddenButtons(c)[0].getAttribute('aria-pressed')).toBe('true');
    expect(filtersCheckbox().checked).toBe(true);
  });

  it('opens with thin lines from a link', async () => {
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-2000&rows=thin');
    expandAll(c);
    await waitFor(() => expect(c.querySelectorAll('.tl-lane.thin').length).toBeGreaterThan(0));
  });

  it('turning it off in Filters shows every row, and the link remembers it', async () => {
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-2000');
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
    const before = lanes(c);
    const box = filtersCheckbox();
    act(() => fireEvent.click(box));
    expect(hiddenButtons(c)).toEqual([]);
    expect(lanes(c)).toBeGreaterThan(before);
    await waitFor(() => expect(window.location.search).toContain('rows=all'));
  });

  it('the ruler says rows are hidden while it is on, and its note turns it off', async () => {
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-2000');
    expandAll(c);
    const note = await screen.findByRole('button', { name: /^\d+ rows hidden: nothing in view\. Show every row$/ });
    expect(note.textContent).toMatch(/^\d+ rows hidden$/);
    act(() => fireEvent.click(note));
    expect(screen.queryByRole('button', { name: /hidden: nothing in view/ })).toBeNull();
    expect(hiddenButtons(c)).toEqual([]);
    expect(filtersCheckbox().checked).toBe(false);
  });

  it('can draw hidden rows as thin lines in their place instead', async () => {
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=-2000');
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
    const drawn = lanes(c);
    filtersCheckbox(); // opens the panel
    const thinRadio = screen.getByRole('radio', { name: 'Show them as thin lines' });
    act(() => fireEvent.click(thinRadio));
    const thin = c.querySelectorAll('.tl-lane.thin');
    expect(thin.length).toBeGreaterThan(0);
    expect(lanes(c)).toBe(drawn + thin.length);
    // a thin line holds no events, only its name for hovering, and is hidden from screen readers
    expect(thin[0].querySelectorAll('.tl-mark').length).toBe(0);
    expect(thin[0].querySelector('.thin-name')?.textContent).toBeTruthy();
    expect(thin[0].getAttribute('aria-hidden')).toBe('true');
    await waitFor(() => expect(window.location.search).toContain('rows=thin'));
    // a click or tap on a line shows its name (touch screens can't hover); again hides it
    act(() => fireEvent.click(thin[0]));
    expect(c.querySelector('.tl-lane.thin')!.classList.contains('peek')).toBe(true);
    act(() => fireEvent.click(c.querySelector('.tl-lane.thin')!));
    expect(c.querySelector('.tl-lane.thin.peek')).toBeNull();
  });

  it('is on by default, even without meta.hideRowsOutOfView, and a link saying rows=all still wins', async () => {
    const plain = structuredClone(SITE_DATASETS[0]) as Dataset;
    delete plain.meta.hideRowsOutOfView;
    let c = renderApp('timeline=ancient-classical&inc=100&at=-2000', [plain]).container;
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
    expect(filtersCheckbox().checked).toBe(true);
    cleanup();
    c = renderApp('timeline=ancient-classical&inc=100&at=-2000&rows=all', [plain]).container;
    expandAll(c);
    expect(hiddenButtons(c)).toEqual([]);
    expect(filtersCheckbox().checked).toBe(false);
  });

  it('is off where the timeline says hideRowsOutOfView: false, unless the link turns it on', async () => {
    const off = structuredClone(SITE_DATASETS[0]) as Dataset;
    off.meta.hideRowsOutOfView = false;
    let c = renderApp('timeline=ancient-classical&inc=100&at=-2000', [off]).container;
    expandAll(c);
    expect(hiddenButtons(c)).toEqual([]);
    expect(c.querySelector('.rows-hidden')).toBeNull();
    expect(filtersCheckbox().checked).toBe(false);
    cleanup();
    c = renderApp('timeline=ancient-classical&inc=100&at=-2000&rows=active', [off]).container;
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
  });

  it('keeps the selected event’s row', async () => {
    // Göbekli Tepe's row has nothing near 500 CE, but its event is selected
    const { container: c } = renderApp('timeline=ancient-classical&inc=100&at=500#gobekli-tepe');
    expandAll(c);
    await waitFor(() => expect(hiddenButtons(c).length).toBeGreaterThan(0));
    expect(c.querySelector('[data-lane="gobekli"]')).not.toBeNull();
  });
});
