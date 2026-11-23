import { describe, expect, it } from 'vitest';
import { canRead, migrate, SCHEMA_VERSION } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { parseUpload } from '../state/dataset.ts';
import { plainTimeline } from '../test/fixtures.ts';
import ancient from '../../public/timelines/ancient-classical.json';

const asVersion = (v: number) => ({ ...plainTimeline(), schemaVersion: v });

describe('schema versions', () => {
  it('writes version 10 and reads 3 to 10', () => {
    expect(SCHEMA_VERSION).toBe(10);
    for (const v of [3, 4, 5, 6, 7, 8, 9, 10]) expect(canRead(v)).toBe(true);
    expect(canRead(2)).toBe(false);
    expect(canRead(11)).toBe(false);
    expect(canRead('10')).toBe(false);
  });

  for (const v of [3, 4, 5, 6, 7, 8, 9])
    it(`lifts a version ${v} file without ages to 10 without changing anything else`, () => {
      const old = asVersion(v);
      const lifted = migrate(old) as Record<string, unknown>;
      expect(lifted.schemaVersion).toBe(10);
      expect({ ...lifted, schemaVersion: v }).toEqual(old);
      // the input is left as it was
      expect(old.schemaVersion).toBe(v);
    });

  it('accepts older files, and refuses versions it can not read with a clear message', () => {
    expect(validateDataset(asVersion(3))).toEqual([]);
    expect(validateDataset(asVersion(4))).toEqual([]);
    expect(validateDataset(asVersion(5))).toEqual([]);
    expect(validateDataset(asVersion(6))).toEqual([]);
    expect(validateDataset(asVersion(7))).toEqual([]);
    expect(validateDataset(asVersion(8))).toEqual([]);
    expect(validateDataset(asVersion(9))).toEqual([]);
    expect(validateDataset(asVersion(11))[0]).toBe('Unsupported schemaVersion: 11 (this app reads versions 3 to 10).');
  });

  it('lifts an uploaded version 3 file', () => {
    const { dataset, errors } = parseUpload(JSON.stringify(asVersion(3)));
    expect(errors).toEqual([]);
    expect(dataset?.schemaVersion).toBe(10);
  });

  it('ships the bundled timeline as version 10', () => {
    expect(ancient.schemaVersion).toBe(10);
  });
});

describe('version 7 → 8: eras become context spans', () => {
  const cite = [{ sourceKey: 'ledger', sourceLocation: 'p. 1' }];
  const v7 = (eras: unknown[], eraGroups?: unknown) => {
    const d = plainTimeline() as unknown as Record<string, any>;
    return { ...d, schemaVersion: 7, meta: { ...d.meta, eras, ...(eraGroups ? { eraGroups } : {}) } } as Record<string, any>;
  };
  const row = (d: Record<string, any>, id: string) => d.tracks.find((t: { id: string }) => t.id === id);

  it('an era without tracks goes to meta.context as an age; group becomes line, eraGroups lines', () => {
    const lifted = migrate(v7([{ id: 'salt', name: 'Salt', group: 'trade', start: 0, end: 9, sources: cite }], { trade: { name: 'Trade' } })) as Record<string, any>;
    expect(lifted.meta.context).toEqual([{ id: 'salt', kind: 'age', name: 'Salt', line: 'trade', start: 0, end: 9, sources: cite }]);
    expect(lifted.meta.lines).toEqual({ trade: { name: 'Trade' } });
    expect('eras' in lifted.meta || 'eraGroups' in lifted.meta).toBe(false);
    expect(validateDataset(lifted)).toEqual([]);
  });

  it('an era with tracks goes to its row’s context with the same id; a second row gets a copy as <id>--<row>', () => {
    const d = v7([]);
    const [a, b] = d.tracks.map((t: { id: string }) => t.id);
    const lifted = migrate({ ...d, meta: { ...d.meta, eras: [{ id: 'salt', name: 'Salt', start: 0, end: 9, tracks: [a, b], sources: cite }] } }) as Record<string, any>;
    expect(row(lifted, a).context.map((s: { id: string }) => s.id)).toEqual(['salt']);
    expect(row(lifted, b).context.map((s: { id: string }) => s.id)).toEqual(['salt--' + b]);
    expect(row(lifted, a).context[0]).not.toHaveProperty('tracks');
    expect(lifted.meta.context).toBeUndefined();
    expect(validateDataset(lifted)).toEqual([]);
  });

  it('an era naming no row the file has stays on the timeline, so nothing is lost', () => {
    const lifted = migrate(v7([{ id: 'salt', name: 'Salt', start: 0, end: 9, tracks: ['nowhere'], sources: cite }])) as Record<string, any>;
    expect(lifted.meta.context.map((s: { id: string }) => s.id)).toEqual(['salt']);
  });

  it('a file without eras only changes its number', () => {
    const d = v7([]);
    delete d.meta.eras;
    expect({ ...(migrate(d) as object), schemaVersion: 7 }).toEqual(d);
  });
});
