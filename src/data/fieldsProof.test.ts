import { describe, expect, it } from 'vitest';
import { allowPattern, fieldChanges } from '../../scripts/fields-proof.ts';

const ds = (tracks: object[], extra: object = {}) => ({ schemaVersion: 6, meta: { id: 't', eras: [{ id: 'axial', name: 'Axial' }] }, tracks, events: [], ...extra });
const rows = [{ id: 'a' }, { id: 'b', parent: 'a' }, { id: 'g' }, { id: 'c', parent: 'g' }];

describe('fields:proof', () => {
  it('finds nothing in an unchanged file', () => {
    expect(fieldChanges(ds(rows), ds(structuredClone(rows)))).toEqual([]);
  });
  it('keys rows by id: a parent change and a move read as that row, one line each', () => {
    const after = [{ id: 'a' }, { id: 'g' }, { id: 'b', parent: 'g' }, { id: 'c', parent: 'g' }];
    expect(fieldChanges(ds(rows), ds(after))).toEqual([
      { path: 'tracks.b.parent', before: 'a', after: 'g' },
      { path: 'tracks order', before: 'b', after: 'b' },
    ]);
  });
  it('keys eras by id and reports added fields, added rows and removed rows', () => {
    const a = ds(rows);
    const b = ds([...rows.slice(1), { id: 'z' }], { meta: { id: 't', eras: [{ id: 'axial', name: 'Axial', url: 'https://x' }] } });
    expect(fieldChanges(a, b).map((c) => c.path)).toEqual(['meta.eras.axial.url', 'tracks.a', 'tracks.z']);
  });
  it('matches allow patterns by whole path, with * as one id or field', () => {
    const re = allowPattern('tracks.*.parent');
    expect(re.test('tracks.egypt.parent')).toBe(true);
    expect(re.test('tracks.egypt.phases.0.parent')).toBe(false);
    expect(allowPattern('tracks order').test('tracks order')).toBe(true);
    expect(allowPattern('meta.eras.*.url').test('meta.eras.axial.urls')).toBe(false);
  });
});
