import { describe, expect, it } from 'vitest';
import { everyField } from './fixtures/everyField.ts';
import { knownFields, strictProblems, uncovered, validateStrict } from './strict.ts';
import { validateDataset } from './validate.ts';

const copy = () => structuredClone(everyField) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('strict checks', () => {
  it('places every object of the fixture (a new kind of nested object needs a line in CHILDREN)', () => {
    expect(uncovered()).toEqual([]);
  });

  it('learns the fields from the fixture', () => {
    const f = knownFields();
    expect(f.memberOf.has('phase')).toBe(true);
    expect(f.event.has('ongoingSources')).toBe(true);
    expect(f['locator:section'].has('heading')).toBe(true);
    expect(f.track.has('role')).toBe(false);
  });

  it('passes the fixture', () => {
    expect(strictProblems(everyField)).toEqual([]);
    expect(validateStrict(everyField)).toEqual([]);
  });

  it('names an unknown field, where it is, and the nearest known one', () => {
    const d = copy();
    d.tracks[1].memberOf[0].rol = 'axis';
    d.events[1].sources[0].sourceLocaton = 'p. 1';
    d.meta.calendar.yearzero = true;
    expect(strictProblems(d)).toEqual([
      'meta.calendar: unknown field "yearzero" (did you mean "yearZero"?)',
      'tracks["quay"].memberOf[0]: unknown field "rol" (did you mean "row"?)',
      'events["council-falls"].sources[0]: unknown field "sourceLocaton" (did you mean "sourceLocation"?)',
    ]);
  });

  it('checks maps, spans given as a list, claims and locators', () => {
    const d = copy();
    d.sources.ledger.publisher = 'x';
    d.tracks[2].span[1].endDates[0].sourse = d.tracks[2].span[1].endDates[0].source;
    d.events[4].sources[0].locator.headng = 'x';
    expect(strictProblems(d)).toEqual([
      'sources.ledger: unknown field "publisher"',
      'tracks["league"].span[1].endDates[0]: unknown field "sourse" (did you mean "source"?)',
      'events["long-watch"].sources[0].locator: unknown field "headng" (did you mean "heading"?)',
    ]);
  });

  it('refuses an unknown context kind only when strict (the app keeps and ignores it)', () => {
    const d = copy();
    d.meta.context[0].kind = 'golden-aeg';
    expect(validateDataset(d)).toEqual([]);
    expect(validateStrict(d)).toEqual(['meta.context["long-harbor"]: unknown context kind "golden-aeg" (did you mean "golden-age"?)']);
  });

  it('refuses unknown kinds and a role its row does not name, only when strict (core 1.0, rule 3)', () => {
    const d = copy();
    d.events[1].links[0].kind = 'suceeds';
    d.tracks[1].kind = 'polty';
    d.events[4].sources[0].locator = { kind: 'sectoin', heading: 'x' };
    d.meta.facets.region.applies = 'trakcs';
    d.tracks[1].memberOf[0].role = 'asociate';
    expect(validateDataset(d)).toEqual([]);
    expect(validateStrict(d)).toEqual([
      'meta.facets.region: unknown facet applies "trakcs" (did you mean "tracks"?)',
      'tracks["quay"]: unknown row kind "polty" (did you mean "polity"?)',
      'tracks["quay"].memberOf[0]: role "asociate" isn\'t one of the sides "league" names (founder, associate) (did you mean "associate"?)',
      'events["council-falls"].links[0]: unknown link kind "suceeds" (did you mean "succeeds"?)',
      'events["long-watch"].sources[0].locator: unknown locator kind "sectoin" (did you mean "section"?)',
    ]);
  });

  it('leaves the app lenient: unknown fields load without strict', () => {
    const d = copy();
    d.tracks[1].memberOf[0].role = 'axis';
    expect(validateDataset(d)).toEqual([]);
  });
});
