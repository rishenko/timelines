import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types.ts';
import { applyChanges, changesFromLegacyCopy, diffDataset, isEmpty } from './draft.ts';
import { draftKey, draftToStore, loadInitial, restoreDraft, saveReplaceDraft, unreadableDraftKey } from './dataset.ts';
import { validateDataset } from '../data/validate.ts';
import example from '../../docs/examples/example-timeline.json';
import combined from '../../public/timelines/ancient-classical.json';

const base = () => structuredClone(example) as unknown as Dataset;
const ev = (d: Dataset, uuid: string) => d.events.find((e) => e.uuid === uuid)!;

describe('drafts stored as changes', () => {
  it('an unchanged timeline has no changes, and a round trip gives back the edited timeline', () => {
    const pub = base();
    expect(isEmpty(diffDataset(pub, pub))).toBe(true);
    const edited = base();
    ev(edited, 'founding').title = 'Founding (my note)';
    edited.events = edited.events.filter((e) => e.uuid !== 'river-treaty');
    edited.tracks.reverse();
    edited.sources.mine = { name: 'My source', tags: ['custom'] } as Dataset['sources'][string];
    expect(applyChanges(pub, diffDataset(pub, edited))).toEqual(edited);
  });

  it('later published fixes reach a reader with a draft; their own edits win', () => {
    const pub = base();
    const mine = base();
    ev(mine, 'founding').title = 'My founding';
    ev(mine, 'founding').edited = true;
    const changes = diffDataset(pub, mine);

    const newer = base();
    ev(newer, 'founding').title = 'Publisher’s founding'; // both changed: the reader wins
    ev(newer, 'first-war').descr = 'A published fix'; // only the publisher changed it: the fix arrives
    newer.events.push({ ...ev(newer, 'first-war'), uuid: 'new-published', title: 'New published event', links: undefined });

    const out = applyChanges(newer, changes);
    expect(ev(out, 'founding').title).toBe('My founding');
    expect(ev(out, 'first-war').descr).toBe('A published fix');
    expect(out.events.some((e) => e.uuid === 'new-published')).toBe(true);
    expect(validateDataset(out)).toEqual([]);
  });

  it('what the reader removed stays removed', () => {
    const pub = base();
    const mine = base();
    mine.events = mine.events.filter((e) => e.uuid !== 'river-treaty');
    const newer = base();
    ev(newer, 'river-treaty').descr = 'Updated upstream';
    expect(applyChanges(newer, diffDataset(pub, mine)).events.some((e) => e.uuid === 'river-treaty')).toBe(false);
  });

  it('keeps the reader’s row order and slots new published rows after their predecessor', () => {
    const pub = base();
    const mine = base();
    const [a, b] = [mine.tracks.findIndex((t) => t.id === 'the-north'), mine.tracks.findIndex((t) => t.id === 'the-south')];
    [mine.tracks[a], mine.tracks[b]] = [mine.tracks[b], mine.tracks[a]];
    const newer = base();
    const i = newer.tracks.findIndex((t) => t.id === 'serath');
    newer.tracks.splice(i + 1, 0, { id: 'new-row', name: 'New row', color: '#000', parent: 'the-south' });
    const order = applyChanges(newer, diffDataset(pub, mine)).tracks.map((t) => t.id);
    expect(order.indexOf('the-south')).toBeLessThan(order.indexOf('the-north'));
    expect(order.indexOf('new-row')).toBe(order.indexOf('serath') + 1);
  });
});

