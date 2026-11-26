import { useMemo, useState } from 'react';
import { agesInView, splitAges } from '../lib/eras.ts';
import { buildScale } from './scale.ts';
import { anchorsFor, keptStretches } from './anchors.ts';
import { ageRef, buildLanes, layoutLanes, layoutPhaseStrips, memberRef, phaseRef, placeMemberships, placeOnLines, type Mark, type PlacedPhase } from './layout.ts';
import { membersByUnion, membersTip, membershipLabel, type ResolvedMembership } from '../lib/memberOf.ts';
import { mergeStretches } from '../lib/lifespan.ts';
import { beforePresent } from '../lib/beforePresent.ts';
import { isApprox, type ResolvedSpan } from '../lib/chronology.ts';
import { rootOf, trackIndex } from '../lib/tracks.ts';
import { hasGlyph } from '../components/CategoryGlyph.tsx';
import { shownLanes, type YearWindow } from './rowsInView.ts';
import { useLaneActivity } from './useLaneActivity.ts';
import type { TimelineViewProps as Props } from './TimelineView.tsx';

const NO_MEMBERSHIPS = new Map<string, ResolvedMembership[]>();

/**
 * What the chart draws, worked out from its props (split step 4c, out of TimelineView): the lanes (all, and those shown
 * when rows with nothing in view are hidden), each lane's strip lines and lifespans, the time scale, the packed layout,
 * and the selected event's related set. It also holds the state those depend on: rows the reader opened (+N), headers
 * revealed, and the year windows the hidden rows and strips were last checked against (set by useRowSettle).
 */
