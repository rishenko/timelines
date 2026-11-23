import { useEffect, useRef } from 'react';
import type { Citation } from '../lib/cite.ts';
import { CiteBox } from './CiteBox.tsx';

/** "Cite this timeline": a modal dialog with the citation (Escape or Close returns focus to where it was opened). */
export function CiteDialog({ title, cite, onClose }: { title: string; cite: Citation; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);
  return (
    <dialog ref={ref} className="cite-dialog" aria-labelledby="cite-dialog-title" onClose={onClose}>
      <h2 id="cite-dialog-title">Cite “{title}”</h2>
      <CiteBox cite={cite} />
      <form method="dialog">
        <button>Close</button>
      </form>
    </dialog>
  );
}
