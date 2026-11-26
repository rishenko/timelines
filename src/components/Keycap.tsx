import { keyLabel, keySpoken } from '../lib/keycap.ts';

/** A key as a keycap (lib/keycap.ts): `k` as a binding ("shift+ArrowLeft"); screen readers hear "Shift plus Arrow Left". */
export function Keycap({ k }: { k: string }) {
  return (
    <kbd className="keycap">
      <span aria-hidden="true">{keyLabel(k)}</span>
      <span className="sr-only">{keySpoken(k)}</span>
    </kbd>
  );
}
