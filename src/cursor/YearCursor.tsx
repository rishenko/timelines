/**
 * The year cursor: a vertical line at one year across the chart (lanes, ruler and Ages strip), its year in a chip at
 * the top, and a band above the chart saying what was going on then in the rows on screen (meanwhile.ts). Nothing is
 * drawn over the chart's marks, and the band keeps its height while the pointer is off the chart, so nothing jumps.
 * Keyboard: Y on the chart places the cursor (at the focused event's year, else the view's centre) and focuses its
 * chip; ←/→ step one zoom step, Shift+←/→ a tenth of one; Escape puts it away and returns focus.
 */
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { rowNote, type Meanwhile } from './meanwhile.ts';
import './cursor.css';

/** The line through the rows, inside the lanes layer (so it scrolls with the chart and spans every row). */
export function CursorLine({ x, height }: { x: number; height: number }) {
  return <div className="tl-cursor-line" style={{ left: x, height }} aria-hidden="true" />;
}

interface ChipProps {
  label: string;
  /** The line's x in the viewport; the chart's top; the sticky header's height (ruler and Ages strip). */
  x: number;
  top: number;
  headH: number;
  keyboard: boolean;
  onStep: (dir: 1 | -1, fine: boolean) => void;
  onClose: () => void;
}

/**
 * The line's top part, through the ruler and the Ages strip (over their bars, never taking their clicks), and the year
 * chip on it. In keyboard mode the chip holds focus and takes the arrows.
 */
export function CursorHead({ label, x, top, headH, keyboard, onStep, onClose }: ChipProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (keyboard) ref.current?.focus();
  }, [keyboard]);
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      onStep(ev.key === 'ArrowRight' ? 1 : -1, ev.shiftKey);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      onClose();
    }
  };
  return (
    <>
      <div className="tl-cursor-head" style={{ left: x, top, height: headH }} aria-hidden="true" />
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={ref}
        className="tl-cursor-chip"
        style={{ left: x, top: top + 2 }}
        tabIndex={keyboard ? 0 : -1}
        role={keyboard ? 'slider' : undefined}
        aria-label={keyboard ? 'Year cursor' : undefined}
        aria-valuetext={keyboard ? label : undefined}
        aria-hidden={keyboard ? undefined : true}
        onKeyDown={onKey}
      >
        {label}
      </div>
    </>
  );
}

/** The readout band above the chart: always there, so the chart doesn't jump as the pointer comes and goes. */
export function CursorBand({ m, label }: { m: Meanwhile | null; label: string | null }) {
  return (
    <div className="tl-cursor-band" aria-live="polite" aria-atomic="true">
      {m && label ? (
        <>
          <span className="cur-year">{label}</span>
          {m.ages.length > 0 && <span className="cur-ages">{m.ages.join(' · ')}</span>}
          {m.rows.map((r) => (
            <span key={r.id} className="cur-row" style={{ '--track-color': r.color } as CSSProperties}>
              <b>{r.name}</b> {rowNote(r)}
            </span>
          ))}
          {!m.rows.length && <span className="cur-none">Nothing on screen spans this year</span>}
        </>
      ) : (
        <span className="cur-none">Point at the chart (or press Y on it) to see what was going on in a year.</span>
      )}
    </div>
  );
}
