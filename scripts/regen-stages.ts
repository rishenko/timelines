// The stage manifest of `npm run data:regen` (Workbench "2026-11-24 Timelines staged data pipeline design (light)" and its Dev B review).
// One entry per step of the route, in DVC's shape (`cmd`, `deps`, `outs`, `params`) so a later switch to DVC is a translation. This file
// only DESCRIBES the route: regen.ts runs the stages in this order, exactly as it ran the old step list (`--check` proves it).
//
// Reading a stage:
//   cmd     what runs ('py' = the extractor's Python via REGEN_PYTHON, 'node' = node scripts/data.ts)
//   needs   stages whose outputs this one reads: they must come earlier in the list
//   reads   other inputs, named so they cannot hide: the previous run's committed files ('self') and a pinned git object ('git')
//   code    the code the stage runs, as directories (COARSE for now: refine per stage with an import-graph test before any reuse)
//   outs    files the stage writes, MEASURED on main 04a69fa (mtime before/after each step); a test proves every out is inside the
//           route's output roots and that two stages writing one file are ordered by `needs`
//   host    'any' runs on every machine; 'pc' stages are declared and recorded but never run by the Mac route (none yet: the dump passes)
//   params  what besides files changes the output (interpreters and dumps); recorded in the stamp
//   checks  between-stage checks (design "Between-stage checks"): a failing gate stops the route before anything downstream is built
export type Stage = {
  name: string;
  layer: 'L2' | 'L3';
  host: 'any' | 'pc';
  cmd: { run: 'py' | 'node'; args: string[] };
  needs: string[];
  reads: string[];
  code: string[];
  outs: string[];
  params: string[];
  /** Run right after the stage, before anything downstream: 'gate' stops the route on a non-zero exit, 'report' prints its last line and goes on (a check whose allowlists are not reviewed yet). */
  checks?: Check[];
};
export type Check = { name: string; cmd: { run: 'py' | 'node'; args: string[] }; mode: 'gate' | 'report' };

const py = (...args: string[]) => ({ run: 'py' as const, args });
const check = (name: string, mode: Check['mode'], run: 'py' | 'node', ...args: string[]): Check => ({ name, mode, cmd: { run, args } });
const node = (...args: string[]) => ({ run: 'node' as const, args: ['scripts/data.ts', ...args] });

const ANCIENT_RUN = [
  'data-src/ancient-classical-importance.json',
  'data-src/ancient-classical-memberships.json',
  'data-src/ancient-classical.json',
  'data-src/provenance/ancient-classical-reigns.json',
  'docs/ancient-classical-key-events.md',
  'public/timelines/ancient-classical.json',
];
const COMPILED = ['ancient-classical', 'earth-life', 'medieval', 'modern-states'].map((t) => `public/timelines/${t}.json`);
const SELF = 'self: the committed public/timelines/<timeline>.json (the "already on main" check reads the previous compile)';

