import { migrate, SCHEMA_VERSION } from './migrate.ts';
import { at0, at1, daysInMonth, endAt, MONTH_NAMES, startAt, SUB_YEAR } from '../lib/subYear.ts';
import { FACET_APPLIES, LINK_KINDS, LOCATOR_KINDS, TRACK_KINDS, type DateClaim, type Dataset, type DateDays, type Membership, type SourceRef, type TrackSpan } from '../types.ts';
import { allClaims, eventChronology, trackChronologies } from '../lib/chronology.ts';
import { isSafeUrl } from '../lib/urls.ts';
import { GAP_TOLERANCE, spanStretches, stretchEnd } from '../lib/lifespan.ts';
import { datasetPresent, formatEventDates } from '../lib/years.ts';
import { formatDate, formatYear } from '../lib/calendar.ts';
import { bestLifespan, withinLifespan } from '../lib/memberOf.ts';

// v1 data has a few hand-typed ids that are not strict hex UUIDs; they are live deep links, so accept any URL-safe id.
export const ID_RE = /^[A-Za-z0-9-]+$/;

/** Maximum nesting: region → civilization → period. */

/** Returns a list of human-readable problems; empty means the dataset is valid. */
export function validateDataset(d: unknown): string[] {
  const errors: string[] = [];
  if (!d || typeof d !== 'object') return ['Dataset is not an object.'];
  // a file of an older version is checked as it reads once lifted to the current one
  const ds = migrate(d) as Dataset;
  if (ds.schemaVersion !== SCHEMA_VERSION)
    errors.push(`Unsupported schemaVersion: ${String(ds.schemaVersion)} (this app reads versions 3 to ${SCHEMA_VERSION}).`);
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
  if (!Array.isArray(m.increments) || m.increments.length === 0 || m.increments.some((i) => (typeof i === 'string' ? !(i in SUB_YEAR) : !(Number.isInteger(i) && i > 0))))
    errors.push('meta.increments must be a list of positive whole numbers, or quarter, month, week or day.');
  else if (!m.increments.includes(m.defaultIncrement)) errors.push('meta.defaultIncrement must be one of meta.increments.');
  if (m.circaFade !== undefined && !(m.circaFade >= 0)) errors.push('meta.circaFade must be zero or more.');
  if (m.hideRowsOutOfView !== undefined && typeof m.hideRowsOutOfView !== 'boolean') errors.push('meta.hideRowsOutOfView must be true or false.');
  if (m.range !== undefined && !(m.range && Number.isInteger(m.range.start) && Number.isInteger(m.range.end) && m.range.start < m.range.end))
    errors.push('meta.range needs whole-number years start < end.');
  if (m.continues !== undefined) {
    if (!Array.isArray(m.continues)) errors.push('meta.continues must be a list.');
    else
      m.continues.forEach((c, i) => {
        if (!c || !ID_RE.test(String(c.timeline)) || !Number.isInteger(c.at) || (c.side !== 'before' && c.side !== 'after'))
          errors.push(`meta.continues[${i}] needs a timeline id, a whole-number year "at", and side "before" or "after".`);
      });
  }

  // Timelines can come from anyone (uploads, links): only allow web and relative links.
  const checkUrl = (label: string, u: unknown) => {
    if (u === undefined) return;
    if (typeof u !== 'string' || !isSafeUrl(u)) errors.push(`${label} must be an http(s) link or a relative path.`);
  };
  checkUrl('meta.creditsImage', m.creditsImage);
  for (const t of ds.tracks) {
    checkUrl(`Track "${t.id}" image`, t.image);
    checkUrl(`Track "${t.id}" url`, t.url);
    if (t.ids !== undefined) {
      if (!t.ids || typeof t.ids !== 'object' || Array.isArray(t.ids)) errors.push(`Track "${t.id}" ids must be an object.`);
      else if (t.ids.wikidata !== undefined && !/^Q[1-9]\d*$/.test(String(t.ids.wikidata)))
        errors.push(`Track "${t.id}" ids.wikidata must be a Wikidata item id such as "Q11768".`);
    }
  }
  for (const [k, s] of Object.entries(ds.sources)) {
    checkUrl(`Source "${k}" url`, s.url);
    if (s.dump !== undefined && !(typeof s.dump === 'string' && /^[a-z]+wiki-\d{8}$/.test(s.dump)))
      errors.push(`Source "${k}" dump must name a snapshot like "enwiki-20261101".`);
    if (s.revision !== undefined) {
      if (!(Number.isInteger(s.revision) && s.revision > 0)) errors.push(`Source "${k}" revision must be a page revision id (a positive whole number).`);
      else if (!s.url) errors.push(`Source "${k}" has a revision but no url.`);
    }
  }

  // locators: the machine-readable form of a place in a source, wherever a source is cited
  const forEachRef = (v: unknown, at: string, fn: (r: SourceRef, at: string) => void) => {
    if (Array.isArray(v)) v.forEach((x, i) => forEachRef(x, `${at}[${i}]`, fn));
    else if (v && typeof v === 'object') {
      if ('sourceKey' in v) fn(v as SourceRef, at);
      else for (const [k, x] of Object.entries(v)) forEachRef(x, at ? `${at}.${k}` : k, fn);
    }
  };
  const LOCATOR_FIELDS: Record<string, { need: string[]; may: string[] }> = {
    infobox: { need: ['field'], may: ['value'] },
    lead: { need: ['quote'], may: [] },
    section: { need: ['heading'], may: ['quote'] },
    category: { need: ['name'], may: [] },
    page: { need: ['page'], may: [] },
  };
  forEachRef({ meta: ds.meta, tracks: ds.tracks, chronologies: ds.chronologies, events: ds.events }, '', (r, at) => {
    if (r.locator === undefined) return;
    const l = r.locator as unknown as Record<string, unknown>;
    if (!l || typeof l !== 'object' || !LOCATOR_KINDS.includes(l.kind as never)) {
      errors.push(`${at}: locator kind must be one of ${LOCATOR_KINDS.join(', ')}.`);
      return;
    }
    const { need, may } = LOCATOR_FIELDS[l.kind as string];
    for (const f of need) if (typeof l[f] !== 'string' || !(l[f] as string).trim()) errors.push(`${at}: a ${String(l.kind)} locator needs ${f}.`);
    for (const f of may) if (l[f] !== undefined && typeof l[f] !== 'string') errors.push(`${at}: locator ${f} must be text.`);
    for (const f of Object.keys(l)) if (f !== 'kind' && !need.includes(f) && !may.includes(f)) errors.push(`${at}: a ${String(l.kind)} locator has no field "${f}".`);
  });

  // facets (ways to group rows) and the rows' memberships in their values
  const facets = m.facets ?? {};
  if (m.facets !== undefined && (typeof m.facets !== 'object' || Array.isArray(m.facets))) errors.push('meta.facets must be an object.');
  for (const [fid, f] of Object.entries(facets)) {
    if (!ID_RE.test(fid)) errors.push(`Facet id "${fid}" must be letters, digits and dashes.`);
    if (!f?.name) errors.push(`Facet "${fid}" has no name.`);
    const values = f?.values ?? {};
    if (!f?.values || typeof f.values !== 'object') errors.push(`Facet "${fid}" needs values.`);
    if (f?.applies !== undefined && !FACET_APPLIES.includes(f.applies)) errors.push(`Facet "${fid}" applies must be tracks, events or both.`);
    for (const [vid, v] of Object.entries(values)) {
      if (!ID_RE.test(vid)) errors.push(`Facet "${fid}" value id "${vid}" must be letters, digits and dashes.`);
      if (!v?.name) errors.push(`Facet "${fid}" value "${vid}" has no name.`);
      for (const b of v?.broader ?? []) if (!values[b]) errors.push(`Facet "${fid}" value "${vid}" names unknown broader value "${b}".`);
    }
    // broader values may not loop back (a value inside itself)
    const loops = (vid: string, seen: Set<string>): boolean =>
      seen.has(vid) || (values[vid]?.broader ?? []).some((b) => loops(b, new Set([...seen, vid])));
    for (const vid of Object.keys(values)) if ((values[vid]?.broader ?? []).some((b) => loops(b, new Set([vid])))) errors.push(`Facet "${fid}" value "${vid}" is inside itself through broader values.`);
  }
  /** Memberships in facet values, of a row or an event: known values of facets that apply to it, each cited. */
  const checkMemberships = (label: string, list: Membership[] | undefined, of: 'tracks' | 'events') => {
    if (list === undefined) return;
    if (!Array.isArray(list)) {
      errors.push(`${label} memberships must be a list.`);
      return;
    }
    for (const ms of list) {
      const f = facets[ms?.facet];
      if (!f) errors.push(`${label} has a membership in unknown facet "${ms?.facet}".`);
      else if (!f.values?.[ms.value]) errors.push(`${label} has a membership in unknown ${ms.facet} value "${ms.value}".`);
      else if (![of, 'both'].includes(f.applies ?? 'tracks'))
        errors.push(`${label} has a membership in facet "${ms.facet}", which applies to ${f.applies ?? 'tracks'} only (set its applies to "both" to use it here).`);
      if (!Array.isArray(ms?.sources) || !ms.sources.length) errors.push(`${label} membership ${ms?.facet}/${ms?.value} cites no source.`);
      else for (const s of ms.sources) if (!ds.sources[s?.sourceKey]) errors.push(`${label} membership ${ms.facet}/${ms.value} cites unknown source "${s?.sourceKey}".`);
    }
  };
  for (const t of ds.tracks) checkMemberships(`Track "${t.id}"`, t.memberships, 'tracks');
  for (const e of ds.events) checkMemberships(`Event "${e.title || e.uuid}"`, e.memberships, 'events');

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
      checkDay(`${label} (date claim)`, c.year, c.month, c.day);
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
    if (t.kind !== undefined && !TRACK_KINDS.includes(t.kind)) errors.push(`Track "${t.id}" kind must be polity, person or theme.`);
    checkChronology(`Track "${t.id}"`, t.chronology);
  }
  const byId = new Map(ds.tracks.map((t) => [t.id, t]));
  for (const t of ds.tracks) {
    if (t.parent === undefined) continue;
    if (!trackIds.has(t.parent)) {
      errors.push(`Track "${t.id}" has unknown parent "${t.parent}".`);
      continue;
    }
    let p: string | undefined = t.parent;
    const seen = new Set([t.id]);
    while (p !== undefined) {
      if (seen.has(p)) {
        errors.push(`Track "${t.id}" is its own ancestor.`);
        break;
      }
      seen.add(p);
      p = byId.get(p)?.parent;
    }
  }
  if (errors.length) return errors;

  /** A month (1–12) and day (needs a month; must exist in that month) given with a year, if any. */
  const checkDay = (label: string, year: number, month: unknown, day: unknown) => {
    if (month === undefined) {
      if (day !== undefined) errors.push(`${label} has a day but no month.`);
      return;
    }
    if (!(Number.isInteger(month) && (month as number) >= 1 && (month as number) <= 12)) errors.push(`${label}: the month must be 1–12.`);
    else if (day !== undefined && !(Number.isInteger(day) && (day as number) >= 1 && Number.isInteger(year) && (day as number) <= daysInMonth(year, month as number)))
      errors.push(`${label}: ${String(day)} ${MONTH_NAMES[(month as number) - 1]} doesn't exist in that year.`);
  };
  /** The months and days of a start and end, and that the end date isn't before the start date. */
  const checkDays = (label: string, o: DateDays & { start: number; end?: number }) => {
    checkDay(`${label} start`, o.start, o.startMonth, o.startDay);
    if (o.end === undefined) {
      if (o.endMonth !== undefined || o.endDay !== undefined) errors.push(`${label} has an end month or day but no end year.`);
      return;
    }
    checkDay(`${label} end`, o.end, o.endMonth, o.endDay);
    if (o.end === o.start && o.startMonth && o.endMonth && at1(o) <= at0(o)) errors.push(`${label} ends before it starts.`);
  };

  /** Sources saying something is still going: only on something ongoing, each a known source with a location. */
  const checkOngoingSources = (label: string, s: { ongoing?: boolean; ongoingSources?: SourceRef[] }) => {
    if (s.ongoingSources === undefined) return;
    if (!s.ongoing) errors.push(`${label} has ongoingSources but isn't ongoing: cite its end in endDates instead.`);
    if (!Array.isArray(s.ongoingSources)) errors.push(`${label}: ongoingSources must be a list.`);
    else
      for (const r of s.ongoingSources) {
        if (!ds.sources[r?.sourceKey]) errors.push(`${label}: ongoingSources cites unknown source "${r?.sourceKey}".`);
        else if (typeof r.sourceLocation !== 'string') errors.push(`${label}: an ongoingSources entry needs a sourceLocation (may be "").`);
      }
  };

  /** A lifespan stretch or a phase: a start, and an end or `ongoing` (not both). Returns whether its years are usable. */
  const checkSpan = (label: string, s: TrackSpan, chron: string | undefined): boolean => {
    if (!s || typeof s !== 'object') {
      errors.push(`${label} must be an object with a start and an end.`);
      return false;
    }
    let ok = true;
    if (s.ongoing !== undefined && s.ongoing !== true) errors.push(`${label}: ongoing must be true or left out.`);
    if (!Number.isInteger(s.start)) {
      errors.push(`${label} needs an integer start.`);
      ok = false;
    }
    checkOngoingSources(label, s);
    if (s.ongoing) {
      if (s.end !== undefined) errors.push(`${label} has both an end and ongoing: use one.`);
      if (s.endDates) errors.push(`${label} is ongoing, so it can't have end date claims.`);
    } else if (!Number.isInteger(s.end)) {
      errors.push(`${label} needs an integer end (or ongoing: true).`);
      ok = false;
    } else if (ok && s.end! < s.start) {
      errors.push(`${label} ends before it starts.`);
      ok = false;
    }
    checkDays(label, s);
    checkClaims(`${label} start`, s.start, s.startDates, chron);
    if (!s.ongoing && s.end !== undefined) checkClaims(`${label} end`, s.end, s.endDates, chron);
    return ok;
  };
  const present = datasetPresent(ds);
  const yr = (y: number) => (m.calendar ? formatYear(y, m.calendar) : String(y));
  const chronologyOf = trackChronologies(ds.tracks);
  for (const t of ds.tracks) {
    const chron = chronologyOf(t.id);
    // the lifespan: one stretch, or a list of stretches in date order that don't overlap
    let stretches: TrackSpan[] | undefined;
    if (t.span !== undefined) {
      const list = spanStretches(t.span);
      const many = Array.isArray(t.span);
      if (!list.length) errors.push(`Track "${t.id}" lifespan is an empty list: leave it out instead.`);
      const ok = list.map((s, i) => checkSpan(`Track "${t.id}" lifespan${many ? ` stretch ${i + 1}` : ''}`, s, chron));
      if (ok.every(Boolean)) {
        stretches = list;
        list.forEach((s, i) => {
          if (i === 0) return;
          const prev = list[i - 1];
          if (prev.ongoing) errors.push(`Track "${t.id}" lifespan stretch ${i} is ongoing, so it must be the last.`);
          else if (s.start <= prev.end!)
            errors.push(`Track "${t.id}" lifespan stretch ${i + 1} starts (${yr(s.start)}) before stretch ${i} ends (${yr(prev.end!)}): list stretches in date order, with a gap between them.`);
        });
      }
    }
    if (t.phases === undefined) continue;
    if (!Array.isArray(t.phases)) {
      errors.push(`Track "${t.id}" phases must be a list.`);
      continue;
    }
    t.phases.forEach((p, i) => {
      if (!p.name) errors.push(`Track "${t.id}" phase ${i + 1} has no name.`);
      const label = `Track "${t.id}" phase "${p.name || i + 1}"`;
      if (!checkSpan(label, p, chron) || !stretches) return;
      // a typed lifespan says when the row existed, so it must cover every phase (best estimates)
      const end = stretchEnd(p, present);
      if (!stretches.some((s) => s.start <= p.start && stretchEnd(s, present) >= end))
        errors.push(
          `Track "${t.id}" lifespan doesn't contain its phase "${p.name || i + 1}" (${yr(p.start)} – ${p.ongoing ? 'ongoing' : yr(end)}). A typed lifespan must cover all of the row's phases; leave it out to have it worked out from them.`,
        );
    });
  }

  /** Whether a span contains another (best estimates, on full dates where months and days are given). */
  const contains = (outer: TrackSpan, inner: TrackSpan) =>
    at0(outer) <= at0(inner) && (outer.ongoing || (!inner.ongoing && at1(outer) >= at1(inner)));

  // dated memberships: the row a row belonged to for a stretch of years (a republic in a union)
  const isDescendant = (id: string, of: string): boolean => {
    for (let p = byId.get(id)?.parent; p !== undefined; p = byId.get(p)?.parent) if (p === of) return true;
    return false;
  };
  for (const t of ds.tracks) {
    if (t.memberOf === undefined) continue;
    if (!Array.isArray(t.memberOf)) {
      errors.push(`Track "${t.id}" memberOf must be a list.`);
      continue;
    }
    t.memberOf.forEach((ms, i) => {
      const union = byId.get(ms?.row);
      const label = `Track "${t.id}" membership ${i + 1}${union ? ` (in "${ms.row}")` : ''}`;
      if (!ms || typeof ms !== 'object') {
        errors.push(`${label} must be an object with a row, a start and an end.`);
        return;
      }
      if (!union) errors.push(`${label} names unknown row "${String(ms.row)}".`);
      else if (ms.row === t.id) errors.push(`${label} names the row itself.`);
      else if (isDescendant(ms.row, t.id)) errors.push(`${label} names "${ms.row}", which sits under it: a row can't belong to its own sub-row.`);
      if (!Array.isArray(ms.sources) || !ms.sources.length) errors.push(`${label} cites no source.`);
      else
        for (const r of ms.sources) {
          if (!ds.sources[r?.sourceKey]) errors.push(`${label} cites unknown source "${r?.sourceKey}".`);
          else if (typeof r.sourceLocation !== 'string') errors.push(`${label}: a source needs a sourceLocation (may be "").`);
        }
      if (!checkSpan(label, ms, chronologyOf(t.id)) || !union || ms.row === t.id) return;
      // within both rows' lifespans (best estimates): a member can't belong before it or the union existed
      const years = `${yr(ms.start)} – ${ms.ongoing ? 'ongoing' : yr(ms.end!)}`;
      if (!withinLifespan(ms, bestLifespan(t, present), present)) errors.push(`${label} (${years}) lies outside the lifespan of "${t.id}".`);
      if (!withinLifespan(ms, bestLifespan(union, present), present)) errors.push(`${label} (${years}) lies outside the lifespan of "${ms.row}".`);
      // the phase that held it: one phase of that name on this row, containing the membership
      if (ms.phase !== undefined) {
        const named = typeof ms.phase === 'string' ? (t.phases ?? []).filter((p) => p.name === ms.phase) : [];
        if (!named.length) errors.push(`${label} names phase "${String(ms.phase)}", which "${t.id}" doesn't have.`);
        else if (named.filter((p) => contains(p, ms)).length !== 1)
          errors.push(`${label} (${years}) doesn't lie within ${named.length > 1 ? 'exactly one of the phases named' : 'its phase'} "${ms.phase}". Leave phase out for a membership that outlasts the phase.`);
      }
    });
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
    checkDays(label, e);
    checkOngoingSources(label, e);
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
      const chron = eventChronology(ds, e, chronologyOf);
      checkClaims(`${label} start`, e.start, e.startDates, chron);
      if (e.end !== undefined) checkClaims(`${label} end`, e.end, e.endDates, chron);
      else if (e.endDates) errors.push(`${label} has end date claims but no end.`);
    }
  }

  // eras: periods across all rows, dated like phases and cited; in one group they follow each other
  const eras = m.eras ?? [];
  const eraIds = new Set<string>();
  if (m.eras !== undefined && !Array.isArray(m.eras)) errors.push('meta.eras must be a list.');
  else {
    for (const [i, era] of eras.entries()) {
      const label = `Era "${era?.name || era?.id || i + 1}"`;
      if (!era || typeof era !== 'object') {
        errors.push(`${label} must be an object.`);
        continue;
      }
      if (!era.id || !ID_RE.test(era.id)) errors.push(`${label} needs an id of letters, digits and dashes.`);
      else if (eraIds.has(era.id)) errors.push(`Duplicate era id "${era.id}".`);
      eraIds.add(era.id);
      if (!era.name) errors.push(`${label} has no name.`);
      checkChronology(label, era.chronology);
      if (!Array.isArray(era.sources) || !era.sources.length) errors.push(`${label} cites no source.`);
      else for (const r of era.sources) if (!ds.sources[r?.sourceKey]) errors.push(`${label} cites unknown source "${r?.sourceKey}".`);
      if (!checkSpan(label, era, era.chronology)) continue;
      if (m.range && (era.start < m.range.start || (era.ongoing ? false : era.end! > m.range.end)))
        errors.push(`${label} lies outside meta.range (${yr(m.range.start)} – ${yr(m.range.end)}).`);
    }
    const groups = new Map<string, typeof eras>();
    for (const era of eras) if (era && Number.isInteger(era.start)) groups.set(era.group ?? '', [...(groups.get(era.group ?? '') ?? []), era]);
    for (const list of groups.values()) {
      const sorted = [...list].sort((a, b) => at0(a) - at0(b));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        if (prev.ongoing || at1(prev) > at0(sorted[i]))
          errors.push(`Eras "${prev.name}" and "${sorted[i].name}" overlap: eras in one group follow each other (put alternatives in another group).`);
      }
    }
  }

  // redirects: ids the timeline no longer has, to the id that replaced them (or null: removed on purpose)
  if (ds.redirects !== undefined) {
    if (!ds.redirects || typeof ds.redirects !== 'object' || Array.isArray(ds.redirects)) errors.push('redirects must be an object.');
    else {
      const live = new Set([...trackIds, ...uuids, ...eraIds]);
      for (const [from, to] of Object.entries(ds.redirects)) {
        if (!ID_RE.test(from)) errors.push(`Redirect "${from}" must be letters, digits and dashes.`);
        else if (live.has(from)) errors.push(`Redirect "${from}" names an id the timeline still has.`);
        if (to !== null && !(typeof to === 'string' && live.has(to))) errors.push(`Redirect "${from}" points to "${String(to)}", which isn't a row, event or era of this timeline (use null for a removed id).`);
      }
    }
  }

  // succession: the events that began and ended lifespan stretches, phases, memberships and eras
  const eventsById = new Map(ds.events.map((e) => [e.uuid, e]));
  /** Every dated part that can name the events that began and ended it: lifespans, phases, memberships, eras. */
  const parts: { s: TrackSpan; label: string }[] = [
    ...ds.tracks.flatMap((t) => {
      const stretches = spanStretches(t.span);
      return [
        ...stretches.map((s, i) => ({ s, label: `Track "${t.id}" lifespan${stretches.length > 1 ? ` stretch ${i + 1}` : ''}` })),
        ...(Array.isArray(t.phases) ? t.phases : []).map((p, i) => ({ s: p, label: `Track "${t.id}" phase "${p.name || i + 1}"` })),
        ...(Array.isArray(t.memberOf) ? t.memberOf : []).flatMap((m, i) => (m && typeof m === 'object' ? [{ s: m, label: `Track "${t.id}" membership ${i + 1} (in "${m.row}")` }] : [])),
      ];
    }),
    ...eras.flatMap((era, i) => (era && typeof era === 'object' ? [{ s: era as TrackSpan, label: `Era "${era.name || i + 1}"` }] : [])),
  ];
  for (const { s, label } of parts)
    for (const side of ['start', 'end'] as const) {
      const id = side === 'start' ? s.startEvent : s.endEvent;
      if (id === undefined) continue;
      const field = `${side}Event`;
      const e = typeof id === 'string' ? eventsById.get(id) : undefined;
      if (!e) {
        errors.push(`${label} ${field} names unknown event "${String(id)}".`);
        continue;
      }
      if (side === 'end' && s.ongoing) {
        errors.push(`${label} is ongoing, so it has no end for an endEvent.`);
        continue;
      }
      const y = side === 'start' ? s.start : s.end;
      if (!Number.isInteger(y) || !Number.isInteger(e.start)) continue;
      const from = e.start;
      const to = e.ongoing ? present : (e.end ?? e.start);
      // an edge and an event both given in months or days must meet within one of the edge's units (a day, or a
      // month), so a row that changes hands several times in a year can't name the wrong change
      const em = side === 'start' ? s.startMonth : s.endMonth;
      const ed = side === 'start' ? s.startDay : s.endDay;
      if (em && e.startMonth) {
        const unit = ed ? 1 / 365 : 1 / 12;
        const edge0 = startAt(y!, em, ed) - unit;
        const edge1 = endAt(y!, em, ed) + unit;
        const to1 = e.ongoing ? present + 1 : at1(e);
        if (edge1 <= at0(e) || edge0 >= to1)
          errors.push(
            `${label} ${side === 'start' ? 'starts' : 'ends'} on ${formatDate(y!, em, ed, m.calendar)}, but its ${field} "${e.title}" is dated ${formatEventDates(e, m.calendar)}: the event must fall within a ${ed ? 'day' : 'month'} of the edge it begins or ends.`,
          );
        continue;
      }
      if (y! < from - GAP_TOLERANCE || y! > to + GAP_TOLERANCE)
        errors.push(
          `${label} ${side === 'start' ? 'starts' : 'ends'} in ${yr(y!)}, but its ${field} "${e.title}" is dated ${yr(from)}${to !== from ? ` – ${yr(to)}` : ''}: the event must fall within a year of the edge it begins or ends.`,
        );
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
  return migrate(d) as Dataset;
}
