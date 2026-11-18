/**
 * Schema v3: a generic timeline (fictional or historical).
 *
 * Years are stored as integers in astronomical numbering: there is always a
 * year 0 internally. A calendar without a year zero (BCE/CE) displays stored 0
 * as 1 BCE and -1449 as 1450 BCE; a calendar with one (REDACTED's BE/U) displays
 * -5500 as 5500 BE. Use lib/calendar.ts to convert to and from display form.
 */

export interface Calendar {
  /** Label for years before the epoch, e.g. "BCE" or "BE". */
  before: string;
  /** Label for years from the epoch on, e.g. "CE" or "U". */
  after: string;
  /** True if the calendar has a year 0 (REDACTED: 0 AE). False for BCE/CE (1 BCE is followed by 1 CE). */
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
  /** Tag applied to sources created in the editor (REDACTED: "homebrew"). */
  customSourceTag?: string;
  /** Years of range drawn either side of a "circa" date that has no stated margin. */
  circaFade?: number;
  /** Track ids that start collapsed. */
  collapsed?: string[];
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
  /** Keep this track after all others (e.g. "REDACTED", "Other powers"); new tracks are inserted before it. */
  pinLast?: boolean;
  /** Default chronology for events on this track; children inherit it. */
  chronology?: string;
  /** Shaded across the lane: when this track existed. */
  span?: TrackSpan;
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
