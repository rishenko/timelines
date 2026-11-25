import { useMemo, useState } from 'react';
import type { Track } from '../types.ts';
import { anyCollapsed, defaultCollapsed, parentIds, sameCollapsed } from './collapse.ts';

/**
 * Folded rows: the ones the timeline opens with (meta.collapsed), the reader's current folds, and what the toolbar's
 * Collapse/Expand all and Default view need to know.
 */
export function useFolding(tracks: Track[], metaCollapsed: string[] | undefined) {
  const openingCollapsed = useMemo(() => defaultCollapsed(metaCollapsed), [metaCollapsed]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(openingCollapsed);
  const hasSubRows = useMemo(() => parentIds(tracks).length > 0, [tracks]);
  const someCollapsed = useMemo(() => anyCollapsed(tracks, collapsed), [tracks, collapsed]);
  // "Default view" restores the rows the timeline opens with; only useful when that isn't simply "all open".
  const hasDefaultView = useMemo(() => anyCollapsed(tracks, openingCollapsed), [tracks, openingCollapsed]);
  const canReset = useMemo(
    () => hasDefaultView && !sameCollapsed(tracks, collapsed, openingCollapsed),
    [hasDefaultView, tracks, collapsed, openingCollapsed],
  );
  return { openingCollapsed, collapsed, setCollapsed, hasSubRows, someCollapsed, hasDefaultView, canReset };
}
