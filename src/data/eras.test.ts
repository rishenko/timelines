// Ages (context spans, schema v8; v7's meta.eras) in the bundled timelines: one that appears in several timelines (the Timurid Renaissance crosses the
// Medieval–Modern States seam at 1500) has the same name, line and dates in each, as a seam row does. They come
// from one entry of pipelines/common/periods.json, so they match by construction; this keeps it enforced. And a
// timeline built from a periods plan holds what the plan says.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOURCE_TIMELINES } from '../../scripts/lib/timelines.ts';
import type { ContextSpan, Dataset } from '../types.ts';

/** Every context span of a timeline: its own, then each row's. */
const spans = (ds: Dataset): ContextSpan[] => [...(ds.meta.context ?? []), ...ds.tracks.flatMap((t) => t.context ?? [])];

const timelines = SOURCE_TIMELINES.map((t) => [t.short, JSON.parse(readFileSync(t.compiled, 'utf8')) as Dataset] as const);

describe('eras across timelines', () => {
  it('an era in more than one timeline is the same in each (name, line, dates and their claims)', () => {
    const seen = new Map<string, [string, ContextSpan]>();
    let shared = 0;
    for (const [short, ds] of timelines) {
      for (const era of spans(ds)) {
        const first = seen.get(era.id);
        if (!first) {
          seen.set(era.id, [short, era]);
          continue;
        }
        shared++;
        expect(era, `${era.id}: ${first[0]} and ${short} differ`).toEqual(first[1]);
      }
    }
    expect(shared, 'the Timurid Renaissance, at least, crosses a seam').toBeGreaterThan(0);
  });
});

describe.each(SOURCE_TIMELINES.filter((t) => t.periods).map((t) => [t.short, t]))('the periods plan of %s', (_, t) => {
  const plan = JSON.parse(readFileSync(t.periods!, 'utf8')) as { eras: { id: string }[]; events: { uuid: string; tracks: string[] }[] };
  const ds = JSON.parse(readFileSync(t.compiled, 'utf8')) as Dataset;

  it('is what the bundled timeline holds: its eras, and each of its events, key', () => {
    expect(spans(ds).map((e) => e.id).sort()).toEqual(plan.eras.map((e) => e.id).sort());
    for (const p of plan.events) {
      const e = ds.events.find((x) => x.uuid === p.uuid);
      expect(e, p.uuid).toBeDefined();
      expect([e!.tracks, e!.importance], p.uuid).toEqual([p.tracks, 1]);
    }
  });
});
