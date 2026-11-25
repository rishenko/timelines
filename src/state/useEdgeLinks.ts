import { useMemo } from 'react';
import type { TimelineMeta } from '../types.ts';
import { formatYear } from '../lib/calendar.ts';
import type { useLibraryActions } from './useLibraryActions.ts';

/** Links to neighbouring timelines (meta.continues), for the ends of the ruler; unknown timelines are skipped. */
export function useEdgeLinks(continues: TimelineMeta['continues'], timelines: ReturnType<typeof useLibraryActions>['timelines']) {
  return useMemo(
    () =>
      (continues ?? []).flatMap((c) => {
        const target = timelines.find((t) => t.summary.id === c.timeline)?.summary;
        if (!target) return [];
        // the year in the other timeline's calendar when the site's list gives it; else as a stored year
        const at = target.calendar ? formatYear(c.at, target.calendar) : String(c.at);
        return [
          {
            side: c.side,
            year: c.at,
            label: c.side === 'before' ? `Earlier: ${target.title}` : `Continues in ${target.title}`,
            title: target.calendar ? `Open ${target.title} at ${at}` : `Open ${target.title}`,
            href: `?timeline=${encodeURIComponent(c.timeline)}&at=${encodeURIComponent(at)}`,
          },
        ];
      }),
    [continues, timelines],
  );
}
