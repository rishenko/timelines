// @vitest-environment jsdom
// Phase strips from the keyboard: each strip line of a row (its phases, then its memberships in other rows) is a line of
// the chart's keyboard grid, above the row's events. Up and Down reach it, Left/Right and Home/End walk it, and Enter
// opens the phase's details in the side panel. The chart stays one Tab stop, which starts on an event.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp, SITE } from './test/app.tsx';
import { plainTimeline } from './test/fixtures.ts';
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

const src = [{ sourceKey: 'ledger', sourceLocation: 'p. 20' }];

/** The fictional timeline, with Quay Town (three phases) in a union, the Harbor League, for a membership line. */
function open(query = 'inc=50&at=100') {
  const d: Dataset = plainTimeline();
  d.tracks.splice(3, 0, { id: 'league', name: 'The Harbor League', color: '#b33a3a', span: { start: 60, end: 179 } });
  d.tracks.find((x) => x.id === 'quay')!.memberOf = [{ row: 'league', start: 60, end: 179, sources: src }];
  SITE.push({ id: d.meta.id, title: d.meta.title, file: 'harbor-towns.json' });
  try {
    return renderApp(`timeline=harbor-towns&${query}`, [d]);
  } finally {
    SITE.pop();
  }
}

const press = async (key: string) =>
  act(async () => {
    fireEvent.keyDown(document.activeElement!, { key });
  });
const focused = () => document.activeElement as HTMLElement;
const stops = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lanes [data-stop]')];

describe('phase strips from the keyboard', () => {
  it('leaves the Tab stop on an event; strip cells are buttons with their dates in their names', () => {
    const { container: c } = open();
    const tab = stops(c).filter((el) => el.tabIndex === 0);
    expect(tab).toHaveLength(1);
    expect(tab[0].classList.contains('tl-mark')).toBe(true);
    const cells = [...c.querySelectorAll<HTMLElement>('[data-lane="quay"] .tl-phase')];
    expect(cells.length).toBeGreaterThanOrEqual(3);
    expect(cells.every((el) => el.getAttribute('role') === 'button' && el.tabIndex === -1)).toBe(true);
    expect(cells.map((el) => el.getAttribute('aria-label'))).toContain('Second Council, 60 L – 179 L, phase: details and sources');
    // a membership's name starts with its visible text, verbatim (2.5.3 Label in Name)
    const member = c.querySelector<HTMLElement>('[data-lane="quay"] .tl-phase.member')!;
    expect(member.getAttribute('aria-label')).toBe('in The Harbor League, 60–179, Quay Town, membership: details and sources');
    expect(member.getAttribute('aria-label')!.startsWith(member.querySelector('.tl-phase-name')!.textContent!)).toBe(true);
  });

  it("reaches a row's strip lines with ↑ from its events, walks a line with ←/→ and Home/End", async () => {
    const { container: c } = open();
    const quay = c.querySelector('[data-lane="quay"]')!;
    quay.querySelector<HTMLElement>('.tl-mark')!.focus();
    // the membership line sits under the phases, so ↑ reaches it first, then the phases
    await press('ArrowUp');
    expect(focused().classList.contains('member')).toBe(true);
    expect(focused().closest('[data-lane]')).toBe(quay);
    await press('ArrowUp');
    expect(focused().matches('.tl-phase:not(.member)')).toBe(true);
    expect(stops(c).filter((el) => el.tabIndex === 0)).toEqual([focused()]);
    await press('Home');
    expect(focused().getAttribute('aria-label')).toMatch(/^First Council/);
    await press('ArrowRight');
    expect(focused().getAttribute('aria-label')).toMatch(/^Second Council/);
    await press('End');
    expect(focused().getAttribute('aria-label')).toMatch(/^Third Council/);
    await press('ArrowRight');
    expect(focused().getAttribute('aria-label')).toMatch(/^Third Council/);
    // ↓ goes back through the membership line to the row's events
    await press('ArrowDown');
    await press('ArrowDown');
    expect(focused().classList.contains('tl-mark')).toBe(true);
  });

  it("opens a phase's details with Enter: dates, claims with sources; Escape closes and returns focus to the cell", async () => {
    const { container: c } = open();
    const third = [...c.querySelectorAll<HTMLElement>('[data-lane="quay"] .tl-phase')].find((el) => el.getAttribute('aria-label')?.startsWith('Third Council'))!;
    third.focus();
    await press('Enter');
    const panel = c.querySelector('aside.side-panel.detail')!;
    expect(panel.querySelector('#detail-title')!.textContent).toBe('Third Council');
    expect(panel.textContent).toContain('Phase of Quay Town');
    expect(panel.textContent).toContain('The Harbor Ledger');
    expect(panel.textContent).toContain('p. 12');
    expect(third.getAttribute('aria-pressed')).toBe('true');
    expect(third.classList.contains('selected')).toBe(true);
    await act(async () => {
      fireEvent.keyDown(panel, { key: 'Escape' });
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(c.querySelector('aside.side-panel.detail')).toBeNull();
    expect(document.activeElement?.getAttribute('data-phase-ref')).toBe(third.getAttribute('data-phase-ref'));
  });

  it("opens a membership's details with Space, naming the union and its sources", async () => {
    const { container: c } = open();
    c.querySelector<HTMLElement>('[data-lane="quay"] .tl-phase.member')!.focus();
    await press(' ');
    const panel = c.querySelector('aside.side-panel.detail')!;
    expect(panel.querySelector('#detail-title')!.textContent).toBe('Quay Town in The Harbor League');
    expect(panel.textContent).toContain('Membership of The Harbor League');
    expect(panel.textContent).toContain('p. 20');
  });

  it('keeps a membership’s ref by its place in Track.memberOf, and an editor opening closes a phase’s details', async () => {
    const { container: c } = open();
    const member = c.querySelector<HTMLElement>('[data-lane="quay"] .tl-phase.member')!;
    expect(member.getAttribute('data-phase-ref')).toBe('member:quay:0');
    member.focus();
    await press('Enter');
    expect(c.querySelector('#detail-title')!.textContent).toBe('Quay Town in The Harbor League');
    // edit mode, then the row's editor: its phases may be reordered or deleted, so the details close
    fireEvent.click(screen.getByRole('button', { name: /^Customize/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on edit mode' }));
    expect(c.querySelector('[data-lane="quay"] .tl-phase.member.selected')).not.toBeNull();
    await act(async () => {
      fireEvent.click(c.querySelector<HTMLElement>('[data-lane="quay"] button[title="Edit Quay Town"]')!);
    });
    expect(c.querySelector('[data-lane="quay"] .tl-phase.selected')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Quay Town in The Harbor League' })).toBeNull();
  });

  it('selecting an event closes a phase’s details (one panel at a time)', async () => {
    const { container: c } = open();
    c.querySelector<HTMLElement>('[data-lane="quay"] .tl-phase')!.focus();
    await press('Enter');
    expect(c.querySelector('#detail-title')!.textContent).toMatch(/Council/);
    await act(async () => {
      fireEvent.click(c.querySelector<HTMLElement>('[data-lane="quay"] .tl-mark')!);
    });
    expect(c.querySelector('[data-lane="quay"] .tl-phase.selected')).toBeNull();
    expect(c.querySelector('#detail-title')!.textContent).not.toMatch(/Council/);
  });
});
