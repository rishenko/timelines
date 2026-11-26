import type { CommandRegistry } from './registry.ts';

/**
 * The reader's key bindings, kept in this browser (plugin design §4): a reader preference, so not in the view link,
 * where a shared link would change someone else's keys. Bindings of commands that aren't registered at the moment
 * (the chart's, in table view) are kept too.
 */
const KEY = 'timelines:key-bindings';

/** The saved bindings: id → key, or null for unbound. Anything else in storage is dropped. */
export function loadBindings(): Record<string, string | null> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, k]) => k === null || typeof k === 'string'));
  } catch {
    return {};
  }
}

/** Applies the saved bindings to the registry and saves each change after; returns `off()`. */
export function keepBindings(commands: CommandRegistry): () => void {
  commands.setBindings(loadBindings());
  let saved = JSON.stringify(commands.bindings());
  return commands.subscribe(() => {
    const now = JSON.stringify(commands.bindings());
    if (now === saved) return;
    saved = now;
    try {
      localStorage.setItem(KEY, now);
    } catch {
      // storage disabled: the bindings last until the page closes
    }
  });
}
