import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { TourStep } from '../lib/tour.ts';

/**
 * A short guided tour for first-time readers: a card that walks through the parts of the page, each step pointing
 * at the thing it describes (outlined, with the rest of the page dimmed). It opens by itself on a reader's first
 * visit (see state/panels.ts) and from the Legend's "Take the tour" button.
 */

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The part of an element a reader can see: inside the screen and, for chart content, inside the chart's scroll area
 * and clear of the sticky row labels and ruler, which cover content scrolled under them. Null unless it shows whole
 * (near enough), or, when `partly`, a good stretch of it (a long band reaching past the view).
 */
function visibleBox(el: HTMLElement, partly = false): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  const b: Box = { left: Math.max(r.left, 0), top: Math.max(r.top, 0), right: Math.min(r.right, window.innerWidth), bottom: Math.min(r.bottom, window.innerHeight) };
  if (el.closest('.tl-lanes')) {
    const clip = (c: Box) => {
      b.left = Math.max(b.left, c.left);
      b.top = Math.max(b.top, c.top);
      b.right = Math.min(b.right, c.right);
      b.bottom = Math.min(b.bottom, c.bottom);
    };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(auto|scroll)/.test(o.overflowX + o.overflowY)) {
        clip(p.getBoundingClientRect());
        break;
      }
    }
    // the labels themselves are what covers the rest, so they aren't clipped by it
    const label = el.closest('.tl-lane-label, .thin-label') ? null : document.querySelector('.tl-lane-label, .thin-label');
    if (label) b.left = Math.max(b.left, label.getBoundingClientRect().right);
    const ruler = document.querySelector('.tl-ruler');
    if (ruler) b.top = Math.max(b.top, ruler.getBoundingClientRect().bottom);
  }
  const w = b.right - b.left;
  const h = b.bottom - b.top;
  return w >= (partly ? Math.min(r.width - 1, 40) : r.width - 1) && h >= Math.min(r.height - 1, 10) ? b : null;
}

/**
 * The step's target and the part of it to outline: the first match a reader can see (the widest, for steps that ask),
 * else a toolbar item off screen (the toolbar scrolls sideways on a phone; it is scrolled into view), else none.
 */
function findTarget(step: TourStep): { el: HTMLElement; box: Box | null } | null {
  if (!step.target) return null;
  const all = [...document.querySelectorAll<HTMLElement>(step.target)];
  let best: { el: HTMLElement; box: Box | null } | null = null;
  for (const el of all) {
    const box = visibleBox(el, step.widest);
    if (!box) continue;
    if (!step.widest) return { el, box };
    if (!best?.box || box.right - box.left > best.box.right - best.box.left) best = { el, box };
  }
  if (best) return best;
  const offScreen = all.find((el) => el.closest('.toolbar'));
  return offScreen ? { el: offScreen, box: null } : null;
}

const CARD_W = 340;
const PAD = 6;

export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Box | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const next = useCallback(() => (last ? onClose() : setI((n) => n + 1)), [last, onClose]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  // find and measure the step's target; toolbar items may sit off screen on a phone (the toolbar scrolls sideways)
  const measure = useCallback(() => {
    const t = findTarget(step);
    setRect(t ? (t.box ?? visibleBox(t.el, true)) : null);
  }, [step]);
  useLayoutEffect(() => {
    const t = findTarget(step);
    if (t?.el.closest('.toolbar')) t.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // measuring the page after it renders is what a layout effect is for; the rect can't be derived during render
    // oxlint-disable-next-line react/set-state-in-effect
    measure();
  }, [step, measure]);
  useEffect(() => {
    // the outline follows its target when the page or the chart scrolls
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
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
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.right - rect.left + 2 * PAD, height: rect.bottom - rect.top + 2 * PAD }}
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
