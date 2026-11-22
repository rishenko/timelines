import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  D2_PARAMS,
  PARAM_ORDER,
  TIMELINE_PARAMS,
  fitIncrement,
  linkNotice,
  parseView,
  resolveView,
  serializeHash,
  serializeView,
  type ParsedView,
  type ViewState,
} from './viewState.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { startAt } from '../lib/subYear.ts';
import type { Dataset } from '../types.ts';
import fixtures from './links.fixtures.json';

const bundled = new Map<string, Dataset>(
  ['ancient-classical', 'medieval', 'modern-states'].map((id) => [id, JSON.parse(readFileSync(`public/timelines/${id}.json`, 'utf8'))]),
);
const split = (link: string): [string, string] => {
  const i = link.indexOf('#');
  return i === -1 ? [link, ''] : [link.slice(0, i), link.slice(i)];
};
const params = (query: string) => query.split('&').map((p) => p.split('=')[0]);

describe('frozen links (src/state/links.fixtures.json: entries are only ever added)', () => {
  for (const f of fixtures as (ParsedView & { name: string; timeline: string; link: string })[]) {
    it(f.name, () => {
      const [query, hash] = split(f.link);
      const got = parseView(query, hash, bundled.get(f.timeline)!);
      expect(got).toEqual({ state: f.state, skipped: f.skipped, unknownParams: f.unknownParams, version: f.version });
    });
  }
});

describe('serializeView', () => {
  const ds = bundled.get('modern-states')!;
  it('writes v=1 first, then the parameters in the fixed order, and never the timeline', () => {
    for (const f of fixtures as { timeline: string; link: string }[]) {
      const d = bundled.get(f.timeline)!;
      const [query, hash] = split(f.link);
      const out = serializeView(parseView(query, hash, d).state, d);
      const names = params(out);
      expect(names[0]).toBe('v');
      const at = names.map((n) => (PARAM_ORDER as readonly string[]).indexOf(n));
      expect(at.every((i) => i >= 0)).toBe(true);
      expect([...at].sort((a, b) => a - b)).toEqual(at);
      for (const t of TIMELINE_PARAMS) expect(names).not.toContain(t);
    }
  });

  it('a state with nothing but defaults is v=1 alone; the default rows mode is left out', () => {
    expect(serializeView({}, ds)).toBe('v=1');
    const anc = bundled.get('ancient-classical')!; // hides rows with nothing in view by default
    expect(serializeView({ rows: 'active' }, anc)).toBe('v=1');
    expect(serializeView({ rows: 'all' }, anc)).toBe('v=1&rows=all');
  });

  it('writes regions and categories in the facet’s order, the set in picked order, commas unescaped', () => {
    expect(serializeView({ cat: ['siege', 'rule', 'conflict'], set: { ids: ['japan', 'china'], order: 'picked' } }, ds)).toBe(
      'v=1&set=japan,china&cat=rule,conflict,siege',
    );
    const anc = bundled.get('ancient-classical')!;
    expect(serializeView({ regions: ['nile', 'anatolia'] }, anc)).toBe('v=1&regions=anatolia,nile');
  });

  it('keeps from/to or at/inc as the state has it', () => {
    expect(serializeView({ window: { from: 1914, to: 1918 } }, ds)).toBe('v=1&from=1914&to=1918');
    expect(serializeView({ window: { inc: 10, at: 1916 } }, ds)).toBe('v=1&inc=10&at=1916');
    expect(serializeHash({ selected: 'battle-of-adwa' })).toBe('#battle-of-adwa');
  });

  it('writes BCE years so they read back the same (no year 0: stored -1499 is 1500 BCE, written -1500)', () => {
    const anc = bundled.get('ancient-classical')!;
    expect(serializeView({ window: { inc: 100, at: -1499 } }, anc)).toBe('v=1&inc=100&at=-1500');
    expect(serializeView({ window: { from: -2000, to: 0 } }, anc)).toBe('v=1&from=-2001&to=-1');
    // a centre between years is written as its day, so only day starts come back exactly
    for (const at of [-1499, 0, 1, startAt(-1499, 7, 1), startAt(-10, 3, 15)]) expect(parseView(serializeView({ window: { inc: 100, at } }, anc), '', anc).state.window).toEqual({ inc: 100, at });
  });

  it('round trip: parsing what it writes gives the same state, for every frozen link', () => {
    for (const f of fixtures as { timeline: string; link: string }[]) {
      const d = bundled.get(f.timeline)!;
      const [query, hash] = split(f.link);
      const s: ViewState = parseView(query, hash, d).state;
      const again = parseView(serializeView(s, d), serializeHash(s), d);
      expect(again.state).toEqual(s);
      expect(again.skipped).toEqual([]);
      expect(again.version).toBe(1);
    }
  });
});

