/**
 * Timeline files across schema versions. The app writes SCHEMA_VERSION and reads any version it can lift to it: a
 * file is migrated step by step (3 → 4 → …) when it is loaded, uploaded, fetched from a link or compiled, so files
 * saved by older versions of the app keep working. An older app meeting a newer file says "Unsupported
 * schemaVersion" rather than failing on whatever field changed.
 *
 * Versions (the changelog is in docs/data-format.md):
 * - 3: the format before dates in months and days.
 * - 4: dates may give months and days; `meta.increments` may name steps below a year. Additive: a v3 file is a v4
 *   file with a different number.
 */

export const SCHEMA_VERSION = 4;

/** Each step lifts a file from its version to the next. */
const STEPS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  3: (d) => ({ ...d, schemaVersion: 4 }),
};

/** Whether a file of this version can be read (it is current, or can be lifted to it). */
export function canRead(version: unknown): boolean {
  let v = version;
  while (typeof v === 'number' && v !== SCHEMA_VERSION && STEPS[v]) v += 1;
  return v === SCHEMA_VERSION;
}

/** A file lifted to SCHEMA_VERSION; anything it can't read (not an object, unknown version) is returned unchanged. */
export function migrate<T = unknown>(d: T): T {
  if (!d || typeof d !== 'object' || !canRead((d as { schemaVersion?: unknown }).schemaVersion)) return d;
  let out = d as Record<string, unknown>;
  while (out.schemaVersion !== SCHEMA_VERSION) out = STEPS[out.schemaVersion as number](out);
  return out as T;
}
