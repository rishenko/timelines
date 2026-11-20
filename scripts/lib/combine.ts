// Builds the combined Ancient + Classical timeline from the two compiled files and the rules in data-src/combined.json
// (its "about" lists the general rules). Pure: takes the datasets and rules, returns the combined dataset and any
// problems; scripts/data.ts writes the file and the test checks it is up to date.
import { validateDataset } from '../../src/data/validate.ts';
import type { Dataset, DateClaim, SourceRef, Track, TrackPhase, TimelineEvent } from '../../src/types.ts';

interface Rule {
  to: string;
  why: string;
}
export interface CombineRules {
  output: string;
  ancient: string;
  classical: string;
  meta: { id: string; title: string; subtitle: string; description: string };
  renameRows: { ancient: Record<string, Rule>; classical: Record<string, Rule> };
  parents: Record<string, Rule>;
  /** A group's children in a set order, when the merged order fails the proximity test. */
  order: Record<string, { to: string[]; why: string }>;
  names: Record<string, Rule>;
  eventTracks: { classical: Record<string, string> };
  eventsWorded: Record<string, string>;
}

type Side = 'ancient' | 'classical';
const SPLIT_SUFFIX = '-classical';

/** Renames row ids in one dataset (rows, parents, events' rows, collapsed); merges duplicate row ids in an event. */
function renameRows(d: Dataset, map: Record<string, Rule>): Dataset {
  const to = (id: string) => map[id]?.to ?? id;
  const out = structuredClone(d);
  out.tracks = out.tracks.map((t) => ({ ...t, id: to(t.id), ...(t.parent ? { parent: to(t.parent) } : {}) }));
  out.events = out.events.map((e) => ({ ...e, tracks: [...new Set(e.tracks.map(to))] }));
  if (out.meta.collapsed) out.meta.collapsed = [...new Set(out.meta.collapsed.map(to))];
  return out;
}

/** Points every citation in a dataset at renamed source keys. */
function renameSourceKeys(d: Dataset, map: Map<string, string>) {
  if (!map.size) return;
  const ref = (r?: SourceRef) => (r && map.has(r.sourceKey) ? { ...r, sourceKey: map.get(r.sourceKey)! } : r);
  const claims = (cs?: DateClaim[]) => cs?.map((c) => (c.source ? { ...c, source: ref(c.source) } : c));
  const span = <T extends { startDates?: DateClaim[]; endDates?: DateClaim[] }>(s: T): T => ({
    ...s,
    ...(s.startDates ? { startDates: claims(s.startDates) } : {}),
    ...(s.endDates ? { endDates: claims(s.endDates) } : {}),
  });
  d.events = d.events.map((e) => ({ ...span(e), sources: e.sources.map((r) => ref(r)!) }));
  d.tracks = d.tracks.map((t) => ({
    ...t,
    ...(t.span ? { span: span(t.span) } : {}),
    ...(t.phases ? { phases: t.phases.map(span) } : {}),
  }));
}

/** Inserts the rows of `later` that `base` lacks next to their neighbour in `later`'s order. */
export function mergeOrder(base: string[], later: string[]): string[] {
  const out = [...base];
  later.forEach((id, i) => {
    if (out.includes(id)) return;
    const before = later.slice(0, i).reverse().find((x) => out.includes(x));
    if (before !== undefined) {
      out.splice(out.indexOf(before) + 1, 0, id);
      return;
    }
    const after = later.slice(i + 1).find((x) => out.includes(x));
    out.splice(after !== undefined ? out.indexOf(after) : out.length, 0, id);
  });
  return out;
}

/** The dating system a row uses: its own, or the nearest ancestor's. */
function effectiveChronology(tracks: Map<string, Track>, id: string): string | undefined {
  for (let t = tracks.get(id); t; t = t.parent ? tracks.get(t.parent) : undefined) if (t.chronology) return t.chronology;
  return undefined;
}

