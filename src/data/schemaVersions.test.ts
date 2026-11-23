// The schema's version history, tested on frozen files (docs/data-format.md, "Versions"):
// - fixtures/everyField.ts sets every field of the current schema (the build fails if one is added and left unset)
//   and is written out as fixtures/v<current>.json;
// - every older version the app reads keeps its own file, unchanged once released (FROZEN below), and lifts to the
//   current version as recorded in fixtures/v<N>.lifted.json;
// - lifting is idempotent and leaves its input alone, on the fixtures and on every timeline (bundled, and local
//   ones when TIMELINES_LOCAL_DATA is set).
// To release a version: add its step to migrate.ts, bump everyField's schemaVersion and fields, run
// `npx vitest run src/data/schemaVersions.test.ts -u` to write the new files, and add the previous version's hash to
// FROZEN (the failing test prints it).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canRead, migrate, SCHEMA_VERSION } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { everyField } from './fixtures/everyField.ts';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { timelineIndex } from '../../scripts/lib/timeline-index.ts';

/** The oldest version the app reads. */
const OLDEST = 3;

/** Released versions' fixtures, by a hash of their content (whitespace and line endings don't count). */
const FROZEN: Record<number, string> = {
  3: '427c0de1bbda87e37ff4c3cf6b1067e4fb0ebe4f512f67591c103f2d917bf4d8',
  4: '298b4f4f7834a5cd0d91fe2ced248801dddbc167f911141f7c3721db4b44cbf0',
  5: '0f78fdc46747a6e6aeea6ef0cc3779074e25c2842893b2d8e456b529c0e2ec56',
  6: '7733d4b4bdc9916758288e54a44205c66fe3afd66ecfd2aa6bccdb5a7322c368',
  // never released (it folded into 8), but kept: files written while it was current lift through it
  7: '1847cb56f23dfff454d7910dea610a233aadac822b0e9a18f4914c04a8ae07c9',
};

const dir = 'src/data/fixtures';
const versions = Array.from({ length: SCHEMA_VERSION - OLDEST + 1 }, (_, i) => OLDEST + i);
const older = versions.filter((v) => v < SCHEMA_VERSION);
const read = (file: string): unknown => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

/** Freezes a value deeply, so a migrator that changed its input would throw. */
function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(deepFreeze);
    Object.freeze(v);
  }
  return v;
}

const timelines: [string, unknown][] = [
  ...timelineIndex().timelines.map((t): [string, unknown] => [
    t.id,
    JSON.parse(readFileSync(`public/timelines/${t.file}`, 'utf8')),
  ]),
  ...localTimelineFiles().map((f): [string, unknown] => [f.file, JSON.parse(readFileSync(f.path, 'utf8'))]),
];

describe('schema versions', () => {
  it(`reads versions ${OLDEST} to ${SCHEMA_VERSION}, and no others`, () => {
    for (const v of versions) expect(canRead(v)).toBe(true);
    expect(canRead(OLDEST - 1)).toBe(false);
    expect(canRead(SCHEMA_VERSION + 1)).toBe(false);
  });

  it('the every-field fixture is valid, current, and written out as this version’s file', async () => {
    expect(everyField.schemaVersion).toBe(SCHEMA_VERSION);
    expect(validateDataset(everyField)).toEqual([]);
    await expect(json(everyField)).toMatchFileSnapshot(`fixtures/v${SCHEMA_VERSION}.json`);
  });

  it('every older version has a fixture, unchanged since its release', () => {
    for (const v of older) {
      expect(existsSync(`${dir}/v${v}.json`), `fixtures/v${v}.json`).toBe(true);
      expect(hash(read(`v${v}.json`)), `fixtures/v${v}.json is frozen; FROZEN[${v}]`).toBe(FROZEN[v]);
    }
  });

  for (const v of older)
    it(`lifts the version ${v} fixture to ${SCHEMA_VERSION}, as recorded`, async () => {
      const file = deepFreeze(read(`v${v}.json`)) as { schemaVersion: number };
      expect(file.schemaVersion).toBe(v);
      expect(validateDataset(file)).toEqual([]);
      const lifted = migrate(file) as { schemaVersion: number };
      expect(lifted.schemaVersion).toBe(SCHEMA_VERSION);
      expect(validateDataset(lifted)).toEqual([]);
      await expect(json(lifted)).toMatchFileSnapshot(`fixtures/v${v}.lifted.json`);
    });

  it('lifting twice changes nothing, and never changes its input', () => {
    const files: [string, unknown][] = [...versions.map((v): [string, unknown] => [`v${v}`, read(`v${v}.json`)]), ...timelines];
    for (const [name, data] of files) {
      const once = migrate(deepFreeze(data));
      expect(migrate(once), name).toEqual(once);
    }
  });
});
