import { Fragment, type ReactNode } from 'react';
import { Keycap } from './Keycap.tsx';

/** Text with its keys as keycaps: each `[[binding]]` ("Use [[ArrowLeft]] and [[ArrowRight]]") becomes a Keycap. */
export function withKeycaps(text: string): ReactNode {
  const parts = text.split(/\[\[([^\]]+)\]\]/);
  return parts.length === 1 ? text : parts.map((p, i) => (i % 2 ? <Keycap key={i} k={p} /> : <Fragment key={i}>{p}</Fragment>));
}
