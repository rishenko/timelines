import { useCallback, useMemo, useState } from 'react';
import type { Dataset } from '../types.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';
import { formatYear } from '../lib/calendar.ts';
import { PLUGIN_API, type ViewContext } from '../plugins/api.ts';
import { usePlugin } from '../plugins/usePlugin.ts';
import type { useFocusRequest } from './focus.ts';
import type { View } from './url.ts';
import type { Notify } from './toast.ts';

interface Args {
  /** The plugin the link names (from this site's plugins/ folder), or null. */
  at: URL | null;
  schemaVersion: number;
  notify: Notify;
  data: Dataset;
  events: ResolvedEvent[];
  spans: Map<string, ResolvedSpan[]>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setView: (v: View) => void;
  focusOn: ReturnType<typeof useFocusRequest>[1];
}

/**
 * A view plugin (docs/plugins.md): loaded once, shown as a third view after Timeline and Table, with a frozen snapshot
 * of what the chart shows (the deferred data) and a few actions.
 */
export function useViewPlugin(a: Args) {
  const { notify, setSelectedId, setView, focusOn } = a;
  const onPluginError = useCallback((why: string) => notify(`The view plugin didn't load: ${why}.`, 'error'), [notify]);
  const plugin = usePlugin(a.at, a.schemaVersion, onPluginError);
  const [pluginOn, setPluginOn] = useState(!!a.at);
  const cal = a.data.meta.calendar;
  const pluginCtx = useMemo<ViewContext | null>(
    () =>
      plugin
        ? Object.freeze({
            apiVersion: PLUGIN_API,
            data: a.data,
            events: a.events,
            spans: a.spans,
            selectedId: a.selectedId,
            formatYear: (y: number) => formatYear(y, cal),
            select: (id: string | null) => setSelectedId(id),
            showOnTimeline: (year: number) => {
              setPluginOn(false);
              setView('timeline');
              focusOn({ year });
            },
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the setters are stable (useState)
    [plugin, a.data, a.events, a.spans, a.selectedId, cal, focusOn],
  );
  return { plugin, pluginOn, setPluginOn, pluginCtx };
}
