// The rules schema version 5 added (docs/data-format.md): each is broken once on the every-field fixture, which
// is valid as it stands, and must be named.
import { describe, expect, it } from 'vitest';
import { validateDataset } from './validate.ts';
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

describe('schema version 5 rules', () => {
  it('the fixture is valid', () => {
    expect(validateDataset(everyField)).toEqual([]);
  });

  const cases: [string, (d: Dataset) => void, RegExp][] = [
    // facets on events
    ['facet applies', (d) => ((d.meta.facets!.theme as { applies: string }).applies = 'places'), /Facet "theme" applies must be tracks, events or both/],
    ['event in a rows-only facet', (d) => Object.assign(watch(d).memberships![0], { facet: 'region', value: 'bay' }), /Event "The Long Watch" has a membership in facet "region", which applies to tracks only/],
    ['row in an events-only facet', (d) => (quay(d).memberships = [{ facet: 'theme', value: 'trade', sources: [{ sourceKey: 'ledger', sourceLocation: '' }] }]), /Track "quay" has a membership in facet "theme", which applies to events only/],
    ['event membership without a source', (d) => (watch(d).memberships![0].sources = []), /Event "The Long Watch" membership theme\/trade cites no source/],
    // row kinds
    ['row kind', (d) => ((quay(d) as { kind: string }).kind = 'empire'), /Track "quay" kind must be polity, person or theme/],
    // events' ongoingSources
    ['ongoingSources on an ended event', (d) => Object.assign(watch(d), { ongoing: undefined, end: 160 }), /Event "The Long Watch" has ongoingSources but isn't ongoing/],
    ['ongoingSources citing an unknown source', (d) => (watch(d).ongoingSources![0].sourceKey = 'nowhere'), /ongoingSources cites unknown source "nowhere"/],
    // provenance
    ['dump', (d) => (d.sources.ledger.dump = '2026-11-01'), /Source "ledger" dump must name a snapshot like "enwiki-20261101"/],
    ['revision', (d) => (d.sources.ledger.revision = 1.5), /Source "ledger" revision must be a page revision id/],
    ['revision without a url', (d) => Object.assign(d.sources.logbook, { revision: 7 }), /Source "logbook" has a revision but no url/],
    ['locator kind', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'margin' }), /events\[\d+\]\.sources\[0\]: locator kind must be one of/],
    ['locator without its field', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'lead' }), /a lead locator needs quote/],
    ['locator with a field it has no place for', (d) => ((watch(d).sources[0] as { locator: unknown }).locator = { kind: 'page', page: '3', line: '2' }), /a page locator has no field "line"/],
    // eras
    ['era id', (d) => (d.meta.eras![1].id = 'age-of-piers'), /Duplicate era id "age-of-piers"/],
    ['era without a source', (d) => (d.meta.eras![0].sources = []), /Era "The Age of Piers" cites no source/],
    ['eras overlapping in a group', (d) => Object.assign(d.meta.eras![1], { start: 40, startDates: undefined }), /Eras "The Age of Piers" and "The Age of Leagues" overlap/],
    ['era outside the range', (d) => Object.assign(d.meta.eras![0], { start: -400, end: -300, startMonth: undefined, startDay: undefined, endMonth: undefined, endDay: undefined, startDates: undefined, endDates: undefined, startEvent: undefined, endEvent: undefined }), /Era "The Age of Piers" lies outside meta.range/],
    ['era span rules', (d) => Object.assign(d.meta.eras![1], { end: 200 }), /Era "The Age of Leagues" has both an end and ongoing/],
    ['era startEvent', (d) => (d.meta.eras![0].startEvent = 'long-watch'), /Era "The Age of Piers" starts in .*, but its startEvent "The Long Watch"/],
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

  it('accepts an era that runs past meta.range, as long as it overlaps it', () => {
    // a seam era keeps its own dates in both timelines (the Timurid Renaissance, c. 1375–1525, across 1500)
    expect(problems((d) => Object.assign(d.meta.eras![0], { start: -150, startMonth: undefined, startDay: undefined, startDates: undefined, startEvent: undefined }))).toEqual([]);
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
