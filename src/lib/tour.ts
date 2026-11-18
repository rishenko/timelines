// The guided tour's steps (components/Tour.tsx draws them): what each step says and which element it points at.
import type { Dataset } from '../types.ts';

export interface TourStep {
  /** CSS selector of the element the step points at; none for a centered card. */
  target?: string;
  title: string;
  text: string;
}

/** The steps for a timeline: only the features it uses (no Dating step without alternative chronologies, …). */
export function tourSteps(data: Dataset, o: { hasDating: boolean; hasSubRows: boolean }): TourStep[] {
  const steps: TourStep[] = [
    {
      title: `Welcome to ${data.meta.title}`,
      // the subtitle, not the description: a description can be a long list of regions
      text: `${data.meta.subtitle ? `${data.meta.subtitle}. ` : ''}This one-minute tour shows how to read it. Use the arrow keys or the buttons; Esc closes it.`,
    },
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
    {
      target: '[aria-label="Years per tick"]',
      title: 'Zoom and move',
      text: 'Pick how many years each tick of the ruler covers. Scroll or drag sideways to move through time; on a touch screen, pinch to zoom.',
    },
  ];
  if (o.hasDating)
    steps.push({
      target: '.dating-menu',
      title: 'Dating',
      text: 'Scholars date some regions differently. Dating switches a region to another chronology, and its events move to match.',
    });
  if (o.hasSubRows)
    steps.push({
      target: '[aria-label="Rows"]',
      title: 'Open and fold rows',
      text: 'Expand all opens every row; Collapse all folds them to the top level. ↺ puts the rows back the way the timeline opens.',
    });
  steps.push(
    {
      target: '[aria-label="View"]',
      title: 'Timeline or table',
      text: 'Table lists the same events with their dates, the ranges the sources allow, and the sources, in words. It works with a screen reader, and Download CSV saves it as a spreadsheet.',
    },
    {
      target: '.toolbar .search',
      title: 'Search',
      text: 'Find a row, an event or a year, and go straight to it. Press / to search from anywhere.',
    },
    {
      target: '[data-tour="customize"]',
      title: 'Customize',
      text: 'Change the colors, edit the timeline (your edits stay in this browser until you download them), or open and add other timelines.',
    },
    {
      target: '[data-tour="legend"]',
      title: 'Legend and filters',
      text: 'The Legend explains every symbol, color and line, and can start this tour again. Filters hides rows and sources you don’t need.',
    },
  );
  return steps;
}
