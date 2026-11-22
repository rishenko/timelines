import { describe, expect, it } from 'vitest';
import { regionFacetId } from './regionFilter.ts';
import { plainTimeline } from '../test/fixtures.ts';

describe('the region filter’s facet', () => {
  it('is the first facet rows belong to, skipping facets for events only', () => {
    const d = plainTimeline();
    expect(regionFacetId(d)).toBeUndefined();
    d.meta.facets = {
      theme: { name: 'Theme', applies: 'events', values: {} },
      region: { name: 'Region', values: {} },
      people: { name: 'People', applies: 'both', values: {} },
    };
    expect(regionFacetId(d)).toBe('region');
    d.meta.facets = { theme: { name: 'Theme', applies: 'events', values: {} }, people: { name: 'People', applies: 'both', values: {} } };
    expect(regionFacetId(d)).toBe('people');
  });
});
