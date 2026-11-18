import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { TourStep } from '../lib/tour.ts';

/**
 * A short guided tour for first-time readers: a card that walks through the parts of the page, each step pointing
 * at the thing it describes (outlined, with the rest of the page dimmed). It opens by itself on a reader's first
 * visit (see state/panels.ts) and from the Legend's "Take the tour" button.
 */

/** The first element matching the selector that is on screen (falls back to the first match). */
function findTarget(selector: string): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>(selector)];
  const onScreen = all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  });
  return onScreen ?? all[0] ?? null;
}

const CARD_W = 340;
const PAD = 6;

export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const next = useCallback(() => (last ? onClose() : setI((n) => n + 1)), [last, onClose]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  // find and measure the step's target; toolbar items may sit off screen on a phone (the toolbar scrolls sideways)
  const measure = useCallback(() => {
    const el = step.target ? findTarget(step.target) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);
  useLayoutEffect(() => {
    const el = step.target ? findTarget(step.target) : null;
    if (el?.closest('.toolbar')) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // measuring the page after it renders is what a layout effect is for; the rect can't be derived during render
    // oxlint-disable-next-line react/set-state-in-effect
    measure();
  }, [step, measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, onClose]);

  // the card goes below its target, or above when there's no room; centered without a target. Phones: see CSS.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardStyle: React.CSSProperties = { left: Math.max(8, (vw - CARD_W) / 2), top: Math.max(8, vh * 0.25) };
  if (rect) {
    const left = Math.min(Math.max(8, rect.left), vw - CARD_W - 8);
    cardStyle = rect.bottom + 230 < vh ? { left, top: rect.bottom + PAD + 10 } : { left, bottom: vh - rect.top + PAD + 10 };
  }

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="tour-spot"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD }}
        />
      ) : (
        <div className="tour-dim" />
      )}
      <div className={`tour-card${rect ? '' : ' centered'}`} style={cardStyle}>
        <div className="tour-count muted small">
          {i + 1} of {steps.length}
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="tour-actions">
          <button className="linklike" onClick={onClose}>
            {last ? 'Close' : 'Skip the tour'}
          </button>
          <span className="spacer" />
          {i > 0 && <button onClick={back}>Back</button>}
          <button className="primary" onClick={next} autoFocus>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
