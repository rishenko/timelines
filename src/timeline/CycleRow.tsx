import type { Calendar, Track, TrackCycle } from '../types.ts';
import type { Scale } from './scale.ts';
import { formatYear } from '../lib/calendar.ts';
import { cycleDrawings, periodText, type CycleDrawing } from '../lib/cycles.ts';

/** Room a tick's number needs beside it, px: closer ticks go unnumbered. */
const NUMBER_PX = 44;

/** What the row says about its cycle, read by screen readers and shown on hover. */
export function cycleSummary(track: Track, c: TrackCycle, cal: Calendar): string {
  const name = c.label ?? track.name;
  const from = `${formatYear(c.anchor, cal)}${c.anchorNumber !== undefined ? ` (${name} ${c.anchorNumber})` : ''}`;
  const range = c.periodClaims?.find((p) => p.min !== undefined || p.max !== undefined);
  const est = range ? `; estimates run ${periodText(range.min ?? range.years).replace(/^about /, '')} to ${periodText(range.max ?? range.years).replace(/^about /, '')}` : '';
  return `${name}: repeats every ${periodText(c.period)}${est}, counted from ${from}`;
}

/**
 * A cycle row's repeats (Track.cycle, draft v11): a tick where each repeat starts, across the part of the chart near
 * the viewport (x0..x1, content px) and within the row's lifespan when it has one (`within`), numbered when there is
 * room and the cycle numbers its repeats. Too dense to draw (more than CYCLE_MAX_TICKS, or closer than
 * CYCLE_MIN_TICK_PX), it is one hatched band saying how many repeats it stands for. Display only: the row's name and
 * this summary are what assistive technology reads.
 */
export function CycleRow({
  track,
  scale,
  cal,
  labelW,
  x0,
  x1,
  within,
}: {
  track: Track;
  scale: Scale;
  cal: Calendar;
  labelW: number;
  x0: number;
  x1: number;
  /** The row's lifespan as [from, to] years: repeats are drawn only within it. */
  within?: [number, number][];
}) {
  const c = track.cycle;
  if (!c) return null;
  const summary = cycleSummary(track, c, cal);
  const drawings = cycleDrawings(c, scale, x0, x1, within);
  if (!drawings.length) return <span className="tl-cycle-none" role="img" aria-label={`${summary}. No repeat starts in the years in view.`} />;
  return (
    <>
      {drawings.map((d, i) => (
        <CycleDrawn key={i} track={track} c={c} d={d} summary={summary} cal={cal} labelW={labelW} />
      ))}
    </>
  );
}

function CycleDrawn({ track, c, d, summary, cal, labelW }: { track: Track; c: TrackCycle; d: CycleDrawing; summary: string; cal: Calendar; labelW: number }) {
  if (d.kind === 'density')
    return (
      <div
        className="tl-cycle-density"
        role="img"
        aria-label={`${summary}. About ${d.count.toLocaleString('en-US')} repeats in view, too close together to draw one by one.`}
        title={`${summary}\n≈ ${d.count.toLocaleString('en-US')} repeats here: zoom in to see them one by one`}
        style={{ left: labelW + d.x0, width: d.x1 - d.x0, '--track-color': track.color } as React.CSSProperties}
      />
    );
  const name = c.label ?? track.name;
  const spacing = d.ticks.length > 1 ? d.ticks[1].x - d.ticks[0].x : Infinity;
  const numbered = c.anchorNumber !== undefined && spacing >= NUMBER_PX;
  return (
    <div className="tl-cycle" role="img" aria-label={`${summary}. ${d.ticks.length} repeats start in view.`} style={{ '--track-color': track.color } as React.CSSProperties}>
      {d.ticks.map((t) => {
        const num = c.anchorNumber !== undefined ? ` ${c.anchorNumber + t.n}` : '';
        return (
          <span key={t.n} className="tl-cycle-tick" style={{ left: labelW + t.x }} title={`${name}${num} starts ${formatYear(Math.round(t.year), cal)}`} aria-hidden="true">
            {numbered && <span className="tl-cycle-num">{c.anchorNumber! + t.n}</span>}
          </span>
        );
      })}
    </div>
  );
}
