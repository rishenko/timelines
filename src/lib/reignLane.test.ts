import { describe, expect, it } from 'vitest';
import { reignLaneIds } from './reignLane.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, Facet, TimelineEvent } from '../types.ts';

const facet: Facet = {
  name: 'Category',
  applies: 'events',
  values: {
    rule: { name: 'Rulers' },
    reign: { name: 'Reign or term', broader: ['rule'] },
    interregnum: { name: 'Interregnum', broader: ['rule'] },
    succession: { name: 'Succession', broader: ['rule'] },
    founded: { name: 'State founded' },
  },
};
const ref = [{ sourceKey: 'ledger', sourceLocation: '' }];
const ev = (uuid: string, values: string[]): TimelineEvent => ({
  uuid,
  title: uuid,
  descr: '',
  start: 0,
  end: 20,
  tracks: ['quay'],
  sources: [],
  memberships: values.map((value) => ({ facet: 'category', value, sources: ref })),
});

describe('the reign lane', () => {
  it('takes events with the reign sub-kind as main or second category, and nothing else', () => {
    const d: Dataset = plainTimeline();
    d.meta.facets = { category: facet };
    d.events = [ev('main', ['reign']), ev('second', ['founded', 'reign']), ev('accession', ['succession']), ev('none', [])];
    expect([...reignLaneIds(d, 'category', facet, () => true)].sort()).toEqual(['main', 'second']);
  });

  it('takes a sourced interregnum too, so the gap is drawn on the reign line', () => {
    const d: Dataset = plainTimeline();
    d.meta.facets = { category: facet };
    d.events = [ev('reign', ['reign']), ev('gap', ['interregnum']), ev('accession', ['succession'])];
    expect([...reignLaneIds(d, 'category', facet, () => true)].sort()).toEqual(['gap', 'reign']);
  });

  it('is empty without a category facet', () => {
    const d: Dataset = plainTimeline();
    d.events = [ev('main', ['reign'])];
    expect(reignLaneIds(d, undefined, undefined, () => true).size).toBe(0);
  });
});
