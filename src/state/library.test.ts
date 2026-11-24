import { describe, expect, it } from 'vitest';
import { addToLibrary, entryId, fetchTimeline, isSafeUrl, loadLibrary, normalizeUrl, removeFromLibrary, sessionCopy } from './library.ts';
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
  it('adds, lists, replaces and removes timelines', () => {
    const store = memoryStore();
    addToLibrary(mine('greece'), { store, now: '2026-01-01' });
    expect(loadLibrary(store).map((e) => e.dataset!.meta.id)).toEqual(['greece']);

    // the same timeline again (same id, no URL) replaces it and keeps addedAt
    const again = addToLibrary(mine('greece', 'Greece v2'), { store, now: '2026-02-01' });
    expect(loadLibrary(store)).toHaveLength(1);
    expect(again.dataset.meta.title).toBe('Greece v2');
    expect(again.addedAt).toBe('2026-01-01');
    expect(again.updatedAt).toBe('2026-02-01');

    store.setItem(draftKey('greece'), '{}');
    removeFromLibrary('greece', store);
    expect(loadLibrary(store)).toEqual([]);
    expect(store.getItem(draftKey('greece'))).toBeNull();
  });

  it('renames a timeline whose id clashes with a bundled one', () => {
    const store = memoryStore();
    const e = addToLibrary(mine('ancient-classical'), { store, reservedIds: ['ancient-classical', 'second-site'] });
    expect(e.dataset!.meta.id).toBe('ancient-classical-2');
    expect(validateDataset(e.dataset)).toEqual([]);
  });

  it('keeps timelines from different links apart, and updates one from the same link', () => {
    const store = memoryStore();
    addToLibrary(mine('egypt'), { store, sourceUrl: 'https://a.example/egypt.json' });
    const other = addToLibrary(mine('egypt'), { store, sourceUrl: 'https://b.example/egypt.json' });
    expect(other.dataset.meta.id).toBe('egypt-2');
    // the first link's file now uses a different id: still the same entry
    const updated = addToLibrary(mine('egypt-renamed', 'New'), { store, sourceUrl: 'https://a.example/egypt.json' });
    expect(updated.dataset.meta.id).toBe('egypt');
    expect(loadLibrary(store).map((e) => [e.dataset!.meta.id, e.dataset!.meta.title])).toEqual([
      ['egypt', 'New'],
      ['egypt-2', 'egypt'],
    ]);
  });

  it('ignores unreadable storage', () => {
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

  it('turns GitHub page links into raw links', () => {
    expect(normalizeUrl('https://github.com/me/repo/blob/main/data/t.json')).toBe(
      'https://raw.githubusercontent.com/me/repo/main/data/t.json',
    );
    expect(normalizeUrl(' https://example.com/t.json ')).toBe('https://example.com/t.json');
  });
});

describe('URL safety', () => {
  it('allows web links and relative paths only', () => {
    for (const u of ['https://a.b/c', 'http://a.b', 'timelines/example/logo.svg', './x.svg', '/x.svg'])
      expect(isSafeUrl(u), u).toBe(true);
    for (const u of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.example/x', 'vbscript:x'])
      expect(isSafeUrl(u), u).toBe(false);
  });

  it('rejects datasets with unsafe links or images', () => {
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
  it('keeps a linked timeline too large to store as its link and summary, and still returns it whole', () => {
    const store = smallStore(20_000);
    const added = addToLibrary(mine('big', 'Big One'), { store, sourceUrl: URL_ });
    expect(added.dataset.events.length).toBeGreaterThan(100);
    const [kept] = loadLibrary(store);
    expect(kept.dataset).toBeUndefined();
    expect(kept.linkOnly).toMatchObject({ id: 'big', title: 'Big One' });
    expect(kept.sourceUrl).toBe(URL_);
    expect(entryId(kept)).toBe('big');
    expect(sessionCopy(kept)?.meta.id).toBe('big'); // opening it now doesn't fetch it again
    removeFromLibrary('big', store);
    expect(loadLibrary(store)).toEqual([]);
  });
  it('an uploaded file too large to store still says the storage is full', () => {
    expect(() => addToLibrary(mine('big'), { store: smallStore(20_000) })).toThrow(/storage is full/);
  });
  it('a linked timeline that fits is kept whole', () => {
    const store = smallStore(50_000_000);
    addToLibrary(mine('small'), { store, sourceUrl: URL_ });
    expect(loadLibrary(store)[0].dataset?.meta.id).toBe('small');
  });
});
