// @vitest-environment jsdom
// The event panel's "Cite this event" and "Report a problem" (docs/feature-audit.md items 6 and 3): a timeline the site
// doesn't ship (here a fixture, like a reader's own) gets a citation but no link to the public repo's issues.
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

describe('the event panel: cite and report', () => {
  it('cites the event; no "Report a problem" on a timeline the site doesn’t ship', () => {
    renderApp('timeline=harbor-towns#founding', [plainTimeline()]);
    const panel = screen.getByRole('complementary', { name: 'Quay Town founded' });
    expect(within(panel).getByText(/In “The Harbor Towns,” Timelines, data version/)).toBeTruthy();
    // (inside the closed <details>, which jsdom doesn't open on a click on its summary as browsers do, hence `hidden`)
    const buttons = within(panel).getAllByRole('button', { hidden: true }).map((b) => b.textContent);
    expect(buttons).toEqual(expect.arrayContaining(['Copy the Chicago citation', 'Copy the BibTeX entry']));
    expect(within(panel).queryByRole('link', { name: /^Report a problem/ })).toBeNull();
  });
});

describe('cite this timeline', () => {
  it('focuses the title button before the dialog opens, so closing it returns focus there (the menu item unmounts)', () => {
    renderApp('timeline=harbor-towns', [plainTimeline()]);
    const title = document.querySelector<HTMLButtonElement>('button.timeline-picker')!;
    fireEvent.click(title);
    fireEvent.click(screen.getByRole('button', { name: 'Cite this timeline…' }));
    expect(document.activeElement).toBe(title);
    expect(document.querySelector('dialog.cite-dialog h2')?.textContent).toBe('Cite “The Harbor Towns”');
  });
});
