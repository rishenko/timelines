import type { ChronologySelection } from './chronology.ts';
import type { Dataset, Track } from '../types.ts';
import { subtreeIds } from './tracks.ts';

/**
 * The reader's filters in the link, beyond what url.ts already writes: rows switched off in Filters → Tracks, sources
 * switched in Filters → Sources, folded rows, and Dating choices. A link says only what differs from the timeline's
 * defaults, in plain ids, so it stays readable and keeps working id by id when the data changes:
 *
 * - rows: `hide=a,b` (switched off), or `show=c,d` (only these on) when that is shorter; `egypt*` stands for a row and
 *   every row below it, so switching off a group writes one id;
 * - source tags: `hidetag=wikipedia` (a tag switched off, so every source carrying it);
 * - sources, against the defaults after those tags: `hidesrc=a` / `addsrc=b`, or `src=c,d` (only these on);
 * - folded rows: `fold=a` / `unfold=b` (against the folds the timeline opens with), or `folded=c,d` (only these);
 * - in any "only these on" list, `all` and `none` stand for every id and no id;
 * - dating: `dating=low,egypt-short`: the chosen chronologies that aren't their group's default.
 *
 * Ids the timeline doesn't have (renamed or removed rows) are skipped and counted, so the reader can be told.
 */

/** Parameter names for one kind of switch: the two difference lists and the "only these on" list. */
interface SwitchNames {
  off: string;
  on: string;
  only: string;
}

export const ROW_PARAMS: SwitchNames = { off: 'hide', on: 'unhide', only: 'show' };
export const SOURCE_PARAMS: SwitchNames = { off: 'hidesrc', on: 'addsrc', only: 'src' };
export const FOLD_PARAMS: SwitchNames = { off: 'unfold', on: 'fold', only: 'folded' };

/**
 * Writes ids in a link and reads them back. The plain one lists ids as they are; `rowBranches` shortens whole
 * branches of rows to `row*`.
 */
export interface IdList {
  pack: (ids: string[]) => string[];
  /** The ids a written item stands for, or null if the timeline has no such id. */
  unpack: (item: string) => string[] | null;
}

const plainIds = (ids: string[]): IdList => {
  const known = new Set(ids);
  return { pack: (xs) => xs, unpack: (x) => (known.has(x) ? [x] : null) };
};

/** Row ids with whole branches written as `row*` (a row with sub-rows, all of them listed too). */
export function rowBranches(tracks: Track[]): IdList {
  const below = new Map(tracks.map((t) => [t.id, [...subtreeIds(t.id, tracks)]]));
  return {
    pack(ids) {
      const listed = new Set(ids);
      const covered = new Set<string>();
      const out: string[] = [];
      for (const id of ids) {
        if (covered.has(id)) continue;
        const branch = below.get(id) ?? [id];
        if (branch.length > 1 && branch.every((x) => listed.has(x))) {
          out.push(`${id}*`);
          for (const x of branch) covered.add(x);
        } else out.push(id);
      }
      return out;
    },
    unpack: (x) => (x.endsWith('*') ? (below.get(x.slice(0, -1)) ?? null) : below.has(x) ? [x] : null),
  };
}

const list = (param: string | null) => (param ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * The link parameters for a set of on/off switches: only what differs from the defaults, or the list of those on
 * when that is shorter (`all` when every one is on, `none` when none is). No parameters when nothing differs.
 */
export function switchParams(
  ids: string[],
  isOn: (id: string) => boolean,
  isOnByDefault: (id: string) => boolean,
  names: SwitchNames,
  idList: IdList = plainIds(ids),
): [string, string][] {
  const turnedOff = ids.filter((id) => !isOn(id) && isOnByDefault(id));
  const turnedOn = ids.filter((id) => isOn(id) && !isOnByDefault(id));
  if (!turnedOff.length && !turnedOn.length) return [];
  const diff: [string, string][] = [];
  const write = (xs: string[]) => idList.pack(xs).join(',');
  if (turnedOff.length) diff.push([names.off, write(turnedOff)]);
  if (turnedOn.length) diff.push([names.on, write(turnedOn)]);
  const on = ids.filter(isOn);
  const only: [string, string][] = [[names.only, on.length === ids.length ? 'all' : on.length ? write(on) : 'none']];
  const length = (ps: [string, string][]) => ps.reduce((n, [k, v]) => n + k.length + v.length + 2, 0);
  return length(only) < length(diff) ? only : diff;
}

/**
 * Reads switches back from the link: every id's state, starting from the defaults. `skipped` counts listed ids the
 * timeline doesn't have. Returns null when the link says nothing about these switches.
 */
export function readSwitches(
  q: URLSearchParams,
  ids: string[],
  isOnByDefault: (id: string) => boolean,
  names: SwitchNames,
  idList: IdList = plainIds(ids),
): { on: Record<string, boolean>; skipped: number } | null {
  if (!q.has(names.only) && !q.has(names.off) && !q.has(names.on)) return null;
  let skipped = 0;
  const pick = (param: string | null) =>
    list(param).flatMap((item) => {
      const found = idList.unpack(item);
      if (!found) skipped++;
      return found ?? [];
    });
  const on: Record<string, boolean> = Object.fromEntries(ids.map((id) => [id, isOnByDefault(id)]));
  if (q.has(names.only)) {
    const value = q.get(names.only);
    const listed = value === 'all' ? ids : value === 'none' ? [] : pick(value);
    for (const id of ids) on[id] = false;
    for (const id of listed) on[id] = true;
  } else {
    for (const id of pick(q.get(names.off))) on[id] = false;
    for (const id of pick(q.get(names.on))) on[id] = true;
  }
  return { on, skipped };
}

/**
 * A source's default once the link's tags are applied: off if a switched-off tag carries it, else its own default.
 * Sources are written and read against this, so switching off a tag doesn't list hundreds of sources.
 */
export function sourceBaseline(ds: Dataset, tagsOff: string[]): (key: string) => boolean {
  return (k) => !ds.sources[k].hiddenByDefault && !ds.sources[k].tags.some((t) => tagsOff.includes(t));
}

/** Reads `hidetag=`: the known tags listed, and how many weren't known. */
export function readTags(param: string | null, ds: Dataset): { off: string[]; skipped: number } {
  const all = list(param);
  const off = all.filter((t) => Object.hasOwn(ds.tags, t));
  return { off, skipped: all.length - off.length };
}

/** The `dating=` value: chosen chronologies that differ from their group's default (empty when none do). */
export function datingParam(selection: ChronologySelection, defaults: ChronologySelection): string {
  return Object.entries(selection)
    .filter(([group, id]) => defaults[group] !== id)
    .map(([, id]) => id)
    .join(',');
}

/** Reads `dating=` back: each listed chronology chosen for its group; unknown ids skipped and counted. */
export function readDating(param: string | null, ds: Dataset): { selection: ChronologySelection; skipped: number } {
  const selection: ChronologySelection = {};
  let skipped = 0;
  for (const id of list(param)) {
    const c = ds.chronologies?.[id];
    if (c) selection[c.group] = id;
    else skipped++;
  }
  return { selection, skipped };
}

/** How many ids in a comma-separated parameter aren't among the known ones. */
export const unknownCount = (param: string | null, known: (id: string) => boolean) => list(param).filter((id) => !known(id)).length;

/** The reader's message when a link named things the timeline no longer has. */
export const skippedNotice = (n: number) =>
  `${n} ${n === 1 ? 'item' : 'items'} in this link ${n === 1 ? "isn't" : "aren't"} in this timeline any more (renamed or removed), so ${n === 1 ? 'it was' : 'they were'} skipped.`;
