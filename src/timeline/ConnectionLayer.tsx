import { LINK_KINDS, type TimelineEvent, type LinkKind } from '../types.ts';
import type { Mark } from './layout.ts';

interface Props {
  left: number;
  width: number;
  height: number;
  marksByEvent: Map<string, Mark[]>;
  eventsById: Map<string, TimelineEvent>;
  /** The selected event (clicked, or chosen from the keyboard): the only one whose rows are joined by a thread. */
  selectedId: string | null;
  related: Set<string> | null;
  inView: (x0: number, x1: number) => boolean;
}

/**
 * Draws the threads that tie the timeline together:
 * - a vertical connector through every lane the selected event appears in, its "+N" pills included (only the selected
 *   event's: a shared event otherwise reads as one by its diamond's border);
 * - curved arrows for explicit event links (causes / part-of / succeeds / conquers / related), always. A link ends only
 *   at events drawn as their own mark: an event gathered into a "+N" pill gets its arrows only while it, or the event
 *   at the other end, is focused (pointed at or selected).
 */
export function ConnectionLayer({ left, width, height, marksByEvent, eventsById, selectedId, related, inView }: Props) {
  let thread: React.ReactNode = null;
  const marks = selectedId ? marksByEvent.get(selectedId) : undefined;
  if (marks && marks.length > 1 && inView(marks[0].x0, marks[0].x0)) {
    const x = marks[0].x0;
    const ys = marks.map((m) => m.cy).sort((a, b) => a - b);
    // no dot on "+N" cluster pills
    const dots = marks.filter((m) => m.kind === 'event').map((m) => m.cy);
    thread = (
      <g key={selectedId} className="thread">
        <line x1={x} x2={x} y1={ys[0]} y2={ys[ys.length - 1]} />
        {dots.map((y) => (
          <circle key={y} cx={x} cy={y} r={3} />
        ))}
      </g>
    );
  }

  const links: React.ReactNode[] = [];
  for (const [id, e] of eventsById) {
    for (const l of e.links ?? []) {
      if (!LINK_KINDS.includes(l.kind)) continue; // a kind this app doesn't know (core 1.0, rule 3): kept, not drawn
      const focused = !!related && related.has(id) && related.has(l.to);
      const reachable = (ms: Mark[] | undefined) => (focused ? ms : ms?.filter((m) => m.kind === 'event'));
      const from = reachable(marksByEvent.get(id));
      const to = reachable(marksByEvent.get(l.to));
      if (!from?.length || !to?.length) continue;
      // pick the closest pair of marks so the arrow takes the shortest vertical path
      let best: [Mark, Mark] = [from[0], to[0]];
      for (const a of from)
        for (const b of to) if (Math.abs(a.cy - b.cy) < Math.abs(best[0].cy - best[1].cy)) best = [a, b];
      const [a, b] = best;
      const sx = a.x1;
      const tx = b.x0;
      if (!inView(Math.min(sx, tx), Math.max(sx, tx))) continue;
      const dx = Math.max(30, Math.abs(tx - sx) / 2);
      const d = `M ${sx} ${a.cy} C ${sx + dx} ${a.cy}, ${tx - dx} ${b.cy}, ${tx} ${b.cy}`;
      links.push(
        <path
          key={`${id}->${l.to}`}
          d={d}
          className={`link ${l.kind} ${focused ? 'on' : ''}`}
          // symmetric kinds have no arrowhead
          markerEnd={l.kind === 'related' || l.kind === 'with' ? undefined : `url(#arrow-${l.kind satisfies LinkKind})`}
        />,
      );
    }
  }

  return (
    <svg className="tl-connections" style={{ left }} width={width} height={height}>
      <defs>
        {(['causes', 'part-of', 'succeeds', 'conquers'] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className={`arrowhead ${k}`} />
          </marker>
        ))}
      </defs>
      {thread}
      {links}
    </svg>
  );
}
