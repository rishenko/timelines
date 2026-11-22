import type { ReactNode } from 'react';
import type { Dataset, DateClaim, LinkKind } from '../types.ts';
import { formatYear } from '../lib/calendar.ts';
import { hasDayZoom } from '../lib/subYear.ts';
import { chronologyGroups } from '../lib/chronology.ts';
import { spanStretches } from '../lib/lifespan.ts';

/** Claims that give a range of years: a margin, or sources that disagree. Claims that all agree draw no range. */
const spreads = (claims: DateClaim[] | undefined) =>
  !!claims && (claims.some((c) => (c.margin ?? 0) > 0) || new Set(claims.map((c) => c.year)).size > 1);

interface Props {
  data: Dataset;
  onClose: () => void;
  /** Starts the guided tour; the button is left out without it. */
  onTour?: () => void;
}

interface Item {
  /** Leave out when the timeline doesn't use this feature. */
  show?: boolean;
  sample: ReactNode;
  /** The sample is text a screen reader should read (keys), not a drawing. */
  readSample?: boolean;
  title: string;
  text: ReactNode;
}

/** Arrowheads for the link samples (own ids, so the legend works without the timeline's SVG). */
function LinkSample({ kind }: { kind: 'causes' | 'part-of' | 'succeeds' | 'conquers' | 'related' }) {
  return (
    <svg className="lg-link" width="64" height="16" aria-hidden>
      <defs>
        <marker id={`lg-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" className={`arrowhead ${kind}`} />
        </marker>
      </defs>
      <path
        d="M 2 12 C 22 12, 40 4, 60 4"
        className={`link ${kind}`}
        markerEnd={kind === 'related' ? undefined : `url(#lg-arrow-${kind})`}
      />
    </svg>
  );
}

const kbd = (...keys: string[]) => (
  <span className="lg-keys">
    {keys.map((k) => (
      <kbd key={k}>{k}</kbd>
    ))}
  </span>
);

/** The chart's keys (src/timeline/keyboard.ts). The whole chart is one Tab stop. */
const KEYS: Item[] = [
  { readSample: true, sample: kbd('Tab'), title: 'Into the chart', text: 'The chart is one stop: Tab enters it at the event you last had (or one in view), and Tab again moves on.' },
  { readSample: true, sample: kbd('←', '→'), title: 'Along a row', text: 'The previous or next event in the row, by date; left of the first are the row’s fold buttons.' },
  { readSample: true, sample: kbd('↑', '↓'), title: 'Between rows', text: 'The nearest event in time in the row above or below.' },
  { readSample: true, sample: kbd('Home', 'End'), title: 'Ends of a row', text: 'The first or last event in the row.' },
  { readSample: true, sample: kbd('PgUp', 'PgDn'), title: 'A screen at a time', text: 'Jump about a screen’s width earlier or later in the row.' },
  { readSample: true, sample: kbd('+', '−'), title: 'Zoom', text: 'Zoom in or out around the focused event.' },
  { readSample: true, sample: kbd('Enter'), title: 'Open', text: 'Open the event’s details (Esc closes them and comes back), zoom into a “+N” group, or fold a row.' },
  { readSample: true, sample: kbd('/'), title: 'Search', text: 'Move to the search box, to find a row, an event or a year.' },
  { readSample: true, sample: kbd('?'), title: 'This list', text: 'Opens the legend from the chart.' },
];

function Section({ title, items }: { title: string; items: Item[] }) {
  items = items.filter((it) => it.show !== false);
  if (!items.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <dl>
        {items.map((it) => (
          <div key={it.title} className="lg-item">
            <dt className="lg-sample" aria-hidden={!it.readSample}>
              {it.sample}
            </dt>
            <dd>
              <strong>{it.title}</strong> {it.text}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LegendPanel({ data, onClose, onTour }: Props) {
  const cal = data.meta.calendar;
  // samples use the timeline's own first row color
  const color = data.tracks.find((t) => !t.pinLast)?.color ?? '#4a86c8';
  const hasChronologies = [...chronologyGroups(data)].some(([, list]) => list.length > 1);
  // only explain what this timeline actually uses
  const has = {
    nesting: data.tracks.some((t) => t.parent),
    // typed, or worked out from phases
    lifespans: data.tracks.some((t) => t.span || t.phases?.length),
    phases: data.tracks.some((t) => t.phases?.length),
    memberOf: data.tracks.some((t) => t.memberOf?.length),
    ongoing: data.tracks.some(
      (t) => spanStretches(t.span).some((s) => s.ongoing) || !!t.phases?.some((p) => p.ongoing) || !!t.memberOf?.some((m) => m.ongoing),
    ),
    ranges:
      hasChronologies ||
      data.events.some((e) => spreads(e.startDates) || spreads(e.endDates)) ||
      data.tracks.some(
        (t) =>
          spanStretches(t.span).some((s) => spreads(s.startDates) || spreads(s.endDates)) ||
          !!t.phases?.some((ph) => spreads(ph.startDates) || spreads(ph.endDates)),
      ),
    circa: data.events.some((e) => e.circa),
    shared: data.events.some((e) => e.tracks.length > 1),
  };
  const linkKinds = new Set<LinkKind>(data.events.flatMap((e) => (e.links ?? []).map((l) => l.kind)));
  // a timeline dated in months and days (it offers a zoom step below a year) says "date" where others say "year"
  const days = hasDayZoom(data.meta.increments);
  const circa = formatYear(cal.yearZero ? 1200 : -1199, cal, true);
  const era = formatYear(cal.yearZero ? 0 : 1, cal);

  const rows: Item[] = [
    {
      sample: (
        <span className="lg-rows">
          <span className="lg-row d0">Region ▾</span>
          <span className="lg-row d1">Civilization ▸</span>
          <span className="lg-row d2">Period</span>
        </span>
      ),
      title: 'Rows',
      text: has.nesting
        ? 'Each row is a region, people, faction or period. Rows nest to any depth. ▾ folds a row’s sub-rows into it; ▸ opens them again. ' +
          'With “Hide rows with nothing in view” (Filters), a +N beside a row counts the sub-rows hidden for having nothing near the years on screen (taken out, or thin lines in their place); it shows them.'
        : 'Each row is a region, people, faction or period.',
    },
    {
      sample: <span className="lg-lifespan" />,
      show: has.lifespans,
      title: 'Lifespan',
      text: 'The shaded band behind a row shows when that civilization, period or faction existed; it is the only thing that colours the row. A row with phases is shaded where they are, so a blank gap between them is a time it didn’t exist. Soft edges mean its start or end is uncertain.',
    },
    {
      sample: (
        <span className="lg-phases">
          <span className="a">I</span>
          <span className="b">II</span>
        </span>
      ),
      show: has.phases,
      title: 'Phases',
      text: 'Some rows change hands over time: a new government, dynasty or era. Each phase is a cell in a thin strip at the top of the row, with a line where it begins and one where it ends; alternating shades tell neighbours apart. Rivals that overlapped, as in a civil war, take a second strip. A blank stretch of strip under a shaded row means it carried on without a phase of its own. A name that doesn’t fit sits beside its phase with a pointer (◂ or ▸), or shows when you point at the phase; zoomed far out, a strip is a thin line without names.',
    },
    {
      sample: (
        <span className="lg-member">
          <span>in Union</span>
        </span>
      ),
      show: has.memberOf,
      title: 'Membership',
      text: 'A row that belonged to another row for a while, such as a republic in a union, gets one more strip under its phases for each membership: the union’s name and years (“in Soviet Union, 1922–91”) in the union’s colour, with a dashed underline. The union is its own row; pointing at its name or lifespan lists its members.',
    },
    {
      sample: (
        <span className="lg-ongoing">
          <span />
        </span>
      ),
      show: has.ongoing,
      title: 'Still going',
      text: 'A phase or lifespan that is still going runs to the present and ends in an arrow instead of a line. While its end is off screen, the arrow waits at the right edge of the chart.',
    },
    {
      sample: <span className="lg-row-more">⇣</span>,
      title: 'Crowded rows',
      text: 'When a row has more than five stacked lines of events, ⇣ shows them all.',
    },
  ];

  const events: Item[] = [
    {
      sample: <span className="lg-bar" />,
      title: 'Span',
      text: days
        ? 'An event with a start and an end date, drawn from the start of its first day (or month, or year) to the end of its last. Zoomed out, one too short to show as a bar is a diamond in its middle.'
        : 'An event lasting several years, from its first to its last year.',
    },
    {
      sample: <span className="lg-diamond" />,
      title: days ? 'Single-date event' : 'Single-year event',
      text: days ? 'An event dated to one day, month or year, in the middle of it.' : 'An event dated to one year.',
    },
    {
      sample: <span className="lg-text lg-key">Key event</span>,
      show: data.events.some((e) => e.importance === 1),
      title: 'Key event',
      text: 'Bold labels mark the events that matter most. In a crowded or collapsed row they are placed first, so they stay visible; at the widest zoom only key events are drawn.',
    },
    {
      sample: <span className="lg-cluster">+3</span>,
      title: 'Folded events',
      text: 'Events that didn’t fit in a crowded row, usually the minor ones. Click to zoom in on them.',
    },
    {
      sample: (
        <span className="lg-multi">
          <span className="lg-diamond" />
          <span className="lg-thread" />
          <span className="lg-diamond" />
        </span>
      ),
      show: has.shared,
      title: 'Shared event',
      text: 'An event that involves several rows appears in each one, its marks outlined, and joined by a vertical thread while it is selected.',
    },
  ];

  const dates: Item[] = [
    {
      sample: <span className="lg-bar uncertain" />,
      show: has.ranges,
      title: 'Uncertain start and end',
      text: `The lighter, striped ends of a bar are the range of ${days ? 'dates' : 'years'} the sources give for its start and end; the darker middle is the part they agree on. If the ranges overlap, the darker part shows the event’s dates under the selected dating system.`,
    },
    {
      sample: (
        <span className="lg-point-range">
          <span className="lg-band" />
          <span className="lg-diamond" />
        </span>
      ),
      show: has.ranges,
      title: 'Uncertain single date',
      text: `The lighter, striped band behind a diamond is the range of ${days ? 'dates' : 'years'} the sources give.`,
    },
    {
      sample: <span className="lg-text">{circa}</span>,
      show: has.circa || has.ranges,
      title: '“c.”',
      text: 'Circa: an approximate date. Open an event to see every date its sources give, with their margins.',
    },
    ...(hasChronologies
      ? [
          {
            sample: <span className="lg-select">Middle ▾</span>,
            title: 'Dating systems',
            text: 'Scholars date some regions differently. The toolbar’s Dating menu redraws a region’s events under another dating system; the ranges always include all of them.',
          },
        ]
      : []),
  ];

  const links: Item[] = [
    { show: linkKinds.has('causes'), sample: <LinkSample kind="causes" />, title: 'Leads to', text: 'One event caused or led to another.' },
    { show: linkKinds.has('part-of'), sample: <LinkSample kind="part-of" />, title: 'Part of', text: 'An event within a larger one.' },
    { show: linkKinds.has('succeeds'), sample: <LinkSample kind="succeeds" />, title: 'Succeeds', text: 'Comes after and replaces another.' },
    { show: linkKinds.has('conquers'), sample: <LinkSample kind="conquers" />, title: 'Conquers', text: 'One power conquers another.' },
    { show: linkKinds.has('related'), sample: <LinkSample kind="related" />, title: 'Related', text: 'Connected, with no direction.' },
  ];

  const ruler: Item[] = [
    {
      sample: <span className="lg-era">{era}</span>,
      title: 'Era line',
      text: `Where ${cal.before} turns to ${cal.after}.${cal.yearZero ? '' : ` This calendar has no year 0: 1 ${cal.before} is followed by 1 ${cal.after}.`}`,
    },
    {
      sample: <span className="lg-gap">⋯</span>,
      title: 'Shortened gap',
      text: days
        ? 'A long stretch with no events, squeezed so the timeline stays short. Its label gives the time skipped (“120 yrs”, “4 months”); the tick after it gives the full date. Zoomed in below a year, the inside of an event’s bar is never squeezed. Turn off “Shorten gaps with no events” in Filters to see true distances.'
        : 'A long stretch with no events, squeezed so the timeline stays short. Its label gives the years skipped. Turn off “Shorten gaps with no events” in Filters to see true distances.',
    },
    {
      sample: (
        <span className="lg-focus">
          <span className="lg-diamond selected" />
          <span className="lg-diamond dim" />
        </span>
      ),
      title: 'Highlight',
      text: 'Pointing at or selecting an event highlights everything connected to it and dims the rest. The thread joining a shared event’s rows shows while it is selected.',
    },
    {
      show: !!data.meta.continues?.length,
      sample: <span className="lg-edge">Next →</span>,
      title: 'Neighbouring timeline',
      text: 'Where this timeline meets the one before or after it, a link on the ruler opens that timeline at the same year.',
    },
    {
      sample: (
        <span className="lg-busy">
          <span className="ring" />
        </span>
      ),
      title: 'Updating',
      text: 'A ring in the chart’s top-right corner while rows are about to come or go after you move through time, or while a change is still being drawn.',
    },
  ];

  return (
    <div className="legend-panel" style={{ '--track-color': color } as React.CSSProperties}>
      <header>
        <h2>How to read this timeline</h2>
        {onTour && (
          <button className="tour-start" onClick={onTour} title="A one-minute guided tour of the page">
            Take the tour
          </button>
        )}
        <button className="icon" onClick={onClose} aria-label="Close the legend" title="Close the legend">
          ✕
        </button>
      </header>
      <div className="legend-grid">
        <Section title="Rows" items={rows} />
        <Section title="Events" items={events} />
        <Section title="Dates" items={dates} />
        <Section title="Connections" items={links} />
        <Section title="Ruler and view" items={ruler} />
        <Section title="Keyboard" items={KEYS} />
      </div>
      <p className="muted small">
        Click any event for its description, dates, sources and connections. Use the zoom buttons to zoom, Filters to hide
        rows or sources, and Customize to change the colors, edit the timeline, or open others.
      </p>
    </div>
  );
}
