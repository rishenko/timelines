import { describe, expect, it } from 'vitest';
import type { Dataset, Track } from '../types.ts';
import { edgeName, successionIndex, successionTip } from './succession.ts';
import { mergeStretches } from './lifespan.ts';
import { validateDataset } from '../data/validate.ts';
import { plainTimeline } from '../test/fixtures.ts';
import { removeEvent, removeTrack } from '../state/edits.ts';

const tracks: Track[] = [
  { id: 'union', name: 'Union', color: '#000', span: { start: 20, end: 49, startEvent: 'merger', endEvent: 'split' } },
  {
    id: 'b',
    name: 'B',
    color: '#000',
    phases: [
      { name: 'Old B', start: 0, end: 49, endEvent: 'split' },
      { name: 'New B', start: 50, ongoing: true, startEvent: 'split' },
    ],
  },
];

describe('successionIndex', () => {
  it('lists what each event started and ended: lifespans, then phases, in row order', () => {
    const split = successionIndex(tracks).get('split')!;
    expect(split.ended.map((e) => edgeName(e, { tracks }))).toEqual(['Union', 'B: Old B']);
    expect(split.started).toEqual([{ trackId: 'b', phase: 'New B', side: 'start', eventId: 'split', year: 50 }]);
    expect(successionIndex(tracks).get('merger')).toEqual({ started: [{ trackId: 'union', side: 'start', eventId: 'merger', year: 20 }], ended: [] });
    expect(successionIndex(tracks).has('nothing')).toBe(false);
  });
});

describe('successionTip', () => {
  const titles = new Map([['split', 'The split']]);
  it("adds a tooltip line per event that began or ended a phase, and nothing for unnamed or missing events", () => {
    const title = (id: string) => titles.get(id);
    expect(successionTip({ startEvent: 'split' }, title)).toBe('\nBegan with: The split');
    expect(successionTip({ startEvent: 'gone', endEvent: 'split' }, title)).toBe('\nEnded with: The split');
    expect(successionTip({}, title)).toBe('');
  });
});

describe('a lifespan worked out from phases', () => {
  it('takes the event that began it from its first phase and the one that ended it from its last', () => {
    expect(
      mergeStretches([
        { start: 10, end: 20, endEvent: 'mid' },
        { start: 0, end: 10, startEvent: 'first', endEvent: 'mid' },
        { start: 20, end: 30, startEvent: 'mid', endEvent: 'last' },
      ]),
    ).toEqual([{ start: 0, end: 30, derived: true, startEvent: 'first', endEvent: 'last' }]);
  });
});

/** Quay Town's councils: a new event in year 60 ends the first council and begins the second. */
function withSuccession(): Dataset {
  const d = plainTimeline();
  d.events.push({ uuid: 'council-change', title: 'The councils change', descr: '', start: 60, tracks: ['quay'], sources: [] });
  const quay = d.tracks.find((t) => t.id === 'quay')!;
  quay.phases![0].endEvent = 'council-change';
  quay.phases![1].startEvent = 'council-change';
  return d;
}

describe('validating startEvent and endEvent', () => {
  it('accepts edges that name an event dated within a year of them', () => {
    expect(validateDataset(withSuccession())).toEqual([]);
  });

  it('refuses unknown events, an end event on an ongoing phase, and an event far from its edge', () => {
    const d = withSuccession();
    const quay = d.tracks.find((t) => t.id === 'quay')!;
    quay.phases![2].startEvent = 'nope';
    d.tracks.find((t) => t.id === 'saltmarsh')!.span = { start: 0, ongoing: true, endEvent: 'council-change' };
    quay.phases![1].endEvent = 'founding';
    const errs = validateDataset(d).join('\n');
    expect(errs).toMatch(/Track "quay" phase "Third Council" startEvent names unknown event "nope"/);
    expect(errs).toMatch(/Track "saltmarsh" lifespan is ongoing, so it has no end for an endEvent/);
    expect(errs).toMatch(/Track "quay" phase "Second Council" ends in 179 L, but its endEvent "Quay Town founded" is dated 40 BL/);
  });
});

describe('editing keeps succession valid', () => {
  it('removing an event, or the last row it is on, drops the edges that named it', () => {
    const before = withSuccession();
    const d = removeEvent(before, 'council-change');
    const quay = d.tracks.find((t) => t.id === 'quay')!;
    expect(quay.phases![0].endEvent).toBeUndefined();
    expect(quay.phases![1].startEvent).toBeUndefined();
    expect(validateDataset(d)).toEqual([]);
    // the untouched rows are the same objects
    expect(d.tracks[1]).toBe(before.tracks[1]);
    const e = withSuccession();
    e.events.find((x) => x.uuid === 'council-change')!.tracks = ['saltmarsh'];
    const gone = removeTrack(e, 'saltmarsh');
    expect(gone.tracks.find((t) => t.id === 'quay')!.phases![1].startEvent).toBeUndefined();
  });
});
