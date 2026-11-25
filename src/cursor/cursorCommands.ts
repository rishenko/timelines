import type { CommandRegistry } from '../commands/registry.ts';

export interface CursorActions {
  /** Place the cursor at a year (keyboard mode: its chip takes focus). */
  place(year: number): void;
  /** One zoom step, or a tenth of one. */
  step(dir: 1 | -1, fine: boolean): void;
  /** Put it away and return focus. */
  close(): void;
}

/**
 * The year cursor's commands, the registry's first client: Y on the chart places it (at the focused event's year, else
 * the view's centre); on its chip ←/→ step one zoom step, Shift+←/→ a tenth of one, and Escape puts it away. `actions`
 * is read when a command runs, so it always sees the current zoom. Returns `off()`.
 */
export function registerCursorCommands(reg: CommandRegistry, actions: () => CursorActions): () => void {
  const offs = [
    reg.register({ id: 'cursor.place', label: 'Place the year cursor', scope: 'chart', key: 'y', run: (ctx) => ctx.year !== undefined && actions().place(ctx.year) }),
    reg.register({ id: 'cursor.step-back', label: 'Year cursor: a step earlier', scope: 'cursor', key: 'ArrowLeft', run: () => actions().step(-1, false) }),
    reg.register({ id: 'cursor.step-forward', label: 'Year cursor: a step later', scope: 'cursor', key: 'ArrowRight', run: () => actions().step(1, false) }),
    reg.register({ id: 'cursor.step-back-fine', label: 'Year cursor: a tenth of a step earlier', scope: 'cursor', key: 'shift+ArrowLeft', run: () => actions().step(-1, true) }),
    reg.register({ id: 'cursor.step-forward-fine', label: 'Year cursor: a tenth of a step later', scope: 'cursor', key: 'shift+ArrowRight', run: () => actions().step(1, true) }),
    reg.register({ id: 'cursor.close', label: 'Put the year cursor away', scope: 'cursor', key: 'Escape', run: () => actions().close() }),
  ];
  return () => offs.forEach((off) => off());
}
