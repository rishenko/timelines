/**
 * Schema v3: a generic timeline (fictional or historical).
 *
 * Years are stored as integers in astronomical numbering: there is always a
 * year 0 internally. A calendar without a year zero (BCE/CE) displays stored 0
 * as 1 BCE and -1449 as 1450 BCE; a calendar with one (e.g. BE/AE) displays
 * -5500 as 5500 BE. Use lib/calendar.ts to convert to and from display form.
 */

export interface Calendar {
  /** Label for years before the epoch, e.g. "BCE" or "BE". */
  before: string;
  /** Label for years from the epoch on, e.g. "CE" or "AE". */
  after: string;
  /** True if the calendar has a year 0 (e.g. 0 AE). False for BCE/CE (1 BCE is followed by 1 CE). */
  yearZero: boolean;
  /** Extra spellings accepted when parsing, e.g. { before: ["BC"], after: ["AD"] }. */
  aliases?: { before?: string[]; after?: string[] };
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
  /** Years-per-tick choices offered in the toolbar, finest first. */
  increments: number[];
  defaultIncrement: number;
  /** Theme preset used when the reader hasn't picked one. */
  defaultTheme?: string;
  /** Tag applied to sources created in the editor (e.g. "homebrew"). */
  customSourceTag?: string;
  /** Years of range drawn either side of a "circa" date that has no stated margin. */
  circaFade?: number;
  /** Track ids that start collapsed. */
  collapsed?: string[];
  /**
   * Start with rows that have nothing near the view hidden (readers can turn it off in Filters). For timelines with
   * many rows that come and go over a long period.
   */
  hideRowsOutOfView?: boolean;
  /**
   * Ways to sort rows into categories besides the row tree (geography, people, civilization), each with its values.
   * Rows join values through Track.memberships. Meant for region filters and comparison sets (not in the app yet).
   */
  facets?: Record<string, Facet>;
  /**
   * Neighbouring timelines this one continues into (or from), shown as links at the ends of the ruler. `at` is the
   * stored year the other timeline opens at; `side` says which end of this timeline the link sits on.
   */
  continues?: TimelineEdgeLink[];
  /** The period the timeline is about (stored years). The ruler doesn't extend past it, even for rows that do. */
  range?: { start: number; end: number };
}

export interface TimelineEdgeLink {
  /** The other timeline's id (a bundled timeline, or one in the reader's library). */
  timeline: string;
  at: number;
  side: 'before' | 'after';
}

/** A date range on a track: the lifespan of a civilization, period or faction. */
export interface TrackSpan {
  start: number;
  end: number;
  circa?: boolean;
  startDates?: DateClaim[];
  endDates?: DateClaim[];
}

export interface Track {
  id: string;
  name: string;
  color: string;
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
  /** Shaded across the lane: when this track existed. */
  span?: TrackSpan;
  /**
   * Named periods within the row, drawn on its own bar: successive governments of one state (France's kingdoms,
   * republics and empires), dynasties, eras. A line marks each change and the name sits along
   * the top of the row. Phases may overlap (two rival governments during a civil war).
   */
  phases?: TrackPhase[];
  /** The facet values this row belongs to (meta.facets), each with the sources that place it there. */
  memberships?: Membership[];
}

/** A way to group rows (meta.facets): its name and values. */
export interface Facet {
  name: string;
  values: Record<string, FacetValue>;
}

/** A facet value, e.g. the region "Aegean". */
export interface FacetValue {
  name: string;
  /** Broader values it is part of (the Aegean is part of the Mediterranean): a row in it belongs to them too. */
  broader?: string[];
}

/** A row's membership in a facet value, with its evidence, e.g. the Hittites in Anatolia per their article. */
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
  /** Hidden by default to avoid spoilers (campaign modules). */
  hiddenByDefault?: boolean;
}

export interface Tag {
  name: string;
}

export interface SourceRef {
  sourceKey: string;
  sourceLocation: string;
}

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

/** One attested value for a date: what a source says, under which chronology, with what margin. */
export interface DateClaim {
  year: number;
  /** ± years, as stated by the source (e.g. a radiocarbon margin). */
  margin?: number;
  chronology?: string;
  source?: SourceRef;
  note?: string;
}

export type LinkKind = 'causes' | 'part-of' | 'related' | 'succeeds' | 'conquers';

export const LINK_KINDS: LinkKind[] = ['causes', 'part-of', 'related', 'succeeds', 'conquers'];

export interface EventLink {
  /** uuid of the target event */
  to: string;
  kind: LinkKind;
}

export interface TimelineEvent {
  uuid: string;
  title: string;
  descr: string;
  /** Start year: the best estimate under the event's chronology. */
  start: number;
  /** End year (inclusive). Absent for single-year events. */
  end?: number;
  /** Still going as of the dataset's present. Overrides `end`. */
  ongoing?: boolean;
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
  links?: EventLink[];
  /** Set by edit mode; stripped from "final" downloads. */
  edited?: boolean;
}

export interface Dataset {
  schemaVersion: 3;
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
}
