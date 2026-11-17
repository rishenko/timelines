import { describe, expect, it } from 'vitest';
import type { Dataset, TimelineEvent } from '../types.ts';
import { BCE_CE } from './calendar.ts';
import {
  allClaims,
  dateWindow,
  defaultSelection,
  eventChronology,
  resolveEvents,
  resolveSpan,
  trackChronology,
} from './chronology.ts';
import { validateDataset } from '../data/validate.ts';

const BCE = (n: number) => 1 - n;
const src = { sourceKey: 'wp', sourceLocation: '' };

function fixture(events: TimelineEvent[]): Dataset {
  return {
    schemaVersion: 3,
    meta: { id: 't', title: 'T', calendar: BCE_CE, increments: [100], defaultIncrement: 100, circaFade: 25 },
    tracks: [
      { id: 'meso', name: 'Mesopotamia', color: '#000', chronology: 'middle' },
      { id: 'babylon', name: 'Babylon', color: '#000', parent: 'meso' },
      { id: 'old-bab', name: 'Old Babylonian', color: '#000', parent: 'babylon' },
      { id: 'egypt', name: 'Egypt', color: '#000', chronology: 'shaw' },
    ],
    sources: { wp: { name: 'Wikipedia', tags: [] } },
    tags: {},
    chronologies: {
      middle: { name: 'Middle', group: 'mesopotamia', default: true },
      high: { name: 'High', group: 'mesopotamia', derive: { from: 'middle', offset: -56, until: BCE(1500) } },
      low: { name: 'Low', group: 'mesopotamia', derive: { from: 'middle', offset: 64, until: BCE(1500) } },
      shaw: { name: 'Shaw', group: 'egypt', default: true },
      hornung: { name: 'Hornung', group: 'egypt' },
    },
    events,
  };
}

const ev = (uuid: string, start: number, tracks: string[], extra: Partial<TimelineEvent> = {}): TimelineEvent => ({
  uuid,
  title: uuid,
  descr: '',
  start,
  tracks,
  sources: [src],
  ...extra,
});

describe('chronologies', () => {
  it('inherits a chronology down the track tree', () => {
    const ds = fixture([]);
    expect(trackChronology(ds.tracks, 'old-bab')).toBe('middle');
    expect(trackChronology(ds.tracks, 'egypt')).toBe('shaw');
    expect(eventChronology(ds, ev('x', 0, ['old-bab']))).toBe('middle');
    expect(eventChronology(ds, ev('x', 0, ['old-bab'], { chronology: 'shaw' }))).toBe('shaw');
  });

  it('picks each group default', () => {
    expect(defaultSelection(fixture([]))).toEqual({ mesopotamia: 'middle', egypt: 'shaw' });
  });

  it('derives shifted alternatives only up to the cut-off', () => {
    const ds = fixture([]);
    const sack = allClaims(ds, BCE(1595), [], 'middle');
    expect(sack.map((c) => [c.chronology, c.year])).toEqual([
      ['high', BCE(1651)],
      ['low', BCE(1531)],
    ]);
    expect(sack.every((c) => c.derived)).toBe(true);
    // after 1500 BCE the chronologies agree
    expect(allClaims(ds, BCE(1155), [], 'middle')).toEqual([]);
  });

  it('prefers a stated claim over a derived one', () => {
    const ds = fixture([]);
    const claims = allClaims(ds, BCE(1595), [{ year: BCE(1650), chronology: 'high', source: src }], 'middle');
    expect(claims.filter((c) => c.chronology === 'high')).toEqual([{ year: BCE(1650), chronology: 'high', source: src }]);
  });
});

describe('error windows', () => {
  it('is the union of claims ± margins and the best estimate', () => {
    expect(dateWindow([{ year: -100, margin: 10 }, { year: -80 }], -90)).toEqual([-110, -80]);
    expect(dateWindow([{ year: -90 }], -90)).toBeUndefined();
    expect(dateWindow([], -90)).toBeUndefined();
    expect(dateWindow([], -90, 25)).toEqual([-115, -65]);
  });

  it('resolves events: windows from claims and derived chronologies, years under the selection', () => {
    const ds = fixture([
      ev('sack', BCE(1595), ['old-bab']),
      ev('narmer', BCE(3100), ['egypt'], { circa: true, startDates: [{ year: BCE(3100), margin: 150, source: src }] }),
      ev('kadesh', BCE(1274), ['egypt']),
      ev('reign', BCE(1792), ['old-bab'], { end: BCE(1750) }),
    ]);
    expect(validateDataset(ds)).toEqual([]);
    const byId = (sel: Record<string, string>) => new Map(resolveEvents(ds, sel).map((e) => [e.uuid, e]));

    const mid = byId(defaultSelection(ds));
    expect(mid.get('sack')!.start).toBe(BCE(1595));
    expect(mid.get('sack')!.startWindow).toEqual([BCE(1651), BCE(1531)]);
    // a stated ±150 dominates the circa fade
    expect(mid.get('narmer')!.startWindow).toEqual([BCE(3250), BCE(2950)]);
    // a single sourced date with no spread draws crisp
    expect(mid.get('kadesh')!.startWindow).toBeUndefined();
    expect(mid.get('reign')!.endWindow).toEqual([BCE(1806), BCE(1686)]);

    const low = byId({ mesopotamia: 'low', egypt: 'shaw' });
    expect(low.get('sack')!.start).toBe(BCE(1531));
    expect(low.get('reign')!.start).toBe(BCE(1728));
    expect(low.get('reign')!.end).toBe(BCE(1686));
    // other regions are untouched
    expect(low.get('narmer')!.start).toBe(BCE(3100));

    // Egypt has no derived alternative and no Hornung claim here: the best estimate stays
    expect(byId({ mesopotamia: 'middle', egypt: 'hornung' }).get('kadesh')!.start).toBe(BCE(1274));
  });

  it('resolves track lifespans the same way', () => {
    const ds = fixture([]);
    const s = resolveSpan(ds, 'old-bab', { start: BCE(1894), end: BCE(1595) }, { mesopotamia: 'high' });
    expect(s.start).toBe(BCE(1950));
    expect(s.end).toBe(BCE(1651));
    expect(s.startWindow).toEqual([BCE(1950), BCE(1830)]);
  });
});
