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
import { timelineIndex } from '../../scripts/lib/timeline-index.ts';
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

// found by the full round trip on the real data (#213): an end on the start's own date, and an explicit importance 2, were dropped on an unchanged save
describe('editor keeps an end on the start\'s own date and an explicit importance 2', () => {
  const data = everyField as Dataset;
  const save = async (e: Dataset['events'][number]) => {
    const onSave = vi.fn();
    render(<EventForm initial={e} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
    const saved = (await submit('Save changes', onSave)) as typeof e;
    cleanup();
    return saved;
  };
  const plain = () => {
    // a copy of a fixture event under its own id, so no phase or span hangs on its dates
    const e = data.events.find((x) => x.end === undefined && !x.ongoing && x.tracks.length)!;
    return { ...e, uuid: 'roundtrip-plain', title: 'A plain event', importance: undefined, endDates: undefined } as Dataset['events'][number];
  };
  it('a reign whose end is its start year keeps the end', async () => {
    const p = plain();
    expect((await save({ ...p, startMonth: undefined, startDay: undefined, end: p.start })).end).toBe(p.start); // years only, as Kittisena (524) and Yunus Pasha (1517)
  });
  it('a one-day span keeps its end month and day', async () => {
    const p = plain();
    const saved = await save({ ...p, end: p.start, endMonth: p.startMonth, endDay: p.startDay });
    expect([saved.end, saved.endMonth, saved.endDay]).toEqual([p.start, p.startMonth, p.startDay]);
  });
  it('an event with no end still gets none', async () => {
    expect((await save(plain())).end).toBeUndefined();
  });
  it('an explicit importance 2 stays; none stays none', async () => {
    expect((await save({ ...plain(), importance: 2 })).importance).toBe(2);
    expect((await save(plain())).importance).toBeUndefined();
  });
});
