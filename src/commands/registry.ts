/**
 * The command registry (plugin design, step 2): every keyboard action is a command with an id (`<owner>.<name>`), a
 * label, a default key and a scope (the part of the page whose keys it takes: the chart, the cursor's chip). The core
 * owns the bindings: a key another command already holds in the same scope is left unbound (with a notice), the
 * reader's own bindings win over the defaults, and every command is listed (the keys help, later the bindings tool).
 * Escape and Tab can't be rebound or bound by a reader: focus and exit must always work (WCAG 2.1.1, 2.1.2).
 */

export type CommandScope = 'chart' | 'cursor';

/** What the scope's key handler knows when a command runs: in the chart, the focused event's year or the view's centre. */
export interface CommandContext {
  year?: number;
}

export interface Command {
  id: string;
  label: string;
  scope: CommandScope;
  /** The default key, as `keyOf` writes it: "y", "ArrowLeft", "shift+ArrowLeft". */
  key?: string;
  run: (ctx: CommandContext) => void;
}

export interface ListedCommand {
  id: string;
  owner: string;
  label: string;
  scope: CommandScope;
  /** The key it answers to now, or null when unbound (a conflict, or the reader unbound it). */
  key: string | null;
}

export interface CommandRegistry {
  /**
   * Adds a command; returns `off()`. A key already held in the scope leaves this one unbound, with a notice. The same id
   * again (a second chart's layer) stands in for the first until its `off()`: the newest chart takes the keys.
   */
  register(c: Command): () => void;
  /** Runs the command bound to the event's key in the scope; true if one ran (the caller prevents the default). */
  dispatch(ev: KeyEventLike, scope: CommandScope, ctx?: CommandContext): boolean;
  list(): ListedCommand[];
  /** The key a command answers to now, or null. */
  keyFor(id: string): string | null;
  /** The reader's bindings (id → key, or null to unbind); refused for Escape and Tab. Returns the problems, if any. */
  setBindings(b: Record<string, string | null>): string[];
  /** Notices about keys left unbound. */
  notices(): string[];
  subscribe(fn: () => void): () => void;
}

export type KeyEventLike = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>;

/** Keys a command can't take or give up: focus and exit must always work. */
const FIXED = new Set(['Escape', 'Tab']);

/**
 * A key event as a binding: a printed character in lower case (Shift is already in the character: "?" or "Y" is the
 * same binding as "y"), other keys by name with their modifiers ("shift+ArrowLeft", "ctrl+k").
 */
export function keyOf(ev: KeyEventLike): string {
  const printed = ev.key.length === 1;
  const mods = [ev.ctrlKey && 'ctrl', ev.altKey && 'alt', ev.metaKey && 'meta', ev.shiftKey && !printed && 'shift'].filter(Boolean);
  return [...mods, printed ? ev.key.toLowerCase() : ev.key].join('+');
}

const ID = /^[a-z0-9-]+\.[a-z0-9-]+$/;

export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>();
  /** Earlier registrations of an id, newest last: the newest is in `commands`. */
  const shadowed = new Map<string, Command[]>();
  let bindings: Record<string, string | null> = {};
  const subs = new Set<() => void>();
  const notify = () => {
    for (const fn of [...subs]) fn();
  };
  // who holds each key, per scope: the reader's bindings first, then defaults in the order they were registered
  let bound = new Map<string, string>();
  let notes: string[] = [];
  const rebind = () => {
    bound = new Map();
    notes = [];
    const want = (c: Command) => (Object.hasOwn(bindings, c.id) ? bindings[c.id] : c.key) ?? null;
    const order = [...commands.values()].sort((a, b) => Number(Object.hasOwn(bindings, b.id)) - Number(Object.hasOwn(bindings, a.id)));
    for (const c of order) {
      const k = want(c);
      if (!k) continue;
      const slot = `${c.scope} ${k}`;
      const holder = bound.get(slot);
      if (holder) notes.push(`"${c.label}" (${c.id}) has no key: ${k} is taken by ${holder}.`);
      else bound.set(slot, c.id);
    }
  };
  const keyFor = (id: string) => {
    const c = commands.get(id);
    if (!c) return null;
    for (const [slot, holder] of bound) if (holder === id) return slot.slice(c.scope.length + 1);
    return null;
  };
  return {
    register(c) {
      if (!ID.test(c.id)) throw new Error(`Command id "${c.id}" must be <owner>.<name> (lower case, digits and dashes).`);
      const prev = commands.get(c.id);
      if (prev) shadowed.set(c.id, [...(shadowed.get(c.id) ?? []), prev]);
      commands.set(c.id, c);
      rebind();
      notify();
      return () => {
        const under = shadowed.get(c.id) ?? [];
        if (commands.get(c.id) === c) {
          const back = under.pop();
          if (back) commands.set(c.id, back);
          else commands.delete(c.id);
        } else under.splice(under.indexOf(c) >>> 0, 1);
        if (!under.length) shadowed.delete(c.id);
        rebind();
        notify();
      };
    },
    dispatch(ev, scope, ctx = {}) {
      const id = bound.get(`${scope} ${keyOf(ev)}`);
      const c = id ? commands.get(id) : undefined;
      if (!c) return false;
      c.run(ctx);
      return true;
    },
    list: () => [...commands.values()].map((c) => ({ id: c.id, owner: c.id.split('.')[0], label: c.label, scope: c.scope, key: keyFor(c.id) })),
    keyFor,
    setBindings(b) {
      const problems: string[] = [];
      const next: Record<string, string | null> = {};
      for (const [id, k] of Object.entries(b)) {
        const def = commands.get(id)?.key;
        if (k && FIXED.has(k.split('+').pop()!)) problems.push(`${k} can't be given to ${id}: it always moves focus or exits.`);
        else if (def && FIXED.has(def) && k !== def) problems.push(`${id} keeps ${def}: it always moves focus or exits.`);
        else next[id] = k;
      }
      bindings = next;
      rebind();
      notify();
      return problems;
    },
    notices: () => notes,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
