// @vitest-environment jsdom
// Every row and every event of every timeline, opened in the editor and saved without changes, comes back exactly
// as it was. The forms copy fields one by one, so a field they don't know would be dropped silently on save (as the
// row form once dropped category memberships); this catches it for every field the data uses, now and later.
// Runs the bundled timelines, and the local ones when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts).
// By default one row and one event per shape (the set of fields used, at every level), which covers every field and
// combination the data has in seconds; ROUNDTRIP=all opens every one (a few minutes).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { migrate } from '../data/migrate.ts';
import type { Dataset } from '../types.ts';
import index from '../../public/timelines/index.json';

afterEach(cleanup);

const ALL = process.env.ROUNDTRIP === 'all';

/** The fields an item uses, at every level (keys only, values left out): items of one shape exercise the same code. */
const shape = (v: unknown): string =>
  Array.isArray(v)
    ? `[${[...new Set(v.map(shape))].sort().join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v).sort().map((k) => `${k}:${shape((v as Record<string, unknown>)[k])}`).join(',')}}`
      : typeof v;

/** Every item, or the first of each shape. */
function sample<T>(items: T[]): T[] {
  if (ALL) return items;
  const seen = new Set<string>();
  return items.filter((i) => {
    const s = shape(i);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
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
          expect(saved).toEqual(t);
        } catch {
          lost.push(`${t.id}: ${saved ? JSON.stringify(diff(t, saved)) : 'not saved'}`);
        }
        cleanup();
      }
      expect(lost).toEqual([]);
    }, 600_000);
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
