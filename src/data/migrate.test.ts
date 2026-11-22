import { describe, expect, it } from 'vitest';
import { canRead, migrate, SCHEMA_VERSION } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { parseUpload } from '../state/dataset.ts';
import { plainTimeline } from '../test/fixtures.ts';
import ancient from '../../public/timelines/ancient-classical.json';

const asVersion = (v: number) => ({ ...plainTimeline(), schemaVersion: v });

describe('schema versions', () => {
  it('writes version 6 and reads 3 to 6', () => {
    expect(SCHEMA_VERSION).toBe(6);
    for (const v of [3, 4, 5, 6]) expect(canRead(v)).toBe(true);
    expect(canRead(2)).toBe(false);
    expect(canRead(7)).toBe(false);
    expect(canRead('6')).toBe(false);
  });

  for (const v of [3, 4, 5])
    it(`lifts a version ${v} file to 6 without changing anything else`, () => {
      const old = asVersion(v);
      const lifted = migrate(old) as Record<string, unknown>;
      expect(lifted.schemaVersion).toBe(6);
      expect({ ...lifted, schemaVersion: v }).toEqual(old);
      // the input is left as it was
      expect(old.schemaVersion).toBe(v);
    });

  it('accepts older files, and refuses versions it can not read with a clear message', () => {
    expect(validateDataset(asVersion(3))).toEqual([]);
    expect(validateDataset(asVersion(4))).toEqual([]);
    expect(validateDataset(asVersion(5))).toEqual([]);
    expect(validateDataset(asVersion(7))[0]).toBe('Unsupported schemaVersion: 7 (this app reads versions 3 to 6).');
  });

  it('lifts an uploaded version 3 file', () => {
    const { dataset, errors } = parseUpload(JSON.stringify(asVersion(3)));
    expect(errors).toEqual([]);
    expect(dataset?.schemaVersion).toBe(6);
  });

  it('ships the bundled timeline as version 6', () => {
    expect(ancient.schemaVersion).toBe(6);
  });
});
