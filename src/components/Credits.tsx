import { useState } from 'react';
import { safeUrl } from '../lib/urls.ts';

/**
 * The timeline's credits note at the foot of the page (meta.credits, meta.creditsImage). On phones the note is
 * clamped to two lines (see .legal in CSS): a tap anywhere on it opens it, and so does its More button (shown only
 * on narrow screens), which keyboard and screen-reader users reach.
 */
export function Credits({ text, image }: { text?: string; image?: string }) {
  const [open, setOpen] = useState(false);
  if (!text && !image) return null;
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <footer className={`legal${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} title={open ? undefined : 'Tap to read the full note'}>
      {safeUrl(image) && <img src={safeUrl(image)} alt="" />}
      {text && <p id="credits-note">{text}</p>}
      <button
        className="legal-toggle linklike"
        aria-expanded={open}
        aria-controls="credits-note"
        onClick={(ev) => {
          ev.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {open ? 'Less' : 'More'}
      </button>
    </footer>
  );
}