describe('restoring saved drafts', () => {
  it('a current draft replays and reports whether the published data changed since', () => {
    const pub = base();
    const mine = base();
    ev(mine, 'founding').title = 'Mine';
    const stored = JSON.parse(JSON.stringify(draftToStore(pub, mine)));
    expect(restoreDraft(pub, stored)).toMatchObject({ updated: false });
    const newer = base();
    ev(newer, 'first-war').descr = 'fix';
    const r = restoreDraft(newer, stored)!;
    expect(r.updated).toBe(true);
    expect(ev(r.data, 'founding').title).toBe('Mine');
    expect(ev(r.data, 'first-war').descr).toBe('fix');
  });

  it('an old full-copy draft keeps its edits but never deletes newer published data', () => {
    const old = base();
    ev(old, 'founding').title = 'Edited long ago';
    ev(old, 'founding').edited = true;
    const newer = base();
    newer.events.push({ ...ev(newer, 'first-war'), uuid: 'added-later', title: 'Added later', links: undefined });
    const r = restoreDraft(newer, old)!;
    expect(r.updated).toBe(true);
    expect(ev(r.data, 'founding').title).toBe('Edited long ago');
    expect(r.data.events.some((e) => e.uuid === 'added-later')).toBe(true);
    expect(changesFromLegacyCopy(newer, old).events.remove).toEqual([]);
  });

  it('a whole uploaded file applies in full, deletions included', () => {
    const pub = base();
    const upload = base();
    upload.events = upload.events
      .filter((e) => e.uuid !== 'river-treaty')
      .map((e) => ({ ...e, links: e.links?.filter((l) => l.to !== 'river-treaty') }));
    const r = restoreDraft(pub, { format: 'replace', data: upload })!;
    expect(r.data.events.some((e) => e.uuid === 'river-treaty')).toBe(false);
  });

  it('nothing stored, or nothing changed, means no draft', () => {
    expect(restoreDraft(base(), null)).toBeNull();
    expect(draftToStore(base(), base())).toBeNull();
  });

  it('a one-event edit to the large combined timeline stores a small draft', () => {
    const pub = structuredClone(combined) as unknown as Dataset;
    const mine = structuredClone(pub);
    mine.events[0] = { ...mine.events[0], title: 'Edited', edited: true };
    const size = JSON.stringify(draftToStore(pub, mine)).length;
    expect(size).toBeLessThan(5000);
    expect(JSON.stringify(pub).length).toBeGreaterThan(100 * size);
  });
});

describe('opening a timeline with a draft that no longer applies', () => {
  const stub = () => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as Storage;
    return store;
  };

  it('keeps the draft under a backup key instead of losing it', () => {
    const store = stub();
    const pub = base();
    // a change that makes the timeline invalid: an event on a track that doesn't exist
    const bad = { format: 'changes', base: 'x', changes: { events: { upsert: [{ ...ev(pub, 'founding'), tracks: ['nowhere'] }], remove: [] }, tracks: { upsert: [], remove: [] }, sources: { upsert: {}, remove: [] } } };
    store.set(draftKey(pub.meta.id), JSON.stringify(bad));
    const state = loadInitial(pub);
    expect(state.dirty).toBe(false);
    expect(state.unreadableDraft).toBe(true);
    expect(JSON.parse(store.get(unreadableDraftKey(pub.meta.id))!)).toEqual(bad);
  });

  it('opens a good draft as before, with no backup', () => {
    const store = stub();
    const pub = base();
    const edited = base();
    ev(edited, 'founding').title = 'Changed';
    store.set(draftKey(pub.meta.id), JSON.stringify(draftToStore(pub, edited)));
    const state = loadInitial(pub);
    expect(state.dirty).toBe(true);
    expect(ev(state.data, 'founding').title).toBe('Changed');
    expect(store.has(unreadableDraftKey(pub.meta.id))).toBe(false);
  });
});

describe('a whole file uploaded for another timeline', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { m, store: { setItem: (k: string, v: string) => void m.set(k, v) } };
  };
  it('is kept as that timeline\'s replace draft', () => {
    const { m, store } = memory();
    saveReplaceDraft('second-site', base(), 'A Second Timeline', store);
    expect(JSON.parse(m.get(draftKey('second-site'))!)).toMatchObject({ format: 'replace' });
  });
  it('over the storage limit says so, readably, and keeps the draft already stored', () => {
    const m = new Map<string, string>([[draftKey('second-site'), 'earlier draft']]);
    const full = {
      setItem: (k: string, v: string) => {
        if (v.length > 1000) throw new DOMException('quota', 'QuotaExceededError');
        m.set(k, v);
      },
    };
    expect(() => saveReplaceDraft('second-site', base(), 'A Second Timeline', full)).toThrow(/too large to keep in this browser as a replacement for "A Second Timeline"/);
    expect(m.get(draftKey('second-site'))).toBe('earlier draft');
  });
});
