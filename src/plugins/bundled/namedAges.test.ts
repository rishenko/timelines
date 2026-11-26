import { describe, expect, it } from 'vitest';
import { lanternAges, namedAges } from './namedAges.ts';
import { isMajorTick, tickLabel, ticksBetween } from '../../lib/calendar.ts';
import type { Calendar } from '../../types.ts';

const fmt = (y: number, month?: number, day?: number, circa = false) => lanternAges.format(y, month, day, { circa });

describe('named ages (plugin design §6)', () => {
  it('counts each age from its own year 1, and years before the first back from it', () => {
    expect([fmt(1), fmt(411), fmt(412), fmt(789), fmt(790), fmt(900)]).toEqual([
      'Age of Tides 1',
      'Age of Tides 411',
      'Age of Lanterns 1',
      'Age of Lanterns 378',
      'Age of Glass 1',
      'Age of Glass 111',
    ]);
    expect([fmt(0), fmt(-39, undefined, undefined, true)]).toEqual(['1 before the Age of Tides', 'c. 40 before the Age of Tides']);
    expect(fmt(288, 12)).toBe('December Age of Tides 288');
    expect(fmt(288, 12, 3)).toBe('3 December Age of Tides 288');
  });

  it('reads back everything it writes', () => {
    for (const [y, m, d, c] of [[1], [411], [412], [790], [900], [0], [-39, undefined, undefined, true], [288, 12], [288, 12, 3]] as [number, number?, number?, boolean?][]) {
      const back = lanternAges.parse(fmt(y, m, d, c));
      expect(back, fmt(y, m, d, c)).toEqual({ year: y, ...(m ? { month: m } : {}), ...(d ? { day: d } : {}), circa: !!c });
    }
    expect(lanternAges.parse('  age of lanterns 12 ')).toEqual({ year: 423, circa: false });
    expect(lanternAges.parse('circa Age of Glass 2')).toEqual({ year: 791, circa: true });
  });

  it('refuses what it would never write', () => {
    for (const t of ['Age of Tides 0', 'Age of Tides 412', '412', '412 AT', '31 February Age of Tides 5', '3 Age of Tides 5', 'Age of Ash 3', '0 before the Age of Tides', '5 before the Age of Glass'])
      expect(lanternAges.parse(t), t).toBe(null);
  });

  it('takes its ages in any order, and names with regex characters', () => {
    const c = namedAges('t', [{ name: 'Age (B)', from: 100 }, { name: 'Age A.', from: 1 }]);
    expect(c.format(150, undefined, undefined, { circa: false })).toBe('Age (B) 51');
    expect(c.parse('Age A. 99')).toEqual({ year: 99, circa: false });
    expect(c.parse('Age Ax 99')).toBe(null);
  });

  it("draws the ruler's ticks: each age's name at its start, its own years in round steps from three steps in", () => {
    const t = lanternAges.ticks!(-60, 900, 50).map((k) => `${k.year} ${k.label}${k.major ? ' *' : ''}`);
    expect(t).toEqual(['-49 50 before', '1 Age of Tides *', '150 150', '200 200', '250 250', '300 300', '350 350', '412 Age of Lanterns *', '561 150', '611 200', '661 250', '711 300', '761 350', '790 Age of Glass *']);
    // a tenth step is major; a year step skips the name's room and stops before the next age
    expect(lanternAges.ticks!(1, 600, 50).find((k) => k.year === 500)).toEqual(undefined);
    expect(lanternAges.ticks!(1, 1000, 10).filter((k) => k.major).map((k) => k.year)).toEqual([1, 100, 200, 300, 400, 412, 511, 611, 711, 790, 889, 989]);
    expect(lanternAges.ticks!(408, 416, 1).map((k) => k.label)).toEqual(['408', '409', '410', '411', 'Age of Lanterns', '3', '4', '5']);
  });

  it("is the ruler's: lib/calendar.ts takes its ticks, labels and majors at a year or more, and keeps its own below", () => {
    const cal = { before: 'BT', after: 'AT', yearZero: false, system: 'lantern-ages' } as Calendar;
    expect(ticksBetween(380, 600, 50, cal)).toEqual([412, 561]);
    expect([tickLabel(412, 50, cal), tickLabel(561, 50, cal), tickLabel(561, 50, cal, true)]).toEqual(['Age of Lanterns', '150', 'Age of Lanterns 150']);
    expect([isMajorTick(412, 50, cal), isMajorTick(561, 50, cal)]).toEqual([true, false]);
    expect(ticksBetween(412, 412.3, 1 / 12, cal).length).toBe(4); // months: the core's
  });
});
