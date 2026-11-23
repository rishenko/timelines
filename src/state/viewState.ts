import { parseFullDate, parseYear } from '../lib/calendar.ts';
import { centerParam, incrementParam, incrementYears, startAt } from '../lib/subYear.ts';
import { parseOrder, parseSet, type SetOrder } from '../lib/sets.ts';
import { categoryFacetId } from '../lib/categories.ts';
import { regionFacetId } from './regionFilter.ts';
import { followRedirect } from '../data/ids.ts';
import { migrateView } from './viewMigrate.ts';
import type { Dataset, Facet } from '../types.ts';

/**
 * A view of one timeline, and its link (schema step D; design: Workbench "2026-11-22 Timelines step D brief").
 * Links, saved views and (step F) views files share this model, one parser and one serializer, so a view can be
 * pasted from the address bar into a views file. The timeline itself (`?timeline=`, `?data=`, `?collection=`) stays
 * outside the state: it is resolved first, because ids are checked against that timeline.
 *
 * The link format has its own version (`v`), separate from the data's `schemaVersion`:
 * - **v1** (this): `v=1` first, then the parameters in a fixed order (`PARAM_ORDER`), lists in a fixed order, commas
 *   unescaped, defaults left out. Adds an end-year window, `from`/`to`.
 * - **v0**: links with no `v`, written before v1. v1 is a superset, so they go through the same parser and open as
 *   they always did.
 * - A `v` newer than this app's opens with a notice, and what can be read is applied.
 */

/** The link version this app writes. A change of meaning bumps it and adds a step in viewMigrate.ts. */
export const LINK_VERSION = 1;

/** The saved-views filters' parameters (step D2): reserved here, in this order, so D2 only fills them in. */
export const D2_PARAMS = ['hide', 'unhide', 'show', 'hidesrc', 'addsrc', 'src', 'hidetag', 'fold', 'unfold', 'folded', 'dating'] as const;

/** The order parameters are written in. */
export const PARAM_ORDER = ['v', 'from', 'to', 'inc', 'at', 'view', 'compress', 'rows', 'regions', 'set', 'order', 'cat', ...D2_PARAMS] as const;

/** Parameters that name the timeline: never part of a view's state. */
export const TIMELINE_PARAMS = ['timeline', 'data', 'collection'] as const;

const READ = new Set<string>(['v', 'from', 'to', 'inc', 'at', 'view', 'compress', 'rows', 'regions', 'set', 'order', 'cat']);

export type RowsMode = 'all' | 'active' | 'thin';

/** Where the chart opens: a centre and a zoom step (`at`/`inc`; either may be missing), or an end-year window. */
export type ViewWindow = { at?: number; inc?: number } | { from: number; to: number };

/** A view: only what differs from the timeline's defaults. */
export interface ViewState {
  window?: ViewWindow;
  view?: 'timeline' | 'table';
  /** Shortened gaps as the link says (`compress=0` off, `compress=1` on); left out, the timeline's own default (`meta.compress`, on unless `false`). */
  compress?: boolean;
  rows?: RowsMode;
  /** Ticked regions, in the facet's order. */
  regions?: string[];
  /** A comparison set, in picked order. */
  set?: { ids: string[]; order: SetOrder };
  /** Ticked categories, in the facet's order. */
  cat?: string[];
  // reserved for step D2: rowSwitches, sourceSwitches, folds, dating
  /** The selected event (the link's #hash). */
  selected?: string;
}

/** An id or value a link names that this timeline can't open. */
export interface SkippedId {
  /** The parameter it came from (`set`, `regions`, `cat`, `#` for the hash, `from`/`to` for a window that can't be used). */
  param: string;
  id: string;
  /** removed: the timeline's `redirects` send it to null; unknown: not in the timeline; invalid: a window that can't be used. */
  reason: 'removed' | 'unknown' | 'invalid';
}

export interface ParsedView {
  state: ViewState;
  skipped: SkippedId[];
  /** Parameters this version doesn't read (for step F's `views --check`; not shown to readers). */
  unknownParams: string[];
  /** The link's version: 0 when it has no `v`. */
  version: number;
}

/** A link's year or date ("1450", "-1449", "1450 BCE", "1916-07-01"), as a position in years. */
export function parseWhen(s: string, cal: Dataset['meta']['calendar']): number | null {
  const y = parseYear(s, cal);
  if (y !== null) return y;
  const d = parseFullDate(s, cal);
  return d ? startAt(d.year, d.month, d.day) : null;
}

const facetOf = (ds: Dataset, id: string | undefined): Facet | undefined => (id ? ds.meta.facets?.[id] : undefined);

/** A list parameter's ids: redirects followed, the ones this timeline can't use skipped and reported. */
function ids(param: string, raw: string | null, ds: Dataset, known: (id: string) => boolean, skipped: SkippedId[]): string[] {
  const out: string[] = [];
  for (const id of (raw ?? '').split(',').map((s) => s.trim())) {
    if (!id) continue;
    const to = followRedirect(ds, id);
    if (to === null) skipped.push({ param, id, reason: 'removed' });
    else if (!known(to)) skipped.push({ param, id, reason: 'unknown' });
    else if (!out.includes(to)) out.push(to);
  }
  return out;
}

