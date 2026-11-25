import { describe, expect, it } from 'vitest';
import { classify, render, type Hand, type Row } from './row-identity.ts';

const row = (id: string, q?: string, name = id): Row => ({ id, name, ids: q ? { wikidata: q } : undefined, url: q ? `https://en.wikipedia.org/wiki/${id}` : undefined });
const rows = (a: Row[], b: Row[] = [], c: Row[] = []) => ({ 'ancient-classical': a, medieval: b, 'modern-states': c });

describe('row identity', () => {
  it('same item is same, different items are namesakes', () => {
    const { entries, problems } = classify(rows([], [row('x', 'Q1'), row('y', 'Q2')], [row('x', 'Q1'), row('y', 'Q3')]), {});
    expect(problems).toEqual([]);
    expect(entries.map((e) => [e.id, e.verdict, e.basis])).toEqual([['x', 'same', 'wikidata'], ['y', 'namesake', 'wikidata']]);
  });
  it('a shared id with no item needs a hand entry, and uses it', () => {
    const a = rows([], [row('europe')], [row('europe')]);
    expect(classify(a, {}).problems[0]).toMatch(/medieval\|modern-states\|europe: shared by both timelines/);
    const hand: Hand = { 'medieval|modern-states|europe': { verdict: 'same', reason: 'the same region' } };
    const r = classify(a, hand);
    expect(r.problems).toEqual([]);
    expect(r.entries[0]).toMatchObject({ verdict: 'same', basis: 'hand', reason: 'the same region' });
  });
  it('a hand entry goes stale when both rows get an id, or the id is no longer shared', () => {
    const hand: Hand = { 'medieval|modern-states|x': { verdict: 'same', reason: 'r' } };
    expect(classify(rows([], [row('x', 'Q1')], [row('x', 'Q1')]), hand).problems[0]).toMatch(/both rows now carry a Wikidata id/);
    expect(classify(rows([], [row('x')], []), hand).problems[0]).toMatch(/not shared by that pair any more/);
  });
  it('ids unique to one timeline are ignored, and pairs are covered both ways', () => {
    const { entries } = classify(rows([row('a', 'Q1')], [row('a', 'Q1'), row('b', 'Q2')], [row('b', 'Q2'), row('c', 'Q3')]), {});
    expect(entries.map((e) => `${e.between.join('/')}:${e.id}`)).toEqual(['ancient-classical/medieval:a', 'medieval/modern-states:b']);
  });
  it('renders counts and stays stable', () => {
    const { entries } = classify(rows([], [row('x', 'Q1')], [row('x', 'Q1')]), {});
    expect(JSON.parse(render(entries)).counts).toEqual({ 'medieval/modern-states same': 1 });
    expect(render(entries)).toBe(render(entries));
  });
});
