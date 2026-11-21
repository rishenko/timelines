import type { Facet, Track } from '../types.ts';
import { childrenMap } from './tracks.ts';

/**
 * The region filter (Filters → Regions): show only the rows in the regions the reader ticks. Regions are the values of
 * a facet (meta.facets, usually geography); a row is in a region when one of its memberships names it or a region
 * inside it (`broader`: a row in the Aegean is in the Mediterranean too). Several ticked regions: a row in any of them
 * shows. A membership counts only while one of its sources is switched on, so a tag cited to a hidden (spoiler) source
 * gives nothing away. Rows with sub-rows stay while any row below them shows.
 */

export interface RegionNode {
  id: string;
  name: string;
  /** Rows in this region (counting the regions inside it). */
  rows: number;
  /** Regions inside it: each region sits under the first region its `broader` names. */
  children: RegionNode[];
}

/** Each value's own id plus every value it sits inside, loop-safe. */
function withBroader(value: string, facet: Facet, into: Set<string>) {
  if (into.has(value)) return;
  into.add(value);
  for (const b of facet.values[value]?.broader ?? []) withBroader(b, facet, into);
}

/** The regions a row is in (its memberships with a source switched on, and the regions containing them). */
export function rowRegions(t: Track, facetId: string, facet: Facet, sourceOn: (key: string) => boolean): Set<string> {
  const out = new Set<string>();
  for (const m of t.memberships ?? [])
    if (m.facet === facetId && m.sources.some((s) => sourceOn(s.sourceKey))) withBroader(m.value, facet, out);
  return out;
}

/** The regions as a tree for the panel, in the facet's order, each with its row count. */
export function regionTree(tracks: Track[], facetId: string, facet: Facet, sourceOn: (key: string) => boolean): RegionNode[] {
  const counts = new Map<string, number>();
  for (const t of tracks) for (const v of rowRegions(t, facetId, facet, sourceOn)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const nodes = new Map<string, RegionNode>(
    Object.entries(facet.values).map(([id, v]) => [id, { id, name: v.name, rows: counts.get(id) ?? 0, children: [] }]),
  );
  const roots: RegionNode[] = [];
  for (const [id, v] of Object.entries(facet.values)) {
    const parent = v.broader?.map((b) => nodes.get(b)).find(Boolean);
    (parent ? parent.children : roots).push(nodes.get(id)!);
  }
  return roots;
}

/**
 * Row visibility for the ticked regions, to lay over the reader's own row toggles: `false` for every row that doesn't
 * show. A row shows if it is in a ticked region, or if any row below it does (so headers stay over their rows).
 */
export function regionOverlay(
  tracks: Track[],
  facetId: string,
  facet: Facet,
  picked: string[],
  sourceOn: (key: string) => boolean,
): Record<string, false> {
  const want = new Set(picked);
  const kids = childrenMap(tracks);
  const shows = new Map<string, boolean>();
  const visit = (t: Track, seen: Set<string>): boolean => {
    if (shows.has(t.id)) return shows.get(t.id)!;
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    const own = [...rowRegions(t, facetId, facet, sourceOn)].some((v) => want.has(v));
    // every child is visited (not just until the first that shows), so each gets its own answer
    const below = (kids.get(t.id) ?? []).map((k) => visit(k, seen)).some(Boolean);
    shows.set(t.id, own || below);
    return own || below;
  };
  for (const t of tracks) visit(t, new Set());
  const out: Record<string, false> = {};
  for (const t of tracks) if (!shows.get(t.id)) out[t.id] = false;
  return out;
}

/** Picked regions from the link (`?regions=anatolia,nile`), keeping only the facet's values, each once. */
export function parseRegions(param: string | null, facet: Facet | undefined): string[] {
  if (!facet) return [];
  const out: string[] = [];
  for (const v of (param ?? '').split(',').map((s) => s.trim())) if (v && Object.hasOwn(facet.values, v) && !out.includes(v)) out.push(v);
  return out;
}

/** A row's region as shown to readers: its name, the regions containing it, and the sources placing the row there. */
export interface RowRegion {
  id: string;
  name: string;
  /** Names of the regions it sits inside, nearest first ("Near East" for Anatolia). */
  within: string[];
  /** Each source once, with every place in it that says so. */
  sources: { key: string; name: string; url?: string; locations: string[] }[];
}

/**
 * A row's own regions (the ones its memberships name, not the regions containing them), for the table and the row
 * label's tooltip. Like the filter, a membership counts only while one of its sources is on, and only those sources
 * are listed.
 */
export function rowRegionList(
  t: Track,
  facetId: string,
  facet: Facet,
  sources: Record<string, { name: string; url?: string }>,
  sourceOn: (key: string) => boolean,
): RowRegion[] {
  const out: RowRegion[] = [];
  for (const m of t.memberships ?? []) {
    if (m.facet !== facetId || !facet.values[m.value]) continue;
    const on = m.sources.filter((s) => sourceOn(s.sourceKey));
    if (!on.length) continue;
    const bySource = new Map<string, RowRegion['sources'][number]>();
    for (const s of on) {
      const src = sources[s.sourceKey];
      let entry = bySource.get(s.sourceKey);
      if (!entry) bySource.set(s.sourceKey, (entry = { key: s.sourceKey, name: src?.name ?? s.sourceKey, url: src?.url, locations: [] }));
      if (s.sourceLocation && !entry.locations.includes(s.sourceLocation)) entry.locations.push(s.sourceLocation);
    }
    const within: string[] = [];
    const seen = new Set<string>([m.value]);
    for (let next = facet.values[m.value].broader?.[0]; next && !seen.has(next); next = facet.values[next]?.broader?.[0]) {
      seen.add(next);
      within.push(facet.values[next]?.name ?? next);
    }
    out.push({ id: m.value, name: facet.values[m.value].name, within, sources: [...bySource.values()] });
  }
  return out;
}

/** "Regions: Anatolia (Near East), Levant (Near East) — from Wikipedia: Hittites", for a tooltip. */
export function regionsTooltip(list: RowRegion[]): string {
  if (!list.length) return '';
  const names = list.map((r) => (r.within.length ? `${r.name} (${r.within.join(', ')})` : r.name)).join('; ');
  const from = [...new Set(list.flatMap((r) => r.sources.map((s) => s.name)))].join('; ');
  return `Regions: ${names} — from ${from}`;
}