export const STAGES: Stage[] = [
  { name: 'emit disasters', layer: 'L3', host: 'any', cmd: py('pipelines/v2/emit.py', 'disaster'), needs: [], reads: [SELF], code: ['pipelines/v2', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['pipelines/v2/emitted/disaster-ancient-classical.json', 'pipelines/v2/emitted/disaster-medieval.json', 'pipelines/v2/emitted/disaster-modern-states.json'] },
  { name: 'emit conflicts', layer: 'L3', host: 'any', cmd: py('pipelines/v2/emit.py', 'conflict'), needs: [], reads: [SELF], code: ['pipelines/v2', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['pipelines/v2/emitted/conflict-ancient-classical.json', 'pipelines/v2/emitted/conflict-medieval.json', 'pipelines/v2/emitted/conflict-modern-states.json', 'pipelines/v2/emitted/conflict-wars.json'] },
  // Ancient is a fixed point, not a repeat: run 1 plans, periods/importance/categories read what run 1 wrote, run 2 applies the categories.
  { name: 'ancient: scripts', layer: 'L3', host: 'any', cmd: node('run-all', 'ancient-classical'), needs: ['emit disasters', 'emit conflicts'], reads: [], code: ['scripts/ancient-classical', 'scripts/lib', 'pipelines/ancient', 'pipelines/common'], params: ['node'], outs: ANCIENT_RUN },
  { name: 'ancient: periods', layer: 'L3', host: 'any', cmd: py('pipelines/ancient/periods.py'), needs: ['ancient: scripts'], reads: [], code: ['pipelines/ancient'], params: ['python'], outs: ['data-src/ancient-classical-periods.json'] },
  { name: 'ancient: importance', layer: 'L3', host: 'any', cmd: node('importance', 'ancient-classical'), needs: ['ancient: periods'], reads: [], code: ['scripts/lib'], params: ['node'],
    outs: ['data-src/ancient-classical.json', 'docs/ancient-classical-key-events.md', 'public/timelines/ancient-classical.json'] },
  { name: 'ancient: categories', layer: 'L3', host: 'any', cmd: py('pipelines/ancient/categories.py'), needs: ['ancient: importance'], reads: [], code: ['pipelines/ancient', 'pipelines/common'], params: ['python'],
    outs: ['data-src/ancient-classical-categories.json', 'data-src/provenance/ancient-classical-categories.json'] },
  { name: 'ancient: scripts again', layer: 'L3', host: 'any', cmd: node('run-all', 'ancient-classical'), needs: ['ancient: categories'], reads: [], code: ['scripts/ancient-classical', 'scripts/lib', 'pipelines/ancient', 'pipelines/common'], params: ['node'], checks: [check('owned ids', 'gate', 'py', 'pipelines/common/owned_ids_check.py')], outs: ANCIENT_RUN },
  { name: 'modern states', layer: 'L3', host: 'any', cmd: py('pipelines/modern-states/gen_modern.py'), needs: ['emit disasters', 'emit conflicts'], reads: [], code: ['pipelines/modern-states', 'pipelines/common', 'pipelines/v2'], params: ['python', 'TIMELINES_DATA'],
    outs: ['data-src/modern-states.json', 'data-src/provenance/modern-states-categories.json', 'data-src/provenance/modern-states-reigns.json', 'data-src/provenance/modern-states.json', 'pipelines/out/gen_modern-report.txt'] },
  { name: 'medieval', layer: 'L3', host: 'any', cmd: py('pipelines/medieval/gen_medieval.py'), needs: ['emit disasters', 'emit conflicts', 'ancient: scripts again'],
    reads: ['git: the Modern States seam file at med_europe.MODERN_COMMIT (public/timelines/modern-states.json), a pinned git object, not a file in the tree', 'public/timelines/ancient-classical.json, as the Ancient stages leave it (the 650 seam)'],
    code: ['pipelines/medieval', 'pipelines/common', 'pipelines/v2'], params: ['python', 'TIMELINES_DATA'], checks: [check('reign checks (report mode: allowlists not reviewed yet)', 'report', 'py', 'pipelines/common/reign_checks.py')],
    outs: ['data-src/medieval.json', 'data-src/provenance/medieval-categories.json', 'data-src/provenance/medieval-reigns.json', 'data-src/provenance/medieval.json', 'pipelines/out/gen_medieval-report.txt'] },
  { name: 'earth and life', layer: 'L3', host: 'any', cmd: py('pipelines/earth-life/gen_earth_life.py'), needs: [], reads: [], code: ['pipelines/earth-life', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['data-src/earth-life.json', 'data-src/provenance/earth-life-categories.json', 'data-src/provenance/earth-life.json', 'pipelines/out/earth-life-events-report.txt'] },
  { name: 'compile', layer: 'L3', host: 'any', cmd: node('build', 'all'), needs: ['ancient: scripts again', 'modern states', 'medieval', 'earth and life'], reads: [], code: ['scripts/lib', 'scripts/build-dataset.ts'], params: ['node'], outs: COMPILED },
  { name: 'importance', layer: 'L3', host: 'any', cmd: node('importance', 'all'), needs: ['compile'], reads: [], code: ['scripts/lib'], params: ['node'], checks: [check('no account name in the data', 'gate', 'py', 'pipelines/common/name_guard.py')],
    outs: ['data-src/ancient-classical.json', 'docs/ancient-classical-key-events.md', ...COMPILED] },
];

/** The argv for a stage, given the Python to use. */
export const checkArgv = (c: Check, python: string): string[] => (c.cmd.run === 'py' ? [python, '-I', ...c.cmd.args] : ['node', ...c.cmd.args]);
export const argv = (s: Stage, python: string): string[] => (s.cmd.run === 'py' ? [python, '-I', ...s.cmd.args] : ['node', ...s.cmd.args]);
