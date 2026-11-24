/**
 * Strict checks for our own data (schema core paper test, rule 4): an unknown field, or an unknown value of a slug the
 * app knows a set of, is an error. Our build and CI call `validateStrict` (scripts/lib/compile.ts,
 * scripts/lib/timeline-index.ts), and every pipeline's output passes through them; the app reads other people's files
 * leniently with `validateDataset` and never imports this module (it would ship the test fixture to every reader).
 *
 * Which fields each kind of object may have is learned from the schema's test fixture (fixtures/everyField.ts), which
 * the build forces to set every field of src/types.ts, so the lists can't fall behind the types. What is hand-kept here
 * is only which kind of object sits under which key (CHILDREN); `uncovered()` (tested) fails when the fixture holds an
 * object this map doesn't place, so a new kind of nested object can't go unchecked.
 */
import { everyField } from './fixtures/everyField.ts';
import { migrate } from './migrate.ts';
import { validateDataset } from './validate.ts';
import { CONTEXT_KINDS, FACET_APPLIES, LINK_KINDS, LOCATOR_KINDS, TRACK_KINDS } from '../types.ts';

/** What sits under a key: one object of a kind, a list of them, a map of them (by id), or one or a list ("span"). */
type Child = { one: string } | { list: string } | { map: string } | { oneOrList: string };

const one = (k: string): Child => ({ one: k });
const list = (k: string): Child => ({ list: k });
const map = (k: string): Child => ({ map: k });

const DATED = { startDates: list('claim'), endDates: list('claim'), ongoingSources: list('ref') };

/** Kind of object → its keys that hold objects → what they hold. Keys holding scalars or lists of scalars aren't listed. */
export const CHILDREN: Record<string, Record<string, Child>> = {
  dataset: { meta: one('meta'), tracks: list('track'), sources: map('source'), tags: map('tag'), chronologies: map('chronology'), events: list('event') },
  meta: { calendar: one('calendar'), facets: map('facet'), continues: list('edge'), range: one('range'), context: list('context'), lines: map('line') },
  calendar: { aliases: one('aliases'), beforePresent: one('beforePresent') },
  facet: { values: map('facetValue') },
  context: { ...DATED, ids: one('ids'), sources: list('ref') },
  track: { ids: one('ids'), span: { oneOrList: 'span' }, phases: list('phase'), memberships: list('membership'), memberOf: list('memberOf'), context: list('context'), roles: map('rowRole') },
  span: DATED,
  phase: DATED,
  memberOf: { ...DATED, sources: list('ref') },
  membership: { sources: list('ref') },
  claim: { source: one('ref') },
  ref: { locator: one('locator') },
  chronology: { source: one('ref'), derive: one('derive') },
  event: { ...DATED, sources: list('ref'), memberships: list('membership'), links: list('link') },
};

