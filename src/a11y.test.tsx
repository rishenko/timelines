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
  for (const id of ['ancient-near-east', 'classical']) {
    it(`${id}: no automated WCAG violations on the opening view`, async () => {
      const { container } = open(id);
      expect(await violations(container)).toEqual([]);
    });
  }

  it('names every event button with its dates and rows', () => {
    const { container } = open('classical');
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
    const { container } = open('classical');
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

  for (const id of ['ancient-near-east', 'classical']) {
    it(`${id}: the table view has no automated WCAG violations`, async () => {
      const { container } = open(id, '&view=table');
      expect(screen.getByRole('region', { name: /^Table: / })).toBeTruthy();
      expect(container.querySelectorAll('table').length).toBeGreaterThan(0);
      expect(await violations(container)).toEqual([]);
    }, 30_000);
  }

  it('table view: an event opens the detail panel, and Escape returns focus to it', async () => {
    const { container } = open('classical', '&view=table');
    const button = container.querySelector<HTMLButtonElement>('table [data-event-id]')!;
    button.focus();
    fireEvent.click(button);
    const heading = await screen.findByRole('heading', { level: 2, name: button.textContent! });
    expect(document.activeElement).toBe(heading);
    await act(async () => {
      fireEvent.keyDown(heading, { key: 'Escape' });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(document.activeElement).toBe(button);
  });

  it('the view switch says which view is on, and the skip link follows it', () => {
    open('classical', '&view=table');
    expect(screen.getByRole('button', { name: 'Table', pressed: true })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Skip to the table' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByRole('link', { name: 'Skip to the timeline' })).toBeTruthy();
  });

  it('a first visit straight into table view does not start the tour (it is about the chart)', () => {
    localStorage.clear();
    open('classical', '&view=table');
    expect(screen.queryByRole('dialog', { name: /Welcome/ })).toBeNull();
  });

  describe('keyboard in the chart', () => {
    const stops = (c: Element) => [...c.querySelectorAll<HTMLElement>('.tl-lanes [data-stop]')];
    const laneOf = (el: Element | null) => el?.closest('.tl-lane')?.getAttribute('aria-label');
    const press = async (key: string) =>
      act(async () => {
        fireEvent.keyDown(document.activeElement!, { key });
      });

    it('is one Tab stop', () => {
      const { container } = open('ancient-near-east');
      expect(stops(container).length).toBeGreaterThan(5);
      expect(stops(container).filter((el) => el.tabIndex === 0)).toHaveLength(1);
    });

    it('moves along a row with the arrows, and between rows', async () => {
      const { container } = open('classical');
      const first = container.querySelector<HTMLElement>('.tl-mark[tabindex="0"]')!;
      first.focus();
      await press('ArrowRight');
      const next = document.activeElement as HTMLElement;
      expect(next).not.toBe(first);
      expect(laneOf(next)).toBe(laneOf(first));
      expect(next.tabIndex).toBe(0);
      expect(first.tabIndex).toBe(-1);
      await press('ArrowDown');
      expect(laneOf(document.activeElement)).not.toBe(laneOf(first));
      await press('Home');
      expect(document.activeElement?.getAttribute('data-stop')).toBeTruthy();
    });

    it('zooms with + and opens the key list with ?', async () => {
      const { container } = open('classical');
      container.querySelector<HTMLElement>('.tl-mark[tabindex="0"]')!.focus();
      const zoomOn = () => screen.getByRole('group', { name: 'Years per tick' }).querySelector('.on')?.textContent;
      const before = zoomOn();
      await press('+');
      expect(zoomOn()).not.toBe(before);
      expect(document.activeElement?.closest('.tl-lanes')).toBeTruthy(); // focus stays in the chart
      await press('?');
      expect(screen.getByRole('heading', { name: 'Keyboard' })).toBeTruthy();
    });
  });

  describe('Customize panel', () => {
    it('replaces the Timelines, Theme and Edit mode buttons', () => {
      open('classical');
      expect(screen.getByRole('button', { name: 'Customize' })).toBeTruthy();
      for (const gone of ['Theme', 'Edit mode', 'Timelines']) expect(screen.queryByRole('button', { name: gone })).toBeNull();
    });

    it('has three tabs, each without automated violations, moved between with the arrow keys', async () => {
      const { container } = open('ancient-near-east');
      fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((t) => t.textContent)).toEqual(['Appearance', 'Edit', 'Timelines']);
      for (const tab of tabs) {
        fireEvent.click(tab);
        expect(screen.getByRole('tabpanel', { name: tab.textContent! })).toBeTruthy();
        expect(await violations(container)).toEqual([]);
      }
      screen.getByRole('tab', { name: 'Timelines' }).focus();
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      expect(document.activeElement?.textContent).toBe('Appearance');
      expect(screen.getByRole('tab', { name: 'Appearance' }).getAttribute('aria-selected')).toBe('true');
    });

    it('turns edit mode on from the Edit tab, and the edit bar turns it off', () => {
      open('classical');
      fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
      fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Turn on edit mode' }));
      expect(screen.queryByRole('tablist', { name: 'Customize' })).toBeNull(); // the panel closes
      expect(screen.getByRole('button', { name: '+ Event' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
      expect(screen.queryByRole('button', { name: '+ Event' })).toBeNull();
    });
  });

  it('has a skip link to the timeline region', () => {
    open('classical');
    const skip = screen.getByRole('link', { name: 'Skip to the timeline' });
    const target = document.querySelector(skip.getAttribute('href')!);
    expect(target?.getAttribute('role')).toBe('region');
  });
});
