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
  layer: 'L1' | 'L2' | 'L3';
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
/** `reads`: the generated files the check reads; each must be written by the stage carrying the check or an earlier one (the test proves it). */
export type Check = { name: string; cmd: { run: 'py' | 'node'; args: string[] }; mode: 'gate' | 'report'; reads: string[] };

const py = (...args: string[]) => ({ run: 'py' as const, args });
const check = (name: string, mode: Check['mode'], reads: string[], run: 'py' | 'node', ...args: string[]): Check => ({ name, mode, reads, cmd: { run, args } });
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
  // The rulers pass (pilot of the staged layout): a heavy dump pass built on the PC, so the Mac route DECLARES it and never runs it. Its output
  // is the rulers csv/json set (the regression-inputs branch for CI, ~/data/stages/L2/rulers via scripts/lib/stages.ts locally); what is
  // committed is its record (dump names, code hashes, output sha256s). `node scripts/stage-record.ts check rulers <dir>` is its gate (CI's
  // freeze-regression job runs it). `cmd` is documentation: run it on the PC with the flags in pipelines/README.md.
  { name: 'rulers', layer: 'L2', host: 'pc', cmd: py('pipelines/extract/rulers.py'), needs: [], reads: ['$TIMELINES_DATA: the Wikipedia and Wikidata dumps and the extract tables (see the record\'s `dumps`)'],
    code: ['pipelines/extract', 'pipelines/common'], params: ['python', 'dumps'], outs: ['data-src/provenance/stages/rulers.record.json'] },
  { name: 'emit disasters', layer: 'L3', host: 'any', cmd: py('pipelines/v2/emit.py', 'disaster'), needs: [], reads: [SELF], code: ['pipelines/v2', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['pipelines/v2/emitted/disaster-ancient-classical.json', 'pipelines/v2/emitted/disaster-medieval.json', 'pipelines/v2/emitted/disaster-modern-states.json'] },
  { name: 'emit conflicts', layer: 'L3', host: 'any', cmd: py('pipelines/v2/emit.py', 'conflict'), needs: [], reads: [SELF], code: ['pipelines/v2', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['pipelines/v2/emitted/conflict-ancient-classical.json', 'pipelines/v2/emitted/conflict-medieval.json', 'pipelines/v2/emitted/conflict-modern-states.json', 'pipelines/v2/emitted/conflict-wars.json'] },
  // v4 step 2 (rules 5 and 6): the holders of the head-of-government and governor offices of six rows (Denmark, Japan, India, Peru, Ottoman, Hawaii), read from each row's
  // list page and joined to Wikidata by the page's links. It reads the committed reign inputs (so no reign is added twice), never a generated timeline. Count guards
  // fail the stage; the modern states stage merges the events and adds the `ruler-kind` facet.
  { name: 'offices', layer: 'L3', host: 'any', cmd: py('pipelines/offices/offices.py'), needs: [], reads: ['the Wikipedia dump (six list pages) and the Wikidata tables under $TIMELINES_DATA', 'pipelines/modern-states/reigns.json and extra-reigns.json (reigns already committed)'],
    code: ['pipelines/offices', 'pipelines/common', 'pipelines/v2'], params: ['python', 'dumps'], outs: ['pipelines/offices/emitted/offices-modern-states.json', 'pipelines/offices/emitted/offices-medieval.json', 'data-src/provenance/stages/offices.record.json'] },
  // Ancient is a fixed point, not a repeat: run 1 plans, periods/importance/categories read what run 1 wrote, run 2 applies the categories.
  { name: 'ancient: scripts', layer: 'L3', host: 'any', cmd: node('run-all', 'ancient-classical'), needs: ['emit disasters', 'emit conflicts'], reads: [], code: ['scripts/ancient-classical', 'scripts/lib', 'pipelines/ancient', 'pipelines/common'], params: ['node'], outs: ANCIENT_RUN },
  { name: 'ancient: periods', layer: 'L3', host: 'any', cmd: py('pipelines/ancient/periods.py'), needs: ['ancient: scripts'], reads: [], code: ['pipelines/ancient', 'pipelines/common'], params: ['python'], outs: ['data-src/ancient-classical-periods.json'] },
  { name: 'ancient: importance', layer: 'L3', host: 'any', cmd: node('importance', 'ancient-classical'), needs: ['ancient: periods'], reads: [], code: ['scripts/lib'], params: ['node'],
    outs: ['data-src/ancient-classical.json', 'docs/ancient-classical-key-events.md', 'public/timelines/ancient-classical.json'] },
  { name: 'ancient: categories', layer: 'L3', host: 'any', cmd: py('pipelines/ancient/categories.py'), needs: ['ancient: importance'], reads: [], code: ['pipelines/ancient', 'pipelines/common'], params: ['python'],
    outs: ['data-src/ancient-classical-categories.json', 'data-src/provenance/ancient-classical-categories.json'] },
  { name: 'ancient: scripts again', layer: 'L3', host: 'any', cmd: node('run-all', 'ancient-classical'), needs: ['ancient: categories'], reads: [], code: ['scripts/ancient-classical', 'scripts/lib', 'pipelines/ancient', 'pipelines/common'], params: ['node'], checks: [check('owned ids', 'gate', ['data-src/ancient-classical.json'], 'py', 'pipelines/common/owned_ids_check.py')], outs: ANCIENT_RUN },
  { name: 'modern states', layer: 'L3', host: 'any', cmd: py('pipelines/modern-states/gen_modern.py'), needs: ['emit disasters', 'emit conflicts', 'offices'], reads: [], code: ['pipelines/modern-states', 'pipelines/common', 'pipelines/v2'], params: ['python', 'TIMELINES_DATA'],
    outs: ['data-src/modern-states.json', 'data-src/provenance/modern-states-categories.json', 'data-src/provenance/modern-states-offices.json', 'data-src/provenance/modern-states-reigns.json', 'data-src/provenance/modern-states.json', 'pipelines/out/gen_modern-report.txt'] },
  { name: 'medieval', layer: 'L3', host: 'any', cmd: py('pipelines/medieval/gen_medieval.py'), needs: ['emit disasters', 'emit conflicts', 'ancient: scripts again'],
    reads: ['git: the Modern States seam file at med_europe.MODERN_COMMIT (public/timelines/modern-states.json), a pinned git object, not a file in the tree', 'public/timelines/ancient-classical.json, as the Ancient stages leave it (the 650 seam)'],
    code: ['pipelines/medieval', 'pipelines/common', 'pipelines/v2'], params: ['python', 'TIMELINES_DATA'], checks: [check('reign checks (report mode: allowlists not reviewed yet)', 'report', ['data-src/ancient-classical.json', 'data-src/medieval.json', 'data-src/modern-states.json'], 'py', 'pipelines/common/reign_checks.py')],
    outs: ['data-src/medieval.json', 'data-src/provenance/medieval-categories.json', 'data-src/provenance/medieval-reigns.json', 'data-src/provenance/medieval.json', 'pipelines/out/gen_medieval-report.txt'] },
  { name: 'earth and life', layer: 'L3', host: 'any', cmd: py('pipelines/earth-life/gen_earth_life.py'), needs: [], reads: [], code: ['pipelines/earth-life', 'pipelines/common'], params: ['python', 'TIMELINES_DATA'],
    outs: ['data-src/earth-life.json', 'data-src/provenance/earth-life-categories.json', 'data-src/provenance/earth-life.json', 'pipelines/out/earth-life-events-report.txt'] },
  { name: 'compile', layer: 'L3', host: 'any', cmd: node('build', 'all'), needs: ['ancient: scripts again', 'modern states', 'medieval', 'earth and life'], reads: [], code: ['scripts/lib', 'scripts/build-dataset.ts'], params: ['node'], outs: COMPILED },
  { name: 'importance', layer: 'L3', host: 'any', cmd: node('importance', 'all'), needs: ['compile'], reads: [], code: ['scripts/lib'], params: ['node'],
    outs: ['data-src/ancient-classical.json', 'docs/ancient-classical-key-events.md', ...COMPILED] },
  // The revisions table (wave 2 A2): the revision of every cited Wikipedia page, read from the dump after everything is compiled. The table goes to
  // ~/data/stages/L1/revisions (outside the repo); the record is committed. Generators do not read it (they call wp_dump.page_revision), or it would feed back.
  { name: 'revisions', layer: 'L1', host: 'any', cmd: py('pipelines/common/revisions.py', 'build'), needs: ['importance'], reads: ['the compiled public/timelines/*.json (the cited pages); the Wikipedia dump and its index'],
    code: ['pipelines/common'], params: ['python', 'dumps'], checks: [check('no account name in the data', 'gate', [...COMPILED, 'data-src/medieval.json', 'data-src/modern-states.json', 'data-src/earth-life.json'], 'py', 'pipelines/common/name_guard.py')], outs: ['data-src/provenance/stages/revisions.record.json'] },
  // The ruler rules as data processing (Workbench "2026-11-25 Timelines ruler rules as code design"): every committed reign through the decision table
  // (pipelines/reign-rules/rules.json), with its verdict, rule and reason, the marks, the scores against the stored baseline and the validations. Until the
  // ruler definition is answered it only measures: its files go to ~/data/stages/L2/reign-rules (outside the repo) and nothing under data-src changes. It
  // fails only when its own files disagree with its counts or the rulers inputs are missing. When the verdicts feed the data it moves before the generators.
  { name: 'reign rules', layer: 'L3', host: 'any', cmd: py('pipelines/reign-rules/classify.py'), needs: ['importance'],
    reads: ['the committed reign files (pipelines/<generator>/reigns.json, *-reigns.json), pipelines/common/rulings.json, pipelines/extract/reigns-excluded.json, the rows\' spans in data-src', '$TIMELINES_RULERS_INPUTS (or a regression-inputs checkout): the recorded rulers inputs, for the office text; must match data-src/provenance/stages/rulers.record.json'],
    code: ['pipelines/reign-rules', 'pipelines/common'], params: ['python'], outs: ['pipelines/out/reign-rules-summary.txt'] },
  // R4 (ontology review): what each row id shared by two timelines means (same Wikidata item, or a namesake), from the rows' ids.wikidata and the hand decisions for rows with no item.
  { name: 'row identity', layer: 'L3', host: 'any', cmd: { run: 'node', args: ['scripts/row-identity.ts'] }, needs: ['importance'], reads: ['pipelines/common/row-identity-hand.json'],
    code: ['scripts/lib', 'scripts/row-identity.ts'], params: ['node'], outs: ['data-src/row-identity.json'],
    checks: [check('every shared id has a verdict and no hand entry is stale', 'gate', ['data-src/row-identity.json'], 'node', 'scripts/row-identity.ts', '--check')] },
];

/** The argv for a stage, given the Python to use. */
export const checkArgv = (c: Check, python: string): string[] => (c.cmd.run === 'py' ? [python, '-X', 'utf8', '-I', ...c.cmd.args] : ['node', ...c.cmd.args]);
export const argv = (s: Stage, python: string): string[] => (s.cmd.run === 'py' ? [python, '-X', 'utf8', '-I', ...s.cmd.args] : ['node', ...s.cmd.args]);
