import { describe, expect, it } from 'vitest';
import type { Dataset, Track } from '../types.ts';
import {
  datingParam,
  readDating,
  readSwitches,
  readTags,
  ROW_PARAMS,
  rowBranches,
  skippedNotice,
  SOURCE_PARAMS,
  sourceBaseline,
  switchParams,
  unknownCount,
} from './viewLink.ts';

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
const allOn = () => true;
const query = (ps: [string, string][]) => new URLSearchParams(ps);
const roundTrip = (on: Record<string, boolean>, byDefault: (id: string) => boolean = allOn) => {
  const ps = switchParams(ids, (id) => on[id], byDefault, ROW_PARAMS);
  return { ps, back: readSwitches(query(ps), ids, byDefault, ROW_PARAMS)!.on };
};

describe('switchParams / readSwitches', () => {
  it('writes nothing when nothing differs from the defaults, and reads nothing back', () => {
    expect(switchParams(ids, allOn, allOn, ROW_PARAMS)).toEqual([]);
    expect(readSwitches(query([]), ids, allOn, ROW_PARAMS)).toBeNull();
  });

  it('lists switched-off ids while that is shorter, and only the ones on when that is', () => {
    const few = Object.fromEntries(ids.map((id) => [id, id !== 'b']));
    expect(roundTrip(few).ps).toEqual([['hide', 'b']]);
    expect(roundTrip(few).back).toEqual(few);
    const most = Object.fromEntries(ids.map((id) => [id, id === 'e']));
    expect(roundTrip(most).ps).toEqual([['show', 'e']]);
    expect(roundTrip(most).back).toEqual(most);
  });

  it('writes both directions against mixed defaults, and "all" when every one is on', () => {
    const many = [...'abcdefghijkl'];
    const byDefault = (id: string) => id !== 'l';
    const on = Object.fromEntries(many.map((id) => [id, id !== 'a']));
    const ps = switchParams(many, (id) => on[id], byDefault, ROW_PARAMS);
    expect(ps).toEqual([['hide', 'a'], ['unhide', 'l']]);
    expect(readSwitches(query(ps), many, byDefault, ROW_PARAMS)!.on).toEqual(on);
    const every = Object.fromEntries(ids.map((id) => [id, true]));
    const folds = switchParams(ids, (id) => every[id], () => false, ROW_PARAMS);
    expect(folds).toEqual([['show', 'all']]);
    expect(readSwitches(query(folds), ids, () => false, ROW_PARAMS)!.on).toEqual(every);
  });

  it('"none" (or an empty list) means every one off', () => {
    const off = Object.fromEntries(ids.map((id) => [id, false]));
    expect(switchParams(ids, () => false, allOn, ROW_PARAMS)).toEqual([['show', 'none']]);
    expect(readSwitches(query([['show', 'none']]), ids, allOn, ROW_PARAMS)!.on).toEqual(off);
    expect(readSwitches(query([['show', '']]), ids, allOn, ROW_PARAMS)!.on).toEqual(off);
  });

  it('skips and counts ids the timeline no longer has', () => {
    const r = readSwitches(query([['hide', 'a,gone,b'], ['unhide', 'old']]), ids, allOn, ROW_PARAMS)!;
    expect(r.skipped).toBe(2);
    expect(r.on.a).toBe(false);
    expect(r.on.c).toBe(true);
    expect(readSwitches(query([['src', 'gone,c']]), ids, allOn, SOURCE_PARAMS)).toMatchObject({ skipped: 1, on: { c: true, a: false } });
  });
});

describe('rowBranches', () => {
  const t = (id: string, parent?: string) => ({ id, name: id, color: '#000', parent }) as Track;
  const tracks = [t('africa'), t('egypt', 'africa'), t('old', 'egypt'), t('new', 'egypt'), t('nubia', 'africa'), t('rome'), t('greece'), t('persia')];
  const rows = tracks.map((x) => x.id);
  const branches = rowBranches(tracks);

  it('writes a row and everything below it as row*, and reads it back', () => {
    const on: Record<string, boolean> = { africa: false, egypt: false, old: false, new: false, nubia: false, rome: true, greece: true, persia: true };
    const ps = switchParams(rows, (id) => on[id], () => true, ROW_PARAMS, branches);
    expect(ps).toEqual([['hide', 'africa*']]);
    expect(readSwitches(query(ps), rows, () => true, ROW_PARAMS, branches)!.on).toEqual(on);
  });

  it('keeps single ids where a branch is only partly listed, and skips unknown branches', () => {
    expect(branches.pack(['egypt', 'old', 'nubia'])).toEqual(['egypt', 'old', 'nubia']);
    expect(branches.pack(['egypt', 'old', 'new', 'rome'])).toEqual(['egypt*', 'rome']);
    expect(branches.unpack('rome*')).toEqual(['rome']);
    expect(branches.unpack('gone*')).toBeNull();
  });
});

const ds = {
  meta: {},
  tracks: [],
  events: [],
  tags: { wiki: { name: 'Wikipedia' }, books: { name: 'Books' } },
  sources: {
    w1: { tags: ['wiki'] },
    w2: { tags: ['wiki'] },
    b1: { tags: ['books'] },
    x: { tags: [], hiddenByDefault: true },
  },
  chronologies: {
    middle: { group: 'Mesopotamia', default: true },
    low: { group: 'Mesopotamia' },
    shaw: { group: 'Egypt', default: true },
    hornung: { group: 'Egypt' },
  },
} as unknown as Dataset;

describe('tags and sources', () => {
  it('a switched-off tag turns off its sources in the baseline, so they are not listed one by one', () => {
    const base = sourceBaseline(ds, ['wiki']);
    expect(['w1', 'w2', 'b1', 'x'].map(base)).toEqual([false, false, true, false]);
    const on = { w1: false, w2: true, b1: true, x: false };
    expect(switchParams(Object.keys(ds.sources), (k) => on[k as keyof typeof on], base, SOURCE_PARAMS)).toEqual([['addsrc', 'w2']]);
  });

  it('reads tags, skipping unknown ones', () => {
    expect(readTags('wiki,gone', ds)).toEqual({ off: ['wiki'], skipped: 1 });
  });
});

describe('dating', () => {
  it('writes only choices that differ from the defaults and reads them back', () => {
    const defaults = { Mesopotamia: 'middle', Egypt: 'shaw' };
    expect(datingParam(defaults, defaults)).toBe('');
    expect(datingParam({ Mesopotamia: 'low', Egypt: 'shaw' }, defaults)).toBe('low');
    expect(readDating('low,hornung,gone', ds)).toEqual({ selection: { Mesopotamia: 'low', Egypt: 'hornung' }, skipped: 1 });
  });
});

describe('notices', () => {
  it('counts unknown ids and words the message for one or many', () => {
    expect(unknownCount('a,zz,b', (id) => ids.includes(id))).toBe(1);
    expect(unknownCount(null, () => false)).toBe(0);
    expect(skippedNotice(1)).toContain("1 item in this link isn't");
    expect(skippedNotice(3)).toContain('3 items in this link aren');
  });
});
