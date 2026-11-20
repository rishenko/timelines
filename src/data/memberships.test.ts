import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateDataset } from './validate.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { applyMemberships, type MembershipPlan } from '../../scripts/lib/memberships.ts';
import type { Dataset } from '../types.ts';

const REGIONS = { name: 'Region', values: { med: { name: 'Mediterranean' }, aegean: { name: 'Aegean', broader: ['med'] } } };

/** The fixture with a region facet, its first row in the Aegean per its first source. */
function withMemberships(patch: (d: Dataset) => void = () => {}) {
  const d = plainTimeline();
  const src = Object.keys(d.sources)[0];
  d.meta.facets = { geography: structuredClone(REGIONS) };
  d.tracks[0].memberships = [{ facet: 'geography', value: 'aegean', sources: [{ sourceKey: src, sourceLocation: 'category "Bronze Age Aegean"' }] }];
  patch(d);
  return d;
}

describe('category memberships in the data format', () => {
  it('accepts facets, broader values and sourced memberships', () => {
    expect(validateDataset(withMemberships())).toEqual([]);
  });

  it('refuses memberships in unknown facets or values, and unsourced or wrongly sourced ones', () => {
    const errs = (patch: (d: Dataset) => void) => validateDataset(withMemberships(patch)).join(' ');
    expect(errs((d) => (d.tracks[0].memberships![0].facet = 'people'))).toMatch(/unknown facet "people"/);
    expect(errs((d) => (d.tracks[0].memberships![0].value = 'nile'))).toMatch(/unknown geography value "nile"/);
    expect(errs((d) => (d.tracks[0].memberships![0].sources = []))).toMatch(/cites no source/);
    expect(errs((d) => (d.tracks[0].memberships![0].sources[0].sourceKey = 'nowhere'))).toMatch(/unknown source "nowhere"/);
  });

  it('refuses broader values that are unknown or loop back', () => {
    const errs = (patch: (d: Dataset) => void) => validateDataset(withMemberships(patch)).join(' ');
    expect(errs((d) => (d.meta.facets!.geography.values.aegean.broader = ['atlantic']))).toMatch(/unknown broader value "atlantic"/);
    expect(errs((d) => (d.meta.facets!.geography.values.med.broader = ['aegean']))).toMatch(/inside itself/);
  });
});

describe('the memberships plan', () => {
  const plan: MembershipPlan = JSON.parse(readFileSync('data-src/ancient-classical-memberships.json', 'utf8'));
  const data: Dataset = JSON.parse(readFileSync('public/timelines/ancient-classical.json', 'utf8'));

  it('is what the bundled timeline holds', () => {
    expect(data.meta.facets).toEqual(plan.facets);
    for (const t of data.tracks) expect(t.memberships ?? []).toEqual(plan.rows[t.id] ?? []);
  });

  it('places every pilot row in at least one region, citing its own Wikipedia article', () => {
    for (const [id, ms] of Object.entries(plan.rows)) {
      const t = data.tracks.find((x) => x.id === id)!;
      expect(ms.some((m) => m.facet === 'geography'), id).toBe(true);
      for (const m of ms) for (const s of m.sources) expect(data.sources[s.sourceKey].url, `${id} ${m.facet}/${m.value}`).toBe(t.url);
    }
  });

  it('applies idempotently: replaces old memberships, removes them from rows the plan leaves out', () => {
    const d = structuredClone(data) as unknown as Record<string, any>;
    d.tracks[0].memberships = [{ facet: 'geography', value: 'iberia', sources: [] }];
    applyMemberships(d, plan);
    const once = JSON.stringify(d);
    applyMemberships(d, plan);
    expect(JSON.stringify(d)).toBe(once);
    expect(d.tracks[0].memberships ?? []).toEqual(plan.rows[d.tracks[0].id] ?? []);
  });
});
