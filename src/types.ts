/**
 * The timeline format: a generic timeline (fictional or historical). Its version is `Dataset.schemaVersion`; older
 * files are lifted to it when loaded (data/migrate.ts; changes in docs/data-format.md, "Versions").
 *
 * Years are stored as integers in astronomical numbering: there is always a
 * year 0 internally. A calendar without a year zero (BCE/CE) displays stored 0
 * as 1 BCE and -1449 as 1450 BCE; a calendar with one (e.g. BE/AE) displays
 * -5500 as 5500 BE. Use lib/calendar.ts to convert to and from display form.
 */

import type { SubYearUnit } from './lib/subYear.ts';

export interface Calendar {
  /** Label for years before the epoch, e.g. "BCE" or "BE". */
  before: string;
  /** Label for years from the epoch on, e.g. "CE" or "AE". */
  after: string;
  /** True if the calendar has a year 0 (e.g. 0 AE). False for BCE/CE (1 BCE is followed by 1 CE). */
  yearZero: boolean;
  /** Extra spellings accepted when parsing, e.g. { before: ["BC"], after: ["AD"] }. */
  aliases?: { before?: string[]; after?: string[] };
  /** Deep time (v9): years shown as time before `present` ("66 Ma", "11.7 ka BP"), not with the era labels; see lib/beforePresent.ts. */
  beforePresent?: BeforePresent;
  /** A calendar plugin that names and reads the years, by id ("lantern-ages"; schema 11.4). Without it: before/after. */
  system?: string;
}

/** A calendar's before-present display (schema v9). */
export interface BeforePresent {
  /** The stored year that is "present", e.g. 1950 (geology's and radiocarbon's BP). */
  present: number;
  /**
   * An uncited "c." fades by this share of its age (0.01: 1 %), instead of `meta.circaFade` years, which can't suit
   * both 66 Ma and 11.7 ka. Absent: `circaFade` as usual.
   */
  circaShare?: number;
}

export interface TimelineMeta {
  /** Short id used in URLs (?timeline=) and browser storage keys. */
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Footer text: credits, licences, disclaimers. */
  credits?: string;
  /** Image shown beside the credits (URL, relative to the site root). */
  creditsImage?: string;
  calendar: Calendar;
  /**
   * Years-per-tick choices offered in the toolbar, finest first. Steps below a year are named: "quarter", "month",
   * "week", "day" (lib/subYear.ts); a timeline offers them only if it lists them.
   */
  increments: (number | SubYearUnit)[];
  defaultIncrement: number | SubYearUnit;
  /** Theme preset used when the reader hasn't picked one. */
  defaultTheme?: string;
  /** Tag applied to sources created in the editor (e.g. "homebrew"). */
  customSourceTag?: string;
  /** Years of range drawn either side of a "circa" date that has no stated margin. */
  circaFade?: number;
  /** Track ids that start collapsed. */
  collapsed?: string[];
  /**
   * Start with rows that have nothing near the view hidden (readers can turn it off in Filters). On unless this is
   * `false`.
   */
  hideRowsOutOfView?: boolean;
  /**
   * Start with long stretches without events shortened ("compressed" gaps). On unless this is `false`; readers can
   * turn it on or off in Filters, and a link's `compress=` wins. v10 (e.g. deep time, until it has events to fill it).
   */
  compress?: boolean;
  /**
   * Ways to sort rows into categories besides the row tree (geography, people, civilization), each with its values.
   * Rows join values through Track.memberships. The region filter uses the first facet, and comparison sets show each row's broad region from it.
   */
  facets?: Record<string, Facet>;
  /**
   * Neighbouring timelines this one continues into (or from), shown as links at the ends of the ruler. `at` is the
   * stored year the other timeline opens at; `side` says which end of this timeline the link sits on.
   */
  continues?: TimelineEdgeLink[];
  /** The period the timeline is about (stored years). The ruler doesn't extend past it, even for rows that do. */
  range?: { start: number; end: number };
  /**
   * The timeline's own context lines (schema v8): named, cited periods across the whole timeline, such as the Bronze
   * Age or the Age of Revolutions (kind `age`), drawn in the strip under the ruler. A group's or row's own are in its
   * `Track.context`.
   */
  context?: ContextSpan[];
  /**
   * Display names for context lines, by line id (`{ "ages-aegean": { "name": "Aegean" } }`): a line's spans are
   * labelled with its name, or with one made from the id when it has none. Each key is a `line` some span has.
   */
  lines?: Record<string, ContextLine>;
}