/** A facet's values in the facet's own order (so the same view always gives the same link). */
const inFacetOrder = (values: string[], facet: Facet | undefined) =>
  facet ? Object.keys(facet.values).filter((v) => values.includes(v)) : values;

/** Reads a link's query (with or without `?`) and hash against the timeline it opens. */
export function parseView(query: string, hash: string, ds: Dataset): ParsedView {
  const q = migrateView(new URLSearchParams(query.replace(/^\?/, '')));
  const skipped: SkippedId[] = [];
  const state: ViewState = {};
  const cal = ds.meta.calendar;
  const v = q.get('v');
  const version = v === null ? 0 : Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : 0;
  const unknownParams = [...new Set(q.keys())].filter((k) => !READ.has(k) && !(TIMELINE_PARAMS as readonly string[]).includes(k));

  // the window: from/to override at/inc when both are there and from < to
  const fromRaw = q.get('from');
  const toRaw = q.get('to');
  const from = fromRaw !== null ? parseWhen(fromRaw, cal) : null;
  const to = toRaw !== null ? parseWhen(toRaw, cal) : null;
  if (from !== null && to !== null && from < to) state.window = { from, to };
  else {
    if (fromRaw !== null) skipped.push({ param: 'from', id: fromRaw, reason: 'invalid' });
    if (toRaw !== null) skipped.push({ param: 'to', id: toRaw, reason: 'invalid' });
    const inc = incrementYears(q.get('inc') ?? '');
    const okInc = ds.meta.increments.map(incrementYears).includes(inc);
    const atRaw = q.get('at');
    const at = atRaw !== null ? parseWhen(atRaw, cal) : null;
    if (okInc || at !== null) state.window = { ...(okInc ? { inc } : {}), ...(at !== null ? { at } : {}) };
  }

  if (q.get('view') === 'table') state.view = 'table';
  if (q.get('compress') === '0') state.compress = false;
  else if (q.get('compress') === '1') state.compress = true;
  const rows = q.get('rows');
  if (rows === 'all' || rows === 'active' || rows === 'thin') state.rows = rows;

  const regionFacet = facetOf(ds, regionFacetId(ds));
  const regions = ids('regions', q.get('regions'), ds, (id) => !!regionFacet && Object.hasOwn(regionFacet.values, id), skipped);
  if (regions.length) state.regions = inFacetOrder(regions, regionFacet);

  const trackIds = new Set(ds.tracks.map((t) => t.id));
  const set = parseSet(ids('set', q.get('set'), ds, (id) => trackIds.has(id), skipped).join(','), ds.tracks);
  if (set.length) state.set = { ids: set, order: parseOrder(q.get('order')) };

  const catFacet = facetOf(ds, categoryFacetId(ds));
  const cat = ids('cat', q.get('cat'), ds, (id) => !!catFacet && Object.hasOwn(catFacet.values, id), skipped);
  if (cat.length) state.cat = inFacetOrder(cat, catFacet);

  const sel = decodeURIComponent(hash.replace(/^#/, ''));
  if (sel) {
    const eventIds = new Set(ds.events.map((e) => e.uuid));
    const [found] = ids('#', sel, ds, (id) => eventIds.has(id), skipped);
    if (found) state.selected = found;
  }
  return { state, skipped, unknownParams, version };
}

/** The rows mode a timeline opens with. */
/** Whether the timeline opens with shortened gaps: on unless its `meta.compress` is `false` (deep time, until it has events). */
const defaultCompress = (ds: Dataset): boolean => ds.meta.compress !== false;
const defaultRows = (ds: Dataset): RowsMode => (ds.meta.hideRowsOutOfView !== false ? 'active' : 'all');

/**
 * A position for a link, written so `parseWhen` reads it back exactly. A bare year is read as displayed: in a
 * calendar without a year 0, "-1500" is 1500 BCE, stored as -1499. So a whole stored year at or before 0 is written one
 * lower (-1499 as "-1500", 0 as "-1"). Full dates ("-1499-07-01") are read with the stored year, so they are written
 * as they are. Links before v1 wrote the stored year, so their BCE centres opened a year late; reading them is
 * unchanged.
 */
export function whenParam(y: number, cal: Dataset['meta']['calendar']): string {
  if (!cal.yearZero && Number.isInteger(y) && y <= 0) return String(y - 1);
  return centerParam(y);
}

/** A list's values for a link: each encoded, commas left as they are. */
const list = (values: string[]) => values.map(encodeURIComponent).join(',');

/**
 * A view as a link's query (without `?` and without the timeline): `v=1` first, then `PARAM_ORDER`, defaults left out.
 * The hash (the selected event) is `serializeHash`.
 */
export function serializeView(state: ViewState, ds: Dataset): string {
  const out: string[] = [`v=${LINK_VERSION}`];
  const w = state.window;
  const cal = ds.meta.calendar;
  if (w && 'from' in w) out.push(`from=${whenParam(w.from, cal)}`, `to=${whenParam(w.to, cal)}`);
  else if (w) {
    if (w.inc !== undefined) out.push(`inc=${incrementParam(w.inc)}`);
    if (w.at !== undefined) out.push(`at=${whenParam(w.at, cal)}`);
  }
  if (state.view === 'table') out.push('view=table');
  // only a choice that differs from the timeline's own default is written, as with `rows`
  if (state.compress !== undefined && state.compress !== defaultCompress(ds)) out.push(`compress=${state.compress ? 1 : 0}`);
  if (state.rows && state.rows !== defaultRows(ds)) out.push(`rows=${state.rows}`);
  if (state.regions?.length) out.push(`regions=${list(inFacetOrder(state.regions, facetOf(ds, regionFacetId(ds))))}`);
  if (state.set?.ids.length) {
    out.push(`set=${list(state.set.ids)}`);
    if (state.set.order !== 'picked') out.push(`order=${state.set.order}`);
  }
  if (state.cat?.length) out.push(`cat=${list(inFacetOrder(state.cat, facetOf(ds, categoryFacetId(ds))))}`);
  return out.join('&');
}

export const serializeHash = (state: ViewState) => (state.selected ? `#${state.selected}` : '');

/** The app's full view: the state with the timeline's defaults filled in. */
export interface ResolvedView {
  increment: number;
  /** The centre from the link, or null for the timeline's default centre. */
  at: number | null;
  /** An end-year window from the link (`from`/`to`): the app picks the zoom that fits it and centres on it. */
  window: { from: number; to: number } | null;
  compress: boolean;
  hideOutOfView: boolean;
  thinRows: boolean;
  view: 'timeline' | 'table';
  regions: string[];
  set: string[];
  order: SetOrder;
  cat: string[];
  selected: string | null;
}

/**
 * The finest zoom step at which `[from, to]` fits the chart's width (`widthPx`, the chart without its row labels;
 * `tickPx` per tick), else the coarsest. At open the app estimates the width from the window (`window.innerWidth`
 * less the row labels), because the chart hasn't been measured yet; a side panel open at that moment makes the
 * estimate a little wide.
 */
export function fitIncrement(from: number, to: number, increments: number[], widthPx: number, tickPx = 80): number {
  const steps = [...increments].sort((a, b) => a - b);
  return steps.find((inc) => (widthPx / tickPx) * inc >= to - from) ?? steps[steps.length - 1];
}

export function resolveView(state: ViewState, ds: Dataset, widthPx = 1200): ResolvedView {
  const increments = ds.meta.increments.map(incrementYears);
  const w = state.window;
  const rows = state.rows ?? defaultRows(ds);
  let increment = incrementYears(ds.meta.defaultIncrement);
  let at: number | null = null;
  let window: ResolvedView['window'] = null;
  if (w && 'from' in w) {
    window = { from: w.from, to: w.to };
    increment = fitIncrement(w.from, w.to, increments, widthPx);
    at = (w.from + w.to) / 2;
  } else if (w) {
    if (w.inc !== undefined) increment = w.inc;
    if (w.at !== undefined) at = w.at;
  }
  return {
    increment,
    at,
    window,
    compress: state.compress ?? defaultCompress(ds),
    hideOutOfView: rows !== 'all',
    thinRows: rows === 'thin',
    view: state.view ?? 'timeline',
    regions: state.regions ?? [],
    set: state.set?.ids ?? [],
    order: state.set?.order ?? 'picked',
    cat: state.cat ?? [],
    selected: state.selected ?? null,
  };
}

/** One notice for a link's problems, or null: a newer version, and the ids this timeline doesn't have, counted by kind. */
export function linkNotice(parsed: Pick<ParsedView, 'skipped' | 'version'>): string | null {
  const parts: string[] = [];
  if (parsed.version > LINK_VERSION) parts.push('This link is from a newer version of the app; parts of it may be ignored.');
  const ids = parsed.skipped.filter((s) => s.reason !== 'invalid');
  if (ids.length) {
    const kinds: [string, string, string][] = [
      ['set', 'row', 'rows'],
      ['regions', 'region', 'regions'],
      ['cat', 'category', 'categories'],
      ['#', 'event', 'events'],
    ];
    const named = kinds.flatMap(([param, one, many]) => {
      const n = ids.filter((s) => s.param === param).length;
      return n ? [`${n} ${n === 1 ? one : many}`] : [];
    });
    const and = named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named[0];
    const removed = ids.filter((s) => s.reason === 'removed').length;
    parts.push(`This link names ${and} this timeline doesn’t have${removed ? ` (${removed} removed from this timeline)` : ''}.`);
  }
  return parts.length ? parts.join(' ') : null;
}
