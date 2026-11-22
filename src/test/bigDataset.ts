// A timeline several times the size of a real one, for the performance tests: `base` copied over, the copies' ids
// suffixed (-c1, -c2) so every row, event and reference stays distinct. Modern States ×3 is about 1,800 rows and
// 4,400 events: the size the larger timelines being built reach.
import type { Dataset, TimelineEvent, Track, TrackSpan } from '../types.ts';

export function bigDataset(base: Dataset, copies = 3): Dataset {
  const tracks: Track[] = [];
  const events: TimelineEvent[] = [];
  for (let n = 0; n < copies; n++) {
    const id = (s: string) => (n ? `${s}-c${n}` : s);
    const span = <S extends TrackSpan>(s: S): S => ({
      ...s,
      ...(s.startEvent && { startEvent: id(s.startEvent) }),
      ...(s.endEvent && { endEvent: id(s.endEvent) }),
    });
    for (const t of base.tracks)
      tracks.push({
        ...t,
        id: id(t.id),
        ...(t.parent && { parent: id(t.parent) }),
        ...(t.span && { span: Array.isArray(t.span) ? t.span.map(span) : span(t.span) }),
        ...(t.phases && { phases: t.phases.map(span) }),
        ...(t.memberOf && { memberOf: t.memberOf.map((m) => ({ ...span(m), row: id(m.row) })) }),
      });
    for (const e of base.events)
      events.push({
        ...e,
        uuid: id(e.uuid),
        tracks: e.tracks.map(id),
        ...(e.links && { links: e.links.map((l) => ({ ...l, to: id(l.to) })) }),
      });
  }
  return { ...base, tracks, events };
}
