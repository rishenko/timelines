// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { draftKey, useDataset } from './dataset.ts';
import { plainTimeline } from '../test/fixtures.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useDataset saving drafts', () => {
  it('stores an edit as a draft', () => {
    const pub = plainTimeline();
    const { result } = renderHook(() => useDataset(pub));
    const event = { ...pub.events[0], title: 'Renamed' };
    act(() => result.current[1]({ type: 'upsertEvent', event }));
    expect(localStorage.getItem(draftKey(pub.meta.id))).toContain('Renamed');
    expect(result.current[2]).toBe(false);
  });

  it("keeps the edit and reports it unsaved when storage refuses it, instead of failing", () => {
    const pub = plainTimeline();
    const { result } = renderHook(() => useDataset(pub));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const event = { ...pub.events[0], title: 'Renamed' };
    act(() => result.current[1]({ type: 'upsertEvent', event }));
    expect(result.current[0].data.events[0].title).toBe('Renamed');
    expect(result.current[2]).toBe(true);

    // once storage works again, the next save clears the warning
    vi.restoreAllMocks();
    act(() => result.current[1]({ type: 'upsertEvent', event: { ...event, title: 'Renamed again' } }));
    expect(result.current[2]).toBe(false);
    expect(localStorage.getItem(draftKey(pub.meta.id))).toContain('Renamed again');
  });
});
