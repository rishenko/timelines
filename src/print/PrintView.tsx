/**
 * Print and Export: a static layout of the current view, drawn as SVG so it prints and saves sharp.
 *   - Print: the browser's own print (⌘P / Ctrl+P); there's no Print button. App mounts <PrintPages> in a print-only
 *     layer on `beforeprint` (print.css hides the app). It prints the view: the years on screen and the rows on screen,
 *     on one landscape page that the browser fits to the paper (A4 or Letter, no settings).
 *   - Export (toolbar): the same view as one image, saved as PNG or SVG (export.ts).
 * The filters, the comparison set and folded rows apply as on screen (a folded row carries its sub-rows' events).
 */
import { useMemo } from 'react';
import type { Dataset, Track } from '../types.ts';
import type { ResolvedEvent, ResolvedPhase, ResolvedSpan } from '../lib/chronology.ts';
import { eraStart, formatYear } from '../lib/calendar.ts';
import { printTicks, tickStep } from './ticks.ts';

interface Props {
  data: Dataset;
  events: ResolvedEvent[];
  spans: Map<string, ResolvedSpan[]>;
  phases: Map<string, ResolvedPhase[]>;
  visibleTracks: Record<string, boolean>;
  sourceNote?: string;
  /** The years in view (astronomical), first and last. */
  from: number;
  to: number;
  /** Rows folded on screen: printed folded too, their sub-rows' events on them, as the chart draws them. */
  collapsed?: Record<string, boolean>;
  /** The rows on screen (lane ids): only these are drawn. Absent: every row the filters leave. */
  rows?: ReadonlySet<string>;
  /** An image for Export (1600 px wide) instead of a page. */
  figure?: boolean;
}

/** The page is laid out at A4 landscape's width; print.css scales it to the paper (and down to fit its height). */
const SHEET = { w: 297, h: 210 };
const PX_PER_MM = 96 / 25.4;
const MARGIN_MM = 8;
const LABEL_W = 170;
const HEADER_H = 38;
const FOOTER_H = 58;
const RULER_H = 22;
const LANE_H = 13;
const STRIP_H = 11;
const ROW_PAD = 4;
const MAX_LANES = 5;
const CHAR_W = 5.1; // 9 px sans, average

/** The page's own styles, inside each SVG, so a saved image (figure mode) looks the same outside the app. */
const SVG_STYLE = `text { font-family: Inter, system-ui, sans-serif; } .p-title { font-size: 15px; font-weight: 700; fill: #111; } .p-sub { font-size: 10px; fill: #444; } .p-tick { font-size: 9px; fill: #333; } .p-grid { stroke: #ddd; stroke-width: 0.6; } .p-zero { stroke: #b33; stroke-width: 0.8; } .p-rule { stroke: #666; stroke-width: 0.8; } .p-rowline { stroke: #ccc; stroke-width: 0.5; } .p-row { font-size: 10px; font-weight: 600; fill: #111; } .p-row.sub { font-weight: 500; } .p-row.head { font-size: 10.5px; font-weight: 700; fill: #000; text-transform: uppercase; letter-spacing: 0.4px; } .p-phase { font-size: 7px; font-weight: 600; letter-spacing: 0.3px; fill: #222; } .p-ev { font-size: 9px; fill: #222; } .p-ev.key { font-weight: 700; fill: #000; } .p-more { font-size: 8px; fill: #666; } .p-legend { font-size: 9px; fill: #333; } .p-legend.key { font-weight: 700; fill: #000; } .p-source { font-size: 8px; fill: #555; }`;


interface Item {
  e: ResolvedEvent;
  x0: number;
  x1: number;
  span: boolean;
  lane: number;
  labelRoom: number;
}
interface RowLayout {
  track: Track;
  depth: number;
  height: number;
  spans: ResolvedSpan[];
  phases: ResolvedPhase[];
  items: Item[];
  folded: number;
}

