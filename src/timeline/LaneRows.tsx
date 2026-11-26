import { Fragment, type Dispatch, type SetStateAction } from 'react';
import { stripLineNamePx, ageRef, type LaneLayout } from './layout.ts';
import { stripStopKey } from './keyboard.ts';
import { useLongPress } from './gestures.ts';
import { PhaseStripCell, SpanBand } from './Bands.tsx';
import { LaneLabel } from './LaneLabel.tsx';
import { ClusterMark, EventMark } from './Marks.tsx';
import type { ViewportStore } from './viewportStore.ts';
import type { TimelineViewProps } from './TimelineView.tsx';
import type { useChartModel } from './useChartModel.ts';

type Model = ReturnType<typeof useChartModel>;

/** What every lane draws from: the chart's props, its model and the view's state (one object, so each lane takes one prop). */
export interface LaneContext {
  props: TimelineViewProps;
  labelW: number;
  scale: Model['scale'];
  cal: Model['cal'];
  anyRow: Model['anyRow'];
  trackNames: Model['trackNames'];
  groupColor: Model['groupColor'];
  laneLifespans: Model['laneLifespans'];
  laneStrips: Model['laneStrips'];
  unionTips: Model['unionTips'];
  related: Model['related'];
  shown: Model['shown'];
  expanded: Model['expanded'];
  setExpanded: Model['setExpanded'];
  revealed: Model['revealed'];
  setRevealed: Model['setRevealed'];
  /** The shared props of every band and strip cell (Bands.tsx). */
  band: { scale: Model['scale']; cal: Model['cal']; labelW: number; inView: (x0: number, x1: number) => boolean; eventTitle: (id: string) => string | undefined };
  inView: (x0: number, x1: number) => boolean;
  stripCues: Set<string>;
  flashLane: string | null;
  peekLane: string | null;
  setPeekLane: Dispatch<SetStateAction<string | null>>;
  rovingKey: string | null;
  onStopFocus: (key: string) => void;
  openStrip: ((ref: string) => void) | undefined;
  viewStore: ViewportStore;
}

type Drawn = { lanes: { l: LaneLayout; index: number; skipped: number }[]; skippedBelow: number };
type EditGestures = {
  onLaneDoubleClick: (trackId: string) => (ev: React.MouseEvent<HTMLDivElement>) => void;
  onLanePointerDown: (trackId: string) => (ev: React.PointerEvent<HTMLDivElement>) => void;
  press: ReturnType<typeof useLongPress>;
};

/**
 * The chart's rows (split step 4c, out of TimelineView): each drawn lane (a thin line, or the full row with its
 * lifespan, strips, label and marks), the empty space of the lanes left out, and edit mode's Add a track.
 */
export function LaneRows({ ctx, drawn }: { ctx: LaneContext; drawn: Drawn }) {
  const { props, scale, labelW } = ctx;
  const { editMode } = props;
  // Adding an event in edit mode: double-click an empty spot in a lane, or on touch screens hold a finger there.
  const isEmptySpot = (target: EventTarget, lane: Element) =>
    target === lane || (target as HTMLElement).classList.contains('tl-span') || (target as HTMLElement).classList.contains('tl-phase-fill');
  const createAt = (trackId: string, lane: Element, clientX: number) => {
    const contentX = clientX - lane.getBoundingClientRect().left - labelW;
    props.onCreateAt(trackId, Math.floor(scale.yearAt(contentX)));
  };
  const onLaneDoubleClick = (trackId: string) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (editMode && isEmptySpot(ev.target, ev.currentTarget)) createAt(trackId, ev.currentTarget, ev.clientX);
  };
  const press = useLongPress();
  const onLanePointerDown = (trackId: string) => (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || ev.pointerType !== 'touch' || !isEmptySpot(ev.target, ev.currentTarget)) return;
    const lane = ev.currentTarget;
    const x = ev.clientX;
    press.start(x, ev.clientY, () => createAt(trackId, lane, x));
  };
  const gestures = { onLaneDoubleClick, onLanePointerDown, press };
  return (
    <>
      {drawn.lanes.map(({ l, index, skipped }) => (
        // keyed per lane: an unkeyed [skip, lane] pair is matched by position, so culling a lane at the top remounted every lane below it
        <Fragment key={l.lane.id}>
          {skipped > 0 && <div key={`skip-${l.lane.id}`} className="tl-rows-skipped" style={{ height: skipped }} aria-hidden="true" />}
          {ctx.shown.thin.has(l.lane.id) ? <ThinLane ctx={ctx} l={l} index={index} /> : <Lane ctx={ctx} l={l} index={index} gestures={gestures} />}
        </Fragment>
      ))}
      {editMode && drawn.skippedBelow > 0 && <div className="tl-rows-skipped" style={{ height: drawn.skippedBelow }} aria-hidden="true" />}
      {editMode && (
        <div className="tl-add-lane">
          <button style={{ width: labelW }} onClick={() => props.onAddTrack()}>
            + Add a track
          </button>
        </div>
      )}
    </>
  );
}