/** How a context line is shown (meta.lines). */
export interface ContextLine {
  name: string;
}

/** The kinds of context span the app knows; others are kept but not drawn. */
export const CONTEXT_KINDS = ['age', 'golden-age'] as const;

/**
 * A named period on a node's context lines (schema v8): the timeline's own (`meta.context`) or a group's or row's
 * (`Track.context`). Dated like a phase, and cited. Spans of one kind on one `line` of a node follow each other
 * without overlapping; lines are alternative ways of dividing the same years.
 */
export interface ContextSpan extends TrackSpan {
  /** Letters, digits and dashes; unique among all the timeline's context spans. Links can name it. */
  id: string;
  /**
   * What sort of period it is: `age` (an archaeological or historical age; shown) or `golden-age` (a high point;
   * off by default). Any other kind of letters, digits and dashes is kept but not drawn, so a later kind needs no new
   * schema version.
   */
  kind: string;
  name: string;
  /** Spans that divide the same years one way share a line (e.g. "three-age"); one line if left out. */
  line?: string;
  color?: string;
  /** The chronology its dates follow. */
  chronology?: string;
  /** A page about the period (e.g. its Wikipedia article): its name links to it. Not a date source; those are `sources`. */
  url?: string;
  /** Its identifiers in other datasets (as a row's). */
  ids?: TrackIds;
  sources: SourceRef[];
}

export interface TimelineEdgeLink {
  /** The other timeline's id (a bundled timeline, or one in the reader's library). */
  timeline: string;
  at: number;
  side: 'before' | 'after';
}

/**
 * A date range on a track: a stretch of the lifespan of a civilization, period or faction, or a phase. It has an
 * `end`, or is `ongoing` (still going: runs to the dataset's present).
 */
export interface TrackSpan extends DateDays {
  start: number;
  /** Last year, inclusive. Absent when `ongoing`. */
  end?: number;
  /** Still going as of the dataset's present. Use instead of `end`. */
  ongoing?: boolean;
  /** Sources saying it is still going (only when `ongoing`): an ongoing stretch's counterpart to `endDates`. */
  ongoingSources?: SourceRef[];
  circa?: boolean;
  startDates?: DateClaim[];
  endDates?: DateClaim[];
  /** The event that began it (an event uuid): the event lists it as started. */
  startEvent?: string;
  /** The event that ended it (an event uuid; not on an ongoing stretch or phase). */
  endEvent?: string;
}

/** What a row stands for: polity (a state, people, culture, faction or union: the default), person, theme (a network, route,
 * movement or trade), and since 11.3 group (a container: a region), organization (an alliance or bloc) or conflict (a war). */
export type TrackKind = 'polity' | 'person' | 'theme' | 'group' | 'organization' | 'conflict';

export const TRACK_KINDS: TrackKind[] = ['polity', 'person', 'theme', 'group', 'organization', 'conflict'];

