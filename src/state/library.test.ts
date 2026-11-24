import { describe, expect, it } from 'vitest';
import { addToLibrary, entryId, entrySummary, fetchTimeline, isSafeUrl, LIBRARY_KEY, loadEntryDataset, loadLibrary, normalizeUrl, removeFromLibrary, sessionCopy, updateSummary, type BigStore } from './library.ts';
import { draftKey } from './dataset.ts';
import { validateDataset } from '../data/validate.ts';
import combined from '../../public/timelines/ancient-classical.json';
import type { Dataset } from '../types.ts';

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

const mine = (id: string, title = id): Dataset => {
  const d = structuredClone(combined as unknown as Dataset);
  d.meta = { ...d.meta, id, title };
  return d;
};

describe('library', () => {
  it('adds, lists, replaces and removes timelines', async () => {
    const store = memoryStore();
    await addToLibrary(mine('greece'), { store, now: '2026-01-01' });
    expect(loadLibrary(store).map((e) => e.dataset!.meta.id)).toEqual(['greece']);

    // the same timeline again (same id, no URL) replaces it and keeps addedAt
    const again = await addToLibrary(mine('greece', 'Greece v2'), { store, now: '2026-02-01' });
    expect(loadLibrary(store)).toHaveLength(1);
    expect(again.dataset.meta.title).toBe('Greece v2');
    expect(again.addedAt).toBe('2026-01-01');
    expect(again.updatedAt).toBe('2026-02-01');

    store.setItem(draftKey('greece'), '{}');
    await removeFromLibrary('greece', store);
    expect(loadLibrary(store)).toEqual([]);
    expect(store.getItem(draftKey('greece'))).toBeNull();
  });

  it('renames a timeline whose id clashes with a bundled one', async () => {
    const store = memoryStore();
    const e = await addToLibrary(mine('ancient-classical'), { store, reservedIds: ['ancient-classical', 'second-site'] });
    expect(e.dataset!.meta.id).toBe('ancient-classical-2');
    expect(validateDataset(e.dataset)).toEqual([]);
  });

  it('keeps timelines from different links apart, and updates one from the same link', async () => {
    const store = memoryStore();
    await addToLibrary(mine('egypt'), { store, sourceUrl: 'https://a.example/egypt.json' });
    const other = await addToLibrary(mine('egypt'), { store, sourceUrl: 'https://b.example/egypt.json' });
    expect(other.dataset.meta.id).toBe('egypt-2');
    // the first link's file now uses a different id: still the same entry
    const updated = await addToLibrary(mine('egypt-renamed', 'New'), { store, sourceUrl: 'https://a.example/egypt.json' });
    expect(updated.dataset.meta.id).toBe('egypt');
    expect(loadLibrary(store).map((e) => [e.dataset!.meta.id, e.dataset!.meta.title])).toEqual([
      ['egypt', 'New'],
      ['egypt-2', 'egypt'],
    ]);
  });

  it('ignores unreadable storage', async () => {
    const store = memoryStore();
    store.setItem('timelines:library', 'not json');
    expect(loadLibrary(store)).toEqual([]);
  });
});

