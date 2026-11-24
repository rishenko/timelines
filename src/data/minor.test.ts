// Core 1.0 (schema 11): a newer minor loads with a notice (rule 1), unknown kinds are kept (rule 3), and the minor a
// dataset needs is worked out from what it uses (docs/data-format.md, "Versions").
import { describe, expect, it } from 'vitest';
import { everyField } from './fixtures/everyField.ts';
import { minorNeeded, newerMinor, SCHEMA_MINOR } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { forDownload, parseUpload } from '../state/dataset.ts';

const copy = () => structuredClone(everyField) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('core 1.0 minor versions', () => {
  it('a newer minor loads, with a notice', () => {
    const d = { ...copy(), schemaMinor: SCHEMA_MINOR + 3, somethingNew: { a: 1 } };
    expect(validateDataset(d)).toEqual([]);
    expect(newerMinor(d)).toMatch(/newer version of the format \(11\.4; this app reads 11\.1\)/);
    const up = parseUpload(JSON.stringify(d));
    expect(up.errors).toEqual([]);
    expect(up.notice).toMatch(/newer version/);
    expect((up.dataset as unknown as Record<string, unknown>).somethingNew).toEqual({ a: 1 });
  });
  it('no notice for this minor or older', () => {
    expect(newerMinor({ schemaMinor: SCHEMA_MINOR })).toBeNull();
    expect(newerMinor({})).toBeNull();
    expect(parseUpload(JSON.stringify(everyField)).notice).toBeUndefined();
  });
  it('unknown link, row and locator kinds load (rule 3)', () => {
    const d = copy();
    d.events[1].links[0].kind = 'inspires';
    d.tracks[1].kind = 'network';
    d.events[4].sources[0].locator = { kind: 'timestamp', at: '01:02' };
    expect(validateDataset(d)).toEqual([]);
  });
  it('a role must be a slug, and sides need names', () => {
    const a = copy();
    a.tracks[2].roles.founder.name = '';
    expect(validateDataset(a)).toEqual(['Track "league" role "founder" needs a name.']);
    const b = copy();
    b.tracks[1].memberOf[0].role = 'Axis Powers';
    expect(validateDataset(b)).toEqual(['Track "quay" membership 1 (in "league") role must be a slug (letters, digits and dashes).']);
  });
  it('the minor a dataset needs: 1 with a role or roles, else 0', () => {
    expect(minorNeeded(everyField)).toBe(1);
    const d = copy();
    delete d.tracks[2].roles;
    delete d.tracks[1].memberOf[0].role;
    expect(minorNeeded(d)).toBe(0);
  });
  it('schemaMinor is a whole number', () => {
    for (const bad of ['1', 1.5, -1]) expect(validateDataset({ ...copy(), schemaMinor: bad })).toEqual(['schemaMinor must be a whole number, 0 or more.']);
  });
  it('a download stamps the minor the data needs, as the build does, never below the file\'s own', () => {
    expect(forDownload(everyField as never, false).schemaMinor).toBe(1);
    const plain = copy();
    delete plain.tracks[2].roles;
    delete plain.tracks[1].memberOf[0].role;
    delete plain.schemaMinor;
    expect('schemaMinor' in forDownload(plain as never, false)).toBe(false);
    expect(forDownload({ ...plain, schemaMinor: 4 } as never, true).schemaMinor).toBe(4);
  });
});
