// @vitest-environment jsdom
// Every row and every event of every timeline, opened in the editor and saved without changes, comes back exactly
// as it was. The forms copy fields one by one, so a field they don't know would be dropped silently on save (as the
// row form once dropped category memberships); this catches it for every field the data uses, now and later.
// Runs the schema's every-field fixture (src/data/fixtures/everyField.ts), the bundled timelines, and the local ones when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts).
// By default enough rows and events that every field path the data uses is saved at least once (about a minute);
// ROUNDTRIP=all opens every one (Kevin, 2026-11-24: "Full, split per timeline"; CI runs it on pull requests that touch the
// data, the pipelines or the forms, .github/workflows/roundtrip.yml). ROUNDTRIP_TIMELINE=<id> runs one timeline, and
// ROUNDTRIP_SHARD=k/n every n-th item from the k-th, so CI can split the large timelines across jobs. Items are tested in
// chunks (CHUNK), one test each, so no test runs long however large the timeline grows.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { localTimelineFiles } from '../../scripts/lib/local-data.ts';
import { migrate } from '../data/migrate.ts';
import type { Dataset, Track } from '../types.ts';
import { timelineIndex } from '../../scripts/lib/timeline-index.ts';
import { everyField } from '../data/fixtures/everyField.ts';

afterEach(cleanup);

const ALL = process.env.ROUNDTRIP === 'all';
const ONLY = process.env.ROUNDTRIP_TIMELINE;
/** "k/n": every n-th item from the k-th (1-based). */
const SHARD = (process.env.ROUNDTRIP_SHARD ?? '1/1').split('/').map(Number) as [number, number];
/** Items per test, so each test takes about 10 s on a laptop: a Modern States row takes about 1.3 s to open and save, an event about 0.8 s. */
const CHUNK = { events: 12, rows: 8 };
const TIMEOUT = 180_000;

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
  if (ALL) return items.filter((_, i) => i % SHARD[1] === SHARD[0] - 1);
  const seen = new Set<string>();
  return items.filter((i) => {
    const fresh = [...paths(i)].filter((p) => !seen.has(p));
    fresh.forEach((p) => seen.add(p));
    return fresh.length > 0;
  });
}

// every bundled timeline (the site's list, timelines/index.json), then the local ones
const bundled = timelineIndex().timelines.map(
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
      const saved = (await submit('Save row', onSave)) as Track;
      expect(saved.phases!.map((p) => p.start)).toEqual(starts);
      expect(saved.phases).toEqual(t.phases);
    });
  }
});

/** The items in chunks of `size`, each with its 1-based position in the timeline's list ("rows 21–40"). */
function chunks<T>(items: T[], size: number): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (let i = 0; i < items.length; i += size) out.push({ label: `${i + 1}–${Math.min(i + size, items.length)} of ${items.length}`, items: items.slice(i, i + size) });
  return out;
}

describe('editor round trip: saving unchanged keeps every field', () => {
  for (const [name, data] of timelines.filter(([id]) => !ONLY || id === ONLY)) {
    for (const { label, items } of chunks(sample(data.events), CHUNK.events))
      it(`${name}: events ${label}`, async () => {
        const lost: string[] = [];
        for (const e of items) {
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

    for (const { label, items } of chunks(sample(data.tracks), CHUNK.rows))
      it(`${name}: rows ${label}`, async () => {
        const lost: string[] = [];
        for (const t of items) {
          const onSave = vi.fn();
          render(<TrackForm initial={t} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
          const saved = await submit('Save row', onSave);
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

// Core 1.0, reader rule 2 (docs/data-format.md, "Versions"): a field the forms don't know, such as one a newer version
// of the format adds, survives a save; a field the form manages and the reader cleared is gone.
describe('editor keeps fields it does not know', () => {
  const data = everyField as Dataset;
  it('a row: an unknown field, and one inside a membership, survive a save', async () => {
    const t = { ...data.tracks.find((x) => x.id === 'quay')!, futureField: { sides: ['a', 'b'] } } as Track & { futureField: unknown };
    t.memberOf = t.memberOf!.map((m, i) => (i ? m : { ...m, role: 'axis' } as typeof m));
    const onSave = vi.fn();
    render(<TrackForm initial={t} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
    const saved = (await submit('Save row', onSave)) as Track & { futureField?: unknown };
    expect(saved.futureField).toEqual({ sides: ['a', 'b'] });
    expect((saved.memberOf![0] as { role?: string }).role).toBe('axis');
    expect(saved).toEqual(t);
  });
  it('a row: a link the reader cleared in the form is removed', async () => {
    const t = data.tracks.find((x) => x.id === 'quay')!;
    const onSave = vi.fn();
    render(<TrackForm initial={t} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByDisplayValue(t.url!), { target: { value: '' } });
    const saved = (await submit('Save row', onSave)) as Track;
    expect(saved.url).toBeUndefined();
  });
  it('an event: an unknown field survives a save', async () => {
    const e = { ...data.events.find((x) => x.uuid === 'council-falls')!, futureField: 7 } as Dataset['events'][number] & { futureField: number };
    const onSave = vi.fn();
    render(<EventForm initial={e} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
    const saved = (await submit('Save changes', onSave)) as typeof e;
    expect(saved.futureField).toBe(7);
    expect(saved).toEqual(withoutEdited(e));
  });
});
