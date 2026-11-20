import { describe, expect, it } from 'vitest';
import { tourSteps } from './tour.ts';
import ancient from '../../public/timelines/ancient-near-east.json';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset } from '../types.ts';

describe('guided tour', () => {
  it('covers the dating systems and nested rows of a timeline that has them', () => {
    const steps = tourSteps(ancient as unknown as Dataset, { hasDating: true, hasSubRows: true });
    expect(steps[0].title).toBe('Welcome to Ancient Civilizations');
    expect(steps[0].target).toBeUndefined();
    expect(steps.map((s) => s.title)).toEqual(expect.arrayContaining(['Dating', 'Open and fold rows', 'Search']));
  });

  it('leaves out steps for features a timeline does not use', () => {
    const titles = tourSteps(plainTimeline(), { hasDating: false, hasSubRows: false }).map((s) => s.title);
    expect(titles).not.toContain('Dating');
    expect(titles).not.toContain('Open and fold rows');
    expect(titles).toContain('Events');
  });
});
