// Event categories from a plan (scripts/lib/categories.ts), for a timeline without a generator: the bundled file holds
// exactly what its plan says, and the applier refuses a stale plan.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import { applyCategories, type CategoryPlan } from '../../scripts/lib/categories.ts';
import type { Dataset } from '../types.ts';

const planned = SOURCE_TIMELINES.filter((t) => t.categories);

describe.each(planned.map((t) => [t.short, t]))('the event categories plan of %s', (_, t) => {
  const plan = JSON.parse(readFileSync(t.categories!, 'utf8')) as CategoryPlan;
  const ds = JSON.parse(readFileSync(t.compiled, 'utf8')) as Dataset;

  it('is what the bundled timeline holds: the facet, and each event\'s categories first, citing its first source', () => {
    expect(ds.meta.facets?.category).toEqual(plan.facet);
    for (const e of ds.events) {
      const cats = (e.memberships ?? []).filter((m) => m.facet === 'category');
      expect(cats.map((m) => m.value), e.uuid).toEqual(plan.events[e.uuid] ?? []);
      for (const m of cats) expect(m.sources, e.uuid).toEqual([e.sources[0]]);
      expect((e.memberships ?? []).slice(0, cats.length), e.uuid).toEqual(cats);
    }
  });
});

describe('applyCategories', () => {
  const facet = { name: 'Category', applies: 'events', values: { conflict: { name: 'Wars' }, battle: { name: 'Battle', broader: ['conflict'] } } };
  const data = () => ({ meta: { facets: { geography: { name: 'Region', values: {} } } }, events: [{ uuid: 'a', sources: [{ sourceKey: 's' }] }] });

  it('keeps the other facets and puts the categories first', () => {
    const d: Record<string, any> = data();
    applyCategories(d, { facet, events: { a: ['battle'] } });
    expect(Object.keys(d.meta.facets)).toEqual(['geography', 'category']);
    expect(d.events[0].memberships).toEqual([{ facet: 'category', value: 'battle', sources: [{ sourceKey: 's' }] }]);
  });

  it('refuses an event the file doesn\'t have, or an unknown value', () => {
    expect(() => applyCategories(data(), { facet, events: { gone: ['battle'] } })).toThrow(/no event "gone"/);
    expect(() => applyCategories(data(), { facet, events: { a: ['siege'] } })).toThrow(/unknown category "siege"/);
  });
});