/** Rows in display order with their depth (only rows switched on, and their visible ancestors). */
function ordered(tracks: Track[], on: Record<string, boolean>, collapsed: Record<string, boolean> = {}): { t: Track; depth: number }[] {
  const kids = new Map<string | undefined, Track[]>();
  const ids = new Set(tracks.map((t) => t.id));
  for (const t of tracks) {
    const p = t.parent && ids.has(t.parent) ? t.parent : undefined;
    kids.set(p, [...(kids.get(p) ?? []), t]);
  }
  const out: { t: Track; depth: number }[] = [];
  const walk = (p: string | undefined, depth: number) => {
    for (const t of kids.get(p) ?? []) {
      if (on[t.id] !== false) out.push({ t, depth });
      if (!collapsed[t.id] || on[t.id] === false) walk(t.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

function layoutRows(p: Props, from: number, to: number, x: (y: number) => number, plotW: number, minImp: number, eventsOnly: boolean): RowLayout[] {
  // a folded row draws its sub-rows' events: each row's events go to its outermost folded ancestor
  const parentOfId = new Map(p.data.tracks.map((t) => [t.id, t.parent]));
  const owner = (id: string) => {
    let o = id;
    for (let a = parentOfId.get(id); a; a = parentOfId.get(a)) if (p.collapsed?.[a] && p.visibleTracks[a] !== false) o = a;
    return o;
  };
  const byTrack = new Map<string, ResolvedEvent[]>();
  for (const e of p.events) {
    if ((e.importance ?? 2) > minImp) continue;
    const end = e.end ?? e.start;
    if (end < from || e.start > to) continue;
    // on every row it names, as the chart draws it (once per row, even when two of its rows fold into one)
    for (const t of new Set(e.tracks.map(owner))) byTrack.set(t, [...(byTrack.get(t) ?? []), e]);
  }
  const rows: RowLayout[] = [];
  const all = ordered(p.data.tracks, p.visibleTracks, p.collapsed).filter(({ t }) => !p.rows || p.rows.has(t.id));
  const parentOf = new Map(p.data.tracks.map((t) => [t.id, t.parent]));
  for (const { t, depth } of all) {
    const spans = (p.spans.get(t.id) ?? []).filter((s) => s.end >= from && s.start <= to);
    const phases = (p.phases.get(t.id) ?? []).filter((s) => s.end >= from && s.start <= to);
    const evs = (byTrack.get(t.id) ?? []).sort((a, b) => a.start - b.start || (a.importance ?? 2) - (b.importance ?? 2));
    if ((!spans.length && !phases.length && !evs.length) || (eventsOnly && !evs.length)) {
      // a row on screen prints even with nothing in the years (as on screen); otherwise it's kept only as a heading
      rows.push({ track: t, depth, spans: [], phases: [], items: [], folded: 0, height: p.rows ? 15 : 0 });
      continue;
    }
    // events into lanes: each lane remembers where its last label ends
    const laneEnd: number[] = [];
    const items: Item[] = [];
    let folded = 0;
    for (const e of evs) {
      const span = e.end !== undefined && e.end !== e.start;
      const x0 = Math.max(0, x(e.start));
      const x1 = span ? Math.min(plotW, x(e.end!)) : x0;
      const want = (span ? 2 : 12) + Math.min(e.title.length, 34) * CHAR_W;
      let lane = laneEnd.findIndex((end) => end + 6 <= x0);
      if (lane < 0 && laneEnd.length < MAX_LANES) lane = laneEnd.push(-Infinity) - 1;
      if (lane < 0) {
        folded++;
        continue;
      }
      const room = Math.max(x1 - x0, Math.min(want, plotW - x0));
      laneEnd[lane] = x0 + Math.max(room, x1 - x0);
      items.push({ e, x0, x1, span, lane, labelRoom: room });
    }
    // a label may only run up to the next item in its lane
    for (const it of items) {
      const next = items.filter((o) => o.lane === it.lane && o.x0 > it.x0).sort((a, b) => a.x0 - b.x0)[0];
      if (next) it.labelRoom = Math.min(it.labelRoom, next.x0 - it.x0 - 4);
    }
    const lanes = Math.max(1, laneEnd.length);
    rows.push({ track: t, depth, spans, phases, items, folded, height: (phases.length ? STRIP_H : 0) + lanes * LANE_H + ROW_PAD * 2 });
  }
  // keep empty rows only as headings of rows that are drawn (their ancestors), 15 px tall
  const needed = new Set<string>();
  for (const r of rows)
    if (r.height) for (let a = parentOf.get(r.track.id); a; a = parentOf.get(a)) needed.add(a);
  return rows.filter((r) => r.height || needed.has(r.track.id)).map((r) => (r.height ? r : { ...r, height: 15 }));
}

function cut(text: string, room: number): string {
  const n = Math.floor(room / CHAR_W);
  if (n >= text.length) return text;
  return n < 4 ? '' : `${text.slice(0, n - 1)}…`;
}

export function PrintPages(p: Props) {
  const meta = p.data.meta;
  const figure = !!p.figure;
  // rows on screen print as they are, with or without events in the years; otherwise only rows with events
  const eventsOnly = !p.rows && (meta.hideRowsOutOfView ?? p.data.tracks.length > 150);
  // every event the chart draws (crowded ones fold into "+N more", as on screen)
  const minImp: number = 3;
  const pageW = figure ? 1600 : (SHEET.w - 2 * MARGIN_MM) * PX_PER_MM;
  const sheetH = (SHEET.h - 2 * MARGIN_MM) * PX_PER_MM;
  const plotW = pageW - LABEL_W;

  // one page: the view's years, every row (print.css shrinks a tall page to the paper)
  const pages = useMemo(() => {
    const a = p.from;
    const b = p.to;
    const x = (y: number) => ((y - a) / (b - a)) * plotW;
    return [{ from: a, to: b, rows: layoutRows(p, a, b, x, plotW, minImp, eventsOnly) }];
  }, [p, plotW, minImp, eventsOnly]);

  const cal = meta.calendar;
  const yr = (y: number) => formatYear(y, cal);
  const link = window.location.href;
  const evLabel = (minImp === 1 ? 'key events only' : minImp === 2 ? 'key and notable events' : 'all events') + (eventsOnly ? ', rows with events' : '');

  return (
    <div className={figure ? 'print-figure' : 'print-pages'}>
      {pages.map((pg, i) => {
        const x = (y: number) => LABEL_W + ((y - pg.from) / (pg.to - pg.from)) * plotW;
        const step = tickStep(pg.to - pg.from);
        const ticks = printTicks(pg.from, pg.to, cal);
        let y = HEADER_H + RULER_H;
        const pageH = Math.max(figure ? 0 : sheetH, HEADER_H + RULER_H + pg.rows.reduce((n, r) => n + r.height, 0) + FOOTER_H);
        return (
          <section key={i} className="print-page">
            <svg xmlns="http://www.w3.org/2000/svg" width={pageW} height={pageH} viewBox={`0 0 ${pageW} ${pageH}`} preserveAspectRatio="xMinYMin meet" role="img" aria-label={`${meta.title}, ${yr(pg.from)} to ${yr(pg.to)}`}>
              <style>{SVG_STYLE}</style>
              <rect width={pageW} height={pageH} fill="#fff" />
              <text x={0} y={16} className="p-title">
                {meta.title}
              </text>
              <text x={0} y={31} className="p-sub">
                {yr(pg.from)} – {yr(pg.to)} · {step} yr per tick · {evLabel}
              </text>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={HEADER_H + RULER_H - 6} y2={pageH - FOOTER_H} className={t === eraStart(cal) ? 'p-zero' : 'p-grid'} />
                  <text x={x(t) + 2} y={HEADER_H + 12} className="p-tick">
                    {yr(t)}
                  </text>
                </g>
              ))}
              <line x1={0} x2={pageW} y1={HEADER_H + RULER_H - 6} y2={HEADER_H + RULER_H - 6} className="p-rule" />
              {pg.rows.map((r) => {
                const top = y;
                y += r.height;
                const c = r.track.color;
                const stripTop = top + ROW_PAD;
                const laneTop = stripTop + (r.phases.length ? STRIP_H : 0);
                return (
                  <g key={r.track.id}>
                    <rect x={0} y={top} width={4} height={r.height} fill={c} />
                    <text x={8 + r.depth * 10} y={top + r.height / 2 + 3} className={!r.spans.length && !r.items.length && !r.phases.length ? 'p-row head' : r.depth ? 'p-row sub' : 'p-row'}>
                      {cut(r.track.name, LABEL_W - 14 - r.depth * 10)}
                    </text>
                    {r.spans.map((s, k) => (
                      <rect key={k} x={x(Math.max(s.start, pg.from))} y={top} width={Math.max(1, x(Math.min(s.end, pg.to)) - x(Math.max(s.start, pg.from)))} height={r.height} fill={c} opacity={0.12} />
                    ))}
                    {r.phases.map((ph, k) => {
                      const x0 = x(Math.max(ph.start, pg.from));
                      const x1 = x(Math.min(ph.end, pg.to));
                      return (
                        <g key={`ph${k}`}>
                          <rect x={x0} y={stripTop} width={Math.max(1, x1 - x0)} height={STRIP_H - 2} fill={c} opacity={0.3} />
                          <line x1={x0} x2={x0} y1={stripTop} y2={stripTop + STRIP_H - 2} stroke={c} />
                          <text x={x0 + 2} y={stripTop + 7.5} className="p-phase">
                            {cut(ph.name.toUpperCase(), x1 - x0 - 4)}
                          </text>
                        </g>
                      );
                    })}
                    {r.items.map((it) => {
                      const ly = laneTop + it.lane * LANE_H;
                      const key = it.e.importance === 1;
                      return (
                        <g key={it.e.uuid}>
                          {it.span ? (
                            <rect x={LABEL_W + it.x0} y={ly + 1} width={Math.max(2, it.x1 - it.x0)} height={LANE_H - 3} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={0.8} rx={2} />
                          ) : (
                            <rect x={LABEL_W + it.x0 - 3.5} y={ly + 2.5} width={7} height={7} fill={c} stroke="#222" strokeWidth={0.5} transform={`rotate(45 ${LABEL_W + it.x0} ${ly + 6})`} />
                          )}
                          <text x={LABEL_W + it.x0 + (it.span ? 3 : 8)} y={ly + 9} className={key ? 'p-ev key' : 'p-ev'}>
                            {cut(it.e.title, it.labelRoom - (it.span ? 4 : 10))}
                          </text>
                        </g>
                      );
                    })}
                    {r.folded > 0 && (
                      <text x={pageW - 2} y={top + r.height - 3} textAnchor="end" className="p-more">
                        +{r.folded} more
                      </text>
                    )}
                    <line x1={0} x2={pageW} y1={top + r.height} y2={top + r.height} className="p-rowline" />
                  </g>
                );
              })}
              <line x1={LABEL_W} x2={LABEL_W} y1={HEADER_H + RULER_H - 6} y2={pageH - FOOTER_H} className="p-rule" />
              <g transform={`translate(0 ${pageH - FOOTER_H + 12})`}>
                <rect x={0} y={-7} width={7} height={7} fill="#888" stroke="#222" strokeWidth={0.5} transform="rotate(45 3.5 -3.5)" />
                <text x={12} y={0} className="p-legend">
                  event
                </text>
                <rect x={50} y={-8} width={26} height={9} fill="#888" fillOpacity={0.35} stroke="#888" rx={2} />
                <text x={80} y={0} className="p-legend">
                  event with a span
                </text>
                <text x={170} y={0} className="p-legend key">
                  Bold
                </text>
                <text x={194} y={0} className="p-legend">
                  = key event · tinted band = the row&apos;s lifespan · strip at the top of a row = its phases · +N more = events
                  left out for room
                </text>
                <text x={0} y={16} className="p-source">
                  {cut(p.sourceNote ?? meta.credits ?? '', pageW / 0.92)}
                </text>
                <text x={0} y={30} className="p-source">
                  {cut(link, pageW / 0.9)}
                </text>
              </g>
            </svg>
          </section>
        );
      })}
    </div>
  );
}
