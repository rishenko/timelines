// @vitest-environment jsdom
// Every row and every event of every timeline, opened in the editor and saved without changes, comes back exactly
// as it was. The forms copy fields one by one, so a field they don't know would be dropped silently on save (as the
// row form once dropped category memberships); this catches it for every field the data uses, now and later.
// Runs the bundled timelines, and the local ones when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts).
// By default enough rows and events that every field path the data uses is saved at least once (seconds);
// ROUNDTRIP=all opens every one (minutes). Phase order is compared by date: the row editor stores phases in date
// order, and the order they are written in has no meaning (the chart sorts them).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { migrate } from '../data/migrate.ts';
import type { Dataset, Track } from '../types.ts';
import { at0 } from '../lib/subYear.ts';
import index from '../../public/timelines/index.json';

afterEach(cleanup);

const ALL = process.env.ROUNDTRIP === 'all';

/** Every field path an item uses, at every level ("phases.startDates.source.sourceKey"; values left out). */
function paths(v: unknown, at = '', out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) for (const x of v) paths(x, at, out);
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      const p = at ? `${at}.${k}` : k;
      out.add(p);
      paths(x, p, out);
    }
  return out;
}

/** Every item, or enough items that every field path the data uses is saved at least once (greedy, in file order). */
function sample<T>(items: T[]): T[] {
  if (ALL) return items;
  const seen = new Set<string>();
  return items.filter((i) => {
    const fresh = [...paths(i)].filter((p) => !seen.has(p));
    fresh.forEach((p) => seen.add(p));
    return fresh.length > 0;
  });
}

// every bundled timeline (public/timelines/index.json), then the local ones
const bundled = (index as { timelines: { id: string; file: string }[] }).timelines.map(
  (t): [string, Dataset] => [t.id, migrate(JSON.parse(readFileSync(`public/timelines/${t.file}`, 'utf8'))) as Dataset],
);
const timelines: [string, Dataset][] = [
  ...bundled,
  ...localTimelineFiles().map((f): [string, Dataset] => [f.file, migrate(JSON.parse(readFileSync(f.path, 'utf8'))) as Dataset]),
];

/** Submits the open form and waits for its save handler (or its problems). */
async function submit(button: string, onSave: ReturnType<typeof vi.fn>) {
  await act(async () => {
    fireEvent.click(screen.getByText(button));
  });
  return onSave.mock.calls[0]?.[0];
}

describe('editor round trip: saving unchanged keeps every field', () => {
  for (const [name, data] of timelines) {
    it(`${name}: every event`, async () => {
      const lost: string[] = [];
      for (const e of sample(data.events)) {
        const onSave = vi.fn();
        render(<EventForm initial={e} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
        const saved = await submit('Save changes', onSave);
        try {
          expect(saved).toEqual(e);
        } catch {
          lost.push(`${e.uuid}: ${saved ? JSON.stringify(diff(e, saved)) : 'not saved'}`);
        }
        cleanup();
      }
      expect(lost).toEqual([]);
    }, 600_000);

    it(`${name}: every row`, async () => {
      const lost: string[] = [];
      for (const t of sample(data.tracks)) {
        const onSave = vi.fn();
        render(<TrackForm initial={t} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
        const saved = await submit('Save track', onSave);
        try {
          expect(saved).toEqual(byDate(t));
        } catch {
          lost.push(`${t.id}: ${saved ? JSON.stringify(diff(t, saved)) : 'not saved'}`);
        }
        cleanup();
      }
      expect(lost).toEqual([]);
    }, 600_000);
  }
});

/** A row with its phases in date order (stable: phases starting together keep their order). */
const byDate = (t: Track): Track => (t.phases ? { ...t, phases: [...t.phases].sort((a, b) => at0(a) - at0(b)) } : t);

/** The top-level fields that differ, as [before, after]. */
function diff(a: object, b: object): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    if (JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k]))
      out[k] = [(a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]];
  return out;
}
