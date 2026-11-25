import { useState } from 'react';
import { incrementSpoken } from '../lib/subYear.ts';
import type { useRegionFilter } from './regionFilter.ts';
import type { useCategoryFilter } from './categoryFilter.ts';
import type { useComparison } from './comparison.ts';

/**
 * The one polite live region's text (zoom changes, "Went to …", toasts and the rest): kept mounted by App, because a
 * region that appears together with its text is often not read out. Zoom, comparison, region and category changes are
 * said here as they happen; everything else sets it through the returned setter.
 */
export function useAnnouncements(
  increment: number,
  comparison: ReturnType<typeof useComparison>,
  regions: ReturnType<typeof useRegionFilter>,
  categories: ReturnType<typeof useCategoryFilter>,
) {
  const [announcement, setAnnouncement] = useState('');
  const [announcedIncrement, setAnnouncedIncrement] = useState(increment);
  if (increment !== announcedIncrement) {
    setAnnouncedIncrement(increment);
    setAnnouncement(`Zoom: ${incrementSpoken(increment)}`);
  }
  const comparisonSays = comparison.active
    ? `Comparing ${comparison.ordered.length} ${comparison.ordered.length === 1 ? 'row' : 'rows'}${comparison.order === 'related' ? ', related rows together' : comparison.order === 'start' ? ', by start date' : ''}`
    : comparison.rows.length
      ? `${comparison.rows.length} ${comparison.rows.length === 1 ? 'row' : 'rows'} in the comparison; showing the whole timeline`
      : '';
  const [announcedComparison, setAnnouncedComparison] = useState(comparisonSays);
  if (comparisonSays !== announcedComparison) {
    setAnnouncedComparison(comparisonSays);
    setAnnouncement(comparisonSays || 'Comparison cleared');
  }
  const [announcedRegions, setAnnouncedRegions] = useState(regions.picked);
  if (regions.picked !== announcedRegions) {
    setAnnouncedRegions(regions.picked);
    setAnnouncement(regions.names.length ? `Showing rows in ${regions.names.join(', ')}` : 'Region filter off: all rows');
  }
  const [announcedCategories, setAnnouncedCategories] = useState(categories.picked);
  if (categories.picked !== announcedCategories) {
    setAnnouncedCategories(categories.picked);
    setAnnouncement(categories.names.length ? `Showing events in ${categories.names.join(', ')}` : 'Category filter off: all events');
  }
  return [announcement, setAnnouncement] as const;
}