function ThinLane({ ctx, l: { lane, height }, index }: { ctx: LaneContext; l: LaneLayout; index: number }) {
  const { labelW, groupColor, peekLane, setPeekLane } = ctx;
  return (
    // a row with nothing in view, drawn as a thin line in its place (its header's +N shows it); hovering the
    // line, or clicking or tapping it, shows its name in the name column. Mouse/touch only: keyboard and
    // screen-reader users reach these rows through the header's +N button.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={`tl-lane thin${index % 2 ? ' stripe' : ''}${lane.depth ? ' nested' : ''}${groupColor.has(lane.id) ? ' in-group' : ''}${peekLane === lane.id ? ' peek' : ''}`}
      onClick={() => setPeekLane((p) => (p === lane.id ? null : lane.id))}
      style={{ height, '--track-color': lane.track.color, '--depth': lane.depth, '--group-color': groupColor.get(lane.id) } as React.CSSProperties}
      aria-hidden="true"
      data-lane={lane.id}
    >
      <div className="thin-label" style={{ width: labelW }}>
        <span className="thin-name">{lane.track.name}</span>
      </div>
    </div>
  );
}

function Lane({ ctx, l: { lane, height, marks, top, overflow }, index, gestures }: { ctx: LaneContext; l: LaneLayout; index: number; gestures: EditGestures }) {
  const { props, labelW, scale, cal, anyRow, trackNames, groupColor, laneLifespans, laneStrips, unionTips, related, shown, expanded, setExpanded } = ctx;
  const { revealed, setRevealed, band, inView, stripCues, flashLane, rovingKey, onStopFocus, openStrip, viewStore } = ctx;
  const { editMode, eventsById, selectedId, onSelect } = props;
  const { onLaneDoubleClick, onLanePointerDown, press } = gestures;
  return (
    // double-click and long-press add an event in edit mode; the edit bar's Add event button does the same
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className={`tl-lane${index % 2 ? ' stripe' : ''}${lane.depth ? ' nested' : ''}${lane.depth > 1 ? ' deep' : ''}${lane.collapsed ? ' collapsed' : ''}${flashLane === lane.id ? ' flash' : ''}${groupColor.has(lane.id) ? (lane.depth ? ' in-group' : ' group-head') : ''}`}
      style={{ height, '--track-color': lane.track.color, '--depth': lane.depth, '--group-color': groupColor.get(lane.id) } as React.CSSProperties}
      onDoubleClick={onLaneDoubleClick(lane.id)}
      onPointerDown={onLanePointerDown(lane.id)}
      onPointerMove={(ev) => press.move(ev.clientX, ev.clientY)}
      onPointerUp={press.cancel}
      onPointerCancel={press.cancel}
      role="group"
      aria-label={lane.track.name}
      data-lane={lane.id}
    >
      {/* the row's drawn content is in layers the browser skips while the row is off screen (timeline.css,
          .tl-lane-layer); the name stays outside them, so it still covers the gap, era-line and arrow layers */}
      {/* each stretch of a lifespan is its own band; the gaps between them stay blank. A still-going one (or one
          that runs on past the end of the chart) shows an arrow on its top edge, unless a phase on screen
          already shows one in its strip */}
      <div className="tl-lane-layer under">
      {laneLifespans.get(lane.id)?.map((s, i) => (
        <SpanBand
          key={`span-${i}`}
          track={lane.track}
          span={s}
          cue={!stripCues.has(lane.id)}
          title={lane.collapsed ? `${lane.track.name} and the rows folded into it` : undefined}
          members={unionTips.get(lane.id)}
          {...band}
        />
      ))}
      </div>
      <div className="tl-lane-layer strips">
      {/* a named age line (a region's, e.g. Africa's "Nile Valley") shows its name at the chart's left edge, as
          the age bands did (Kevin, #82: every named line is labelled); its ages' names stick just right of it */}
      {laneStrips.get(lane.id)?.lines.map((ln) => {
        const name = laneStrips.get(lane.id)!.cells.find((c) => c.line === ln && c.phase.lineName)?.phase.lineName;
        return name ? (
          <div key={`line-${ln.top}`} className="tl-strip-line" style={{ left: labelW, width: scale.width, top: ln.top, height: ln.height }} aria-hidden="true">
            <span className="tl-strip-line-name" style={{ left: labelW, width: stripLineNamePx(name) }}>
              {name}
            </span>
          </div>
        ) : null;
      })}
      {laneStrips.get(lane.id)?.cells.map((c, i) => (
        <PhaseStripCell
          key={`phase-${i}`}
          cell={c}
          color={(anyRow.get(c.phase.member ?? c.phase.trackId) ?? lane.track).color}
          memberName={lane.track.name}
          union={c.phase.member && (anyRow.get(c.phase.member) ?? c.phase.member)}
          isTabStop={!!c.phase.ref && rovingKey === stripStopKey(c.phase.ref)}
          selected={!!c.phase.ref && (c.phase.ref === props.selectedPhaseRef || (!!props.selectedAgeId && c.phase.ref === ageRef(props.selectedAgeId)))}
          onOpen={openStrip}
          viewStore={viewStore}
          onStopFocus={onStopFocus}
          {...band}
        />
      ))}
      </div>
      <LaneLabel
        lane={lane}
        regionTip={[props.regionTips?.get(lane.id), unionTips.get(lane.id)].filter(Boolean).join('\n') || undefined}
        tag={props.rowTags?.get(lane.id)}
        compare={
          props.onToggleCompare && !editMode
            ? { inSet: !!props.compareRows?.has(lane.id), onToggle: () => props.onToggleCompare!(lane.id) }
            : undefined
        }
        labelW={labelW}
        overflow={overflow}
        expanded={!!expanded[lane.id]}
        editMode={editMode}
        rovingKey={rovingKey}
        onStopFocus={onStopFocus}
        onToggleExpanded={() => setExpanded((x) => ({ ...x, [lane.id]: !x[lane.id] }))}
        onToggleCollapsed={() => props.onToggleCollapsed(lane.id)}
        onEditTrack={() => props.onEditTrack(lane.id)}
        onMoveTrack={(dir) => props.onMoveTrack(lane.id, dir)}
        onAddSubTrack={() => props.onAddTrack(lane.id)}
        inactiveBelow={shown.inactiveBelow.get(lane.id)}
        revealed={revealed.has(lane.id)}
        onToggleRevealed={() =>
          setRevealed((r) => {
            const next = new Set(r);
            if (!next.delete(lane.id)) next.add(lane.id);
            return next;
          })
        }
      />
      <div className="tl-lane-layer marks">
      {marks
        .filter((m) => m.key === rovingKey || inView(Math.min(m.x0, m.whisker?.[0] ?? m.x0), m.footprintEnd))
        .map((m) =>
          m.kind === 'cluster' ? (
            <ClusterMark
              key={m.key}
              mark={m}
              laneTop={top}
              labelW={labelW}
              cal={cal}
              isTabStop={m.key === rovingKey}
              onStopFocus={onStopFocus}
              events={m.eventIds!.map((id) => eventsById.get(id)!)}
              related={m.eventIds!.some((id) => related?.has(id))}
              namedCategory={m.keyEventId ? props.categories?.get(m.keyEventId) : undefined}
              onClick={(mid) => {
                if (!props.onZoomIn(mid)) setExpanded((x) => ({ ...x, [lane.id]: true }));
              }}
            />
          ) : (
            <EventMark
              key={m.key}
              mark={m}
              event={eventsById.get(m.eventId)!}
              laneTop={top}
              labelW={labelW}
              cal={cal}
              isTabStop={m.key === rovingKey}
              onStopFocus={onStopFocus}
              trackNames={trackNames}
              category={props.categories?.get(m.eventId)}
              selected={selectedId === m.eventId}
              related={!!related?.has(m.eventId)}
              showEdited={editMode}
              // clamped to the bar: only a bar crossing the left edge has a new value as the chart scrolls
              viewStore={viewStore}
              onSelect={onSelect}
            />
          ),
        )}
      </div>
    </div>
  );
}
