import { describe, expect, it } from 'vitest';
import { meanwhile, type MeanwhileLane } from './meanwhile.ts';
import type { ResolvedEvent, ResolvedPhase } from '../lib/chronology.ts';
import type { PlacedAge } from '../lib/eras.ts';

const ev = (uuid: string, track: string, start: number, end?: number, importance = 2): ResolvedEvent =>
  ({ uuid, title: uuid, tracks: [track], start, ...(end !== undefined ? { end } : {}), importance }) as ResolvedEvent;
const lane = (id: string, members = [id]): MeanwhileLane => ({ id, name: id, color: '#888', depth: 0, members });
const phase = (name: string, start: number, end: number) => ({ name, start, end }) as ResolvedPhase;

describe('meanwhile', () => {
  const events = [
    ev('Reign of A', 'egypt', -1300, -1250),
    ev('Reign of B', 'egypt', -1250, -1200),
    ev('Siege', 'egypt', -1260, -1255, 1),
    ev('Point', 'egypt', -1260),
    ev('Trade', 'egypt', -1400, -1100, 3),
    ev('Kush thing', 'kush', -1270, -1240),
  ];
  const reigns = new Set(['Reign of A', 'Reign of B']);
  const phases = new Map([['egypt', [phase('New Kingdom', -1550, -1070)]]]);

  it('gives each row its reign, phase and ongoing spans, most important first; points are left out', () => {
    const m = meanwhile(-1260, [lane('egypt'), lane('kush'), lane('empty')], phases, events, reigns);
    expect(m.rows).toEqual([
      { id: 'egypt', name: 'egypt', color: '#888', depth: 0, reign: 'Reign of A', phase: 'New Kingdom', ongoing: ['Siege', 'Trade'] },
      { id: 'kush', name: 'kush', color: '#888', depth: 0, ongoing: ['Kush thing'] },
    ]);
  });

  it('takes the later reign when two meet at the year', () => {
    expect(meanwhile(-1250, [lane('egypt')], phases, events, reigns).rows[0].reign).toBe('Reign of B');
  });

  it('a folded lane collects its sub-rows', () => {
    const m = meanwhile(-1245, [lane('africa', ['africa', 'kush'])], new Map(), events, reigns);
    expect(m.rows[0]).toMatchObject({ id: 'africa', ongoing: ['Kush thing'] });
  });

  it('a folded lane gives its sub-rows alive in the year and their phase', () => {
    const lanes = [{ ...lane('egypt', ['egypt', 'ptolemaic', 'late']), memberNames: new Map([['ptolemaic', 'Ptolemaic Egypt'], ['late', 'Late Period']]) }];
    const life = new Map([['ptolemaic', [{ start: -305, end: -30 }]], ['late', [{ start: -664, end: -332 }]]]);
    const ph = new Map([['ptolemaic', [phase('Late Ptolemaic', -200, -30)]]]);
    expect(meanwhile(-144, lanes, ph, [], new Set(), [], life).rows[0]).toMatchObject({ phase: 'Late Ptolemaic', alive: ['Ptolemaic Egypt'] });
  });

  it('names the ages of the year, with their line', () => {
    const age = (name: string, start: number, end: number, lineName?: string, drawEnd?: number) =>
      ({ era: { name }, span: { start, end }, line: 0, ...(lineName ? { lineName } : {}), ...(drawEnd !== undefined ? { drawEnd } : {}) }) as PlacedAge;
    const ages = [age('Bronze Age', -3300, -1200, 'Near East', -1200), age('Iron Age', -1200, -550, 'Near East'), age('Axial Age', -800, -200)];
    expect(meanwhile(-1200, [], new Map(), [], new Set(), ages).ages).toEqual(['Iron Age (Near East)']);
    expect(meanwhile(-700, [], new Map(), [], new Set(), ages).ages).toEqual(['Iron Age (Near East)', 'Axial Age']);
  });
});