/** Maps whose values aren't objects of a kind (ids to ids): not walked. */
const FREE: Record<string, string[]> = { dataset: ['redirects'] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** A locator's kind decides its fields: each is its own kind of object ("locator:page"). */
const kindOf = (kind: string, o: Record<string, unknown>) => (kind === 'locator' ? `locator:${String(o.kind)}` : kind);

type Visit = (kind: string, o: Record<string, unknown>, at: string) => void;

/** Walks every object of a dataset, naming each by kind and by a path a reader can follow. */
function walk(kind: string, o: Record<string, unknown>, at: string, visit: Visit) {
  const k = kindOf(kind, o);
  visit(k, o, at);
  const kids = CHILDREN[kind] ?? {};
  for (const [key, v] of Object.entries(o)) {
    const c = kids[key];
    if (!c || (FREE[kind] ?? []).includes(key)) continue;
    const name = (x: Record<string, unknown>, i: number) =>
      typeof x.uuid === 'string' ? `${key}["${x.uuid}"]` : typeof x.id === 'string' ? `${key}["${x.id}"]` : `${key}[${i}]`;
    const sub = at ? `${at}.` : '';
    if ('one' in c && isObj(v)) walk(c.one, v, `${sub}${key}`, visit);
    else if ('oneOrList' in c && isObj(v)) walk(c.oneOrList, v, `${sub}${key}`, visit);
    else if (('list' in c || 'oneOrList' in c) && Array.isArray(v)) {
      const ck = 'list' in c ? c.list : c.oneOrList;
      v.forEach((x, i) => isObj(x) && walk(ck, x, `${sub}${name(x, i)}`, visit));
    } else if ('map' in c && isObj(v)) for (const [id, x] of Object.entries(v)) if (isObj(x)) walk(c.map, x, `${sub}${key}.${id}`, visit);
  }
}

let known: Record<string, Set<string>> | undefined;

/** Each kind's fields, as the fixture sets them. */
export function knownFields(): Record<string, Set<string>> {
  if (known) return known;
  const out: Record<string, Set<string>> = {};
  walk('dataset', everyField as unknown as Record<string, unknown>, '', (k, o) => {
    for (const key of Object.keys(o)) (out[k] ??= new Set()).add(key);
  });
  return (known = out);
}

/** Objects in the fixture the map doesn't place (a key holding objects that CHILDREN doesn't name): must be empty. */
export function uncovered(): string[] {
  const out: string[] = [];
  walk('dataset', everyField as unknown as Record<string, unknown>, '', (kind, o, at) => {
    const base = kind.startsWith('locator:') ? 'locator' : kind;
    for (const [key, v] of Object.entries(o)) {
      const holdsObjects = isObj(v) || (Array.isArray(v) && v.some(isObj));
      if (holdsObjects && !CHILDREN[base]?.[key] && !(FREE[base] ?? []).includes(key)) out.push(`${at || 'dataset'}.${key} (${base})`);
    }
  });
  return out;
}

/** Edit distance, for "did you mean". */
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function nearest(word: string, options: Iterable<string>) {
  let best: string | undefined;
  let bestD = Infinity;
  for (const o of options) {
    const dd = distance(word.toLowerCase(), o.toLowerCase());
    if (dd < bestD) [best, bestD] = [o, dd];
  }
  return best !== undefined && bestD <= Math.max(1, Math.floor(word.length / 3)) ? ` (did you mean "${best}"?)` : '';
}

/** The strict problems of a (current-version) dataset: unknown fields, and unknown values of slugs the app knows. */
export function strictProblems(ds: unknown): string[] {
  if (!isObj(ds)) return [];
  const fields = knownFields();
  const out: string[] = [];
  const rows = new Map<unknown, Record<string, unknown>>((Array.isArray(ds.tracks) ? ds.tracks : []).filter(isObj).map((t) => [t.id, t]));
  walk('dataset', ds, '', (kind, o, at) => {
    const allowed = fields[kind];
    const where = at || 'dataset';
    if (!allowed) {
      out.push(kind.startsWith('locator:') ? `${where}: unknown locator kind "${kind.slice(8)}"${nearest(kind.slice(8), LOCATOR_KINDS)}` : `${where}: no known fields for a ${kind} (strict check)`);
      return;
    }
    for (const key of Object.keys(o)) if (!allowed.has(key)) out.push(`${where}: unknown field "${key}"${nearest(key, allowed)}`);
    // core 1.0, rule 3: the app keeps and ignores a kind it doesn't know; our own data may not have one
    const slug = (field: string, known: readonly string[], what: string) => {
      const v = o[field];
      if (typeof v === 'string' && !known.includes(v)) out.push(`${where}: unknown ${what} "${v}"${nearest(v, known)}`);
    };
    if (kind === 'context') slug('kind', CONTEXT_KINDS, 'context kind');
    if (kind === 'track') slug('kind', TRACK_KINDS, 'row kind');
    if (kind === 'link') slug('kind', LINK_KINDS, 'link kind');
    if (kind === 'facet') slug('applies', FACET_APPLIES, 'facet applies');
    // a member's side must be one its row names (Track.roles)
    if (kind === 'memberOf' && typeof o.role === 'string') {
      const sides = rows.get(o.row)?.roles;
      const names = isObj(sides) ? Object.keys(sides) : [];
      if (!names.includes(o.role))
        out.push(`${where}: role "${o.role}" isn't one of the sides "${String(o.row)}" names${names.length ? ` (${names.join(', ')})${nearest(o.role, names)}` : ' (it has no roles)'}`);
    }
  });
  return out;
}

/** `validateDataset` plus the strict problems: for our own build and CI only. */
export function validateStrict(d: unknown): string[] {
  const errors = validateDataset(d);
  return d && typeof d === 'object' ? [...errors, ...strictProblems(migrate(d))] : errors;
}