export function useChartModel(props: Props) {
  const { data, events, eventsById, spans, phases, visibleTracks, collapsed, increment, compress, present, selectedId } = props;
  const cal = data.meta.calendar;
  const trackById = useMemo(() => trackIndex(data.tracks), [data.tracks]);
  /** Rows outside the shown set too, for memberships' unions and members (see allTracks). */
  const anyRow = useMemo(() => (props.allTracks ? trackIndex(props.allTracks) : trackById), [props.allTracks, trackById]);
  const trackNames = useMemo(() => new Map(data.tracks.map((t) => [t.id, t.name])), [data.tracks]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // every lane; the ones drawn may be fewer (hideOutOfView), but the ruler is built from all of them so it never moves
  const allLanes = useMemo(() => buildLanes(data.tracks, visibleTracks, collapsed), [data.tracks, visibleTracks, collapsed]);
  const { rowWindow, setRowWindow, revealed, setRevealed, setFocusedLane, keep, hideOutOfView, activity, activeNow, shown } = useShownLanes(props, allLanes, trackById);
  /**
   * The years the strips are checked against (the view plus a margin either side), set when sideways scrolling
   * settles, never per frame: age lines and membership lines with nothing there are left out (Kevin, 2026-11-22).
   */
  const [stripWindow, setStripWindow] = useState<YearWindow | null>(null);
  const lanes = shown.lanes;
  // A top-level row with sub-rows is a group: its rows share its colour as a background tint.
  const groupColor = useMemo(() => {
    const parents = new Set(data.tracks.map((t) => t.parent));
    const out = new Map<string, string>();
    for (const t of data.tracks) {
      const root = rootOf(t.id, trackById);
      if (root && parents.has(root.id)) out.set(t.id, root.color);
    }
    return out;
  }, [data.tracks, trackById]);
  const memberOf = props.memberOf ?? NO_MEMBERSHIPS;
  // ages: only the lines with an age in the years in view (checked when scrolling settles); cross-region ages in the
  // Ages strip under the ruler, a region's own as lines of its row's strip, above its phases
  const agesShown = useMemo(() => splitAges(agesInView(props.ages ?? [], stripWindow)), [props.ages, stripWindow]);
  // a lane's strip lines: its ages (a step lighter, one line per age line), its phases, then one line per membership
  // in another row ("in Soviet Union, 1922–91"), drawn in the union's colour; memberships with nothing in the years
  // in view leave no empty line
  const lanePhases = useMemo(
    () =>
      new Map(
        lanes.map((l) => {
          // (each keeps a ref to what it stands for, so the keyboard and the side panel find it again)
          const ages = agesShown.bands.get(l.id) ?? [];
          const own: PlacedPhase[] = [];
          const next = () => (own.length ? Math.max(...own.map((p) => p.level)) + 1 : 0);
          for (const line of [...new Set(ages.map((a) => a.line))].sort((a, b) => a - b))
            own.push(
              ...placeOnLines(
                l.id,
                ages.filter((a) => a.line === line).map((a) => ({ ...a.span, name: a.era.name, kind: a.era.kind, lineName: a.lineName, url: a.era.url, ref: ageRef(a.era.id) })),
                next(),
              ),
            );
          own.push(...placeOnLines(l.id, (phases.get(l.id) ?? []).map((p, i) => ({ ...p, ref: phaseRef(l.id, i) })), next()));
          const label = (m: ResolvedMembership) => membershipLabel(m, anyRow.get(m.row) ?? m.row, cal, isApprox(m));
          const ms = (memberOf.get(l.id) ?? [])
            .filter((m) => !stripWindow || (m.end >= stripWindow.y0 && m.start <= stripWindow.y1))
            .map((m) => ({ ...m, ref: memberRef(l.id, m.index) }));
          return [l.id, [...own, ...placeMemberships(l.id, ms, next(), label)]];
        }),
      ),
    [lanes, phases, memberOf, anyRow, cal, agesShown, stripWindow],
  );
  // a union's row says who its members were, and when (its name's and lifespan's tooltips)
  const unionTips = useMemo(() => {
    const out = new Map<string, string>();
    for (const [id, list] of membersByUnion(memberOf)) out.set(id, membersTip(list, (m) => anyRow.get(m)?.name ?? m, cal));
    return out;
  }, [memberOf, anyRow, cal]);
  const laneSpans = useMemo(() => {
    // phase edges are kept uncompressed on the ruler too, so a change of government is never folded into a gap;
    // a folded row's hidden sub-rows count as well, so folding and unfolding rows doesn't move the ruler; so do rows
    // hidden for having nothing in view
    const out: ResolvedSpan[] = [];
    for (const l of allLanes)
      for (const id of l.members) {
        out.push(...(spans.get(id) ?? []));
        out.push(...(phases.get(id) ?? []));
        out.push(...(memberOf.get(id) ?? []));
      }
    return out;
  }, [allLanes, spans, phases, memberOf]);
  const scale = useMemo(
    () =>
      buildScale(anchorsFor(events, present, laneSpans, data.meta.range, increment < 1), {
        increment,
        compress,
        calendar: cal,
        keep: increment < 1 ? keptStretches(events, present, data.meta.range) : undefined,
        end: beforePresent(cal)?.present,
      }),
    [events, present, laneSpans, data.meta.range, increment, compress, cal],
  );
  // a folded row's background is one lifespan: when it or any row folded into it existed, in its own colour (its
  // sub-rows' bands overlaid in their colours would stack into shades that mean nothing)
  const laneLifespans = useMemo(
    () =>
      new Map(
        lanes.map((l) => [
          l.id,
          l.collapsed ? mergeStretches(l.members.flatMap((id) => spans.get(id) ?? [])) : (spans.get(l.id) ?? []),
        ]),
      ),
    [lanes, spans],
  );
  // a lane with phases gets their strips at the top, one line per level: tall enough for names where any fit at this
  // zoom, thin where none do
  const laneStrips = useMemo(
    () => new Map([...lanePhases].filter(([, list]) => list.length).map(([id, list]) => [id, layoutPhaseStrips(list, scale.x, {}, laneLifespans.get(id))])),
    [lanePhases, scale, laneLifespans],
  );
  const headerPx = useMemo(() => {
    return Object.fromEntries([...laneStrips].map(([id, st]) => [id, st.height])) as Record<string, number>;
  }, [laneStrips]);
  // events drawn with a category glyph before their title: their labels are that much wider
  const glyphs = useMemo(
    () => new Set([...(props.categories ?? [])].filter(([, c]) => hasGlyph(c.kind)).map(([id]) => id)),
    [props.categories],
  );
  const layout = useMemo(
    () => layoutLanes(lanes, events, scale, present, { expanded, headerPx, thin: shown.thin, glyphs, bands: props.bands }),
    [lanes, events, scale, present, expanded, headerPx, shown.thin, glyphs, props.bands],
  );
  const marksByEvent = useMemo(() => {
    const m = new Map<string, Mark[]>();
    for (const l of layout.lanes)
      for (const mk of l.marks)
        for (const id of mk.eventIds ?? [mk.eventId]) {
          const list = m.get(id);
          if (list) list.push(mk);
          else m.set(id, [mk]);
        }
    return m;
  }, [layout]);

  // The selected event and everything linked to it (both directions): the rest step back while one is selected. Hovering
  // or focusing an event changes nothing else on the chart (Kevin, 2026-11-24: dimming on hover flickered as the pointer
  // crossed many events); that event alone is highlighted, in CSS.
  const focusId = selectedId;
  const related = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    for (const l of eventsById.get(focusId)?.links ?? []) s.add(l.to);
    for (const e of eventsById.values()) if (e.links?.some((l) => l.to === focusId)) s.add(e.uuid);
    return s;
  }, [focusId, eventsById]);

  return {
    cal, anyRow, trackNames, expanded, setExpanded, allLanes, rowWindow, setRowWindow, stripWindow, setStripWindow,
    revealed, setRevealed, setFocusedLane, keep, hideOutOfView, activity, activeNow, shown, groupColor, agesShown, unionTips,
    scale, laneLifespans, laneStrips, layout, marksByEvent, related,
  };
}