export interface Track {
  id: string;
  name: string;
  color: string;
  /** What the row stands for; a polity if left out. */
  kind?: TrackKind;
  /** Parent track id. Rows nest to any depth (e.g. group → region → civilization → period). */
  parent?: string;
  /** Image URL shown in the lane label (relative to the site root, or absolute). */
  image?: string;
  /** A page about this row (e.g. its Wikipedia article): the row's name links to it. */
  url?: string;
  /** The row's identifiers in other datasets, so it can be matched with them. */
  ids?: TrackIds;
  /** Keep this track after all others (e.g. "Other peoples", "Other powers"); new tracks are inserted before it. */
  pinLast?: boolean;
  /** Default chronology for events on this track; children inherit it. */
  chronology?: string;
  /**
   * Shaded across the lane: when this track existed. One stretch, or a list of stretches in date order with gaps
   * between them (gaps: the row didn't exist then). Must contain all of the row's phases. Without it, a row with
   * phases gets its lifespan worked out from them (lib/lifespan.ts).
   */
  span?: TrackSpan | TrackSpan[];
  /**
   * Named periods within the row, drawn on its own bar: successive governments of one state (France's kingdoms,
   * republics and empires), dynasties, eras. A line marks each change and the name sits along
   * the top of the row. Phases may overlap (two rival governments during a civil war).
   */
  phases?: TrackPhase[];
  /** The facet values this row belongs to (meta.facets), each with the sources that place it there. */
  memberships?: Membership[];
  /**
   * Other rows this row belonged to for a stretch of years (a republic in the Soviet Union 1922–1991), each dated like
   * a phase and with its sources. Different from `memberships` (facet values such as regions, undated).
   */
  memberOf?: RowMembership[];
  /** The group's or row's own context lines (schema v8): ages of a region, for example, drawn on its band. */
  context?: ContextSpan[];
  /**
   * The sides members of this row can take (schema 11, minor 1), by slug: a war's `{ "axis": { "name": "Axis" } }`.
   * A member's `memberOf` entry names one in its `role`.
   */
  roles?: Record<string, RowRole>;
}

/** A side members of a row can take (Track.roles), e.g. one of a war's sides. */
export interface RowRole {
  name: string;
}

/**
 * A row's membership in another row (Track.memberOf) for a stretch of years: dated like a phase (date claims, an end
 * or `ongoing`, the events that began and ended it), naming the row it belonged to and citing at least one source.
 */
export interface RowMembership extends TrackSpan {
  /** The row it belonged to (a track id): a union, empire or alliance with its own row. */
  row: string;
  /**
   * The side this row took in it (schema 11, minor 1): one of the `roles` the target row names, such as a war's
   * "axis" and "allies". A row that changed sides has one entry per side, each with its own dates (Italy in the Second
   * World War: axis 1940–43, allies 1943–45). Letters, digits and dashes.
   */
  role?: string;
  /**
   * The phase of this row that held the membership (a phase name), when the row has rival phases at the time: West
   * Germany in NATO, East Germany in the Warsaw Pact, both phases of one row. The membership lies within that phase.
   */
  phase?: string;
  sources: SourceRef[];
}

/** A way to group rows or events (meta.facets): its name and values. */
export interface Facet {
  name: string;
  values: Record<string, FacetValue>;
  /** What may belong to its values: rows (the default), events, or both. */
  applies?: FacetApplies;
}

/** `people` (schema 11, minor 2): the facet's values group the timeline's people (Dataset.people), e.g. their area. */
export type FacetApplies = 'tracks' | 'events' | 'both' | 'people';

export const FACET_APPLIES: FacetApplies[] = ['tracks', 'events', 'both', 'people'];

/** A facet value, e.g. the region "Aegean". */
export interface FacetValue {
  name: string;
  /** Broader values it is part of (the Aegean is part of the Mediterranean): a row in it belongs to them too. */
  broader?: string[];
}

/** A row's or event's membership in a facet value, with its evidence, e.g. the Hittites in Anatolia per their article. */
export interface Membership {
  facet: string;
  value: string;
  sources: SourceRef[];
}

/** Identifiers of a row in other datasets. */
export interface TrackIds {
  /** Wikidata item id, e.g. "Q11768" (Ancient Egypt). */
  wikidata?: string;
}

/** One named period within a row (see Track.phases). Dated like a lifespan, with date claims for uncertain edges. */
export interface TrackPhase extends TrackSpan {
  name: string;
}

