// The timelines built from a readable source file (data-src/), and every file and script that belongs to each.
// One table, so the data commands (scripts/data.ts), the key-event list and the tests agree on the paths.
// The bundled timeline is here.

export interface SourceTimeline {
  /** The short name used in commands: `npm run data -- build <short>`. */
  short: string;
  /** meta.id, as in ?timeline=, the site's list (timelines/index.json) and data-src/site-timelines.json. */
  id: string;
  /** Readable source file, edited by hand and by the scripts below. */
  source: string;
  /** Compiled file the app bundles. */
  compiled: string;
  /** Importance plan: { "1": [key uuids], "3": [minor uuids] }. */
  importance?: string;
  /** Row links plan: each row's Wikipedia article and Wikidata id (scripts/row-links.ts). */
  rowLinks?: string;
  /** Category memberships plan: facets, and each row's memberships with their sources (scripts/lib/memberships.ts). */
  memberships?: string;
  /** Generated review list of key and minor events; written only for a timeline with an importance plan. */
  keyEvents?: string;
  /**
   * The re-runnable scripts that add this timeline's content, in the order they must run. `run-all` replays them
   * onto the current source file; each is an upsert, so the result should be the file as it is (the test for that
   * is `npm run data -- run-all <short> --check`).
   */
  scripts: string[];
}

// Each timeline's own content scripts live in scripts/<short>/. The combined timeline started on 2026-11-20 from
// the merged Ancient Civilizations and Classical World files (their scripts and plans are in archive/), so only
// the scripts written since then replay onto it.
const own = (short: string, names: string[]) => names.map((n) => `scripts/${short}/${n}.ts`);

export const SOURCE_TIMELINES: SourceTimeline[] = [
  {
    short: 'ancient-classical',
    id: 'ancient-classical',
    source: 'data-src/ancient-classical.json',
    compiled: 'public/timelines/ancient-classical.json',
    importance: 'data-src/ancient-classical-importance.json',
    rowLinks: 'data-src/ancient-classical-row-links.json',
    memberships: 'data-src/ancient-classical-memberships.json',
    keyEvents: 'docs/ancient-classical-key-events.md',
    scripts: own('ancient-classical', ['macedon-phases', 'plain-ware', 'aegean-chronology', 'khufu-reign', 'derived-lifespans']),
  },
];

/** A timeline by short name or id; throws with the list of names when there is none. */
export function sourceTimeline(name: string | undefined): SourceTimeline {
  const t = SOURCE_TIMELINES.find((x) => x.short === name || x.id === name);
  if (!t) throw new Error(`unknown timeline "${name ?? ''}"; use one of: ${SOURCE_TIMELINES.map((x) => x.short).join(', ')}`);
  return t;
}
