import { describe, expect, it } from 'vitest';
import { datesInWords, eventsCsv, fullSections, sectionRows, spanInWords, tableSections } from './table.ts';
import { defaultSelection, resolveEvents, resolveSpan } from './chronology.ts';
import combined from '../../public/timelines/ancient-classical.json';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset } from '../types.ts';
import { resolveLifespan } from './lifespan.ts';

const anc = combined as Dataset;
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

  it('uses top-level rows as sections when a timeline has no regions', () => {
    const ds = plainTimeline();
    const secs = tableSections(ds.tracks, resolveEvents(ds, defaultSelection(ds)));
    expect(secs.every((s) => s.group === undefined)).toBe(true);
    expect(secs.map((s) => s.track.id)).toContain('quay');
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

  it('ends with the full dates, after every earlier column', () => {
    expect(lines[0].endsWith(',description,start_date,end_date')).toBe(true);
    expect(lines.find((l) => l.startsWith('sack-of-babylon,'))!.endsWith(',-1594,')).toBe(true);
    const d = { ...anc, events: [{ uuid: 'somme', title: 'Somme', descr: '', start: 1916, startMonth: 7, startDay: 1, end: 1916, endMonth: 11, endDay: 18, tracks: [anc.tracks[0].id], sources: [] }] };
    const row = eventsCsv(d, d.events).trim().split('\n')[1];
    expect(row.endsWith(',1916-07-01,1916-11-18')).toBe(true);
    expect(row).toContain('1 July 1916 CE – 18 November 1916 CE (141 days)');
  });

  it('gives stored years and the source range as numbers, and quotes cells with commas', () => {
    const row = lines.find((l) => l.startsWith('sack-of-babylon,'))!;
    expect(row).toContain(',-1594,');
    expect(row).toMatch(/,"?[^,]*Middle Chronology/);
    const quoted = lines.find((l) => l.includes('"'));
    expect(quoted).toBeDefined();
  });
});

describe('rows in the table', () => {
  const sel = defaultSelection(anc);
  const spans = new Map(anc.tracks.filter((t) => t.span || t.phases?.length).map((t) => [t.id, resolveLifespan(anc, t, sel)]));
  const phases = new Map(
    anc.tracks
      .filter((t) => t.phases?.length)
      .map((t) => [t.id, t.phases!.map((p) => ({ name: p.name, ...resolveSpan(anc, t.id, p, sel) }))]),
  );
  const all = () => true;

  it("lists a region's rows with their lifespans and phases", () => {
    const egypt = fullSections(anc.tracks, resolved, spans, phases, all).find((s) => s.track.id === 'egypt')!;
    const pharaonic = egypt.rows.find((r) => r.track.id === 'pharaonic-egypt')!;
    expect(pharaonic.phases.map((p) => p.name)).toContain('New Kingdom');
    expect(pharaonic.phases).toHaveLength(9);
    expect(pharaonic.parent).toBeUndefined(); // it sits directly in the section
    const kush = egypt.rows.find((r) => r.track.id === 'kush')!;
    expect(kush.parent?.id).toBe('nubia'); // read as "Kush (in Nubia)"
  });

  it('leaves out rows hidden by Filters, and rows under a hidden row', () => {
    const hidden = new Set(['nubia']);
    const byId = new Map(anc.tracks.map((t) => [t.id, t]));
    const visible = (id: string) => {
      for (let t = byId.get(id); t; t = t.parent ? byId.get(t.parent) : undefined) if (hidden.has(t.id)) return false;
      return true;
    };
    const egypt = fullSections(anc.tracks, resolved, spans, phases, visible).find((s) => s.track.id === 'egypt')!;
    expect(egypt.rows.some((r) => r.track.id === 'kush')).toBe(false);
    expect(egypt.rows.some((r) => r.track.id === 'pharaonic-egypt')).toBe(true);
  });

  it('keeps a section that has rows even when Filters hide all its events', () => {
    const secs = fullSections(anc.tracks, [], spans, phases, all);
    expect(secs.find((s) => s.track.id === 'egypt')?.rows.length).toBeGreaterThan(0);
  });

  it('lists every dated row once in one-list mode', () => {
    const rows = sectionRows(anc.tracks, undefined, spans, phases, all);
    expect(new Set(rows.map((r) => r.track.id)).size).toBe(rows.length);
    expect(rows.length).toBe(anc.tracks.filter((t) => t.span || t.phases?.length).length);
  });

  it('spells out a phase with its source range', () => {
    const newKingdom = phases.get('pharaonic-egypt')!.find((p) => p.name === 'New Kingdom')!;
    const w = spanInWords(newKingdom, anc.meta.calendar);
    expect(w.main).toMatch(/1550 BCE – c\. 1069 BCE|1550 BCE – 1069 BCE/);
    expect(w.ranges.join(' ')).toMatch(/start between/);
  });
});
