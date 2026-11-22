// Event categories (docs/data-format.md, "Event categories"): in every bundled timeline that has the shared `category`
// facet, an event names at most two different categories, never a sub-kind beside its own kind, and only values of that
// facet. Two sub-kinds of one kind are allowed (the Statute of Westminster: reform, then independence).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import type { Dataset } from '../types.ts';

const KINDS = ['rule', 'statehood', 'territory', 'place', 'conflict', 'unrest', 'diplomacy', 'society', 'science', 'archaeology'];

describe.each(SOURCE_TIMELINES.map((t) => [t.short, t.compiled]))('event categories in %s', (_, file) => {
  const ds = JSON.parse(readFileSync(file, 'utf8')) as Dataset;
  const facet = ds.meta.facets?.category;

  it.runIf(!!facet)('the facet has the ten kinds, and every sub-kind sits in one of them', () => {
    const values = facet!.values;
    expect(Object.keys(values).filter((v) => !values[v].broader)).toEqual(KINDS);
    for (const [v, val] of Object.entries(values)) if (val.broader) expect(KINDS, v).toEqual(expect.arrayContaining(val.broader));
    expect(facet!.applies).toBe('events');
  });

  it.runIf(!!facet)('each event names at most two different categories, never a sub-kind beside its own kind', () => {
    const kind = (v: string) => facet!.values[v]?.broader?.[0] ?? v;
    const bad = ds.events.flatMap((e) => {
      const cats = (e.memberships ?? []).filter((m) => m.facet === 'category').map((m) => m.value);
      const repeats = cats.some((v) => cats.some((w) => w !== v && kind(v) === w));
      return cats.length > 2 || new Set(cats).size !== cats.length || repeats ? [`${e.uuid}: ${cats.join(', ')}`] : [];
    });
    expect(bad).toEqual([]);
  });
});
