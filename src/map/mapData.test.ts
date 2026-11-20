import { describe, expect, it } from 'vitest';
import { mapYear, rowsAt, type MapData } from './mapData.ts';

const data: MapData = {
  credits: [],
  land: [],
  shapes: [[[0, 0, 1, 0, 1, 1, 0, 1]]],
  rows: {
    sumer: { borders: [{ from: -3399, to: -2003, name: 'Sumerian City-States', shape: 0 }], point: [46, 32] },
    carthage: { borders: [{ from: -649, to: -145, name: 'Carthage', shape: 0 }], point: [10.3, 36.9] },
    nok: { point: [8, 9.5] },
  },
};

describe('mapYear', () => {
  it('keeps the start when a row has borders then', () => expect(mapYear(data, ['sumer'], -3000, -2900)).toBe(-3000));
  it('moves to the first year in the range with borders', () => expect(mapYear(data, ['sumer'], -3499, -3199)).toBe(-3399));
  it('keeps the start when no year in the range has borders', () => expect(mapYear(data, ['carthage'], -813)).toBe(-813));
  it('takes the earliest border among the rows', () => expect(mapYear(data, ['carthage', 'sumer'], -3499, -100)).toBe(-3399));
  it('ignores rows without borders', () => expect(mapYear(data, ['nok'], -500, -400)).toBe(-500));
});

describe('rowsAt', () => {
  it('gives borders where there are some, else the location', () => {
    const [carthage] = rowsAt(data, ['carthage'], -813);
    expect(carthage.borders).toEqual([]);
    expect(carthage.point).toEqual([10.3, 36.9]);
    expect(rowsAt(data, ['carthage'], -500)[0].point).toBeUndefined();
  });
});
