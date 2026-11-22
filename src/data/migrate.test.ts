import { describe, expect, it } from 'vitest';
import { canRead, migrate, SCHEMA_VERSION } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { parseUpload } from '../state/dataset.ts';
import { plainTimeline } from '../test/fixtures.ts';
import ancient from '../../public/timelines/ancient-classical.json';

const asV3 = () => ({ ...plainTimeline(), schemaVersion: 3 });

describe('schema versions', () => {
  it('writes version 4 and reads 3 and 4', () => {
    expect(SCHEMA_VERSION).toBe(4);
    expect(canRead(3)).toBe(true);
    expect(canRead(4)).toBe(true);
    expect(canRead(2)).toBe(false);
    expect(canRead(5)).toBe(false);
    expect(canRead('4')).toBe(false);
  });

  it('lifts a version 3 file to 4 without changing anything else', () => {
    const v3 = asV3();
    const v4 = migrate(v3) as Record<string, unknown>;
    expect(v4.schemaVersion).toBe(4);
    expect({ ...v4, schemaVersion: 3 }).toEqual(v3);
    // the input is left as it was
    expect(v3.schemaVersion).toBe(3);
  });

  it('accepts a version 3 file, and refuses versions it can not read with a clear message', () => {
    expect(validateDataset(asV3())).toEqual([]);
    expect(validateDataset({ ...plainTimeline(), schemaVersion: 5 })[0]).toBe('Unsupported schemaVersion: 5 (this app reads versions 3 to 4).');
  });

  it('lifts an uploaded version 3 file', () => {
    const { dataset, errors } = parseUpload(JSON.stringify(asV3()));
    expect(errors).toEqual([]);
    expect(dataset?.schemaVersion).toBe(4);
  });

  it('ships the bundled timeline as version 4', () => {
    expect(ancient.schemaVersion).toBe(4);
  });
});
