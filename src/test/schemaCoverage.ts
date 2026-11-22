/**
 * Which schema fields a piece of data never sets, worked out by the type checker (`tsc -b`, so `npm run build` and
 * CI). Used by the every-field fixture (src/data/fixtures/everyField.ts): a field added to src/types.ts that the
 * fixture doesn't set fails the build, before any timeline uses it.
 *
 * `UnsetPaths<Schema, typeof data>` is the union of the unset fields' paths (`"tracks.span.ongoingSources"`), or
 * `never`. A field counts as set when any item at that place sets it, so fields that exclude each other (`end` and
 * `ongoing`) can be set on different items. Records (`sources`, `meta.facets`) are checked through their values. In a
 * union of object types (the kinds of `SourceRef.locator`) only the fields they share are required at each place, so
 * one item can stand for the union; that each member appears somewhere is the fixture test's job. The data must be typed by inference (an object
 * literal with `satisfies Dataset`), not annotated as `Dataset`, or every field counts as set.
 */

/** Lists opened: the element type (to any depth). */
type Elem<T> = T extends readonly (infer U)[] ? Elem<U> : T;

/** The object types a field may hold: lists opened, primitives and `undefined` dropped. */
type Objects<T> = Extract<Elem<NonNullable<T>>, object>;

/** Keys the data sets, over every item type (an array literal's items are inferred as a union with `?: undefined`). */
type SetKeys<D> = D extends unknown ? { [K in keyof D]-?: [D[K]] extends [undefined] ? never : K }[keyof D] : never;

/** The values found at key K across the data's item types. */
type ValuesAt<D, K> = D extends unknown ? (K extends keyof D ? Elem<NonNullable<D[K]>> : never) : never;

/** The values of a record, across the data's item types. */
type RecordValues<D> = D extends unknown ? Elem<NonNullable<D[keyof D]>> : never;

type Join<At extends string, K extends string> = At extends '' ? K : `${At}.${K}`;

export type UnsetPaths<S, D, At extends string = ''> =
  // not distributed: a union of object types is checked as one type (its shared fields)
  [Objects<S>] extends [infer M]
    ? [M] extends [never]
      ? never
      : [M] extends [object]
      ? string extends keyof M
        ? UnsetPaths<M[string & keyof M], RecordValues<D>, Join<At, '*'>>
        : {
            [K in keyof M & string]-?: K extends SetKeys<D> ? UnsetPaths<M[K], ValuesAt<D, K>, Join<At, K>> : Join<At, K>;
          }[keyof M & string]
        : never
    : never;
