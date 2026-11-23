// Pinned reigns (Kevin, 2026-11-23, key events re-audit): the importance plan's `_pinnedReigns` are key reigns the
// rulers pass must not change. A note alone can't hold that, so this checks every pinned id is in the plan's key list
// and, in the compiled timeline, is a key event with the `reign` category.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync('data-src/ancient-classical-importance.json', 'utf8')) as Record<string, unknown>;
const ds = JSON.parse(readFileSync('public/timelines/ancient-classical.json', 'utf8')) as {
  events: { uuid: string; importance?: number; memberships?: { facet: string; value: string }[] }[];
};

describe('pinned reigns', () => {
  const pinned = plan._pinnedReigns as string[];
  it('are listed', () => expect(pinned.length).toBeGreaterThan(0));
  it('are all in the plan’s key list', () => expect(pinned.filter((id) => !(plan['1'] as string[]).includes(id))).toEqual([]));
  it('are key reign events in the compiled timeline', () => {
    const byId = new Map(ds.events.map((e) => [e.uuid, e]));
    const bad = pinned.filter((id) => {
      const e = byId.get(id);
      return !e || e.importance !== 1 || !e.memberships?.some((m) => m.facet === 'category' && m.value === 'reign');
    });
    expect(bad).toEqual([]);
  });
});