/**
 * Which lanes are shown when rows with nothing in view are hidden (or drawn thin): the window they were last checked
 * against, the headers the reader opened, and the lanes that always stay (the selected event's, a focus request's, the
 * one holding keyboard focus).
 */
function useShownLanes(props: Props, allLanes: ReturnType<typeof buildLanes>, trackById: ReturnType<typeof trackIndex>) {
  const { events, eventsById, spans, phases, present, selectedId } = props;
  /** The years the hidden rows were last checked against (when scrolling settled), or null before the first check. */
  const [rowWindow, setRowWindow] = useState<YearWindow | null>(null);
  /** Headers whose rows with nothing in view the reader asked to see. */
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  /** The lane holding keyboard focus when hiding last settled: it stays, so focus isn't lost. */
  const [focusedLane, setFocusedLane] = useState<string | null>(null);
  const hideOutOfView = !!props.hideOutOfView;
  const keep = useMemo(() => {
    const ids = new Set<string>();
    const sel = selectedId ? eventsById.get(selectedId) : undefined;
    const want = new Set([...(sel?.tracks ?? []), ...(props.focus?.trackId ? [props.focus.trackId] : [])]);
    for (const l of allLanes) if (l.members.some((m) => want.has(m))) ids.add(l.id);
    if (focusedLane) ids.add(focusedLane);
    return ids;
  }, [allLanes, selectedId, eventsById, props.focus, focusedLane]);
  const thinRows = !!props.thinRows;
  /** The lanes with anything in the years last checked (hide rows with nothing in view). */
  const activity = useLaneActivity(allLanes, events, spans, phases, present);
  const activeNow = useMemo(() => (hideOutOfView && rowWindow ? activity(rowWindow) : null), [hideOutOfView, rowWindow, activity]);
  const shown = useMemo(() => {
    if (!hideOutOfView || !rowWindow || !activeNow)
      return { lanes: allLanes, inactiveBelow: new Map<string, number>(), hiddenCount: 0, thin: new Set<string>() };
    const active = activeNow;
    const r = shownLanes(allLanes, trackById, active, keep, revealed);
    if (!thinRows) return { ...r, thin: new Set<string>() };
    // thin lines: every lane stays, the ones that would be taken out are drawn thin
    const drawn = new Set(r.lanes.map((l) => l.id));
    return { ...r, lanes: allLanes, thin: new Set(allLanes.filter((l) => !drawn.has(l.id)).map((l) => l.id)) };
  }, [hideOutOfView, thinRows, rowWindow, activeNow, allLanes, trackById, keep, revealed]);
  return { rowWindow, setRowWindow, revealed, setRevealed, setFocusedLane, keep, hideOutOfView, activity, activeNow, shown };
}
