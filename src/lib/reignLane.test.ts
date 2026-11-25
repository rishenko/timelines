import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RULED, reignLaneIds } from './reignLane.ts';
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
    head: { name: 'Head of state', broader: ['reign'] },
    consort: { name: 'Consort', broader: ['reign'] },
    'new-verdict': { name: 'A verdict this app does not know', broader: ['reign'] },
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

  it('takes a verdict under reign into the lane; only plain reigns and the ruled verdicts answer who ruled', () => {
    const d: Dataset = plainTimeline();
    d.meta.facets = { category: facet };
    d.events = [ev('plain', ['reign']), ev('head', ['head']), ev('consort', ['consort']), ev('unknown', ['new-verdict']), ev('gap', ['interregnum'])];
    const lane = reignLaneIds(d, 'category', facet, () => true);
    expect([...lane].sort()).toEqual(['consort', 'gap', 'head', 'plain', 'unknown']);
    expect([...lane.ruled].sort()).toEqual(['head', 'plain']);
  });

  it("knows the same ruled verdicts as the classifier's vocabulary (reign_verdicts.py)", () => {
    const py = readFileSync(new URL('../../pipelines/common/reign_verdicts.py', import.meta.url), 'utf8');
    const ruled = [...py.matchAll(/^ {4}'([a-z-]+)': \('[^']*', True,/gm)].map((m) => m[1]);
    expect(ruled.length).toBeGreaterThan(0);
    expect([...RULED].sort()).toEqual(ruled.sort());
  });

  it('is empty without a category facet', () => {
    const d: Dataset = plainTimeline();
    d.events = [ev('main', ['reign'])];
    expect(reignLaneIds(d, undefined, undefined, () => true).size).toBe(0);
  });
});
