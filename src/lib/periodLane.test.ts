import { describe, expect, it } from 'vitest';
import { periodByRule, periodLaneIds, PERIOD_MIN_YEARS } from './periodLane.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, Facet, TimelineEvent } from '../types.ts';
import { readFileSync } from 'node:fs';
import list from '../data/period-lane.json';

const facet: Facet = {
  name: 'Category',
  applies: 'events',
  values: {
    society: { name: 'Religion, law and culture' },
    'golden-age': { name: 'Golden age', broader: ['society'] },
    religion: { name: 'Religion', broader: ['society'] },
    rule: { name: 'Rulers' },
    founded: { name: 'State founded', broader: ['statehood'] },
    statehood: { name: 'Statehood' },
  },
};
const ev = (title: string, start: number, end?: number): TimelineEvent => ({ uuid: title, title, descr: '', start, end, tracks: ['quay'], sources: [] });

describe('the period lane’s rule', () => {
  it('takes a golden age as main or second category, span or not', () => {
    expect(periodByRule(ev('Salt Years', 0, 50), ['golden-age'], facet)).toBe(true);
    expect(periodByRule(ev('Harbor built', 0, 3), ['founded', 'golden-age'], facet)).toBe(true);
    expect(periodByRule(ev('Greatest extent', 10), ['golden-age'], facet)).toBe(true);
  });

  it(`takes a society span of ${PERIOD_MIN_YEARS} years or more when society is the main category`, () => {
    expect(periodByRule(ev('Long Faith', 0, PERIOD_MIN_YEARS), ['religion'], facet)).toBe(true);
    expect(periodByRule(ev('Short Faith', 0, PERIOD_MIN_YEARS - 1), ['religion'], facet)).toBe(false);
    expect(periodByRule(ev('A council', 5), ['religion'], facet)).toBe(false);
    // society second only: not a society span
    expect(periodByRule(ev('Kingdom founded', 0, 60), ['founded', 'religion'], facet)).toBe(false);
    expect(periodByRule(ev('Reign of Anon', 0, 60), ['rule'], facet)).toBe(false);
  });

  it('leaves out a person’s lifetime', () => {
    expect(periodByRule(ev('Life of the Teacher', 0, 60), ['religion'], facet)).toBe(false);
    expect(periodByRule(ev('The Lifetime of Anon', 0, 60), ['religion'], facet)).toBe(false);
  });

  it('the override list includes or excludes by id, per timeline', () => {
    const d: Dataset = plainTimeline();
    d.meta.facets = { category: facet };
    d.events = [
      { ...ev('golden', 0, 40), memberships: [{ facet: 'category', value: 'golden-age', sources: [{ sourceKey: 'ledger', sourceLocation: '' }] }] },
      { ...ev('plain', 0, 40) },
    ];
    const on = () => true;
    expect([...periodLaneIds(d, 'category', facet, on, {})]).toEqual(['golden']);
    expect([...periodLaneIds(d, 'category', facet, on, { [d.meta.id]: { exclude: ['golden'], include: ['plain'] } })]).toEqual(['plain']);
  });
});

describe('src/data/period-lane.json', () => {
  it('names only events its timelines have', () => {
    for (const [id, o] of Object.entries(list).filter(([k]) => !k.startsWith('_')) as [string, { include: string[]; exclude: string[] }][]) {
      const ds: Dataset = JSON.parse(readFileSync(`public/timelines/${id}.json`, 'utf8'));
      const uuids = new Set(ds.events.map((e) => e.uuid));
      expect([...o.include, ...o.exclude].filter((u) => !uuids.has(u))).toEqual([]);
    }
  });
});
