import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { createCommandRegistry, type CommandRegistry } from './registry.ts';

/** The app's one command registry (Boot provides it, so the keys help and the chart share it). */
export const CommandsContext = createContext<CommandRegistry | null>(null);

/** The registry from the app, or one of this component's own (a chart rendered on its own, as in tests). */
export function useCommands(): CommandRegistry {
  const shared = useContext(CommandsContext);
  const [own] = useState(createCommandRegistry);
  return shared ?? own;
}

/** The key bound to a command as the reader has it, kept current (null when unbound or not registered). */
export function useKeyFor(id: string): string | null {
  const commands = useCommands();
  return useSyncExternalStore(commands.subscribe, () => commands.keyFor(id));
}
