// The guided tour's steps (components/Tour.tsx draws them): what each step says and which element it points at.
import type { Dataset } from '../types.ts';
import { hasDayZoom } from './subYear.ts';

export interface TourStep {
  /** CSS selector of the element the step points at; none for a centered card. */
  target?: string;
  /** Point at the widest match in view rather than the first (for bands, so the step shows a long one). */
  widest?: boolean;
  title: string;
  /** The step's text; `[[binding]]` shows a key as a keycap (components/Keycap.tsx). */
  text: string;
}

/**
 * The steps for a timeline, in reading order: the chart first, then the toolbar from left to right. Only the features
 * the timeline uses get a step (no Dating step without alternative chronologies, …).
 */
export function tourSteps(data: Dataset, o: { hasDating: boolean; hasSubRows: boolean }): TourStep[] {
  const days = hasDayZoom(data.meta.increments);
  const steps: (TourStep | false)[] = [
    {
      title: `Welcome to ${data.meta.title}`,
      // the subtitle, not the description: a description can be a long list of regions
      text: `${data.meta.subtitle ? `${data.meta.subtitle}. ` : ''}This one-minute tour shows how to read it. Use [[ArrowLeft]] [[ArrowRight]] or the buttons; [[Escape]] closes it.`,
    },
    // the chart
    {
      target: '.tl-lane-label',
      title: 'Rows',
      text: o.hasSubRows
        ? 'Each row is a region, people, period or faction. Rows nest: ▸ opens a row’s sub-rows and ▾ folds them. A folded row still shows its key events, in bold.'
        : 'Each row is a region, people, period or faction. Its events run left to right through time.',
    },
    {
      target: '.tl-mark.span:not(.cluster), .tl-mark:not(.cluster)',
      title: 'Events',
      text: 'A bar is an event that lasted years; a diamond is one dated to a single year. Lighter ends show the range of dates the sources give. Click an event for its dates, sources and connections; “+N” gathers events too close to show apart.',
    },
    data.tracks.some((t) => t.span || t.phases?.length) && {
      target: '.tl-span',
      widest: true,
      title: 'Lifespans',
      text:
        'The shaded band behind a row shows when that civilization, period or faction existed, so the shading starts where it begins. Soft edges mean its start or end is uncertain.' +
        (data.tracks.some((t) => (Array.isArray(t.span) ? t.span : t.span ? [t.span] : []).some((s) => s.ongoing) || t.phases?.some((p) => p.ongoing))
          ? ' An arrow at the end means it is still going.'
          : ''),
    },
    data.tracks.some((t) => t.phases?.length) && {
      target: '.tl-phase:not(.member)',
      widest: true,
      title: 'Phases',
      text:
        'A row’s phases (its governments, dynasties or eras) sit in a thin strip along its top, with a line where each begins and ends.' +
        (hasOverlappingPhases(data) ? ' Phases that overlap, such as rival governments in a civil war, take a second strip.' : '') +
        (data.tracks.some((t) => t.phases?.some((p) => p.startEvent || p.endEvent))
          ? ' Point at a phase for its dates and the events that began and ended it.'
          : ' Point at a phase for its dates.'),
    },
    data.tracks.some((t) => t.memberOf?.length) && {
      target: '.tl-phase.member',
      widest: true,
      title: 'Memberships',
      text: 'A row that belonged to another row for a while, such as a republic in a union, gets one more strip under its phases: “in” the union’s name and years, in the union’s colour, with a dashed underline. The union is its own row; point at its name to see its members.',
    },
    // the toolbar, left to right
    {
      target: '.timeline-picker',
      title: 'Timelines',
      text: 'The title is a menu: switch to another timeline here, or add your own.',
    },
    {
      target: '[aria-label="View"]',
      title: 'Timeline or table',
      text: 'Table lists the same events with their dates, the ranges the sources allow, and the sources, in words. It works with a screen reader, and Download CSV saves it as a spreadsheet.',
    },
    o.hasDating && {
      target: '.dating-menu',
      title: 'Dating',
      text: 'Scholars date some regions differently. Dating switches a region to another chronology, and its events move to match.',
    },
    {
      // the zoom group is named "Zoom: time per tick" on a timeline with steps below a year (components/Toolbar.tsx)
      target: days ? '[aria-label="Zoom: time per tick"]' : '[aria-label="Years per tick"]',
      title: 'Zoom and move',
      text: `${days ? 'Pick how much time each tick of the ruler covers, from years down to months, weeks or days: zoomed in, a date given as a year alone spans its whole year.' : 'Pick how many years each tick of the ruler covers.'} Scroll or drag sideways to move through time; on a touch screen, pinch to zoom. When rows are about to come or go as you move, or a change is still being drawn, a spinning ring shows in the chart’s top-right corner until it is done.`,
    },
    o.hasSubRows && {
      target: '[aria-label="Rows"]',
      title: 'Open and fold rows',
      text: 'Expand all opens every row; Collapse all folds them to the top level. ↺ puts the rows back the way the timeline opens.',
    },
    {
      target: '[data-tour="filters"]',
      title: 'Filters',
      text: 'Filters changes what the chart shows. Rows with nothing in view are hidden as you move: show them all again, or draw them as thin lines. Shorten long gaps with no events, show only some regions, and hide rows and sources you don’t need.',
    },
    {
      target: '.toolbar .search',
      title: 'Search',
      text: 'Find a row, a phase, an event or a date, and go straight to it. In the chart, / moves here.',
    },
    {
      target: '[data-tour="legend"]',
      title: 'Legend',
      text: 'The Legend explains every symbol, color and line, and can start this tour again.',
    },
    {
      target: '[data-tour="customize"]',
      title: 'Customize',
      text: 'Change the colors, edit the timeline (your edits stay in this browser until you download them), or open and add other timelines.',
    },
  ];
  return steps.filter((x): x is TourStep => !!x);
}

/** Whether any row has two phases at once (rival governments), which the chart puts on a second strip. */
function hasOverlappingPhases(data: Dataset): boolean {
  return data.tracks.some((t) => {
    let reach = -Infinity; // the latest end among the phases so far
    return [...(t.phases ?? [])]
      .sort((a, b) => a.start - b.start)
      .some((p) => {
        const overlaps = p.start < reach;
        reach = Math.max(reach, p.ongoing ? Infinity : (p.end ?? p.start));
        return overlaps;
      });
  });
}
