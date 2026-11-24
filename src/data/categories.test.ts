// Event categories (docs/data-format.md, "Event categories"): in every bundled timeline that has the shared `category`
// facet, an event names at most two different categories, never a value beside one it is part of, and only values of
// that facet. Two sub-kinds of one kind are allowed (the Statute of Westminster: reform, then independence). Disasters
// have three levels, kind → cause → type (Kevin, 2026-11-23), and so does Foundational text, text → type (a charter);
// every other kind has two.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import type { Dataset } from '../types.ts';

const KINDS = ['rule', 'statehood', 'territory', 'place', 'disaster', 'conflict', 'unrest', 'diplomacy', 'society', 'science', 'archaeology'];
const CAUSES = ['natural', 'human-caused'];
/** Foundational text's types, the only values under it. */
const TEXT_TYPES = ['scripture', 'law-code', 'charter', 'classic'];

describe.each(SOURCE_TIMELINES.map((t) => [t.short, t.compiled]))('event categories in %s', (_, file) => {
  const ds = JSON.parse(readFileSync(file, 'utf8')) as Dataset;
  const facet = ds.meta.facets?.category;

  it.runIf(!!facet)('the facet has the eleven kinds, and every sub-kind sits in one of them (a disaster type in a cause, a text type in Foundational text)', () => {
    const values = facet!.values;
    expect(Object.keys(values).filter((v) => !values[v].broader)).toEqual(KINDS);
    for (const c of CAUSES) expect(values[c]?.broader, c).toEqual(['disaster']);
    expect(values.text?.broader).toEqual(['society']);
    expect(Object.keys(values).filter((v) => values[v].broader?.includes('text'))).toEqual(TEXT_TYPES);
    for (const [v, val] of Object.entries(values))
      if (val.broader) expect([...KINDS, ...CAUSES, 'text'], v).toEqual(expect.arrayContaining(val.broader));
    expect(facet!.applies).toBe('events');
  });

  it.runIf(!!facet)('each event names at most two different categories, never a value beside one it is part of', () => {
    const above = (v: string): string[] => {
      const up = facet!.values[v]?.broader?.[0];
      return up ? [up, ...above(up)] : [];
    };
    const bad = ds.events.flatMap((e) => {
      const cats = (e.memberships ?? []).filter((m) => m.facet === 'category').map((m) => m.value);
      const repeats = cats.some((v) => cats.some((w) => w !== v && above(v).includes(w)));
      return cats.length > 2 || new Set(cats).size !== cats.length || repeats ? [`${e.uuid}: ${cats.join(', ')}`] : [];
    });
    expect(bad).toEqual([]);
  });
});
