// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { Dataset } from '../types.ts';
import { useChronology } from './useChronology.ts';
import combined from '../../public/timelines/ancient-classical.json';

afterEach(cleanup);
const data = combined as unknown as Dataset;

describe('useChronology', () => {
  it('starts on each group default and lists only groups with a choice', () => {
    const { result } = renderHook(() => useChronology(data));
    expect(result.current.selection['Mesopotamia & Anatolia']).toBe('middle');
    expect(result.current.groups.every(([, list]) => list.length > 1)).toBe(true);
    expect(result.current.resolvedById.size).toBe(data.events.length);
  });

  it('re-plots events under another chronology, and reset goes back to the defaults', () => {
    const { result } = renderHook(() => useChronology(data));
    const before = result.current.resolved.map((e) => e.start);
    act(() => result.current.choose('Mesopotamia & Anatolia', 'low'));
    expect(result.current.selection['Mesopotamia & Anatolia']).toBe('low');
    const after = result.current.resolved.map((e) => e.start);
    expect(after).not.toEqual(before);
    act(() => result.current.reset());
    expect(result.current.resolved.map((e) => e.start)).toEqual(before);
  });
});
