import type { Dataset, Source, TimelineEvent, TimelineMeta, Track } from '../types.ts';
import { YEAR_ZERO_CALENDAR } from '../lib/calendar.ts';

/**
 * Importers for older REDACTED data files:
 *   v1 (REDACTED) → v2 (REDACTED) → v3 (this app).
 * Uploads in either old format are converted on load.
 */

// ---- v1 ----------------------------------------------------------------------

/** Shape of the v1 REDACTED data file. */
export interface V1Data {
  factions: Record<string, { name: string; color: string }>;
  sources: Record<
    string,
    { name: string; publishingAttributes: string[]; url?: string; defaultFilteredStatus?: boolean }
  >;
  publishingAttributes: Record<string, { name: string }>;
  timeline: V1Entry[];
}

export interface V1Entry {
  year: number;
  era: 'BE' | 'U';
  uuid: string;
  marker?: boolean;
  intraYearIndex?: number | null;
  factions?: string[];
  title: string;
  descr?: string;
  sources?: { sourceKey: string; sourceLocation: string }[] | null;
}

// ---- v2 ----------------------------------------------------------------------

/** Shape of a REDACTED data file (schema 2). */
export interface V2Data {
  schemaVersion: 2;
  present?: number;
  tracks: { id: string; name: string; color: string; parent?: string; logo?: string }[];
  sources: Record<string, { name: string; publishingAttributes: string[]; url?: string; hiddenByDefault?: boolean }>;
  publishingAttributes: Record<string, { name: string }>;
  events: (Omit<TimelineEvent, 'circa' | 'chronology' | 'startDates' | 'endDates'>)[];
}

// v1 used these keys as UI pseudo-entries; they are not real factions/sources.
const PSEUDO_FACTIONS = new Set(['REDACTED']);
const PSEUDO_SOURCES = new Set(['all-sources', 'no-source']);

// Latest dated event in published sources (REDACTED REDACTED, REDACTED Incident).
// Not the max year in the data: "Hypothesized Creation of Lich chassis" sits at 15005 AE.
export const DEFAULT_PRESENT = 5021;

const REDACTED = { id: 'REDACTED', name: 'REDACTED', color: '#7c8591' };

// v1 colors that don't work on the dark theme.
const COLOR_OVERRIDES: Record<string, string> = {
  union: '#c9ced6', // v1: #000000, invisible on dark background
};

/** Faction logos shipped in public/timelines/REDACTED/logos. */
export const REDACTED_LOGOS = [
  'REDACTED', 'REDACTED', 'REDACTED', 'ha', 'REDACTED', 'REDACTED', 'REDACTED', 'ra', 'REDACTED', 'REDACTED', 'redacted', 'REDACTED',
];

export const REDACTED_META: TimelineMeta = {
  id: 'REDACTED',
  title: 'REDACTED Timeline',
  subtitle: 'unofficial',
  description: 'The REDACTED universe, from the Fall to the REDACTED Incident, by faction.',
  credits:
    'Unofficial REDACTED Universe Timeline is not an official REDACTED product; it is a third party work, and is not affiliated with REDACTED Press. It is published via the REDACTED Third Party License. REDACTED is copyright REDACTED Press. All timeline entries are owned and copyrighted by their respective authors and publishers.',
  creditsImage: 'timelines/REDACTED/powered_by_REDACTED.svg',
  calendar: YEAR_ZERO_CALENDAR,
  increments: [1, 10, 50, 100],
  defaultIncrement: 100,
  defaultTheme: 'dark',
  customSourceTag: 'homebrew',
};

export function isV1Data(x: unknown): x is V1Data {
  return !!x && typeof x === 'object' && Array.isArray((x as V1Data).timeline) && !!(x as V1Data).factions;
}

export function isV2Data(x: unknown): x is V2Data {
  return !!x && typeof x === 'object' && (x as V2Data).schemaVersion === 2;
}

