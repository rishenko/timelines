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

describe('making the index (timelines/index.json, at build time)', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
  const timeline = (id: string, title: string): Dataset => {
    const d = plainTimeline();
    return { ...d, meta: { ...d.meta, id, title } };
  };
  const write = (file: string, d: unknown) => writeFileSync(join(dir, file), JSON.stringify(d));

  it('orders by site-timelines.json, makes entries from the files, adds unlisted files and keeps remote entries', () => {
    dir = mkdtempSync(join(tmpdir(), 'timelines-'));
    write('b.json', timeline('b', 'B'));
    write('c.json', timeline('c', 'C'));
    write('a.json', timeline('a', 'A'));
    const order = `${dir}-order.json`;
    writeFileSync(order, JSON.stringify({
      timelines: ['c', 'gone', { id: 'far', title: 'Far', file: 'https://example.org/far.json' }, { id: 'near', title: 'Near', file: 'near.json' }, 'b'],
    }));
    const { text, notes } = timelineIndexText(dir, order);
    rmSync(order);
    const list = JSON.parse(text).timelines;
    expect(list.map((e: { id: string }) => e.id)).toEqual(['c', 'far', 'b', 'a']);
    expect(list[2]).toEqual({ file: 'b.json', ...summarize(timeline('b', 'B')) });
    expect(list[2].eventCount).toBe(plainTimeline().events.length);
    expect(notes).toEqual([`${order}: near left out: list a file in public/timelines by its id`, 'dropped gone: no timeline file with that id']);
  });

  it('without an order file, lists the files by name', () => {
    dir = mkdtempSync(join(tmpdir(), 'timelines-'));
    write('b.json', timeline('b', 'B'));
    write('a.json', timeline('a', 'A'));
    expect(JSON.parse(timelineIndexText(dir, join(dir, 'none.json')).text).timelines.map((e: { id: string }) => e.id)).toEqual(['a', 'b']);
  });

  it('leaves out files that are not valid timelines', () => {
    dir = mkdtempSync(join(tmpdir(), 'timelines-'));
    write('a.json', timeline('a', 'A'));
    write('broken.json', { schemaVersion: 3 });
    const { text, notes } = timelineIndexText(dir, join(dir, 'none.json'));
    expect(JSON.parse(text).timelines.map((e: { id: string }) => e.id)).toEqual(['a']);
    expect(notes[0]).toMatch(/^broken\.json left out/);
  });

  it("the site's list names every bundled timeline in data-src/site-timelines.json, and leaves none out", () => {
    const { text, notes } = timelineIndexText();
    expect(notes).toEqual([]);
    const order = JSON.parse(readFileSync('data-src/site-timelines.json', 'utf8')).timelines;
    expect(JSON.parse(text).timelines.map((e: { id: string }) => e.id)).toEqual(order);
  });
});
