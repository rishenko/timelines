// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ConnectionLayer } from './ConnectionLayer.tsx';
import type { Mark } from './layout.ts';
import type { TimelineEvent } from '../types.ts';

afterEach(cleanup);

const mark = (eventId: string, kind: Mark['kind'], x: number, cy: number): Mark => ({
  key: `${eventId}-${kind}`,
  kind,
  eventId,
  laneId: 'north',
  row: 0,
  span: false,
  x0: x,
  x1: x,
  footprintEnd: x,
  cy,
});

const ev = (uuid: string, to?: string): TimelineEvent =>
  ({ uuid, title: uuid, descr: '', start: 0, tracks: ['north'], sources: [], links: to ? [{ to, kind: 'causes' }] : [] }) as TimelineEvent;

/** a → b, a → c; b is drawn as its own mark, c only inside a "+N" pill. */
function draw(related: Set<string> | null) {
  const marksByEvent = new Map<string, Mark[]>([
    ['a', [mark('a', 'event', 10, 10)]],
    ['b', [mark('b', 'event', 100, 40)]],
    ['c', [mark('c', 'cluster', 100, 70)]],
  ]);
  const a = { ...ev('a', 'b'), links: [{ to: 'b', kind: 'causes' as const }, { to: 'c', kind: 'causes' as const }] };
  const eventsById = new Map<string, TimelineEvent>([['a', a], ['b', ev('b')], ['c', ev('c')]]);
  const { container } = render(
    <ConnectionLayer left={0} width={200} height={100} marksByEvent={marksByEvent} eventsById={eventsById} selectedId={null} related={related} inView={() => true} />,
  );
  return [...container.querySelectorAll('path.link')].map((p) => p.getAttribute('d'));
}

describe('ConnectionLayer', () => {
  it('draws arrows only while one end is focused, "+N" pills included', () => {
    expect(draw(null)).toEqual([]);
    const focused = draw(new Set(['a', 'b', 'c']));
    expect(focused).toHaveLength(2);
    expect(focused.some((d) => d?.endsWith(' 70'))).toBe(true);
  });

  it("draws only the selected event's thread, through its \"+N\" pills; none with nothing selected or on hover", () => {
    const marksByEvent = new Map<string, Mark[]>([
      ['a', [mark('a', 'event', 10, 10), mark('a', 'event', 10, 40), mark('a', 'cluster', 10, 90)]],
      ['b', [mark('b', 'event', 50, 10), mark('b', 'cluster', 50, 60)]],
    ]);
    const eventsById = new Map<string, TimelineEvent>([['a', ev('a')], ['b', ev('b')]]);
    const lines = (selectedId: string | null, related: Set<string> | null = null) => {
      const { container } = render(
        <ConnectionLayer left={0} width={200} height={100} marksByEvent={marksByEvent} eventsById={eventsById} selectedId={selectedId} related={related} inView={() => true} />,
      );
      const out = [...container.querySelectorAll('.thread line')].map((l) => `${l.getAttribute('x1')}:${l.getAttribute('y1')}-${l.getAttribute('y2')}`);
      cleanup();
      return out;
    };
    expect(lines(null)).toEqual([]);
    // pointing at b (focused, not selected) draws no thread
    expect(lines(null, new Set(['b']))).toEqual([]);
    expect(lines('a', new Set(['a']))).toEqual(['10:10-90']);
    // selecting another event moves the thread to it
    expect(lines('b', new Set(['b']))).toEqual(['50:10-60']);
  });
});
