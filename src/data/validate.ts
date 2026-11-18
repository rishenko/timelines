import { LINK_KINDS, type DateClaim, type Dataset } from '../types.ts';
import { allClaims, eventChronology, trackChronology } from '../lib/chronology.ts';
import { isSafeUrl } from '../lib/urls.ts';

// v1 data has a few hand-typed ids that are not strict hex UUIDs; they are live deep links, so accept any URL-safe id.
const ID_RE = /^[A-Za-z0-9-]+$/;

/** Maximum nesting: region → civilization → period. */
export const MAX_DEPTH = 2;

/** Returns a list of human-readable problems; empty means the dataset is valid. */
export function validateDataset(d: unknown): string[] {
  const errors: string[] = [];
  if (!d || typeof d !== 'object') return ['Dataset is not an object.'];
  const ds = d as Dataset;
  if (ds.schemaVersion !== 3) errors.push(`Unsupported schemaVersion: ${String(ds.schemaVersion)}.`);
  if (ds.present !== undefined && !Number.isInteger(ds.present)) errors.push('present must be an integer year.');
  if (!ds.meta || typeof ds.meta !== 'object') errors.push('meta must be an object.');
  if (!Array.isArray(ds.tracks)) errors.push('tracks must be an array.');
  if (!ds.sources || typeof ds.sources !== 'object') errors.push('sources must be an object.');
  if (!ds.tags || typeof ds.tags !== 'object') errors.push('tags must be an object.');
  if (!Array.isArray(ds.events)) errors.push('events must be an array.');
  if (errors.length) return errors;

  const m = ds.meta;
  if (!m.id || !ID_RE.test(m.id)) errors.push('meta.id must be letters, digits and dashes.');
  if (!m.title) errors.push('meta.title is required.');
  if (!m.calendar || !m.calendar.before || !m.calendar.after || typeof m.calendar.yearZero !== 'boolean')
    errors.push('meta.calendar needs before, after and yearZero.');
  if (!Array.isArray(m.increments) || m.increments.length === 0 || m.increments.some((i) => !(Number.isInteger(i) && i > 0)))
    errors.push('meta.increments must be a list of positive whole numbers.');
  else if (!m.increments.includes(m.defaultIncrement)) errors.push('meta.defaultIncrement must be one of meta.increments.');
  if (m.circaFade !== undefined && !(m.circaFade >= 0)) errors.push('meta.circaFade must be zero or more.');

  // Timelines can come from anyone (uploads, links): only allow web and relative links.
  const checkUrl = (label: string, u: unknown) => {
    if (u === undefined) return;
    if (typeof u !== 'string' || !isSafeUrl(u)) errors.push(`${label} must be an http(s) link or a relative path.`);
  };
  checkUrl('meta.creditsImage', m.creditsImage);
  for (const t of ds.tracks) checkUrl(`Track "${t.id}" image`, t.image);
  for (const [k, s] of Object.entries(ds.sources)) checkUrl(`Source "${k}" url`, s.url);

  const chronologies = ds.chronologies ?? {};
  for (const [id, c] of Object.entries(chronologies)) {
    if (!c.name) errors.push(`Chronology "${id}" has no name.`);
    if (!c.group) errors.push(`Chronology "${id}" has no group.`);
    if (c.derive) {
      const from = chronologies[c.derive.from];
      if (!from) errors.push(`Chronology "${id}" derives from unknown chronology "${c.derive.from}".`);
      else if (from.group !== c.group) errors.push(`Chronology "${id}" derives from "${c.derive.from}" in another group.`);
      if (!Number.isInteger(c.derive.offset)) errors.push(`Chronology "${id}" has a non-integer offset.`);
    }
    if (c.source && !ds.sources[c.source.sourceKey]) errors.push(`Chronology "${id}" cites unknown source "${c.source.sourceKey}".`);
  }
  const checkChronology = (label: string, c: string | undefined) => {
    if (c !== undefined && !chronologies[c]) errors.push(`${label} uses unknown chronology "${c}".`);
  };

  const checkClaims = (label: string, best: number, claims: DateClaim[] | undefined, chron: string | undefined) => {
    if (claims === undefined) return;
    if (!Array.isArray(claims)) {
      errors.push(`${label}: date claims must be a list.`);
      return;
    }
    for (const c of claims) {
      if (!Number.isInteger(c.year)) errors.push(`${label}: a date claim has a non-integer year.`);
      if (c.margin !== undefined && !(c.margin >= 0)) errors.push(`${label}: a date claim has a negative margin.`);
      checkChronology(`${label} (date claim)`, c.chronology);
      if (c.source && !ds.sources[c.source.sourceKey]) errors.push(`${label}: a date claim cites unknown source "${c.source.sourceKey}".`);
    }
    const all = allClaims(ds, best, claims, chron);
    if (all.length) {
      const lo = Math.min(...all.map((c) => c.year - (c.margin ?? 0)));
      const hi = Math.max(...all.map((c) => c.year + (c.margin ?? 0)));
      if (best < lo || best > hi) errors.push(`${label}: the best estimate (${best}) lies outside its claims (${lo}…${hi}).`);
    }
  };

  const trackIds = new Set<string>();
  for (const t of ds.tracks) {
    if (!t.id) errors.push('A track is missing its id.');
    else if (trackIds.has(t.id)) errors.push(`Duplicate track id "${t.id}".`);
    trackIds.add(t.id);
    if (!t.name) errors.push(`Track "${t.id}" has no name.`);
    checkChronology(`Track "${t.id}"`, t.chronology);
  }
  const byId = new Map(ds.tracks.map((t) => [t.id, t]));
  for (const t of ds.tracks) {
    if (t.parent === undefined) continue;
    if (!trackIds.has(t.parent)) {
      errors.push(`Track "${t.id}" has unknown parent "${t.parent}".`);
      continue;
    }
    let depth = 0;
    let p: string | undefined = t.parent;
    const seen = new Set([t.id]);
    while (p !== undefined) {
      if (seen.has(p)) {
        errors.push(`Track "${t.id}" is its own ancestor.`);
        break;
      }
      seen.add(p);
      depth++;
      p = byId.get(p)?.parent;
    }
    if (depth > MAX_DEPTH) errors.push(`Track "${t.id}": at most ${MAX_DEPTH} levels of nesting are supported.`);
  }
  if (errors.length) return errors;

  for (const t of ds.tracks) {
    if (!t.span) continue;
    const label = `Track "${t.id}" lifespan`;
    if (!Number.isInteger(t.span.start) || !Number.isInteger(t.span.end)) errors.push(`${label} needs integer start and end.`);
    else if (t.span.end < t.span.start) errors.push(`${label} ends before it starts.`);
    const chron = trackChronology(ds.tracks, t.id);
    checkClaims(`${label} start`, t.span.start, t.span.startDates, chron);
    checkClaims(`${label} end`, t.span.end, t.span.endDates, chron);
  }

  for (const [key, s] of Object.entries(ds.sources)) {
    if (!Array.isArray(s.tags)) errors.push(`Source "${key}" tags must be a list.`);
    else for (const a of s.tags) if (!ds.tags[a]) errors.push(`Source "${key}" has unknown tag "${a}".`);
  }

  const uuids = new Set<string>();
  for (const e of ds.events) {
    const label = `Event "${e.title || e.uuid}"`;
    if (!e.uuid || !ID_RE.test(e.uuid)) errors.push(`${label} has an invalid id (letters, digits and dashes only).`);
    else if (uuids.has(e.uuid)) errors.push(`Duplicate event uuid "${e.uuid}".`);
    uuids.add(e.uuid);
    if (!e.title) errors.push(`Event ${e.uuid} has no title.`);
    if (!Number.isInteger(e.start)) errors.push(`${label} has a non-integer start year.`);
    if (e.end !== undefined) {
      if (!Number.isInteger(e.end)) errors.push(`${label} has a non-integer end year.`);
      else if (e.end < e.start) errors.push(`${label} ends (${e.end}) before it starts (${e.start}).`);
    }
    if (e.importance !== undefined && ![1, 2, 3].includes(e.importance))
      errors.push(`${label}: importance must be 1 (key), 2 (normal) or 3 (minor).`);
    const tracksOk = Array.isArray(e.tracks) && e.tracks.length > 0;
    if (!tracksOk) errors.push(`${label} has no tracks.`);
    else for (const t of e.tracks) if (!trackIds.has(t)) errors.push(`${label} references unknown track "${t}".`);
    if (!Array.isArray(e.sources)) errors.push(`${label} sources must be an array.`);
    else
      for (const s of e.sources)
        if (!ds.sources[s.sourceKey]) errors.push(`${label} references unknown source "${s.sourceKey}".`);
    checkChronology(label, e.chronology);
    if (tracksOk) {
      const chron = eventChronology(ds, e);
      checkClaims(`${label} start`, e.start, e.startDates, chron);
      if (e.end !== undefined) checkClaims(`${label} end`, e.end, e.endDates, chron);
      else if (e.endDates) errors.push(`${label} has end date claims but no end.`);
    }
  }

  for (const e of ds.events) {
    for (const l of e.links ?? []) {
      if (!uuids.has(l.to)) errors.push(`Event "${e.title}" links to unknown event "${l.to}".`);
      if (l.to === e.uuid) errors.push(`Event "${e.title}" links to itself.`);
      if (!LINK_KINDS.includes(l.kind)) errors.push(`Event "${e.title}" has unknown link kind "${l.kind}".`);
    }
  }

  return errors;
}

export function assertDataset(d: unknown): Dataset {
  const errors = validateDataset(d);
  if (errors.length) throw new Error(`Invalid timeline data:\n- ${errors.join('\n- ')}`);
  return d as Dataset;
}
