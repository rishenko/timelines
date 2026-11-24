// The rules schema version 5 added (docs/data-format.md): each is broken once on the every-field fixture, which
// is valid as it stands, and must be named.
import { describe, expect, it } from 'vitest';
import { validateDataset } from './validate.ts';
import { validateStrict } from './strict.ts';
import { everyField } from './fixtures/everyField.ts';
import type { Dataset } from '../types.ts';

/** The fixture, changed by `edit`, and its problems. */
function problems(edit: (d: Dataset) => void): string[] {
  const d = structuredClone(everyField) as Dataset;
  edit(d);
  return validateDataset(d);
}

const quay = (d: Dataset) => d.tracks.find((t) => t.id === 'quay')!;
const watch = (d: Dataset) => d.events.find((e) => e.uuid === 'long-watch')!;
/** The Age of Piers (an age on Quay Town's band) and the Age of Leagues (a golden age on the timeline), one line. */
const piers = (d: Dataset) => quay(d).context!.find((e) => e.id === 'age-of-piers')!;
const leagues = (d: Dataset) => d.meta.context!.find((e) => e.id === 'age-of-leagues')!;

describe('schema version 5 rules', () => {
  it('the fixture is valid', () => {
    expect(validateDataset(everyField)).toEqual([]);
  });

  const cases: [string, (d: Dataset) => void, RegExp][] = [
    // facets on events
    ['event in a rows-only facet', (d) => Object.assign(watch(d).memberships![0], { facet: 'region', value: 'bay' }), /Event "The Long Watch" has a membership in facet "region", which applies to tracks only/],
    ['row in an events-only facet', (d) => (quay(d).memberships = [{ facet: 'theme', value: 'trade', sources: [{ sourceKey: 'ledger', sourceLocation: '' }] }]), /Track "quay" has a membership in facet "theme", which applies to events only/],
    ['event membership without a source', (d) => (watch(d).memberships![0].sources = []), /Event "The Long Watch" membership theme\/trade cites no source/],
    // row kinds
    // events' ongoingSources
    ['ongoingSources on an ended event', (d) => Object.assign(watch(d), { ongoing: undefined, end: 160 }), /Event "The Long Watch" has ongoingSources but isn't ongoing/],
    ['ongoingSources citing an unknown source', (d) => (watch(d).ongoingSources![0].sourceKey = 'nowhere'), /ongoingSources cites unknown source "nowhere"/],
    // provenance
    ['dump', (d) => (d.sources.ledger.dump = '2026-11-01'), /Source "ledger" dump must name a snapshot like "enwiki-20261101"/],
    ['revision', (d) => (d.sources.ledger.revision = 1.5), /Source "ledger" revision must be a page revision id/],
    ['revision without a url', (d) => Object.assign(d.sources.logbook, { revision: 7 }), /Source "logbook" has a revision but no url/],
    ['locator without its field', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'lead' }), /a lead locator needs quote/],
    // context spans (schema v8; v5's eras)
    ['context span id', (d) => (leagues(d).id = 'age-of-piers'), /Duplicate context span id "age-of-piers"/],
    ['context span without a source', (d) => (piers(d).sources = []), /Context span "The Age of Piers" cites no source/],
    ['context span kind', (d) => (piers(d).kind = 'Golden Age'), /Context span "The Age of Piers" needs a kind of lowercase letters/],
    ['context not a list', (d) => ((quay(d) as { context: unknown }).context = {}), /Track "quay" context must be a list/],
    ['line name for no line', (d) => (d.meta.lines = { 'no-such-line': { name: 'X' } }), /meta.lines names "no-such-line", which no context span has as its line/],
    ['line without a name', (d) => (d.meta.lines = { 'harbor-ages': { name: ' ' } }), /meta.lines "harbor-ages" has no name/],
    ['spans of a kind overlapping on a line, on different nodes', (d) => Object.assign(leagues(d), { kind: 'age', start: 40 }), /Context spans "The Age of Piers" and "The Age of Leagues" overlap/],
    ['context span outside the range', (d) => Object.assign(piers(d), { start: -400, end: -300, startMonth: undefined, startDay: undefined, endMonth: undefined, endDay: undefined, startDates: undefined, endDates: undefined, startEvent: undefined, endEvent: undefined }), /Context span "The Age of Piers" lies outside meta.range/],
    ['context span rules', (d) => Object.assign(leagues(d), { end: 200 }), /Context span "The Age of Leagues" has both an end and ongoing/],
    ['context span startEvent', (d) => (piers(d).startEvent = 'long-watch'), /Context span "The Age of Piers" starts in .*, but its startEvent "The Long Watch"/],
    // the phase that held a membership
    ['memberOf phase the row lacks', (d) => (quay(d).memberOf![0].phase = 'Third Council'), /names phase "Third Council", which "quay" doesn't have/],
    ['memberOf outside its phase', (d) => (quay(d).memberOf![0].phase = 'First Council'), /doesn't lie within its phase "First Council"/],
    // redirects
    ['redirect from a live id', (d) => (d.redirects = { quay: 'league' }), /Redirect "quay" names an id the timeline still has/],
    ['redirect to an unknown id', (d) => (d.redirects = { 'old-quay': 'nowhere' }), /Redirect "old-quay" points to "nowhere"/],
  ];
  for (const [name, edit, message] of cases)
    it(name, () => {
      const found = problems(edit);
      expect(found.some((p) => message.test(p)), found.join('\n') || '(no problems)').toBe(true);
    });

  // core 1.0 (schema 11), rules 2 and 3: a kind or a field this app doesn't know is kept and ignored when the app reads
  // a file; the site's own data is checked strictly, where each is an error (data/strict.ts)
  const lenient: [string, (d: Dataset) => void, RegExp][] = [
    ['facet applies', (d) => ((d.meta.facets!.theme as { applies: string }).applies = 'places'), /meta\.facets\.theme: unknown facet applies "places"/],
    ['row kind', (d) => ((quay(d) as { kind: string }).kind = 'empire'), /tracks\["quay"\]: unknown row kind "empire"/],
    ['locator kind', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'margin' }), /sources\[0\]\.locator: unknown locator kind "margin"/],
    ['locator with a field it has no place for', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'page', page: '3', line: '2' }), /sources\[0\]\.locator: unknown field "line"/],
  ];
  for (const [name, edit, message] of lenient)
    it(`${name}: kept by the app, refused in our own data`, () => {
      const d = structuredClone(everyField) as unknown as Dataset;
      edit(d);
      expect(validateDataset(d)).toEqual([]);
      const strict = validateStrict(d);
      expect(strict.some((p) => message.test(p)), strict.join('\n') || '(no problems)').toBe(true);
    });

  describe('neighbouring spans of a kind on a line', () => {
    // The Age of Piers ends the year (or day) the Age of Leagues starts, 60 (made an age, so the two share kind and line)
    const end = (e: Record<string, unknown>) => (d: Dataset) => {
      leagues(d).kind = 'age';
      Object.assign(piers(d), { endMonth: undefined, endDay: undefined, endDates: undefined, endEvent: undefined, ...e });
    };
    const overlap = /Context spans "The Age of Piers" and "The Age of Leagues" overlap/;
    it('may share a boundary year when both ends there are year-only, as PeriodO chains are written', () => {
      expect(problems(end({ end: 60 }))).toEqual([]);
    });
    it('may not overlap by a year', () => {
      expect(problems(end({ end: 61 })).some((p) => overlap.test(p))).toBe(true);
    });
    it('may not share the year when an end there gives a month or day', () => {
      expect(problems(end({ end: 60, endMonth: 12, endDay: 31 })).some((p) => overlap.test(p))).toBe(true);
    });
  });

  it('accepts spans of a kind without a line that overlap on different nodes, and spans of different kinds on one line', () => {
    // the Age of Leagues and Quay Town's High Tide: golden ages from 60 on, on the timeline and on a row
    expect(problems((d) => delete leagues(d).line)).toEqual([]);
    expect(problems((d) => Object.assign(leagues(d), { start: 40 }))).toEqual([]);
  });

  it('accepts a context span that runs past meta.range, as long as it overlaps it', () => {
    // a seam age keeps its own dates in both timelines (the Timurid Renaissance, c. 1375–1525, across 1500)
    expect(problems((d) => Object.assign(piers(d), { start: -150, startMonth: undefined, startDay: undefined, startDates: undefined, startEvent: undefined }))).toEqual([]);
  });

  it('accepts a redirect to an era, and one removed on purpose', () => {
    expect(problems((d) => (d.redirects = { 'old-age': 'age-of-piers', gone: null }))).toEqual([]);
  });

  it('accepts a phase name used twice when the dates pick one', () => {
    expect(
      problems((d) => {
        const t = quay(d);
        t.phases![0].name = 'Second Council';
      }),
    ).toEqual([]);
  });
});
