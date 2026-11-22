// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ClusterMark } from './Marks.tsx';
import type { Mark } from './layout.ts';
import type { ResolvedEvent } from '../lib/chronology.ts';
import type { Calendar } from '../types.ts';

afterEach(cleanup);

const cal: Calendar = { before: 'BCE', after: 'CE', yearZero: false };

const ev = (uuid: string, start: number, key = false): ResolvedEvent =>
  ({ uuid, title: uuid, descr: '', start, tracks: ['row'], sources: [], ...(key ? { importance: 1 } : {}) }) as ResolvedEvent;

function pill(events: ResolvedEvent[], keyEventId?: string, namedCategory?: { kind: string; labels: string[] }) {
  const mark: Mark = {
    key: 'row:cluster',
    kind: 'cluster',
    eventId: events[0].uuid,
    eventIds: events.map((e) => e.uuid),
    ...(keyEventId ? { keyEventId } : {}),
    laneId: 'row',
    row: 0,
    span: false,
    x0: 0,
    x1: 0,
    footprintEnd: 44,
    cy: 0,
  };
  const { container } = render(
    <ClusterMark mark={mark} laneTop={0} labelW={0} cal={cal} isTabStop={false} onStopFocus={() => {}} events={events} related={false} onClick={() => {}} namedCategory={namedCategory} />,
  );
  return container.querySelector('button')!;
}

describe('ClusterMark', () => {
  it('names the key event it holds, and its accessible name starts with what it shows', () => {
    const b = pill([ev('Second World War', 1939, true), ev('Treaty', 1940), ev('Stalingrad', 1942, true)], 'Second World War');
    expect(b.textContent).toBe('Second World War+2');
    expect(b.classList.contains('has-key')).toBe(true);
    expect(b.getAttribute('aria-label')).toBe(
      'Second World War +2: a key event and 2 more, 1939 CE to 1942 CE; also key: Stalingrad; zoom in',
    );
    // key events head the tooltip's list
    expect(b.title.split('\n').slice(1).map((l) => l.split(' · ')[1])).toEqual(['Second World War (key event)', 'Stalingrad (key event)', 'Treaty']);
  });

  it('shows the named key event’s glyph, and its category in the accessible name', () => {
    const b = pill([ev('Second World War', 1939, true), ev('Treaty', 1940)], 'Second World War', { kind: 'conflict', labels: ['Wars and battles: War'] });
    expect(b.querySelector('.cat-glyph')?.getAttribute('data-kind')).toBe('conflict');
    expect(b.getAttribute('aria-label')).toBe('Second World War +1: a key event (Wars and battles: War) and 1 more, 1939 CE to 1940 CE; zoom in');
  });

  it('is a plain count when it holds no key event', () => {
    const b = pill([ev('a', 10), ev('b', 12)]);
    expect(b.textContent).toBe('+2');
    expect(b.classList.contains('has-key')).toBe(false);
    expect(b.getAttribute('aria-label')).toBe('2 more events, 10 CE to 12 CE; zoom in');
  });
});
