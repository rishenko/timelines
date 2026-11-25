import { Fragment, type ReactNode } from 'react';
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

/** Text with its keys as keycaps: each `[[binding]]` ("Use [[ArrowLeft]] and [[ArrowRight]]") becomes a Keycap. */
export function withKeycaps(text: string): ReactNode {
  const parts = text.split(/\[\[([^\]]+)\]\]/);
  return parts.length === 1 ? text : parts.map((p, i) => (i % 2 ? <Keycap key={i} k={p} /> : <Fragment key={i}>{p}</Fragment>));
}
