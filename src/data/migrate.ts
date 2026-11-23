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
 * - 5: facets on events (`Facet.applies`, `TimelineEvent.memberships`), `meta.eras`, `Track.kind`, events'
 *   `ongoingSources`, `Source.dump` and `revision`, `SourceRef.locator`, `RowMembership.phase` and `redirects`. All
 *   optional and additive: a v4 file is a v5 file with a different number.
 * - 6: `Era.url` and `Era.ids` (an age's own article and Wikidata item). Additive: a v5 file is a v6 file with a
 *   different number.
 * - 7: `Era.tracks` (the rows an age belongs to, such as a region; drawn in their bands) and `meta.eraGroups` (era
 *   groups' display names). Additive: a v6 file is a v7 file with a different number. Never released (it folded into
 *   v8), but the step stays for files written while it was current.
 * - 8: context lines. `meta.eras` becomes `meta.context` and each row's `Track.context` (`ContextSpan`, with a
 *   `kind`; ages are kind `age`), `Era.group` becomes `line`, and `meta.eraGroups` becomes `meta.lines`. Structural:
 *   see `toV8`.
 * - 9: `calendar.beforePresent` (deep time: years shown as time before a present, e.g. 1950, with an optional
 *   `circaShare`). Additive: a v8 file is a v9 file with a different number.
 */

export const SCHEMA_VERSION = 9;

type Obj = Record<string, unknown>;

/**
 * v7 → v8: each era becomes a context span of kind `age` with the same id. One without `tracks` goes to
 * `meta.context`; one with `tracks` goes to the first named row's `Track.context` (any further row gets a copy with
 * the id `<id>--<row>`; no shipped file has one). A row that isn't in the file leaves the age on the timeline, so
 * nothing is lost. `group` becomes `line`, and `meta.eraGroups` becomes `meta.lines`.
 */
function toV8(d: Obj): Obj {
  const meta = { ...((d.meta as Obj) ?? {}) };
  const eras = Array.isArray(meta.eras) ? (meta.eras as Obj[]) : [];
  const groups = meta.eraGroups;
  delete meta.eras;
  delete meta.eraGroups;
  const tracks = Array.isArray(d.tracks) ? (d.tracks as Obj[]) : [];
  const known = new Set(tracks.map((t) => t?.id));
  const root: Obj[] = [];
  const onRow = new Map<unknown, Obj[]>();
  for (const era of eras) {
    if (!era || typeof era !== 'object') {
      root.push(era);
      continue;
    }
    const { tracks: rows, group, ...rest } = era;
    const span: Obj = { ...rest, kind: 'age', ...(group !== undefined ? { line: group } : {}) };
    const named = Array.isArray(rows) ? rows.filter((r) => known.has(r)) : [];
    if (!named.length) root.push(span);
    named.forEach((r, i) => onRow.set(r, [...(onRow.get(r) ?? []), i ? { ...span, id: `${span.id}--${r}` } : span]));
  }
  if (root.length) meta.context = [...(Array.isArray(meta.context) ? (meta.context as Obj[]) : []), ...root];
  if (groups !== undefined) meta.lines = groups;
  return {
    ...d,
    schemaVersion: 8,
    meta,
    ...(onRow.size
      ? { tracks: tracks.map((t) => (onRow.has(t?.id) ? { ...t, context: [...(Array.isArray(t.context) ? (t.context as Obj[]) : []), ...onRow.get(t.id)!] } : t)) }
      : {}),
  };
}

/** Each step lifts a file from its version to the next. */
const STEPS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  3: (d) => ({ ...d, schemaVersion: 4 }),
  4: (d) => ({ ...d, schemaVersion: 5 }),
  5: (d) => ({ ...d, schemaVersion: 6 }),
  6: (d) => ({ ...d, schemaVersion: 7 }),
  7: toV8,
  8: (d) => ({ ...d, schemaVersion: 9 }),
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