export function migrateV1(v1: V1Data): V2Data {
  const tracks: V2Data['tracks'] = [];
  for (const [id, f] of Object.entries(v1.factions)) {
    if (PSEUDO_FACTIONS.has(id)) continue;
    if (id === 'no-faction') continue;
    tracks.push({ id, name: f.name, color: COLOR_OVERRIDES[id] ?? f.color });
  }
  tracks.push(REDACTED);

  const sources: V2Data['sources'] = {};
  for (const [key, s] of Object.entries(v1.sources)) {
    if (PSEUDO_SOURCES.has(key)) continue;
    sources[key] = {
      name: s.name,
      publishingAttributes: [...s.publishingAttributes],
      ...(s.url && s.url !== '#' ? { url: s.url } : {}),
      ...(s.defaultFilteredStatus ? { hiddenByDefault: true } : {}),
    };
  }

  const events: V2Data['events'] = [];
  for (const e of v1.timeline) {
    // Markers existed only to fake an axis (one per 1000 years); v2 has a real ruler.
    if (e.marker) continue;
    const start = e.era === 'BE' ? -Math.abs(e.year) : e.year;
    const factionIds = (e.factions ?? []).filter((f) => !PSEUDO_FACTIONS.has(f));
    const trackIds = factionIds.map((f) => (f === 'no-faction' ? REDACTED.id : f));
    const ev: V2Data['events'][number] = {
      uuid: e.uuid,
      title: e.title,
      descr: e.descr ?? '',
      start,
      tracks: trackIds.length ? [...new Set(trackIds)] : [REDACTED.id],
      sources: (e.sources ?? [])
        .filter((s) => !PSEUDO_SOURCES.has(s.sourceKey))
        .map((s) => ({ sourceKey: s.sourceKey, sourceLocation: s.sourceLocation ?? '' })),
    };
    if (typeof e.intraYearIndex === 'number' && Number.isFinite(e.intraYearIndex)) {
      ev.order = e.intraYearIndex;
    }
    events.push(ev);
  }

  return {
    schemaVersion: 2,
    present: DEFAULT_PRESENT,
    tracks,
    sources,
    // "homebrew" tags sources added by authors and REDACTED in the editor, so readers can filter them
    publishingAttributes: { ...structuredClone(v1.publishingAttributes), homebrew: { name: 'Homebrew' } },
    events,
  };
}

/**
 * v2 → v3: adds REDACTED's meta (BE/U calendar with a year 0, so stored years are
 * unchanged), renames publishing attributes to tags, turns logo names into image
 * URLs, and pins "REDACTED" last.
 */
export function migrateV2(v2: V2Data): Dataset {
  const tracks: Track[] = v2.tracks.map((t) => {
    const out: Track = { id: t.id, name: t.name, color: t.color };
    if (t.parent) out.parent = t.parent;
    const logo = t.logo ?? t.id;
    if (REDACTED_LOGOS.includes(logo)) out.image = `timelines/REDACTED/logos/${logo}.svg`;
    if (t.id === REDACTED.id) out.pinLast = true;
    return out;
  });
  const sources: Record<string, Source> = {};
  for (const [k, s] of Object.entries(v2.sources)) {
    const out: Source = { name: s.name, tags: [...s.publishingAttributes] };
    if (s.url) out.url = s.url;
    if (s.hiddenByDefault) out.hiddenByDefault = true;
    sources[k] = out;
  }
  return {
    schemaVersion: 3,
    meta: structuredClone(REDACTED_META),
    ...(v2.present !== undefined ? { present: v2.present } : {}),
    tracks,
    sources,
    tags: { ...structuredClone(v2.publishingAttributes), homebrew: v2.publishingAttributes.homebrew ?? { name: 'Homebrew' } },
    events: structuredClone(v2.events),
  };
}

/** Converts any older format to v3; returns the input unchanged if it isn't an old format. */
export function upgrade(x: unknown): { data: unknown; from?: 1 | 2 } {
  if (isV1Data(x)) return { data: migrateV2(migrateV1(x)), from: 1 };
  if (isV2Data(x)) return { data: migrateV2(x), from: 2 };
  return { data: x };
}
