import type { KeyEventLike, ListedCommand } from '../commands/registry.ts';
import type { LayerApi } from './layer.ts';

/**
 * Tools (plugin design §3): a plugin with a panel of its own, opened from a toolbar button with its name. It is
 * mounted with an element when the panel opens; `mount` returns its cleanup. Like a layer it draws plain DOM and talks
 * to the app only through `api`.
 *
 * A tool works without a chart (table view): `commands` is always there, and `chart()` is the chart's layer api while
 * one is mounted, else null. `onChart` hears null before each new api (a timeline switch), so a tool drops its
 * subscriptions to the old one there.
 *
 * A tool never runs a command itself. It can hand an element's keydowns to the chart's commands (`commands.keys`), as
 * the Keys tool does, so a reader can try a key from its panel.
 */
export interface ToolApi {
  commands: {
    /** Every command registered now, with its key and default key. */
    list(): ListedCommand[];
    /** Binds a key (null unbinds); returns why it was refused, or null. The core refuses Escape, Tab and conflicts. */
    bind(id: string, key: string | null): string | null;
    /** Back to the default key: one command, or all. */
    reset(id?: string): void;
    /** A key event written as a binding ("ctrl+k", "y", "shift+ArrowLeft"). */
    keyOf(ev: KeyEventLike): string;
    /**
     * Hands an element's keydowns to the chart's commands while a chart is showing, with the year at the view's centre
     * (where Y puts the cursor); a key the element already handled (default prevented) is left alone. Returns `off()`.
     */
    keys(el: HTMLElement): () => void;
    /** Notices about keys left unbound by a conflict. */
    notices(): string[];
    subscribe(fn: () => void): () => void;
  };
  chart(): LayerApi | null;
  onChart(fn: (api: LayerApi | null) => void): () => void;
}

export interface ToolPlugin {
  id: string;
  /** The toolbar button's label, and the panel's heading. */
  name: string;
  apiVersion: number;
  tool: { mount(el: HTMLElement, api: ToolApi): () => void };
}
