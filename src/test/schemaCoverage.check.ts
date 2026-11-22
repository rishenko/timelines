// Type-level tests of UnsetPaths (checked by `tsc -b`, like the fixture it guards): it must name what's missing.
import type { Dataset, TrackSpan } from '../types.ts';
import type { UnsetPaths } from './schemaCoverage.ts';
import type { everyField } from '../data/fixtures/everyField.ts';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Fixture = typeof everyField;

// the fixture sets everything
export const complete: Equal<UnsetPaths<Dataset, Fixture>, never> = true;

// a top-level field left out is named
export const topLevel: Equal<UnsetPaths<Dataset, Omit<Fixture, 'present'>>, 'present'> = true;

// a nested field is named by its path, and set on another item counts (end on one stretch, ongoing on another)
const spans = [{ start: 1, end: 2 }, { start: 3, ongoing: true }];
export const nested: Equal<UnsetPaths<{ s: TrackSpan[] }, { s: typeof spans }>, Exclude<`s.${keyof TrackSpan}`, 's.start' | 's.end' | 's.ongoing'>> = true;

// a record is checked through its values
const sources = { a: { name: 'A', tags: [] as string[] } };
export const records: Equal<UnsetPaths<Pick<Dataset, 'sources'>, { sources: typeof sources }>, `sources.*.${'url' | 'author' | 'year' | 'accessed' | 'hiddenByDefault'}`> = true;
