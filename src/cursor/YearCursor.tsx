/**
 * The year cursor: a vertical line at one year across the chart (lanes, ruler and Ages strip), its year in a chip at
 * the top, and a band above the chart saying what was going on then in the rows on screen (meanwhile.ts). Nothing is
 * drawn over the chart's marks, and the band keeps its height while the pointer is off the chart, so nothing jumps.
 * Keyboard: Y on the chart places the cursor (at the focused event's year, else the view's centre) and focuses its
 * chip; ←/→ step one zoom step, Shift+←/→ a tenth of one; Escape puts it away and returns focus.
 */
import { useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useCursor, type Cursor, type CursorStore } from './cursorStore.ts';
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

/**
 * The readout band above the chart: always there, so the chart doesn't jump as the pointer comes and goes. It's a live
 * region only when the reader placed the cursor with the keyboard: under the pointer it changes every frame, and a
 * screen reader would read each change.
 */
export function CursorBand({ m, label, keyboard }: { m: Meanwhile | null; label: string | null; keyboard: boolean }) {
  return (
    <div className="tl-cursor-band" aria-live={keyboard ? 'polite' : 'off'} aria-atomic="true">
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

// ---- the layers: each reads the cursor store itself, so a pointer move re-renders only these, never the chart ----

/** The line through the rows (chart pixels: x = the label column + the year's x). */
export function CursorLineLayer({ store, x, labelW, height }: { store: CursorStore; x: (year: number) => number; labelW: number; height: number }) {
  const c = useCursor(store);
  return c ? <CursorLine x={labelW + x(c.year)} height={height} /> : null;
}

interface HeadLayerProps {
  store: CursorStore;
  x: (year: number) => number;
  labelW: number;
  /** The chart's horizontal scroll and width: the chip is drawn only while the line is on screen. */
  viewLeft: number;
  viewWidth: number;
  format: (year: number) => string;
  onStep: (dir: 1 | -1, fine: boolean) => void;
  onClose: () => void;
}

/** The head and chip, in viewport coordinates, while the line is on screen. */
export function CursorHeadLayer({ store, x, labelW, viewLeft, viewWidth, format, onStep, onClose }: HeadLayerProps) {
  const c = useCursor(store);
  if (!c) return null;
  const cx = c.left + labelW + x(c.year) - viewLeft;
  if (cx < c.left + labelW || cx > c.left + viewWidth) return null;
  return <CursorHead label={format(c.year)} x={cx} top={c.top} headH={c.headH} keyboard={c.keyboard} onStep={onStep} onClose={onClose} />;
}

/** The readout band: what was going on at the cursor's year in the rows on screen (`meanwhileAt` does the work). */
export function CursorBandLayer({ store, meanwhileAt, format }: { store: CursorStore; meanwhileAt: (c: Cursor) => Meanwhile; format: (year: number) => string }) {
  const c = useCursor(store);
  const m = useMemo(() => (c ? meanwhileAt(c) : null), [c, meanwhileAt]);
  return <CursorBand m={m} label={c ? format(c.year) : null} keyboard={!!c?.keyboard} />;
}