export interface Source {
  name: string;
  tags: string[];
  url?: string;
  author?: string;
  /** Publication year (display text, e.g. "2000" or "2nd ed. 2007"). */
  year?: string;
  /** For web pages: the date the page was read (YYYY-MM-DD). */
  accessed?: string;
  /** The snapshot the values were read from, as `<wiki>-<YYYYMMDD>` (e.g. "enwiki-20261101"), when not the live page. */
  dump?: string;
  /** The page revision read (a revision id, for a permanent link); needs `url`. */
  revision?: number;
  /** Hidden by default to avoid spoilers (campaign modules). */
  hiddenByDefault?: boolean;
}

export interface Tag {
  name: string;
}

export interface SourceRef {
  sourceKey: string;
  /** Where in the source, as readers see it ("p. 12", "infobox year_start: 1920"). */
  sourceLocation: string;
  /** The same place in a form scripts can read (optional; written by generators beside the text). */
  locator?: Locator;
}

/** A place in a source that scripts can find again (SourceRef.locator). */
export type Locator =
  | { kind: 'infobox'; field: string; value?: string }
  | { kind: 'lead'; quote: string }
  | { kind: 'section'; heading: string; quote?: string }
  | { kind: 'category'; name: string }
  | { kind: 'page'; page: string };

export const LOCATOR_KINDS: Locator['kind'][] = ['infobox', 'lead', 'section', 'category', 'page'];

/**
 * A named dating system, e.g. the Mesopotamian Middle Chronology.
 * Chronologies in the same `group` are alternatives to each other; readers can switch between them.
 */
export interface Chronology {
  name: string;
  /** Alternatives share a group, e.g. "mesopotamia". */
  group: string;
  /** The group's default (the one the best estimates follow). */
  default?: boolean;
  description?: string;
  source?: SourceRef;
  /**
   * Dates in this chronology can be derived from another one by a fixed shift:
   * year = year in `from` + `offset`, for dates up to and including `until` (stored year).
   * E.g. the Low Chronology is the Middle Chronology + 64 years in the early second millennium.
   */
  derive?: { from: string; offset: number; until?: number };
}

/**
 * The month and day of a start and end date, when known (1-based; a day needs a month). Without them a date is its
 * whole year (or month). See lib/subYear.ts.
 */
export interface DateDays {
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
}

/** One attested value for a date: what a source says, under which chronology, with what margin. */
export interface DateClaim {
  year: number;
  /** The month and day the source gives, when it gives them. */
  month?: number;
  day?: number;
  /** ± years, as stated by the source (e.g. a radiocarbon margin). */
  margin?: number;
  chronology?: string;
  source?: SourceRef;
  note?: string;
}

/**
 * How two events connect. `with` (schema v9) is symmetric, as `related` is: the two acted together, e.g. co-rulers'
 * reigns (Wikidata P1706, "together with"). It's stored once, on either event.
 */
export type LinkKind = 'causes' | 'part-of' | 'related' | 'succeeds' | 'conquers' | 'with';

export const LINK_KINDS: LinkKind[] = ['causes', 'part-of', 'related', 'succeeds', 'conquers', 'with'];

export interface EventLink {
  /** uuid of the target event */
  to: string;
  kind: LinkKind;
}