describe('parseView', () => {
  const withRedirects = (): Dataset => {
    const d = plainTimeline();
    d.redirects = { 'old-quay': 'quay', 'sunk-isle': null };
    return d;
  };

  it('follows redirects, then reports removed and unknown ids separately', () => {
    const d = withRedirects();
    const p = parseView('set=old-quay,sunk-isle,atlantis', '', d);
    expect(p.state.set?.ids).toEqual(['quay']);
    expect(p.skipped).toEqual([
      { param: 'set', id: 'sunk-isle', reason: 'removed' },
      { param: 'set', id: 'atlantis', reason: 'unknown' },
    ]);
  });

  it('a link with no v is version 0 and reads as before; v=2 is read as far as it can be', () => {
    const d = plainTimeline();
    expect(parseView('inc=10&at=5', '', d)).toMatchObject({ version: 0, state: { window: { inc: 10, at: 5 } } });
    expect(parseView('v=2&inc=10&at=5', '', d)).toMatchObject({ version: 2, state: { window: { inc: 10, at: 5 } } });
  });

  it('lists the parameters it doesn’t read (D2’s names among them, for now), but not the timeline’s', () => {
    const p = parseView('timeline=x&data=y&collection=z&hide=quay&zzz=1', '', plainTimeline());
    expect(p.unknownParams).toEqual(['hide', 'zzz']);
    expect(D2_PARAMS).toContain('hide');
  });
});

describe('resolveView and the from/to window', () => {
  it('picks the finest zoom step at which the window fits, and centres on it', () => {
    // 1200 px at 80 px a tick is 15 ticks: 1914–1918 fits at 1 year a tick; 1450–1750 needs 25
    expect(fitIncrement(1914, 1918, [1, 5, 10, 25, 50], 1200)).toBe(1);
    expect(fitIncrement(1450, 1750, [1, 5, 10, 25, 50], 1200)).toBe(25);
    expect(fitIncrement(0, 5000, [1, 5, 10, 25, 50], 1200)).toBe(50);
    const r = resolveView({ window: { from: 1450, to: 1750 } }, bundled.get('modern-states')!, 1200);
    expect(r).toMatchObject({ increment: 25, at: 1600, window: { from: 1450, to: 1750 } });
  });

  it('fills in the timeline’s defaults', () => {
    const d = plainTimeline();
    expect(resolveView({}, d)).toMatchObject({ increment: 10, at: null, window: null, compress: true, hideOutOfView: true, view: 'timeline' });
  });
});

describe('the link notice', () => {
  it('one notice, counted by kind, with the removed ones said', () => {
    expect(
      linkNotice({
        version: 1,
        skipped: [
          { param: 'set', id: 'a', reason: 'removed' },
          { param: 'set', id: 'b', reason: 'unknown' },
          { param: '#', id: 'c', reason: 'unknown' },
          { param: 'from', id: '1918', reason: 'invalid' },
        ],
      }),
    ).toBe('This link names 2 rows and 1 event this timeline doesn’t have (1 removed from this timeline).');
  });

  it('a newer version and skipped ids share one notice; nothing to say gives none', () => {
    expect(linkNotice({ version: 2, skipped: [{ param: 'cat', id: 'x', reason: 'unknown' }] })).toBe(
      'This link is from a newer version of the app; parts of it may be ignored. This link names 1 category this timeline doesn’t have.',
    );
    expect(linkNotice({ version: 1, skipped: [] })).toBeNull();
  });
});
