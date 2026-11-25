import type { RefObject } from 'react';
import type { useChartModel } from './useChartModel.ts';

type Scale = ReturnType<typeof useChartModel>['scale'];

/**
 * What the chart draws besides its rows (split step 4c, out of TimelineView): the busy ring, pinned to the chart's
 * top-right corner however far it is scrolled, and the layers behind the marks: grid lines, gap breaks and the era line.
 */
export function BusyRing({ stripRef, width, rowsPending, busy, cornerOnScreen }: {
  stripRef: RefObject<HTMLDivElement | null>;
  width: number;
  rowsPending: boolean;
  busy?: boolean;
  cornerOnScreen: boolean;
}) {
  return (
    <div className="tl-busy-strip" ref={stripRef} style={{ width }} aria-hidden="true">
      {(rowsPending || busy) && (
        <span className={`tl-busy${rowsPending ? ' rows' : ''}${cornerOnScreen ? '' : ' floating'}`} title={rowsPending ? 'Updating the rows for these years' : 'Updating'}>
          <span className="ring" />
        </span>
      )}
    </div>
  );
}

/** ticks and gaps: those in view; the era line shows when its tick does. */
export function GridLayers({ labelW, scale, ticks, gaps, era }: { labelW: number; scale: Scale; ticks: number[]; gaps: { y0: number; x0: number; x1: number }[]; era: number }) {
  return (
    <>
      <div className="tl-grid" style={{ left: labelW }}>
        {ticks.map((t) => (
          <div key={t} className="tl-gridline" style={{ left: scale.x(t) }} />
        ))}
      </div>
      {/* gap breaks have their own layer, over the rows' backgrounds and spans (which cover the grid), under the
          marks, so every row shows them */}
      <div className="tl-gaps" style={{ left: labelW }}>
        {gaps.map((g) => (
          <div key={g.y0} className="tl-gap-band" style={{ left: g.x0, width: g.x1 - g.x0 }} />
        ))}
      </div>
      {/* the era line has its own layer, over the rows' backgrounds and spans (which cover the grid), under the marks */}
      {ticks.includes(era) && <div className="tl-era-line" style={{ left: labelW + scale.x(era) }} />}
    </>
  );
}