export interface TimelineEvent extends DateDays {
  uuid: string;
  title: string;
  descr: string;
  /** Start year: the best estimate under the event's chronology. */
  start: number;
  /** End year (inclusive). Absent for single-year events. */
  end?: number;
  /** Still going as of the dataset's present. Overrides `end`. */
  ongoing?: boolean;
  /** Sources saying it is still going (only when `ongoing`), as on a lifespan. */
  ongoingSources?: SourceRef[];
  /** Ordering among events that start in the same year; lower comes first. */
  order?: number;
  /**
   * How much the event matters to its timeline: 1 = key, 2 = normal (the default), 3 = minor.
   * Crowded and collapsed rows place key events first, so they stay visible while minor ones
   * fold into "+N" badges.
   */
  importance?: 1 | 2 | 3;
  /** The date is approximate ("c."). */
  circa?: boolean;
  /** Overrides the chronology inherited from the event's first track. */
  chronology?: string;
  /** Attested values for the start; the error margin is computed from these. */
  startDates?: DateClaim[];
  /** Attested values for the end. */
  endDates?: DateClaim[];
  tracks: string[];
  sources: SourceRef[];
  /** The facet values this event belongs to (facets that apply to events), each with its sources. */
  memberships?: Membership[];
  links?: EventLink[];
  /**
   * The people this event is about (schema 11, minor 2), by id in `Dataset.people`: a reign names its ruler, so one
   * person's reigns over several rows are known to be one person (Darius II on Persia and on Egypt).
   */
  people?: string[];
  /** Set by edit mode; stripped from "final" downloads. */
  edited?: boolean;
}

/**
 * A person the timeline knows (schema 11, minor 2), in `Dataset.people` by id. People stay out of the row tree: a
 * timeline may know thousands. Their area (ruler, scientist…) is a membership in a facet that applies to `people`.
 */
export interface Person {
  name: string;
  ids?: TrackIds;
  /** The year the person is placed at on the timeline, and how it was found (see PersonActive). */
  active: PersonActive;
  /** Birth and death, as a source gives them. Either may be unknown. */
  born?: DateClaim;
  died?: DateClaim;
  /** Facet values (facets with `applies: people`), each with its sources. */
  memberships?: Membership[];
  /** The rows the person belongs to (their country), each with how that was found and its sources. */
  rows?: PersonRow[];
}

/**
 * The year a person is placed at. `from` says how it was found: `source` when a source gives it (a floruit; then
 * `source` is set), or derived from `born`/`died` by a fixed rule: `born-died` (the middle of the life, rounded down),
 * `born` (born + 30), `died` (died − 20). A derived year must match its rule (strict check).
 */
export interface PersonActive {
  year: number;
  from: PersonActiveFrom;
  source?: SourceRef;
}

export type PersonActiveFrom = 'source' | 'born-died' | 'born' | 'died';

export const PERSON_ACTIVE_FROM: PersonActiveFrom[] = ['source', 'born-died', 'born', 'died'];

/** A row a person belongs to: `via` says how (`citizenship`, Wikidata P27; `birthplace`, the country of P19). */
export interface PersonRow {
  row: string;
  via?: PersonRowVia;
  sources: SourceRef[];
}

export type PersonRowVia = 'citizenship' | 'birthplace';

export const PERSON_ROW_VIA: PersonRowVia[] = ['citizenship', 'birthplace'];

export interface Dataset {
  /**
   * The core version of the format (data/migrate.ts): 11 is core 1.0, which only ever grows by additions. Older files
   * are lifted to it when loaded.
   */
  schemaVersion: 11;
  /**
   * The additions to the core this file may use (core 1.0: 0; `RowMembership.role` and `Track.roles`: 1; `people`: 2). A reader
   * accepts a file with a higher minor and ignores what it doesn't know. Absent: 0.
   */
  schemaMinor?: number;
  meta: TimelineMeta;
  /**
   * The setting's "now". Ongoing events run to this year. Defaults to the latest
   * event year, which is wrong when the data contains far-future outliers.
   */
  present?: number;
  tracks: Track[];
  sources: Record<string, Source>;
  tags: Record<string, Tag>;
  chronologies?: Record<string, Chronology>;
  events: TimelineEvent[];
  /** The timeline's people by id (schema 11, minor 2); events name them in `TimelineEvent.people`. */
  people?: Record<string, Person>;
  /**
   * Ids this timeline no longer has (rows, events, context spans), each mapped to the id that replaced it, or to null when it was
   * removed on purpose. Links and saved views that name an old id follow it.
   */
  redirects?: Record<string, string | null>;
}
