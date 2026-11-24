/**
 * A form's result laid over the item it edited, so a field the form doesn't manage survives the save (a field a newer
 * version of the format adds, for instance: core 1.0's reader rule 2, docs/data-format.md "Versions"). Fields the form
 * does manage come only from the form, so clearing one in the form removes it.
 */
export function keepUnmanaged<T extends object>(built: T, initial: T | null | undefined, managed: readonly string[]): T {
  if (!initial) return built;
  const kept = Object.fromEntries(Object.entries(initial).filter(([k]) => !managed.includes(k)));
  return { ...kept, ...built } as T;
}
