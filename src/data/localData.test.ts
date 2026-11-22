// Checks the local datasets (scripts/lib/local-data.ts): timelines kept outside the repo, listed in
// TIMELINES_LOCAL_DATA. They give the app more varied data to be tested on than the timelines it ships. Skipped when
// the variable isn't set (as in CI).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { defaultSelection, resolveEvents } from '../lib/chronology.ts';
import { presentYear } from '../lib/years.ts';
import { anchorsFor } from '../timeline/anchors.ts';
import { buildLanes, layoutLanes } from '../timeline/layout.ts';
import { buildScale } from '../timeline/scale.ts';
import type { Dataset } from '../types.ts';
import { summarize } from './timelineIndex.ts';
import { validateDataset } from './validate.ts';

const files = localTimelineFiles();

describe.skipIf(!files.length)('local datasets', () => {
  for (const f of files) {
    const ds = JSON.parse(readFileSync(f.path, 'utf8')) as Dataset;

    it(`${f.file} is valid`, () => {
      expect(validateDataset(ds)).toEqual([]);
      expect(() => summarize(ds)).not.toThrow();
    });

    it(`${f.file}: events resolve under every dating option, and lay out without overlaps`, () => {
      const events = resolveEvents(ds, defaultSelection(ds));
      expect(events.length).toBe(ds.events.length);
      const present = ds.present ?? presentYear(ds.events);
      for (const inc of ds.meta.increments ?? [10]) {
        const scale = buildScale(anchorsFor(events, present), { increment: inc });
        const { lanes } = layoutLanes(buildLanes(ds.tracks, {}, {}), events, scale, present);
        for (const l of lanes) {
          const byRow = new Map<number, typeof l.marks>();
          for (const m of l.marks) byRow.set(m.row, [...(byRow.get(m.row) ?? []), m]);
          for (const row of byRow.values()) {
            const sorted = [...row].sort((a, b) => a.x0 - b.x0);
            for (let i = 1; i < sorted.length; i++) expect(sorted[i].x0, `${l.lane.id} at ${inc}`).toBeGreaterThan(sorted[i - 1].footprintEnd - 8);
          }
        }
      }
    });
  }
});
