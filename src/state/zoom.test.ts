import { describe, expect, it } from 'vitest';
import { coarserIncrement, finerIncrement, keyEventsOnly, stepIncrement } from './zoom.ts';

const withKey = [{ importance: 1 as const }, {}];
const noKey = [{}, { importance: 3 as const }];

describe('key events only at the coarsest zoom', () => {
  it('applies at the coarsest step of a timeline that marks key events', () => {
    expect(keyEventsOnly([10, 100, 1000], 1000, withKey)).toBe(true);
  });
  it('not at finer steps', () => {
    expect(keyEventsOnly([10, 100, 1000], 100, withKey)).toBe(false);
  });
  it('not when no event is key (e.g. a fictional timeline), nor with a single zoom step', () => {
    expect(keyEventsOnly([1, 10, 100], 100, noKey)).toBe(false);
    expect(keyEventsOnly([100], 100, withKey)).toBe(false);
  });
});

describe('zoom steps', () => {
  it('finds the next finer and coarser step, or none at the ends', () => {
    expect(finerIncrement([10, 50, 100, 500], 100)).toBe(50);
    expect(coarserIncrement([10, 50, 100, 500], 100)).toBe(500);
    expect(finerIncrement([10, 50], 10)).toBeUndefined();
    expect(coarserIncrement([10, 50], 50)).toBeUndefined();
  });
});

describe('zoom steps', () => {
  it('steps one increment finer or coarser, and stops at either end', () => {
    expect(stepIncrement([10, 100, 1000], 100, 1)).toBe(10);
    expect(stepIncrement([10, 100, 1000], 100, -1)).toBe(1000);
    expect(stepIncrement([10, 100, 1000], 10, 1)).toBeUndefined();
    expect(stepIncrement([10, 100, 1000], 1000, -1)).toBeUndefined();
  });
});
