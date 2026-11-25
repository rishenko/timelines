import type { CommandScope, CommandContext } from '../commands/registry.ts';
import type { Cursor } from '../cursor/cursorStore.ts';
import type { MeanwhileLane } from '../cursor/meanwhile.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import type { PlacedAge } from '../lib/eras.ts';
import type { View } from '../timeline/viewportStore.ts';

/**
 * Layers (plugin architecture design §3): a plugin that draws inside the chart. It asks for one or more slots and is
 * mounted once with an element for each; `mount` returns its cleanup. A layer draws plain DOM in its elements and talks
 * to the app only through `api`: no React, no app internals. The chart never re-renders for the cursor or the scroll:
 * a layer subscribes to what it draws from.
 *
 * Slots:
 * - `overlay`: over the rows, scrolling with the chart; x = 0 is the time axis (`api.scale.x(year)`), the height is
 *   the rows'. Takes no pointer events.
 * - `under`: the same, behind the marks.
 * - `ruler`: beside the ruler and Ages strip (the core draws nothing here; children positioned `fixed` sit over them).
 * - `header`: the band above the chart, under the overview strip (a flex child of the chart's column).
 */
export type LayerSlot = 'overlay' | 'under' | 'ruler' | 'header';
export const LAYER_SLOTS: LayerSlot[] = ['overlay', 'under', 'ruler', 'header'];

/** A row on screen, as the cursor's readout names it. */
export type LayerRow = MeanwhileLane;

export interface LayerApi {
  /** The time axis: `x(year)` in chart pixels (x = 0 is the axis start), `year(x)`, the zoom step in years, the width. */
  scale: {
    x(year: number): number;
    year(x: number): number;
    readonly step: number;
    readonly width: number;
    /** The first and last years on the axis. */
    readonly domain: [number, number];
    /** The shortened gaps, in chart pixels. */
    gaps(): { x0: number; x1: number }[];
  };
  /** The exact horizontal view (content px), outside React: called at most once per task on scroll. `scrollTo` moves the chart. */
  viewport: { get(): View; subscribe(fn: () => void): () => void; scrollTo(left: number, smooth?: boolean): void };
  /** The row labels' width: the time axis starts this far into the chart (`viewport.get().width` includes it). */
  readonly labelWidth: number;
  /** The rows on screen now (folded and thin rows excepted), top to bottom. */
  rows: { inView(): LayerRow[] };
  /** What the chart shows, read-only: events (re-plotted under the dating systems), lifespans, phases, ages, reign lanes. */
  timeline: {
    readonly events: ResolvedEvent[];
    readonly spans: Map<string, ResolvedSpan[]>;
    readonly phases: Map<string, ResolvedPhase[]>;
    readonly ages: PlacedAge[];
    readonly reignLane: ReadonlySet<string>;
    /** The reigns that ruled: a cursor's "reign in force" answers only from these (consorts and de facto leaders sit in the reign lane too). */
    readonly ruledReigns: ReadonlySet<string>;
  };
  /**
   * The year cursor (a core store): the year under the pointer or placed with the keyboard, with the chart's geometry.
   * `set(year, true)` places it in keyboard mode (the core remembers where focus was); `set(null)` puts it away (and
   * returns focus after keyboard mode).
   */
  cursor: { get(): Cursor | null; set(year: number | null, keyboard?: boolean): void; subscribe(fn: () => void): () => void };
  /** Registers a command `<plugin id>.<name>` with a default key in a scope; the core owns the bindings. Returns `off()`. */
  command(id: string, label: string, run: (ctx: CommandContext) => void, o: { key?: string; scope: CommandScope }): () => void;
  /** Hands an element's keydowns to the commands of a scope (the core prevents the default for a key it ran). Returns `off()`. */
  keys(el: HTMLElement, scope: CommandScope): () => void;
  /** Formats a year in the timeline's calendar. */
  formatYear(year: number): string;
  /** Called after the chart drew new data, dating, zoom or rows (not on scroll or cursor moves). Returns `off()`. */
  onChange(fn: () => void): () => void;
}

export interface LayerPlugin {
  id: string;
  name: string;
  apiVersion: number;
  layer: {
    slots: LayerSlot[];
    mount(els: Partial<Record<LayerSlot, HTMLElement>>, api: LayerApi): () => void;
  };
}
