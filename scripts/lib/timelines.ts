// The timelines built from a readable source file (data-src/), and every file and script that belongs to each.
// One table, so the data commands (scripts/data.ts), the key-event list and the tests agree on the paths.
// Both bundled timelines are here.

export interface SourceTimeline {
  /** The short name used in commands: `npm run data -- build <short>`. */
  short: string;
  /** meta.id, as in ?timeline= and src/timelines/index.ts. */
  id: string;
  /** Readable source file, edited by hand and by the scripts below. */
  source: string;
  /** Compiled file the app bundles. */
  compiled: string;
  /** Importance plan: { "1": [key uuids], "3": [minor uuids] }. */
  importance?: string;
  /** Generated review list of key and minor events; written only for a timeline with an importance plan. */
  keyEvents?: string;
  /**
   * The re-runnable scripts that add this timeline's content, in the order they must run. `run-all` replays them
   * onto the current source file; each is an upsert, so the result should be the file as it is (the test for that
   * is `npm run data -- run-all <short> --check`).
   */
  scripts: string[];
}

const additions = (names: string[]) => names.map((n) => `scripts/additions/${n}.ts`);
const classical = (names: string[]) => names.map((n) => `scripts/classical/${n}.ts`);

export const SOURCE_TIMELINES: SourceTimeline[] = [
  {
    short: 'ancient',
    id: 'ancient-near-east',
    source: 'data-src/ancient-near-east.json',
    compiled: 'src/timelines/ancient-near-east.json',
    importance: 'data-src/ancient-importance.json',
    keyEvents: 'docs/ancient-key-events.md',
    // phases.ts after every script that puts events on period rows; groups.ts last: it nests the regions into
    // groups and sets the row order
    scripts: additions([
      'europe', 'mediterranean', 'steppe', 'africa', 'asia', 'pacific', 'caucasus', 'arabia', 'eastern-europe',
      'americas', 'north-asia', 'fill-gaps', 'neolithic-near-east', 'neolithic-world', 'neolithic-2', 'neolithic-3',
      'ideas', 'peoples', 'phases', 'groups',
    ]),
  },
  {
    short: 'classical',
    id: 'classical',
    source: 'data-src/classical.json',
    compiled: 'src/timelines/classical.json',
    importance: 'data-src/classical-importance.json',
    keyEvents: 'docs/classical-key-events.md',
    // skeleton first; summary-only after the region passes; phases after every script that defines its rows;
    // collapsed.ts last (it reads the final rows)
    scripts: classical([
      'skeleton', 'mediterranean-near-east', 'south-asia', 'east-asia', 'steppe', 'africa', 'europe', 'americas',
      'se-asia-tibet', 'china-north-south', 'island-sea-oceania', 'summary-only', 'phases', 'collapsed',
    ]),
  },
];

/** A timeline by short name or id; throws with the list of names when there is none. */
export function sourceTimeline(name: string | undefined): SourceTimeline {
  const t = SOURCE_TIMELINES.find((x) => x.short === name || x.id === name);
  if (!t) throw new Error(`unknown timeline "${name ?? ''}"; use one of: ${SOURCE_TIMELINES.map((x) => x.short).join(', ')}`);
  return t;
}