/** Every stored year in a dataset, with claim margins: the earliest is where the combined ruler may start. */
function earliestYear(d: Dataset): number {
  let min = Infinity;
  const claims = (cs?: DateClaim[]) => cs?.forEach((c) => (min = Math.min(min, c.year - (c.margin ?? 0))));
  const span = (s: { start: number; startDates?: DateClaim[]; endDates?: DateClaim[] }) => {
    min = Math.min(min, s.start);
    claims(s.startDates);
    claims(s.endDates);
  };
  d.events.forEach(span);
  for (const t of d.tracks) {
    if (t.span) span(t.span);
    t.phases?.forEach(span);
  }
  return min;
}

export function combine(ancientIn: Dataset, classicalIn: Dataset, rules: CombineRules): { dataset: Dataset; errors: string[] } {
  const errors: string[] = [];
  const a = renameRows(ancientIn, rules.renameRows.ancient);
  const c = renameRows(classicalIn, rules.renameRows.classical);
  for (const side of ['ancient', 'classical'] as Side[]) {
    const ids = new Set((side === 'ancient' ? ancientIn : classicalIn).tracks.map((t) => t.id));
    for (const id of Object.keys(rules.renameRows[side])) if (!ids.has(id)) errors.push(`renameRows.${side}: no row "${id}"`);
  }

  // Sources: one copy when both files agree; otherwise Classical's copy gets its own key.
  const sources = { ...a.sources };
  const split = new Map<string, string>();
  for (const [k, s] of Object.entries(c.sources)) {
    if (!(k in sources)) sources[k] = s;
    else if (JSON.stringify(sources[k]) !== JSON.stringify(s)) {
      split.set(k, k + SPLIT_SUFFIX);
      sources[k + SPLIT_SUFFIX] = s;
    }
  }
  renameSourceKeys(c, split);

  // Rows.
  const A = new Map(a.tracks.map((t) => [t.id, t]));
  const C = new Map(c.tracks.map((t) => [t.id, t]));
  for (const [side, d] of [['Ancient', a], ['Classical', c]] as const) {
    const seen = new Set<string>();
    for (const t of d.tracks) {
      if (seen.has(t.id)) errors.push(`${side}: two rows are "${t.id}" after renaming`);
      seen.add(t.id);
    }
  }
  const merged = new Map<string, Track>();
  for (const id of new Set([...A.keys(), ...C.keys()])) {
    const at = A.get(id);
    const ct = C.get(id);
    let t: Track;
    if (at && ct) {
      if ((at.parent ?? '') !== (ct.parent ?? '') && !rules.parents[id])
        errors.push(`row "${id}": Ancient puts it under "${at.parent ?? 'top level'}", Classical under "${ct.parent ?? 'top level'}"; settle it in "parents"`);
      t = { ...at };
      if (!t.url && ct.url) {
        t.url = ct.url;
        if (ct.ids) t.ids = ct.ids;
      }
      if (at.span && ct.span) {
        const { start, startDates, circa } = at.span;
        const { end, endDates } = ct.span;
        t.span = { start, end, ...(circa || ct.span.circa ? { circa: true } : {}), ...(startDates ? { startDates } : {}), ...(endDates ? { endDates } : {}) };
        if (t.span.end < t.span.start) errors.push(`row "${id}": merged lifespan ends before it starts`);
      } else if (ct.span) t.span = ct.span;
      if (at.phases || ct.phases) {
        const byName = new Map<string, TrackPhase>();
        for (const p of [...(at.phases ?? []), ...(ct.phases ?? [])]) byName.set(p.name, p);
        t.phases = [...byName.values()].sort((x, y) => x.start - y.start);
      }
    } else t = { ...(at ?? ct)! };
    if (rules.parents[id]) t.parent = rules.parents[id].to;
    if (rules.names[id]) t.name = rules.names[id].to;
    merged.set(id, t);
  }
  for (const [what, map] of [['parents', rules.parents], ['names', rules.names], ['order', rules.order]] as const)
    for (const id of Object.keys(map)) if (!merged.has(id)) errors.push(`${what}: no row "${id}"`);
  for (const t of merged.values()) if (t.parent && !merged.has(t.parent)) errors.push(`row "${t.id}": no parent row "${t.parent}"`);

  // Rows keep the dating system they had in Ancient, wherever they now sit.
  for (const id of A.keys()) {
    const was = effectiveChronology(A, id);
    if (was && effectiveChronology(merged, id) !== was) merged.get(id)!.chronology = was;
  }

  // Order: siblings in Ancient's order, Classical's rows slotted in; written depth first.
  const kids = (tracks: Track[], parent: string | undefined) =>
    tracks.filter((t) => t.parent === parent && merged.get(t.id)?.parent === parent).map((t) => t.id);
  const tracks: Track[] = [];
  const walk = (parent: string | undefined) => {
    const order = mergeOrder(kids(a.tracks, parent), kids(c.tracks, parent));
    // rows moved under this parent by a rule, from either side
    for (const t of merged.values()) if (t.parent === parent && !order.includes(t.id)) order.push(t.id);
    const set = parent !== undefined ? rules.order[parent]?.to : undefined;
    if (set && [...set].sort().join() !== [...order].sort().join())
      errors.push(`order.${parent}: list exactly its rows (${[...order].sort().join(', ')})`);
    for (const id of set && errors.length === 0 ? set : order) {
      tracks.push(merged.get(id)!);
      walk(id);
    }
  };
  walk(undefined);

  // Events: Ancient's version of a shared event; Classical's rows where listed; links from both.
  const CE = new Map(c.events.map((e) => [e.uuid, e]));
  const AE = new Set(a.events.map((e) => e.uuid));
  const events: TimelineEvent[] = a.events.map((e) => {
    const ce = CE.get(e.uuid);
    if (!ce) return e;
    if (ce.title !== e.title && !rules.eventsWorded[e.uuid])
      errors.push(`event "${e.uuid}" is worded differently ("${e.title}" / "${ce.title}"); list it in "eventsWorded"`);
    const out = { ...e };
    if (rules.eventTracks.classical[e.uuid]) out.tracks = ce.tracks;
    const links = [...(e.links ?? []), ...(ce.links ?? []).filter((l) => !(e.links ?? []).some((x) => x.to === l.to && x.kind === l.kind))];
    if (links.length) out.links = links;
    return out;
  });
  events.push(...c.events.filter((e) => !AE.has(e.uuid)));
  for (const [what, ids] of [['eventTracks.classical', Object.keys(rules.eventTracks.classical)], ['eventsWorded', Object.keys(rules.eventsWorded)]] as const)
    for (const id of ids) if (!AE.has(id) || !CE.has(id)) errors.push(`${what}: "${id}" is not in both timelines`);

  const order = new Map(tracks.map((t, i) => [t.id, i]));
  const collapsed = [...new Set([...(a.meta.collapsed ?? []), ...(c.meta.collapsed ?? [])])]
    .filter((id) => merged.has(id))
    .sort((x, y) => order.get(x)! - order.get(y)!);
  const baseMeta = { ...a.meta };
  delete baseMeta.continues;
  delete baseMeta.range;
  const end = classicalIn.meta.range?.end;
  if (end === undefined) errors.push('the Classical timeline has no meta.range to end the combined one');
  const dataset: Dataset = {
    schemaVersion: 3,
    meta: {
      ...baseMeta,
      ...rules.meta,
      collapsed,
      range: { start: earliestYear(a), end: end ?? 0 },
    },
    tracks,
    sources,
    tags: { ...a.tags, ...c.tags },
    ...(a.chronologies ? { chronologies: a.chronologies } : {}),
    events,
  };
  return { dataset, errors: [...errors, ...validateDataset(dataset)] };
}
