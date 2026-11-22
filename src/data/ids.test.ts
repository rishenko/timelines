// The id-stability check (npm run data -- ids --check) and redirects in links: what counts as a lost id, what a
// redirect accounts for, and how ids from a link follow redirects.
import { describe, expect, it } from 'vitest';
import { datasetIds, describeId, followRedirect, followRedirectList, lostIds } from './ids.ts';
import { validateDataset } from './validate.ts';
import { everyField } from './fixtures/everyField.ts';
import type { Dataset } from '../types.ts';

const base = () => {
  const d = structuredClone(everyField) as Dataset;
  delete d.redirects;
  return d;
};

/** The base fixture changed by `edit`, its lost ids as text, and its validation problems (the check runs on valid files). */
function lost(edit: (d: Dataset) => void) {
  const after = base();
  edit(after);
  return { lost: lostIds(base(), after).map(describeId), problems: validateDataset(after) };
}

/** Renames a row everywhere it's named. */
function renameRow(d: Dataset, from: string, to: string) {
  const fix = (id: string) => (id === from ? to : id);
  for (const t of d.tracks) {
    t.id = fix(t.id);
    if (t.parent) t.parent = fix(t.parent);
    for (const m of t.memberOf ?? []) m.row = fix(m.row);
  }
  for (const e of d.events) e.tracks = e.tracks.map(fix);
}

describe('ids a link can name', () => {
  it('covers every kind', () => {
    const kinds = new Set(datasetIds(everyField).map((r) => r.kind));
    expect([...kinds].sort()).toEqual(['chronology', 'era', 'event', 'facet', 'region', 'row', 'source', 'tag']);
  });

  it('names a region with its facet', () => {
    expect(datasetIds(everyField).filter((r) => r.kind === 'region').map(describeId)).toContain('region "bay" (facet "region")');
  });
});

describe('the id-stability check', () => {
  it('passes an unchanged file', () => {
    expect(lostIds(base(), base())).toEqual([]);
  });

  it('fails a renamed row, and a redirect to its new id passes it', () => {
    const renamed = lost((d) => renameRow(d, 'quay', 'quay-town'));
    expect(renamed.problems).toEqual([]);
    expect(renamed.lost).toEqual(['row "quay"']);
    const redirected = lost((d) => {
      renameRow(d, 'quay', 'quay-town');
      d.redirects = { quay: 'quay-town' };
    });
    expect(redirected).toEqual({ lost: [], problems: [] });
  });

  it('fails a removed event, and a redirect to null passes it', () => {
    const drop = (d: Dataset) => {
      d.events = d.events.filter((e) => e.uuid !== 'leaves-league');
      // the membership it ended no longer names it
      for (const m of d.tracks.flatMap((t) => t.memberOf ?? [])) if (m.endEvent === 'leaves-league') delete m.endEvent;
    };
    expect(lost(drop).lost).toEqual(['event "leaves-league"']);
    expect(lost((d) => (drop(d), (d.redirects = { 'leaves-league': null })))).toEqual({ lost: [], problems: [] });
  });

  it('checks eras, facets, regions, sources, tags and chronologies too', () => {
    const r = lost((d) => {
      d.meta.eras = d.meta.eras!.filter((e) => e.id !== 'age-of-piers');
      delete d.meta.facets!.theme;
      delete d.meta.facets!.region.values.bay;
      delete d.sources.logbook;
      delete d.tags.homebrew;
    });
    expect(r.lost).toEqual([
      'era "age-of-piers"',
      'region "bay" (facet "region")',
      'facet "theme"',
      'region "trade" (facet "theme")',
      'source "logbook"',
      'tag "homebrew"',
    ]);
  });

  it('accepts only null for a lost id that is not a row, event or era', () => {
    const dropTag = (d: Dataset) => delete d.tags.homebrew;
    expect(lost((d) => (dropTag(d), (d.redirects = { homebrew: null }))).lost).toEqual([]);
    // a tag can't be renamed through redirects: validation refuses a target that isn't a row, event or era, and the
    // check doesn't count it either
    const renamed = lost((d) => (dropTag(d), (d.redirects = { homebrew: 'quay' })));
    expect(renamed.lost).toEqual(['tag "homebrew"']);
  });

  it('does not count a new id as lost', () => {
    expect(lost((d) => d.tracks.push({ ...d.tracks[0], id: 'new-row' })).lost).toEqual([]);
  });
});

describe('redirects in links', () => {
  const ds = { redirects: { 'old-quay': 'quay', 'lost-storm': null } };

  it('follows a renamed id, drops a removed one, and leaves others alone', () => {
    expect(followRedirect(ds, 'old-quay')).toBe('quay');
    expect(followRedirect(ds, 'lost-storm')).toBeNull();
    expect(followRedirect(ds, 'league')).toBe('league');
    expect(followRedirect({}, 'old-quay')).toBe('old-quay');
  });

  it('does not treat inherited object keys as redirects', () => {
    expect(followRedirect(ds, 'constructor')).toBe('constructor');
  });

  it('follows each id of a comma list', () => {
    expect(followRedirectList(ds, 'old-quay,lost-storm,league')).toBe('quay,league');
    expect(followRedirectList(ds, null)).toBeNull();
    expect(followRedirectList({}, 'a,b')).toBe('a,b');
  });
});