describe('fetchTimeline', () => {
  const ok = (body: string) => (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;

  it('loads and validates a timeline', async () => {
    const ds = await fetchTimeline('https://x.example/t.json', ok(JSON.stringify(combined)));
    expect(ds.meta.id).toBe('ancient-classical');
  });

  it('explains failures', async () => {
    await expect(fetchTimeline('ftp://x/t.json', ok('{}'))).rejects.toThrow(/http/);
    await expect(fetchTimeline('https://x/t.json', ok('nope'))).rejects.toThrow(/valid timeline/);
    const notFound = (async () => new Response('', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch;
    await expect(fetchTimeline('https://x/t.json', notFound)).rejects.toThrow(/404/);
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(fetchTimeline('https://x/t.json', offline)).rejects.toThrow(/CORS/);
  });

  it('turns GitHub page links into raw links', async () => {
    expect(normalizeUrl('https://github.com/me/repo/blob/main/data/t.json')).toBe(
      'https://raw.githubusercontent.com/me/repo/main/data/t.json',
    );
    expect(normalizeUrl(' https://example.com/t.json ')).toBe('https://example.com/t.json');
  });
});

describe('URL safety', () => {
  it('allows web links and relative paths only', async () => {
    for (const u of ['https://a.b/c', 'http://a.b', 'timelines/example/logo.svg', './x.svg', '/x.svg'])
      expect(isSafeUrl(u), u).toBe(true);
    for (const u of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.example/x', 'vbscript:x'])
      expect(isSafeUrl(u), u).toBe(false);
  });

  it('rejects datasets with unsafe links or images', async () => {
    const d = mine('bad');
    d.sources[Object.keys(d.sources)[0]].url = 'javascript:alert(1)';
    d.tracks[0].image = 'data:image/svg+xml,<svg/>';
    d.meta.creditsImage = '//evil.example/x.png';
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/Source .* url must be/);
    expect(errs).toMatch(/Track .* image must be/);
    expect(errs).toMatch(/creditsImage must be/);
  });
});

describe('a library over the browser\'s storage limit', () => {
  /** A store that refuses values over `max` characters, as a full localStorage does. */
  const smallStore = (max: number) => {
    const s = memoryStore();
    return { ...s, setItem: (k: string, v: string) => {
      if (v.length > max) throw new DOMException('quota', 'QuotaExceededError');
      s.setItem(k, v);
    } };
  };
  const URL_ = 'https://files.example/big.json';
  it('keeps a linked timeline too large to store as its link and summary, and still returns it whole', async () => {
    const store = smallStore(20_000);
    const added = await addToLibrary(mine('big', 'Big One'), { store, sourceUrl: URL_, big: undefined });
    expect(added.dataset.events.length).toBeGreaterThan(100);
    const [kept] = loadLibrary(store);
    expect(kept.dataset).toBeUndefined();
    expect(kept.linkOnly).toMatchObject({ id: 'big', title: 'Big One' });
    expect(kept.sourceUrl).toBe(URL_);
    expect(entryId(kept)).toBe('big');
    expect(sessionCopy(kept)?.meta.id).toBe('big'); // opening it now doesn't fetch it again
    await removeFromLibrary('big', store, undefined);
    expect(loadLibrary(store)).toEqual([]);
  });
  it('an uploaded file too large to store still says the storage is full', async () => {
    await expect(addToLibrary(mine('big'), { store: smallStore(20_000), big: undefined })).rejects.toThrow(/storage is full/);
  });
  it('a linked timeline that fits is kept whole', async () => {
    const store = smallStore(50_000_000);
    await addToLibrary(mine('small'), { store, sourceUrl: URL_, big: undefined });
    expect(loadLibrary(store)[0].dataset?.meta.id).toBe('small');
  });
});

describe('a library with IndexedDB behind it', () => {
  const smallStore = (max: number) => {
    const s = memoryStore();
    return { ...s, setItem: (k: string, v: string) => {
      if (v.length > max) throw new DOMException('quota', 'QuotaExceededError');
      s.setItem(k, v);
    } };
  };
  /** An in-memory stand-in for IndexedDB. */
  const memoryBig = (failPut = false): BigStore & { map: Map<string, Dataset> } => {
    const map = new Map<string, Dataset>();
    return {
      map,
      get: async (id) => map.get(id),
      put: async (id, d) => {
        if (failPut) throw new DOMException('quota', 'QuotaExceededError');
        map.set(id, d);
      },
      delete: async (id) => void map.delete(id),
    };
  };

  it('keeps an uploaded timeline too large for localStorage in IndexedDB, with its summary in the list', async () => {
    const store = smallStore(20_000), big = memoryBig();
    const added = await addToLibrary(mine('big', 'Big One'), { store, big });
    expect(added.dataset.events.length).toBeGreaterThan(100);
    const [kept] = loadLibrary(store);
    expect(kept.dataset).toBeUndefined();
    expect(kept.big).toMatchObject({ id: 'big', title: 'Big One' });
    expect(entrySummary(kept).title).toBe('Big One');
    expect((await loadEntryDataset(kept, big))?.events).toHaveLength(added.dataset.events.length);
    await removeFromLibrary('big', store, big);
    expect(loadLibrary(store)).toEqual([]);
    expect(big.map.size).toBe(0);
  });

  it('keeps a linked timeline in IndexedDB too, so it opens without the network', async () => {
    const store = smallStore(20_000), big = memoryBig();
    await addToLibrary(mine('big', 'Big One'), { store, big, sourceUrl: 'https://files.example/big.json' });
    const [kept] = loadLibrary(store);
    expect(kept.big?.id).toBe('big');
    expect(kept.linkOnly).toBeUndefined();
    expect((await loadEntryDataset(kept, big))?.meta.title).toBe('Big One');
  });

  it('falls back when IndexedDB refuses it: a linked timeline becomes link-only, an upload says the storage is full', async () => {
    const store = smallStore(20_000), big = memoryBig(true);
    await addToLibrary(mine('big'), { store, big, sourceUrl: 'https://files.example/big.json' });
    expect(loadLibrary(store)[0].linkOnly?.id).toBe('big');
    await expect(addToLibrary(mine('other'), { store, big })).rejects.toThrow(/storage is full/);
  });

  it('drops the IndexedDB copy when the timeline is replaced by a version that fits', async () => {
    const store = memoryStore(), big = memoryBig();
    big.map.set('t', mine('t'));
    store.setItem(LIBRARY_KEY, JSON.stringify([{ big: { id: 't', title: 't' }, addedAt: 'a', updatedAt: 'a' }]));
    await addToLibrary({ ...mine('t'), events: [] }, { store, big });
    expect(loadLibrary(store)[0].dataset?.meta.id).toBe('t');
    expect(big.map.size).toBe(0);
  });

  it("a large entry's picker summary follows the timeline when it is opened", async () => {
    const store = smallStore(20_000), big = memoryBig();
    await addToLibrary(mine('big', 'Old title'), { store, big, sourceUrl: 'https://files.example/big.json' });
    updateSummary(mine('big', 'New title'), store);
    expect(entrySummary(loadLibrary(store)[0]).title).toBe('New title');
  });

  it("a link-only entry's picker summary follows the timeline when it is opened", async () => {
    const store = smallStore(20_000);
    await addToLibrary(mine('big', 'Old title'), { store, big: undefined, sourceUrl: 'https://files.example/big.json' });
    updateSummary(mine('big', 'New title'), store);
    expect(entrySummary(loadLibrary(store)[0]).title).toBe('New title');
  });
});
