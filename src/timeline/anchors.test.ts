import { describe, expect, it } from 'vitest';
import { anchorsFor } from './anchors.ts';
import { validateDataset } from '../data/validate.ts';
import classical from '../timelines/classical.json';
import type { ResolvedEvent } from '../lib/chronology.ts';
import type { Dataset } from '../types.ts';

const ev = (start: number, end?: number) => ({ uuid: String(start), title: '', descr: '', start, end, tracks: ['x'], sources: [] }) as ResolvedEvent;

describe('a timeline range keeps the ruler to its period', () => {
  it('clamps anchors outside the range to its ends', () => {
    const range = { start: -499, end: 650 };
    expect(anchorsFor([ev(-1100), ev(100, 1453)], 2000, [], range)).toEqual([-499, 100, 650]);
    expect(anchorsFor([ev(-1100)], 2000)).toEqual([-1100]);
  });

  it('the Classical World states its range, and reversed ranges are rejected', () => {
    const d = structuredClone(classical) as unknown as Dataset;
    expect(d.meta.range).toEqual({ start: -499, end: 650 });
    d.meta.range = { start: 650, end: -499 };
    expect(validateDataset(d).join()).toContain('meta.range');
  });
});
