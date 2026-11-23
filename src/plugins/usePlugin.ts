import { useEffect, useState } from 'react';
import { checkPlugin, type ViewPlugin } from './api.ts';

/**
 * Loads a view plugin's module (once per address and schema) and checks it against the contract. `onError` hears why a
 * module couldn't be used (not found, not a plugin, another API or schema version).
 */
export function usePlugin(url: URL | null, schemaVersion: number, onError?: (why: string) => void) {
  const [plugin, setPlugin] = useState<ViewPlugin | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    import(/* @vite-ignore */ url.href)
      .then((m: { default?: unknown }) => {
        if (!live) return;
        const why = checkPlugin(m.default, schemaVersion);
        if (why) onError?.(why);
        setPlugin(why ? null : (m.default as ViewPlugin));
      })
      .catch(() => live && onError?.(`${url.pathname.split('/').pop()} couldn't be fetched`));
    return () => {
      live = false;
    };
  }, [url, schemaVersion, onError]);
  return plugin;
}
