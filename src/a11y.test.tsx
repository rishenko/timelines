// @vitest-environment jsdom
// Accessibility checks on the whole app (WCAG 2.2 AA is the target; docs/feature-audit.md item 23).
// axe-core runs the automated WCAG rules on the rendered page. jsdom has no layout or colours, so the colour-contrast
// rule is off here (it's checked per theme separately); everything else axe can see from the markup is on.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import App from './App.tsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

beforeAll(() => {
  // jsdom lacks these; the app only uses them for layout and scrolling
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  // jsdom lays nothing out, so the timeline would draw no events; give elements a screen-sized box
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});

beforeEach(() => {
  // a first visit starts the guided tour; most checks are about the page itself (the tour has its own test)
  localStorage.setItem('timelines:legend-seen', '1');
});

async function violations(root: Element) {
  const result = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.html.slice(0, 120)}`);
}

function open(timeline: string, extra = '') {
  window.history.replaceState(null, '', `/?timeline=${timeline}${extra}`);
  return render(<App />);
}

describe('accessibility', () => {
  for (const id of ['ancient-near-east', 'classical', 'REDACTED']) {
    it(`${id}: no automated WCAG violations on the opening view`, async () => {
      const { container } = open(id);
      expect(await violations(container)).toEqual([]);
    });
  }

  it('names every event button with its dates and rows', () => {
    const { container } = open('REDACTED');
    const marks = [...container.querySelectorAll<HTMLButtonElement>('button.tl-mark:not(.cluster)')];
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      const label = m.getAttribute('aria-label') ?? '';
      // the visible title comes first (WCAG 2.5.3, label in name), then a date
      expect(label.startsWith(m.querySelector('.label')?.textContent ?? '\u0000')).toBe(true);
      expect(label).toMatch(/\d/);
    }
  });

  it('gives row fold buttons a name and an expanded state', () => {
    const { container } = open('ancient-near-east');
    const folds = [...container.querySelectorAll('button.collapse[aria-expanded]')];
    expect(folds.length).toBeGreaterThan(0);
    for (const b of folds) expect(b.getAttribute('aria-label')).toMatch(/^(Sub-rows of|All events in) /);
  });

  it('moves focus into the detail panel when an event opens, and back when Escape closes it', async () => {
    const { container } = open('REDACTED');
    const mark = container.querySelector<HTMLButtonElement>('button.tl-mark:not(.cluster)')!;
    mark.focus();
    fireEvent.click(mark);
    const heading = await screen.findByRole('heading', { level: 2 });
    expect(document.activeElement).toBe(heading);
    expect(await violations(container)).toEqual([]);
    await act(async () => {
      fireEvent.keyDown(heading, { key: 'Escape' });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(document.activeElement?.getAttribute('data-event-id')).toBe(mark.getAttribute('data-event-id'));
  });

  it('the guided tour on a first visit has no automated violations', async () => {
    localStorage.clear();
    const { container } = open('ancient-near-east');
    expect(screen.getByRole('dialog', { name: /Welcome/ })).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });

  it('has a skip link to the timeline region', () => {
    open('classical');
    const skip = screen.getByRole('link', { name: 'Skip to the timeline' });
    const target = document.querySelector(skip.getAttribute('href')!);
    expect(target?.getAttribute('role')).toBe('region');
  });
});
