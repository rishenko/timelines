// Schema 11, minor 2: the `people` block (docs/data-format.md, "People"). The pilot fixture holds 20 real rows of the
// people pass (pipelines/people/fixture.py); the everyField fixture sets every field.
import { describe, expect, it } from 'vitest';
import pilot from './fixtures/people-pilot.json';
import { everyField } from './fixtures/everyField.ts';
import { minorNeeded } from './migrate.ts';
import { derivedActive, strictProblems, validateStrict } from './strict.ts';
import { validateDataset } from './validate.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const copy = (d: unknown = pilot) => structuredClone(d) as Record<string, any>;

describe('people (schema 11.2)', () => {
  it('the pilot (20 people from the pass) is valid, strictly', () => {
    expect(Object.keys(pilot.people)).toHaveLength(20);
    expect(validateStrict(pilot)).toEqual([]);
    expect(validateStrict(everyField)).toEqual([]);
  });
  it('one person, two reigns: Darius II on Persia and on Egypt', () => {
    const reigns = pilot.events.filter((e) => e.people?.includes('darius-ii'));
    expect(reigns.map((e) => e.tracks[0]).sort()).toEqual(['achaemenid-empire', 'egypt']);
  });
  it('needs minor 2', () => {
    expect(minorNeeded(pilot as never)).toBe(2);
    expect(minorNeeded(everyField)).toBe(4); // the fixture also names a calendar plugin (11.4)
    const d = copy(everyField);
    delete d.meta.calendar.system;
    expect(minorNeeded(d)).toBe(2);
    delete d.people;
    for (const e of d.events) delete e.people;
    delete d.meta.facets.area;
    expect(minorNeeded(d)).toBe(1);
  });
  it('an event names only people the timeline has, each once', () => {
    const d = copy();
    d.events[0].people = ['darius-iii'];
    expect(validateDataset(d)).toEqual(['Event "Reign of Darius II" names unknown person "darius-iii".']);
    d.events[0].people = ['darius-ii', 'darius-ii'];
    expect(validateDataset(d)).toEqual(['Event "Reign of Darius II" names person "darius-ii" more than once.']);
  });
  it('a person needs a name, an active year and how it was found, and cited rows', () => {
    const d = copy();
    d.people['darius-ii'].name = '';
    delete d.people['vegetius'].active;
    delete d.people['ibn-arabi'].active.from;
    d.people['jan-gossaert'].rows[0].row = 'atlantis';
    d.people['flavio-biondo'].rows[0].sources = [];
    expect(validateDataset(d)).toEqual([
      'Person "darius-ii" has no name.',
      'Person "flavio-biondo" row "italy" cites no source.',
      'Person "ibn-arabi" active needs from: how the year was found (source, born-died, born or died).',
      'Person "jan-gossaert" belongs to unknown row "atlantis".',
      'Person "vegetius" needs active, a year it is placed at.',
    ]);
  });
  it('born after died, and an active year from a source that cites none', () => {
    const d = copy();
    d.people['darius-ii'].born.year = -300;
    d.people['vegetius'].active = { year: 425, from: 'source' };
    expect(validateDataset(d)).toEqual(['Person "darius-ii" is born (-300) after dying (-404).']);
    expect(strictProblems(d)).toContain('people.vegetius.active: active is from a source but cites none');
  });
  it('a facet for people holds only people, and people only such facets', () => {
    const d = copy();
    d.events[0].memberships = [{ facet: 'area', value: 'religion', sources: [{ sourceKey: 'wikidata', sourceLocation: 'x' }] }];
    expect(validateDataset(d)).toEqual(['Event "Reign of Darius II" has a membership in facet "area", which applies to people only (a facet for people applies to people only).']);
    const e = copy(everyField);
    e.people['first-warden'].memberships[0] = { facet: 'theme', value: 'trade', sources: e.people['first-warden'].memberships[0].sources };
    expect(validateDataset(e)).toEqual(['Person "first-warden" has a membership in facet "theme", which applies to events only (a facet for people applies to people only).']);
  });
  it('strict: a derived active year must be what its rule gives; unknown from/via and fields fail', () => {
    expect(derivedActive('born-died', -475, -404)).toBe(-440); // Darius II, as the pass rounds (down)
    expect(derivedActive('born', 1953, undefined)).toBe(1983);
    expect(derivedActive('died', undefined, 100)).toBe(80);
    const d = copy();
    d.people['darius-ii'].active.year = -441;
    d.people['vegetius'].active.from = 'floruit';
    d.people['ibn-arabi'].rows[0].via = 'citizenshp';
    d.people['jan-gossaert'].activ = 'x';
    delete d.people['laurentino-cortizo'].born;
    expect(validateDataset(d)).toEqual([]); // rule 3: all of it loads
    expect(strictProblems(d)).toEqual([
      'people.darius-ii: active year -441 isn\'t what "born-died" gives (-440)',
      'people.ibn-arabi.rows[0]: unknown row via "citizenshp" (did you mean "citizenship"?)',
      'people.jan-gossaert: unknown field "activ" (did you mean "active"?)',
      'people.laurentino-cortizo: active is from "born", but the dates that rule needs aren\'t there',
      'people.vegetius.active: unknown active from "floruit"',
    ]);
  });
});

describe('editing a timeline with people', async () => {
  const { removeSource, removeTrack, sourceBlockers, upsertTrack } = await import('../state/edits.ts');
  const ds = () => copy() as never;
  it('a renamed row takes its people with it', () => {
    const d = ds() as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const row = d.tracks.find((t: { id: string }) => t.id === 'italy');
    const out = upsertTrack(d as never, { ...row, id: 'italian-states' }, 'italy');
    expect(out.people!['flavio-biondo'].rows![0].row).toBe('italian-states');
    expect(validateDataset(out)).toEqual([]);
  });
  it('a removed row leaves its people without it', () => {
    const out = removeTrack(ds(), 'italy');
    expect(out.people!['flavio-biondo'].rows).toBeUndefined();
    expect(validateDataset(out)).toEqual([]);
  });
  it('a removed source drops its citations; birth and death keep their years', () => {
    const out = removeSource(ds(), 'wikidata');
    expect(out.people!['darius-ii'].born).toEqual({ year: -475 });
    expect(out.people!['darius-ii'].rows).toBeUndefined();
    expect(out.people!['darius-ii'].memberships).toHaveLength(1); // cites the people pass
    expect(validateDataset(out).filter((e) => e.startsWith('Person'))).toEqual([]);
  });
  it("a source a person's floruit rests on can't be deleted; the editor names them", () => {
    const d = copy(everyField) as never as import('../types.ts').Dataset;
    expect(sourceBlockers(d, 'ledger')).toEqual(['The First Warden']);
    expect(removeSource(d, 'ledger')).toBe(d);
    expect(sourceBlockers(d, 'logbook')).toEqual([]);
    expect(validateStrict(removeSource(d, 'logbook')).filter((e) => e.includes('first-warden'))).toEqual([]);
  });
});
