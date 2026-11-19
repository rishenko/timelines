import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTimelineIndex, summarize } from './timelineIndex.ts';
import { timelineIndexText } from '../../scripts/lib/timeline-index.ts';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset } from '../types.ts';

describe('the site index (timelines/index.json)', () => {
  it('keeps valid entries in order', () => {
    const { entries, errors } = parseTimelineIndex({
      timelines: [
        { id: 'a', title: 'A', file: 'a.json' },
        { id: 'b', title: 'B', file: 'https://example.org/b.json', subtitle: 'Bee', eventCount: 3 },
      ],
    });
    expect(errors).toEqual([]);
    expect(entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(entries[1]).toEqual({ id: 'b', title: 'B', file: 'https://example.org/b.json', subtitle: 'Bee', eventCount: 3 });
  });

  it('leaves out entries without a usable id, title or file, and says why', () => {
    const { entries, errors } = parseTimelineIndex({
      timelines: [
        { id: 'ok', title: 'OK', file: 'ok.json' },
        { id: 'has space', title: 'X', file: 'x.json' },
        { id: 'ok', title: 'Again', file: 'again.json' },
        { id: 'untitled', file: 'u.json' },
        { id: 'script', title: 'S', file: 'javascript:alert(1)' },
        { id: 'other-host', title: 'P', file: '//evil.example/p.json' },
        null,
      ],
    });
    expect(entries.map((e) => e.id)).toEqual(['ok']);
    expect(errors).toHaveLength(6);
    expect(errors.join(' ')).toMatch(/repeats the id "ok"/);
  });

  it('drops malformed optional fields but keeps the entry', () => {
    const { entries } = parseTimelineIndex({
      timelines: [{ id: 'a', title: 'A', file: 'a.json', eventCount: -1, calendar: { before: 'BCE' }, defaultTheme: 7 }],
    });
    expect(entries).toEqual([{ id: 'a', title: 'A', file: 'a.json' }]);
  });

  it('needs a "timelines" list', () => {
    expect(parseTimelineIndex({}).errors).toEqual(['The index needs a "timelines" list.']);
    expect(parseTimelineIndex(null).entries).toEqual([]);
  });
});

describe('writing the index (npm run data -- index)', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
  const timeline = (id: string, title: string): Dataset => {
    const d = plainTimeline();
    return { ...d, meta: { ...d.meta, id, title } };
  };
  const write = (file: string, d: unknown) => writeFileSync(join(dir, file), JSON.stringify(d));

  it('keeps the order, refreshes listed files, adds new ones, drops missing ones and keeps remote entries', () => {
    dir = mkdtempSync(join(tmpdir(), 'timelines-'));
    write('b.json', timeline('b', 'B'));
    write('c.json', timeline('c', 'C'));
    write('index.json', {
      timelines: [
        { id: 'b', title: 'Old title', file: 'b.json', eventCount: 99 },
        { id: 'gone', title: 'Gone', file: 'gone.json' },
        { id: 'far', title: 'Far', file: 'https://example.org/far.json' },
      ],
    });
    const { text, notes } = timelineIndexText(dir);
    const list = JSON.parse(text).timelines;
    expect(list.map((e: { id: string }) => e.id)).toEqual(['b', 'far', 'c']);
    expect(list[0]).toEqual({ file: 'b.json', ...summarize(timeline('b', 'B')) });
    expect(list[0].eventCount).toBe(plainTimeline().events.length);
    expect(notes).toEqual(['dropped gone: gone.json is gone']);
  });

  it('leaves out files that are not valid timelines', () => {
    dir = mkdtempSync(join(tmpdir(), 'timelines-'));
    write('a.json', timeline('a', 'A'));
    write('broken.json', { schemaVersion: 3 });
    const { text, notes } = timelineIndexText(dir);
    expect(JSON.parse(text).timelines.map((e: { id: string }) => e.id)).toEqual(['a']);
    expect(notes[0]).toMatch(/^broken\.json left out/);
  });

  it('the site index in public/timelines is up to date', () => {
    expect(readFileSync('public/timelines/index.json', 'utf8')).toBe(timelineIndexText('public/timelines').text);
  });
});
