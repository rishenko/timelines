// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LegendPanel } from './LegendPanel.tsx';
import combined from '../../public/timelines/ancient-classical.json';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset } from '../types.ts';
import { laneBands } from '../lib/laneBands.ts';
import { categoryFacetId } from '../lib/categories.ts';

const titles = (ds: Dataset) =>
  [...render(<LegendPanel data={ds} onClose={() => {}} />).container.querySelectorAll('.lg-item strong')].map(
    (el) => el.textContent,
  );

describe('LegendPanel', () => {
  it('explains everything the combined timeline uses', () => {
    const t = titles(combined as unknown as Dataset);
    for (const want of ['Lifespan', 'Uncertain start and end', 'Dating systems', 'Conquers', 'Succeeds', 'Era line', 'Key event'])
      expect(t).toContain(want);
  });

  it('leaves out features a timeline does not use', () => {
    const t = titles(plainTimeline());
    expect(t).toContain('Span');
    expect(t).toContain('Leads to');
    // phases on Quay Town; the Third Council's end has two dates
    expect(t).toContain('Phases');
    // a row with phases has a lifespan worked out from them
    expect(t).toContain('Lifespan');
    expect(t).toContain('Uncertain start and end');
    for (const absent of ['Dating systems', 'Conquers', 'Succeeds', 'Key event', 'Still going'])
      expect(t).not.toContain(absent);
  });

  it('explains the still-going arrow only when a lifespan or phase is ongoing', () => {
    const ds = plainTimeline();
    const t = ds.tracks.find((x) => x.phases?.length)!;
    const last = t.phases!.at(-1)!;
    t.phases![t.phases!.length - 1] = { name: last.name, start: last.start, ongoing: true };
    expect(titles(ds)).toContain('Still going');
  });

  it("explains each lane band the timeline has, in the bands' order, from the one list (lib/laneBands.ts)", () => {
    const ds = combined as unknown as Dataset;
    const id = categoryFacetId(ds);
    const bands = laneBands(ds, id, ds.meta.facets![id!], () => true);
    const t = [...render(<LegendPanel data={ds} onClose={() => {}} bands={bands} />).container.querySelectorAll('.lg-item strong')].map((el) => el.textContent);
    expect(t.indexOf('Golden ages and long spans') - t.indexOf('Reigns')).toBe(1);
    const none = bands.map((b) => ({ ...b, ids: new Set<string>() }));
    const t0 = [...render(<LegendPanel data={ds} onClose={() => {}} bands={none} />).container.querySelectorAll('.lg-item strong')].map((el) => el.textContent);
    expect(t0).not.toContain('Reigns');
    expect(t0).not.toContain('Golden ages and long spans');
  });
});
