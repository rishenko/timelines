// @vitest-environment jsdom
// A link made before a row or event was renamed still opens on it: readUrl follows the timeline's redirects.
import { afterEach, describe, expect, it } from 'vitest';
import { readUrl } from './url.ts';
import { validateDataset } from '../data/validate.ts';
import { everyField } from '../data/fixtures/everyField.ts';
import type { Dataset } from '../types.ts';

const ds = structuredClone(everyField) as Dataset;
ds.redirects = { 'old-quay': 'quay', 'lost-storm': null, 'old-joins': 'joins-league', 'old-bay': null };

const open = (link: string) => {
  window.history.replaceState(null, '', link);
  return readUrl(ds);
};

describe('ids in a link follow redirects', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('the test timeline is valid', () => {
    expect(validateDataset(ds)).toEqual([]);
  });

  it('a renamed row in a comparison set opens as its new id; a removed one is skipped', () => {
    expect(open('/?set=old-quay,lost-storm').set).toEqual(['quay']);
  });

  it('a renamed event in the hash is selected under its new id; a removed one selects nothing', () => {
    expect(open('/#old-joins').selected).toBe('joins-league');
    expect(open('/#lost-storm').selected).toBeNull();
    expect(open('/#leaves-league').selected).toBe('leaves-league');
  });

  it('a region redirected to null is skipped', () => {
    expect(open('/?regions=old-bay,coast').regions).toEqual(['coast']);
  });

  it('ids with no redirect read as before', () => {
    window.history.replaceState(null, '', '/?set=quay,nowhere#joins-league');
    const plain = readUrl(everyField);
    expect([plain.set, plain.selected]).toEqual([['quay'], 'joins-league']);
  });
});
