import { useEffect, useRef, useState } from 'react';
import './plugin.css';
import type { MountedView, ViewContext, ViewPlugin } from './api.ts';

/**
 * The plugin's view in the main area: mounted into a plain element, given a new snapshot on every change. An error
 * thrown by the plugin is shown in a line instead of taking the app down.
 */
export function PluginView({ plugin, ctx }: { plugin: ViewPlugin; ctx: ViewContext }) {
  const el = useRef<HTMLDivElement>(null);
  const view = useRef<MountedView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      view.current = plugin.mount(el.current!, ctx);
    } catch (e) {
      setError(String(e));
    }
    return () => {
      try {
        view.current?.unmount();
      } catch {
        // a plugin failing to clean up shouldn't stop the app switching views
      }
      view.current = null;
    };
    // mount once per plugin; later snapshots go through update
    // mount once per plugin; later snapshots go through update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin]);
  useEffect(() => {
    try {
      view.current?.update(ctx);
    } catch (e) {
      setError(String(e));
    }
  }, [ctx]);
  return (
    <section className="plugin-view" aria-label={plugin.name}>
      {error && <p className="plugin-error">The {plugin.name} view stopped: {error}</p>}
      <div ref={el} className="plugin-root" />
    </section>
  );
}
