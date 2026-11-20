// @vitest-environment jsdom
// Shared lists: reading one (addresses resolved against the list), saving, removing, and where their timelines sit
// among the site's and the reader's own.
import { afterEach, describe, expect, it } from 'vitest';
import { COLLECTIONS_KEY, collectionName, loadCollections, parseCollection, removeCollection, saveCollection } from './collections.ts';
import { addToLibrary, loadLibrary } from './library.ts';
import { draftKey } from './dataset.ts';
import { addFromLink, listTimelines, reservedIds } from './timelines.ts';
import { SITE } from '../test/app.tsx';
import { plainTimeline } from '../test/fixtures.ts';

afterEach(() => localStorage.clear());

const URL_ = 'https://lists.example/club/list.json';
const list = (...ids: string[]) => ({
  title: 'Reading club',
  timelines: ids.map((id) => ({ id, title: `T ${id}`, file: `files/${id}.json` })),
});

describe('parseCollection', () => {
  it("resolves each file against the list's own address and keeps the title", () => {
    const c = parseCollection(
      { title: ' Reading club ', timelines: [{ id: 'a', title: 'A', file: 'files/a.json' }, { id: 'b', title: 'B', file: 'https://other.example/b.json' }] },
      URL_,
    );
    expect(c.title).toBe('Reading club');
    expect(c.entries.map((e) => e.file)).toEqual(['https://lists.example/club/files/a.json', 'https://other.example/b.json']);
  });

  it('leaves out unusable entries, and refuses a list with none left', () => {
    expect(parseCollection({ timelines: [{ id: 'a', title: 'A', file: 'a.json' }, { id: 'bad id', title: 'B', file: 'b.json' }] }, URL_).entries).toHaveLength(1);
    expect(() => parseCollection({ timelines: [{ id: 'a', title: 'A', file: 'javascript:alert(1)' }] }, URL_)).toThrow(/no timelines/);
    expect(() => parseCollection({ timelines: [] }, URL_)).toThrow(/no timelines/);
  });

  it('names an untitled list by its site', () => {
    expect(collectionName({ url: URL_ })).toBe('lists.example');
    expect(collectionName({ url: URL_, title: 'Club' })).toBe('Club');
  });
});

describe('saved lists', () => {
  it('replaces the saved copy from the same address, keeping when it was added', () => {
    saveCollection(parseCollection(list('a'), URL_), { now: '2026-01-01T00:00:00Z' });
    saveCollection(parseCollection(list('a', 'b'), URL_), { now: '2026-02-01T00:00:00Z' });
    const [c, ...rest] = loadCollections();
    expect(rest).toHaveLength(0);
    expect(c.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect([c.addedAt, c.updatedAt]).toEqual(['2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z']);
  });

  it('ignores unreadable storage', () => {
    localStorage.setItem(COLLECTIONS_KEY, '{not json');
    expect(loadCollections()).toEqual([]);
  });

  it("removing a list deletes the reader's edits to its timelines, but not to timelines listed elsewhere", () => {
    saveCollection(parseCollection(list('a', 'b', 'classical'), URL_));
    for (const id of ['a', 'b', 'classical']) localStorage.setItem(draftKey(id), '{}');
    saveCollection(parseCollection(list('b'), 'https://other.example/list.json'));
    removeCollection(URL_, ['classical']);
    expect(loadCollections().map((c) => c.url)).toEqual(['https://other.example/list.json']);
    expect(['a', 'b', 'classical'].map((id) => localStorage.getItem(draftKey(id)) !== null)).toEqual([false, true, true]);
  });
});

describe('listTimelines with shared lists', () => {
  it("lists the site's, then the lists', then the reader's own; taken ids are left out of lists", () => {
    addToLibrary(plainTimeline());
    saveCollection(parseCollection(list('a', 'classical', plainTimeline().meta.id), URL_));
    saveCollection(parseCollection(list('a', 'z'), 'https://other.example/list.json'));
    const got = listTimelines(SITE).map((t) => `${t.collection ? collectionName(t.collection) + ':' : t.library ? 'own:' : ''}${t.summary.id}`);
    expect(got).toEqual([...SITE.map((t) => t.id), 'Reading club:a', 'Reading club:z', `own:${plainTimeline().meta.id}`]);
  });

  it("a list's timeline carries its full file address, so it loads like the site's", () => {
    saveCollection(parseCollection(list('a'), URL_));
    expect(listTimelines([]).find((t) => t.summary.id === 'a')?.entry?.file).toBe('https://lists.example/club/files/a.json');
  });

  it("new library timelines can't take a list's ids", () => {
    saveCollection(parseCollection(list(plainTimeline().meta.id), URL_));
    expect(reservedIds(SITE)).toContain(plainTimeline().meta.id);
    expect(addToLibrary(plainTimeline(), { reservedIds: reservedIds(SITE) }).dataset.meta.id).not.toBe(plainTimeline().meta.id);
  });
});

describe('addFromLink', () => {
  const serve = (body: unknown) => (async () => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response) as typeof fetch;

  it('saves a list and returns its first timeline', async () => {
    expect(await addFromLink(URL_, SITE, serve(list('a', 'b')))).toBe('a');
    expect(loadCollections()).toHaveLength(1);
    expect(loadLibrary()).toHaveLength(0);
  });

  it('adds a timeline to the library', async () => {
    expect(await addFromLink('https://files.example/t.json', SITE, serve(plainTimeline()))).toBe(plainTimeline().meta.id);
    expect(loadLibrary()[0].sourceUrl).toBe('https://files.example/t.json');
  });

  it("refuses, and doesn't keep, a new list whose timelines are all here already", async () => {
    await expect(addFromLink(URL_, SITE, serve(list('classical')))).rejects.toThrow(/already here/);
    expect(loadCollections()).toEqual([]);
  });

  it('says what is wrong with a file that is neither', async () => {
    await expect(addFromLink(URL_, SITE, serve({ hello: 1 }))).rejects.toThrow(/isn't a valid timeline/);
  });
});
