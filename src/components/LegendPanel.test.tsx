// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LegendPanel } from './LegendPanel.tsx';
import ancient from '../timelines/ancient-near-east.json';
import REDACTED from '../timelines/REDACTED.json';
import type { Dataset } from '../types.ts';

const titles = (ds: Dataset) =>
  [...render(<LegendPanel data={ds} onClose={() => {}} />).container.querySelectorAll('.lg-item strong')].map(
    (el) => el.textContent,
  );

describe('LegendPanel', () => {
  it('explains everything the ancient timeline uses', () => {
    const t = titles(ancient as unknown as Dataset);
    for (const want of ['Lifespan', 'Uncertain start and end', 'Dating systems', 'Conquers', 'Succeeds', 'Era line', 'Key event'])
      expect(t).toContain(want);
  });

  it('leaves out features a timeline does not use', () => {
    const t = titles(REDACTED as Dataset);
    expect(t).toContain('Span');
    expect(t).toContain('Leads to');
    for (const absent of ['Lifespan', 'Uncertain start and end', 'Dating systems', 'Conquers', 'Succeeds', 'Key event'])
      expect(t).not.toContain(absent);
  });
});
