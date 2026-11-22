// @vitest-environment jsdom
// Every row and every event of every timeline, opened in the editor and saved without changes, comes back exactly
// as it was. The forms copy fields one by one, so a field they don't know would be dropped silently on save (as the
// row form once dropped category memberships); this catches it for every field the data uses, now and later.
// Runs the schema's every-field fixture (src/data/fixtures/everyField.ts), the bundled timelines, and the local ones when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts).
// By default enough rows and events that every field path the data uses is saved at least once (seconds);
// ROUNDTRIP=all opens every one (about 40 minutes).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { migrate } from '../data/migrate.ts';
import type { Dataset, Track } from '../types.ts';
import index from '../../public/timelines/index.json';
import { everyField } from '../data/fixtures/everyField.ts';

afterEach(cleanup);

const ALL = process.env.ROUNDTRIP === 'all';
/** Every event of a large timeline takes over ten minutes (Modern States: about 1,450 events). */
const TIMEOUT = ALL ? 3_600_000 : 600_000;

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
  ['every-field fixture', everyField as Dataset],
  ...localTimelineFiles().map((f): [string, Dataset] => [f.file, migrate(JSON.parse(readFileSync(f.path, 'utf8'))) as Dataset]),
];

const withoutEdited = ({ edited: _edited, ...e }: Dataset['events'][number]) => e;

/** Submits the open form and waits for its save handler (or its problems). */
async function submit(button: string, onSave: ReturnType<typeof vi.fn>) {
  await act(async () => {
    fireEvent.click(screen.getByText(button));
  });
  return onSave.mock.calls[0]?.[0];
}

// rows that group others list each one's phases together, out of date order; saving must keep that order
describe('row editor keeps phases in the order they were written', () => {
  const modern = timelines.find(([id]) => id === 'modern-states')![1];
  for (const id of ['yemen', 'philippines', 'united-states']) {
    it(id, async () => {
      const t = modern.tracks.find((x) => x.id === id)!;
      const starts = t.phases!.map((p) => p.start);
      expect(starts).not.toEqual([...starts].sort((a, b) => a - b));
      const onSave = vi.fn();
      render(<TrackForm initial={t} data={modern} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
      const saved = (await submit('Save track', onSave)) as Track;
      expect(saved.phases!.map((p) => p.start)).toEqual(starts);
      expect(saved.phases).toEqual(t.phases);
    }, 30_000); // a large row: the form takes a few seconds to open and save on a slow runner
  }
});

describe('editor round trip: saving unchanged keeps every field', () => {
  for (const [name, data] of timelines) {
    it(`${name}: every event`, async () => {
      const lost: string[] = [];
      for (const e of sample(data.events)) {
        const onSave = vi.fn();
        render(<EventForm initial={e} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
        const saved = await submit('Save changes', onSave);
        try {
          // `edited` is set by the save itself (state/edits.ts), not by the form
          expect(saved).toEqual(withoutEdited(e));
        } catch {
          lost.push(`${e.uuid}: ${saved ? JSON.stringify(diff(e, saved)) : 'not saved'}`);
        }
        cleanup();
      }
      expect(lost).toEqual([]);
    }, TIMEOUT);

    it(`${name}: every row`, async () => {
      const lost: string[] = [];
      for (const t of sample(data.tracks)) {
        const onSave = vi.fn();
        render(<TrackForm initial={t} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
        const saved = await submit('Save track', onSave);
        try {
          expect(saved).toEqual(t);
        } catch {
          lost.push(`${t.id}: ${saved ? JSON.stringify(diff(t, saved)) : 'not saved'}`);
        }
        cleanup();
      }
      expect(lost).toEqual([]);
    }, TIMEOUT);
  }
});

/** The top-level fields that differ, as [before, after]. */
function diff(a: object, b: object): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    if (JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k]))
      out[k] = [(a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]];
  return out;
}
