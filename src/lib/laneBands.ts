import type { Dataset, Facet } from '../types.ts';
import { periodLaneIds } from './periodLane.ts';
import { reignLaneIds } from './reignLane.ts';

export type { ReignLane } from './reignLane.ts';

/**
 * Lane bands (the renderers split, R8): kinds of event a row draws on lines of its own at its top, above its other
 * events, each from a rule over the timeline's categories. The layout (timeline/layout.ts `bands`) and the Legend both
 * read this one ordered list, so a new band is one entry here. An event goes in the first band that has it.
 */
export interface LaneBandKind {
  id: string;
  /** The timeline's events on this band. */
  pick(ds: Dataset, facetId: string | undefined, facet: Facet | undefined, sourceOn: (key: string) => boolean): ReadonlySet<string>;
  /** At most `maxReignRows` lines in a collapsed row (the rest fold into "+N"); else never folded. */
  capped?: boolean;
  /** The Legend's entry: its sample's class, title and text. */
  legend: { sample: string; title: string; text: string };
}

/** A band with its events picked for one timeline. */
export type LaneBand = Pick<LaneBandKind, 'id' | 'capped' | 'legend'> & { ids: ReadonlySet<string> };

export const LANE_BANDS: LaneBandKind[] = [
  {
    id: 'reign',
    pick: reignLaneIds,
    capped: true,
    legend: {
      sample: 'lg-reign',
      title: 'Reigns',
      text: 'A row’s rulers, such as “Reign of Ramesses II”, come first among its events, one after another on the top line; overlapping reigns, or names that would collide, go on a second line. A gap means no reign is recorded there yet; a sourced interregnum (“Ottoman Interregnum”) is drawn in its gap. Zoomed out, reigns that don’t fit fold into the row’s “+N”.',
    },
  },
  {
    id: 'period',
    pick: (ds, facetId, facet, sourceOn) => periodLaneIds(ds, facetId, facet, sourceOn),
    legend: {
      sample: 'lg-period',
      title: 'Golden ages and long spans',
      text: 'A row’s golden ages, and spans of 25 years or more in religion, law, culture or the economy, sit on a line of their own under its phases and reigns, above its other events. They cross its rulers, so they are kept apart from what happened within them.',
    },
  },
];

/** Each band's events for one timeline, in order. */
export const laneBands = (ds: Dataset, facetId: string | undefined, facet: Facet | undefined, sourceOn: (key: string) => boolean): LaneBand[] =>
  LANE_BANDS.map(({ pick, ...b }) => ({ ...b, ids: pick(ds, facetId, facet, sourceOn) }));
