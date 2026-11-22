// @vitest-environment jsdom
// Dated memberships in the app (Track.memberOf): a member's row draws each as one more strip line naming the union and
// its years, display only; the union's row lists its members; the table view's rows table lists both.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
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

/**
 * The fictional timeline with a union (the Harbor League) and its members, plus an island held by several rows at
 * once and changing hands several times in one year (as a contested border world would).
 */
function open(query: string) {
  const d: Dataset = plainTimeline();
  d.tracks.splice(3, 0, { id: 'league', name: 'The Harbor League', color: '#b33a3a', span: { start: 60, end: 179, endEvent: 'great-storm' } });
  d.tracks.splice(4, 0, { id: 'isle', name: 'Gull Isle', color: '#888888' });
  const t = (id: string) => d.tracks.find((x) => x.id === id)!;
  t('quay').memberOf = [{ row: 'league', start: 60, end: 179, sources: src }];
  t('saltmarsh').span = { start: -10, end: 200 };
  t('saltmarsh').memberOf = [{ row: 'league', start: 95, end: 150, endEvent: 'great-storm', sources: src }];
  t('isle').span = { start: 0, end: 260 };
  t('isle').memberOf = [
    // held jointly by three rows
    { row: 'quay', start: 100, end: 140, sources: src },
    { row: 'saltmarsh', start: 100, end: 140, sources: src },
    { row: 'lighthouse', start: 120, end: 140, sources: src },
    // changes hands three times in one year
    { row: 'quay', start: 150, end: 150, sources: src },
    { row: 'saltmarsh', start: 150, end: 150, sources: src },
    { row: 'quay', start: 150, end: 200, sources: src },
  ];
  SITE.push({ id: d.meta.id, title: d.meta.title, file: 'harbor-towns.json' });
  try {
    return renderApp(`timeline=harbor-towns&${query}`, [d]);
  } finally {
    SITE.pop();
  }
}

describe('dated memberships', () => {
  it("draws a member's membership as a strip after its phases, in the union's colour, naming the union and its years", () => {
    const { container: c } = open('inc=50&at=100');
    const quay = c.querySelector('[data-lane="quay"]')!;
    const member = quay.querySelector<HTMLElement>('.tl-phase.member')!;
    expect(member).not.toBeNull();
    expect(member.style.getPropertyValue('--track-color')).toBe('#b33a3a'); // the League's colour
    expect(member.querySelector('.tl-phase-fill')!.getAttribute('title')).toMatch(/^Quay Town in The Harbor League: 60 L – 179 L/);
    // below the phase lines, and display only (no buttons or links in the strip)
    const phaseTops = [...quay.querySelectorAll<HTMLElement>('.tl-phase:not(.member)')].map((p) => parseFloat(p.style.top));
    expect(parseFloat(member.style.top)).toBeGreaterThan(Math.max(...phaseTops));
    expect(member.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it("lists a union's members in its name's tooltip", () => {
    const { container: c } = open('inc=50&at=100');
    const name = c.querySelector('[data-lane="league"] .tl-lane-label .name')!;
    expect(name.getAttribute('title')).toContain('Members (2): Quay Town 60–179, Saltmarsh 95–150');
  });

  it('stacks memberships that overlap, including several in one year, on their own lines', () => {
    const { container: c } = open('inc=50&at=100');
    const strips = [...c.querySelectorAll<HTMLElement>('[data-lane="isle"] .tl-phase.member')];
    expect(strips).toHaveLength(6);
    const lines = new Set(strips.map((s) => s.style.top));
    expect(lines.size).toBe(3); // three held it at once in 120–140, and three changes in 150 overlap each other
  });

  it("lists memberships and members in the table view's rows table", () => {
    const { container: c } = open('view=table');
    const row = (id: string) => [...c.querySelectorAll('table.rows-table tr')].find((tr) => tr.querySelector(`th[data-row-id="${id}"]`))!;
    const table = c.querySelector('table.rows-table')!;
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toContain('Memberships');
    expect(row('saltmarsh').textContent).toContain('in The Harbor League: 95 L – 150 L');
    expect(row('league').textContent).toContain('Members (2): Quay Town (60 L – 179 L), Saltmarsh (95 L – 150 L)');
  });

  it('names and colours unions and members outside a comparison set from the whole timeline', () => {
    // the union isn't in the set: its member's strip still reads "in The Harbor League", in the League's colour
    const { container: c } = open('inc=50&at=100&set=quay');
    const member = c.querySelector<HTMLElement>('[data-lane="quay"] .tl-phase.member')!;
    expect(member.style.getPropertyValue('--track-color')).toBe('#b33a3a');
    expect(member.textContent).toContain('in The Harbor League');
    cleanup();
    // the members aren't in the set: the union's tooltip still names them
    const { container: u } = open('inc=50&at=100&set=league');
    expect(u.querySelector('[data-lane="league"] .tl-lane-label .name')!.getAttribute('title')).toContain('Members (2): Quay Town 60–179, Saltmarsh 95–150');
    cleanup();
    // and the table view's rows table
    const { container: t } = open('view=table&set=league');
    const row = [...t.querySelectorAll('table.rows-table tr')].find((tr) => tr.querySelector('th[data-row-id="league"]'))!;
    expect(row.textContent).toContain('Members (2): Quay Town (60 L – 179 L), Saltmarsh (95 L – 150 L)');
  });
});
