// @vitest-environment jsdom
// Ages (meta.eras) in the app: the strip under the ruler in the chart, and the Ages table in the table view.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderApp } from './test/app.tsx';
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
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const withAges = () => {
  const d = plainTimeline();
  d.meta.eras = [
    { id: 'salt-years', name: 'Salt Years', group: 'trade', start: 20, end: 60, sources: [{ sourceKey: 'ledger', sourceLocation: 'p. 3' }] },
    { id: 'long-calm', name: 'Long Calm', group: 'weather', start: 0, end: 30, circa: true, sources: [{ sourceKey: 'logbook', sourceLocation: '' }] },
  ];
  return d;
};

describe('ages', () => {
  it('the chart draws them in the Ages strip, one button each', () => {
    renderApp(`timeline=harbor-towns&inc=10&at=30`, [withAges()]);
    const strip = screen.getByRole('group', { name: 'Ages' });
    expect(within(strip).getByRole('button', { name: /^Salt Years, 20 L – 60 L, age/ })).toBeTruthy();
    expect(within(strip).getByRole('button', { name: /^Long Calm, c\. 0 L – c\. 30 L, age/ })).toBeTruthy();
  });

  it('the table view lists them, earliest first, with dates and sources', () => {
    renderApp(`timeline=harbor-towns&view=table`, [withAges()]);
    const table = screen.getByRole('table', { name: /^Ages/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Long Calm', 'Salt Years']);
    expect(rows[1].textContent).toContain('The Harbor Ledger');
  });

  it('the table links an age with a page by its name, plus its Wikidata id; one without stays plain text', () => {
    const d = withAges();
    d.meta.eras![0].url = 'https://en.wikipedia.org/wiki/Salt_Years';
    d.meta.eras![0].ids = { wikidata: 'Q123' };
    renderApp(`timeline=harbor-towns&view=table`, [d]);
    const table = screen.getByRole('table', { name: /^Ages/ });
    const link = within(table).getByRole('link', { name: /^Salt Years\s*\(opens in a new tab\)$/ });
    expect(link.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Salt_Years');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(within(table).getByRole('link', { name: /^Wikidata\s*Q123\s*\(opens in a new tab\)$/ }).getAttribute('href')).toBe('https://www.wikidata.org/wiki/Q123');
    expect(within(table).queryByRole('link', { name: /Long Calm/ })).toBeNull();
  });

  it('an age placed in a row is drawn on that row’s band, not in the strip, with the same button', () => {
    const d = withAges();
    const row = d.tracks[0];
    d.meta.eras![0].tracks = [row.id];
    renderApp(`timeline=harbor-towns&inc=10&at=30`, [d]);
    const strip = screen.getByRole('group', { name: 'Ages' });
    expect(within(strip).queryByRole('button', { name: /^Salt Years/ })).toBeNull();
    const band = screen.getByRole('group', { name: `Ages in ${row.name}` });
    expect(within(band).getByRole('button', { name: /^Salt Years, 20 L – 60 L, age: details, article and sources$/ })).toBeTruthy();
  });

  it('the table names each age’s region, and lists an age in two rows once', () => {
    const d = withAges();
    d.meta.eras![0].tracks = [d.tracks[0].id, d.tracks[1].id];
    renderApp(`timeline=harbor-towns&view=table`, [d]);
    const table = screen.getByRole('table', { name: /^Ages/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('All regions');
    expect(rows[1].textContent).toContain(`${d.tracks[0].name}, ${d.tracks[1].name}`);
  });

  it('a band with two lines names each line, in the tooltip, the accessible name and the table', () => {
    const d = withAges();
    const row = d.tracks[0];
    d.meta.eras![0].tracks = [row.id];
    d.meta.eras![0].group = 'ages-salt-coast';
    d.meta.eras![1].tracks = [row.id];
    d.meta.eras![1].group = 'ages-weather-coast';
    renderApp(`timeline=harbor-towns&inc=10&at=30`, [d]);
    const band = screen.getByRole('group', { name: `Ages in ${row.name}` });
    const b = within(band).getByRole('button', { name: /^Salt Years \(Salt Coast\), 20 L – 60 L, age/ });
    expect(b.title).toContain('Region: Salt Coast');
    expect([...band.querySelectorAll('.tl-age-line-name')].map((e) => e.textContent)).toEqual(['Salt Coast', 'Weather Coast']);
    cleanup();
    renderApp(`timeline=harbor-towns&view=table`, [d]);
    expect(screen.getByRole('table', { name: /^Ages/ }).textContent).toContain(`${row.name}: Salt Coast`);
  });

  it('clicking an age opens its details in the side panel: region, article and sources as links; Escape closes it', () => {
    const d = withAges();
    const row = d.tracks[0];
    d.meta.eras![0].tracks = [row.id];
    d.meta.eras![0].url = 'https://en.wikipedia.org/wiki/Salt_Years';
    d.meta.eras![0].group = 'ages-salt';
    d.meta.eraGroups = { 'ages-salt': { name: 'Salt Coast' } };
    renderApp(`timeline=harbor-towns&inc=10&at=30`, [d]);
    const b = within(screen.getByRole('group', { name: `Ages in ${row.name}` })).getByRole('button', { name: /^Salt Years/ });
    fireEvent.click(b);
    expect(b.getAttribute('aria-pressed')).toBe('true');
    const panel = screen.getByRole('complementary', { name: 'Salt Years' });
    expect(within(panel).getByText(`${row.name} · Salt Coast`)).toBeTruthy();
    expect(within(panel).getByRole('link', { name: /^Article on en\.wikipedia\.org/ }).getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Salt_Years');
    expect(within(panel).getByRole('heading', { name: 'Sources' })).toBeTruthy();
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Salt Years' })).toBeNull();
  });

  it('a timeline without ages has no strip', () => {
    renderApp(`timeline=harbor-towns`, [plainTimeline()]);
    expect(screen.queryByRole('group', { name: 'Ages' })).toBeNull();
  });
});
