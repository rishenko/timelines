import type { Dataset } from '../types.ts';
import type { ResolvedEvent, ResolvedSpan } from '../lib/chronology.ts';

/**
 * The contract between the app and a view plugin (docs/plugins.md). A plugin is a plain ES module in the site's
 * `plugins/` folder whose default export is a ViewPlugin. It gets a DOM element and a read-only snapshot of what the
 * reader sees (the compiled timeline after filters and dating), and talks back only through the callbacks here. No
 * React, no app internals: the app can change freely behind this contract. A change to what the snapshot or the
 * callbacks mean bumps PLUGIN_API.
 */

/** The plugin API version this app speaks. A plugin names the one it was written for; a mismatch refuses to load. */
export const PLUGIN_API = 1;

/** What the app hands a view, frozen: a new snapshot on every change (filters, dating, selection). */
export interface ViewContext {
  apiVersion: number;
  /** The compiled timeline (schemaVersion inside), after the reader's filters: rows and events as shown. */
  data: Readonly<Dataset>;
  /** Visible events, re-plotted under the selected dating systems (start/end in the timeline's years). */
  events: readonly ResolvedEvent[];
  /** Each row's lifespan stretches. */
  spans: ReadonlyMap<string, readonly ResolvedSpan[]>;
  /** The selected event, if any. */
  selectedId: string | null;
  /** Formats a year in this timeline's calendar ("500 BCE", "3055 L"). */
  formatYear: (year: number) => string;
  /** Asks the app to open an event's details in the side panel (the same panel the chart uses). */
  select: (uuid: string | null) => void;
  /** Asks the app to show the chart centred on a year. */
  showOnTimeline: (year: number) => void;
}

export interface MountedView {
  update(ctx: ViewContext): void;
  unmount(): void;
}

export interface ViewPlugin {
  id: string;
  /** The view's name on its toolbar button. */
  name: string;
  apiVersion: number;
  /** The data schema versions it reads (inclusive); outside them it refuses to load. */
  schema: [min: number, max: number];
  mount(el: HTMLElement, ctx: ViewContext): MountedView;
}

/** Why a module can't be used as a view, or null. */
export function checkPlugin(p: unknown, schemaVersion: number): string | null {
  const v = p as Partial<ViewPlugin> | undefined;
  if (!v || typeof v.mount !== 'function' || typeof v.id !== 'string' || typeof v.name !== 'string') return 'not a view plugin (no id, name or mount)';
  if (v.apiVersion !== PLUGIN_API) return `written for plugin API ${String(v.apiVersion)}, this app speaks ${PLUGIN_API}`;
  if (!Array.isArray(v.schema) || typeof v.schema[0] !== 'number' || typeof v.schema[1] !== 'number') return 'no data schema range (schema: [min, max])';
  if (schemaVersion < v.schema[0] || schemaVersion > v.schema[1]) return `reads data schema ${v.schema[0]}–${v.schema[1]}, this timeline is schema ${schemaVersion}`;
  return null;
}

/**
 * Where a plugin may be loaded from: this site's `plugins/` folder only (`?plugin=plugins/centuries.js`), a `.js` file
 * with no query or fragment. Anything else (another site, `../`, a path outside the folder) gives null, so a link can't
 * make the app run someone else's code with the reader's library and drafts. Plugins from elsewhere would need a
 * sandboxed iframe (docs/plugins.md, "Trust").
 */
export function pluginUrl(param: string | null, base = document.baseURI): URL | null {
  if (!param) return null;
  try {
    // the site's plugins folder, beside the app (the site is served from a sub-path on GitHub Pages)
    const dir = new URL('plugins/', base);
    const u = new URL(param.replace(/^\//, ''), new URL('.', base));
    // only plugins/<slug>.js: no sub-folders, no encoded separators
    const file = u.pathname.startsWith(dir.pathname) ? u.pathname.slice(dir.pathname.length) : '';
    return u.origin === dir.origin && /^[a-z0-9-]+\.js$/.test(file) && !u.search && !u.hash ? u : null;
  } catch {
    return null;
  }
}
