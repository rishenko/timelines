import { describe, expect, it } from 'vitest';
import { tourSteps } from './tour.ts';
import combined from '../../public/timelines/ancient-classical.json';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset } from '../types.ts';

describe('guided tour', () => {
  it('covers the dating systems and nested rows of a timeline that has them', () => {
    const steps = tourSteps(combined as unknown as Dataset, { hasDating: true, hasSubRows: true });
    expect(steps[0].title).toBe('Welcome to Ancient and Classical World');
    expect(steps[0].target).toBeUndefined();
    expect(steps.map((s) => s.title)).toEqual(expect.arrayContaining(['Dating', 'Open and fold rows', 'Search']));
  });

  it('leaves out steps for features a timeline does not use', () => {
    const titles = tourSteps(plainTimeline(), { hasDating: false, hasSubRows: false }).map((s) => s.title);
    expect(titles).not.toContain('Dating');
    expect(titles).not.toContain('Open and fold rows');
    expect(titles).toContain('Events');
  });

  it('shows the chart first, then the toolbar from left to right', () => {
    const titles = tourSteps(combined as unknown as Dataset, { hasDating: true, hasSubRows: true }).map((s) => s.title);
    expect(titles.slice(1)).toEqual([
      'Rows',
      'Events',
      'Lifespans',
      'Phases',
      'Timelines',
      'Timeline or table',
      'Dating',
      'Zoom and move',
      'Open and fold rows',
      'Filters',
      'Search',
      'Legend',
      'Customize',
    ]);
  });

  it('explains lifespan bands, right after Events, only when rows have them', () => {
    const titles = tourSteps(combined as unknown as Dataset, { hasDating: true, hasSubRows: true }).map((s) => s.title);
    expect(titles.indexOf('Lifespans')).toBe(titles.indexOf('Events') + 1);
    const plain = plainTimeline();
    // a row with phases has a lifespan worked out from them, so take the phases away too
    const noSpans = { ...plain, tracks: plain.tracks.map(({ span: _span, phases: _phases, ...t }) => t) } as Dataset;
    expect(tourSteps(noSpans, { hasDating: false, hasSubRows: false }).map((s) => s.title)).not.toContain('Lifespans');
  });

  it('explains phases after lifespans, and memberships only when a row has one', () => {
    const plain = plainTimeline();
    const titles = tourSteps(plain, { hasDating: false, hasSubRows: false }).map((s) => s.title);
    expect(titles.indexOf('Phases')).toBe(titles.indexOf('Lifespans') + 1);
    expect(titles).not.toContain('Memberships');
    const noPhases = { ...plain, tracks: plain.tracks.map(({ phases: _p, ...t }) => t) } as Dataset;
    expect(tourSteps(noPhases, { hasDating: false, hasSubRows: false }).map((s) => s.title)).not.toContain('Phases');

    const member = {
      ...plain,
      tracks: plain.tracks.map((t) => (t.id === 'saltmarsh' ? { ...t, memberOf: [{ row: 'quay', start: 0, end: 50, sources: [] }] } : t)),
    } as Dataset;
    const steps = tourSteps(member, { hasDating: false, hasSubRows: false });
    expect(steps.map((s) => s.title).indexOf('Memberships')).toBe(steps.map((s) => s.title).indexOf('Phases') + 1);
    expect(steps.find((s) => s.title === 'Memberships')?.target).toBe('.tl-phase.member');
  });

  it('mentions a second strip only when phases overlap', () => {
    const plain = plainTimeline();
    const text = (d: Dataset) => tourSteps(d, { hasDating: false, hasSubRows: false }).find((s) => s.title === 'Phases')!.text;
    expect(text(plain)).not.toMatch(/second strip/);
    const rival = {
      ...plain,
      tracks: plain.tracks.map((t) => (t.id === 'quay' ? { ...t, phases: [...t.phases!, { name: 'Rival Council', start: 100, end: 120 }] } : t)),
    } as Dataset;
    expect(text(rival)).toMatch(/second strip/);
  });
});
