import type { Dataset } from '../types.ts';

/**
 * The ids a timeline promises to keep: the ones links, saved views and views files name. If one disappears, a link
 * that names it silently loses part of its view, so the id-stability check (`npm run data -- ids --check`, in CI)
 * fails unless the file's `redirects` accounts for it (see docs/data-format.md#redirects).
 */
export type IdKind = 'row' | 'event' | 'era' | 'facet' | 'region' | 'source' | 'tag' | 'chronology';

/** Kinds a redirect may point to a new id for; the others can only be redirected to null (removed on purpose). */
export const RENAMEABLE: ReadonlySet<IdKind> = new Set(['row', 'event', 'era']);

export interface IdRef {
  kind: IdKind;
  id: string;
  /** For a region (a facet value): the facet it belongs to. */
  facet?: string;
}

/** Every id of the timeline that a link can name, by kind. */
export function datasetIds(ds: Dataset): IdRef[] {
  const out: IdRef[] = [];
  for (const t of ds.tracks ?? []) out.push({ kind: 'row', id: t.id });
  for (const e of ds.events ?? []) out.push({ kind: 'event', id: e.uuid });
  // context spans (ages and the like, schema v8), on the timeline and on its rows; links name them as eras
  for (const era of [...(ds.meta?.context ?? []), ...(ds.tracks ?? []).flatMap((t) => t.context ?? [])]) out.push({ kind: 'era', id: era.id });
  for (const [f, facet] of Object.entries(ds.meta?.facets ?? {})) {
    out.push({ kind: 'facet', id: f });
    for (const v of Object.keys(facet.values ?? {})) out.push({ kind: 'region', id: v, facet: f });
  }
  for (const k of Object.keys(ds.sources ?? {})) out.push({ kind: 'source', id: k });
  for (const k of Object.keys(ds.tags ?? {})) out.push({ kind: 'tag', id: k });
  for (const k of Object.keys(ds.chronologies ?? {})) out.push({ kind: 'chronology', id: k });
  return out;
}

const refKey = (r: IdRef) => `${r.kind}\u0000${r.facet ?? ''}\u0000${r.id}`;

/** How an id reads in a report: `row "hittites"`, `region "anatolia" (facet "region")`. */
export const describeId = (r: IdRef) => `${r.kind} "${r.id}"${r.facet ? ` (facet "${r.facet}")` : ''}`;

/**
 * The ids `before` had that `after` lost without a redirect: what the id-stability check fails on. A redirect to null
 * accounts for any kind; a redirect to a new id accounts only for a row, an event or an era (validation makes sure
 * the target exists).
 */
export function lostIds(before: Dataset, after: Dataset): IdRef[] {
  const now = new Set(datasetIds(after).map(refKey));
  const redirects = after.redirects ?? {};
  return datasetIds(before).filter((r) => {
    if (now.has(refKey(r))) return false;
    if (!Object.hasOwn(redirects, r.id)) return true;
    return redirects[r.id] !== null && !RENAMEABLE.has(r.kind);
  });
}

/**
 * Follows the timeline's redirects for an id from a link or a saved view: the id itself if the timeline has no redirect
 * for it, the id that replaced it, or null when it was removed on purpose. Redirects never chain (validation), so one
 * step is enough. Whether the result exists is the caller's check, as for any id in a link.
 */
export function followRedirect(ds: Pick<Dataset, 'redirects'>, id: string): string | null {
  const r = ds.redirects;
  return r && Object.hasOwn(r, id) ? r[id] : id;
}

/** A link's comma list (`set=`, `regions=`) with its redirects followed; removed ids are dropped. */
export function followRedirectList(ds: Pick<Dataset, 'redirects'>, param: string | null): string | null {
  if (param === null || !ds.redirects) return param;
  return param
    .split(',')
    .map((s) => followRedirect(ds, s.trim()))
    .filter((s): s is string => !!s)
    .join(',');
}
