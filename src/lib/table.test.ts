import { describe, expect, it } from 'vitest';
import { datesInWords, eventsCsv, tableSections } from './table.ts';
import { defaultSelection, resolveEvents } from './chronology.ts';
import ancient from '../timelines/ancient-near-east.json';
import REDACTED from '../timelines/REDACTED.json';
import type { Dataset } from '../types.ts';

const anc = ancient as Dataset;
const resolved = resolveEvents(anc, defaultSelection(anc));
const byUuid = new Map(resolved.map((e) => [e.uuid, e]));

describe('tableSections', () => {
  const sections = tableSections(anc.tracks, resolved);

  it('groups events by region, under their top-level group, in row order', () => {
    const egypt = sections.find((s) => s.track.id === 'egypt')!;
    expect(egypt.group?.id).toBe('near-east');
    const ids = sections.map((s) => s.track.id);
    expect(ids.indexOf('egypt')).toBeLessThan(ids.indexOf('anatolia'));
  });

  it('lists an event in every region it belongs to, once each', () => {
    const where = sections.filter((s) => s.events.some((e) => e.uuid === 'kadesh')).map((s) => s.track.id);
    expect(where).toEqual(['egypt', 'anatolia']);
    const egypt = sections.find((s) => s.track.id === 'egypt')!;
    expect(egypt.events.filter((e) => e.uuid === 'kadesh')).toHaveLength(1);
  });

  it('sorts each section by date and leaves out empty ones', () => {
    for (const s of sections) {
      expect(s.events.length).toBeGreaterThan(0);
      const starts = s.events.map((e) => e.start);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    }
  });

  it('uses top-level rows as sections when a timeline has no regions (REDACTED)', () => {
    const ds = REDACTED as Dataset;
    const secs = tableSections(ds.tracks, resolveEvents(ds, defaultSelection(ds)));
    expect(secs.every((s) => s.group === undefined)).toBe(true);
    expect(secs.map((s) => s.track.id)).toContain('redacted');
  });
});

describe('datesInWords', () => {
  it('spells out the range the sources allow for an uncertain single-year event', () => {
    const d = datesInWords(byUuid.get('sack-of-babylon')!, anc.meta.calendar);
    expect(d.main).toMatch(/1595 BCE/);
    expect(d.ranges[0]).toMatch(/^the sources put it between \d+ BCE and \d+ BCE$/);
  });

  it('says nothing more for a date the sources agree on', () => {
    const plain = resolved.find((e) => !e.startWindow && !e.endWindow && !e.circa)!;
    expect(datesInWords(plain, anc.meta.calendar).ranges).toEqual([]);
  });
});

describe('eventsCsv', () => {
  const csv = eventsCsv(anc, resolved);
  const lines = csv.trim().split('\n');

  it('has one header and one line per event (not per section)', () => {
    expect(lines[0].startsWith('id,title,dates,start_year')).toBe(true);
    // descriptions may hold no newlines, so lines = events + 1
    expect(lines).toHaveLength(resolved.length + 1);
  });

  it('gives stored years and the source range as numbers, and quotes cells with commas', () => {
    const row = lines.find((l) => l.startsWith('sack-of-babylon,'))!;
    expect(row).toContain(',-1594,');
    expect(row).toMatch(/,"?[^,]*Middle Chronology/);
    const quoted = lines.find((l) => l.includes('"'));
    expect(quoted).toBeDefined();
  });
});
