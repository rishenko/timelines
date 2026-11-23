// The WCAG 2.2 AA coverage report: runs every automated accessibility check and writes the results per success
// criterion to docs/wcag-report.md. The criteria, how each is covered and which checks it relies on come from the
// matrix in docs/wcag-coverage.md (edit them there); this adds what the checks found.
//
// Checks:
//   axe       axe-core in a real browser (so colour contrast and target size are judged too), over every view in
//             scripts/lib/ui-states.ts at each width. Each axe rule counts toward the criteria its WCAG tags name.
//   contrast  npm run contrast (1.4.3, text on the timeline's layered backgrounds, every theme preset)
//   contrast-ui  npm run contrast:ui (1.4.11 marks and form fields, 2.4.7 focus outline; every theme preset)
//   reflow    npm run reflow (1.4.10, 1.4.4)
//   targets   npm run targets (2.5.8)
//   tests     the accessibility tests (vitest): src/a11y.test.tsx and the files in TEST_FILES
// Which criteria rely on contrast, contrast-ui, reflow, targets and tests is the matrix's "Run" column.
//
//   node scripts/a11y-report.ts [--url http://localhost:4317/] [--timeline ancient-classical] [--width 1280]...
//        [--skip axe|contrast|contrast-ui|reflow|targets|tests]... [--out docs/wcag-report.md] [--browser chrome|msedge]
//        [--state <name>]...
// Defaults: widths 390 and 1280.
// --state runs axe over the named views only (names as in scripts/lib/ui-states.ts, e.g. --state "plugin view"), for
// a PR's own new states in about a minute. It skips the other checks (they don't use states) and prints the summary
// without writing the report, unless --out is given. Run `npm run build` and `npx vite preview --port 4317` first. Exits with 1 if any
// check fails.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { openState, uiStates } from './lib/ui-states.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timeline = one('--timeline', 'ancient-classical');
const widths = all('--width').length ? all('--width').map(Number) : [390, 1280];
const onlyStates = all('--state');
const skip = new Set(onlyStates.length ? [...all('--skip'), 'contrast', 'contrast-ui', 'reflow', 'targets', 'tests'] : all('--skip'));
const out = all('--out')[0] ?? (onlyStates.length ? null : 'docs/wcag-report.md');
const browserChannel = one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome');

/** The views to run axe over: all, or (--state) the named ones; an unknown name stops the run with the list. */
function pickStates(states: ReturnType<typeof uiStates>) {
  if (!onlyStates.length) return states;
  const names = states.map((s) => s[0]);
  const unknown = onlyStates.filter((n) => !names.includes(n));
  if (unknown.length) {
    console.error(`unknown state ${unknown.map((n) => `"${n}"`).join(', ')}; the states are: ${names.map((n) => `"${n}"`).join(', ')}`);
    process.exit(2);
  }
  return states.filter((s) => onlyStates.includes(s[0]));
}

const MATRIX = 'docs/wcag-coverage.md';
/** Test files with accessibility checks (the "tests" check). */
const TEST_FILES = ['src/a11y.test.tsx', 'src/components/TrackForm.test.tsx', 'src/timeline/keyboard.test.ts', 'src/components/ErrorBoundary.test.tsx'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const SCRIPT_CHECKS = ['contrast', 'contrast-ui', 'reflow', 'targets'] as const;
type CheckId = (typeof SCRIPT_CHECKS)[number] | 'tests';

// ---- the matrix ----

interface Criterion {
  sc: string;
  name: string;
  level: 'A' | 'AA';
  coverage: 'Automated' | 'Partial' | 'Manual' | 'N/A';
  run: CheckId[];
  status: string;
}

function readMatrix(): Criterion[] {
  const rows: Criterion[] = [];
  for (const line of readFileSync(MATRIX, 'utf8').split('\n')) {
    const m = line.match(/^\| (\d\.\d+\.\d+) (.+?) \| (AA?) \| (Automated|Partial|Manual|N\/A)[^|]* \| ([^|]*) \| [^|]* \| ([^|]*) \|$/);
    if (!m) continue;
    const run = m[5].trim() === '—' ? [] : (m[5].split(',').map((s) => s.trim().replace(/`/g, '')) as CheckId[]);
    for (const r of run) if (![...SCRIPT_CHECKS, 'tests'].includes(r)) throw new Error(`${MATRIX}: ${m[1]}: unknown check "${r}"`);
    rows.push({ sc: m[1], name: m[2], level: m[3] as 'A' | 'AA', coverage: m[4] as Criterion['coverage'], run, status: m[6].trim() });
  }
  if (rows.length !== 55) throw new Error(`${MATRIX}: expected 55 criteria, found ${rows.length}`);
  return rows;
}

// ---- axe in the browser ----

interface RuleResult {
  id: string;
  help: string;
  scs: string[];
  /** Elements the rule passed, failed, or couldn't decide ("incomplete": needs a person), over every view. */
  passes: number;
  violations: number;
  incomplete: number;
  /** Views where it failed, with an example element. */
  failedIn: { view: string; nodes: number; example: string }[];
}

const scOf = (tag: string) => tag.match(/^wcag(\d)(\d)(\d+)$/)?.slice(1).join('.');

async function runAxe(): Promise<{ rules: Map<string, RuleResult>; views: string[]; skipped: string[]; version: string }> {
  const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
  const axeSource = readFileSync(axePath, 'utf8');
  const version = JSON.parse(readFileSync(join(axePath, '..', 'package.json'), 'utf8')).version as string;
  const rules = new Map<string, RuleResult>();
  const views: string[] = [];
  /** Views that couldn't be opened: one the timeline doesn't have (Dating, with one dating system) or a broken one. */
  const skipped: string[] = [];
  const browser = await chromium.launch({ channel: browserChannel });
  for (const width of widths) {
    for (const state of pickStates(uiStates(base, timeline))) {
      const view = `${width}px ${state[0]}`;
      const page = await openState(browser, base, timeline, width, state);
      if (!page) {
        skipped.push(view);
        continue;
      }
      await page.addScriptTag({ content: axeSource });
      type Res = { id: string; help: string; tags: string[]; nodes: { html: string }[] };
      const r = (await page.evaluate(
        (tags) =>
          (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<unknown> } }).axe.run(document, {
            runOnly: { type: 'tag', values: tags },
          }),
        AXE_TAGS,
      )) as { passes: Res[]; violations: Res[]; incomplete: Res[] };
      await page.close();
      views.push(view);
      const entry = (x: Res) => {
        let e = rules.get(x.id);
        if (!e) {
          e = { id: x.id, help: x.help, scs: x.tags.flatMap((t) => scOf(t) ?? []), passes: 0, violations: 0, incomplete: 0, failedIn: [] };
          rules.set(x.id, e);
        }
        return e;
      };
      for (const x of r.passes) entry(x).passes += x.nodes.length;
      for (const x of r.incomplete) entry(x).incomplete += x.nodes.length;
      for (const x of r.violations) {
        const e = entry(x);
        e.violations += x.nodes.length;
        e.failedIn.push({ view, nodes: x.nodes.length, example: x.nodes[0]?.html.slice(0, 100) ?? '' });
      }
      const bad = r.violations.length;
      console.log(`${bad ? 'FAIL' : 'ok  '}  axe ${view}${bad ? `: ${r.violations.map((v) => v.id).join(', ')}` : ''}`);
    }
  }
  await browser.close();
  return { rules, views, skipped, version };
}

// ---- the other checks ----

interface CheckResult {
  ok: boolean;
  /** Failure lines from the check's output. */
  failures: string[];
}

function runScript(id: (typeof SCRIPT_CHECKS)[number]): CheckResult {
  console.log(`…     ${id}`);
  // contrast: the opening view only (--quick), as the report has always checked; a theme change runs the sweep itself
  const extra = id === 'contrast' ? ['--quick'] : [];
  const r = spawnSync('node', [`scripts/${id}.ts`, '--url', base, '--browser', browserChannel, ...extra], { encoding: 'utf8' });
  const lines = `${r.stdout}\n${r.stderr}`.split('\n');
  const failures = lines.filter((l) => /^(FAIL|\?)/.test(l)).map((l) => l.trim());
  const ok = r.status === 0;
  if (!ok && !failures.length) failures.push(lines.filter(Boolean).slice(-3).join(' / ') || `exit ${r.status}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id}${failures.length ? `: ${failures.length} failing` : ''}`);
  return { ok, failures };
}

function runTests(): CheckResult {
  console.log('…     tests');
  const file = join(mkdtempSync(join(tmpdir(), 'a11y-report-')), 'vitest.json');
  spawnSync('npx', ['vitest', 'run', ...TEST_FILES, '--reporter=json', `--outputFile=${file}`], { encoding: 'utf8' });
  let failures: string[] = [];
  let total = 0;
  try {
    const j = JSON.parse(readFileSync(file, 'utf8')) as {
      numTotalTests: number;
      testResults: { assertionResults: { fullName: string; status: string }[] }[];
    };
    total = j.numTotalTests;
    failures = j.testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed').map((a) => a.fullName));
  } catch {
    failures = ['the tests did not run (no results file)'];
  }
  console.log(`${failures.length ? 'FAIL' : 'ok  '}  tests: ${total - failures.length} of ${total} pass`);
  return { ok: !failures.length && total > 0, failures };
}

// ---- the report ----

const matrix = readMatrix();
const axe = skip.has('axe') ? null : await runAxe();
const checks = new Map<CheckId, CheckResult>();
for (const id of SCRIPT_CHECKS) if (!skip.has(id)) checks.set(id, runScript(id));
if (!skip.has('tests')) checks.set('tests', runTests());

type Result = 'pass' | 'fail' | 'not run' | '—';
interface Row {
  c: Criterion;
  /** axe rules for this criterion that tested at least one element, and those that found nothing to test. */
  axeTested: RuleResult[];
  axeFailed: RuleResult[];
  axeIncomplete: number;
  checkResults: [CheckId, Result][];
  result: Result;
}
const rows: Row[] = matrix.map((c) => {
  const forSc = axe ? [...axe.rules.values()].filter((r) => r.scs.includes(c.sc)) : [];
  const axeTested = forSc.filter((r) => r.passes + r.violations > 0);
  const axeFailed = forSc.filter((r) => r.violations > 0);
  const checkResults = c.run.map((id): [CheckId, Result] => {
    const r = checks.get(id);
    return [id, !r ? 'not run' : r.ok ? 'pass' : 'fail'];
  });
  const results: Result[] = [...checkResults.map(([, r]) => r), ...(axeTested.length ? [axeFailed.length ? 'fail' : 'pass'] : [])] as Result[];
  const result: Result = results.includes('fail') ? 'fail' : results.includes('pass') ? 'pass' : results.includes('not run') ? 'not run' : '—';
  return { c, axeTested, axeFailed, axeIncomplete: forSc.reduce((n, r) => n + r.incomplete, 0), checkResults, result };
});

const applicable = rows.filter((r) => r.c.coverage !== 'N/A');
const count = (cov: Criterion['coverage']) => rows.filter((r) => r.c.coverage === cov).length;
const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
const automatedSome = applicable.filter((r) => r.c.coverage === 'Automated' || r.c.coverage === 'Partial').length;
const exercised = applicable.filter((r) => r.result === 'pass' || r.result === 'fail');
const failing = rows.filter((r) => r.result === 'fail');
const commit = (() => {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts', 'public'], { encoding: 'utf8' }).trim();
    return dirty ? `${sha} with uncommitted changes` : sha;
  } catch {
    return 'unknown';
  }
})();
const ran = [axe ? 'axe' : null, ...checks.keys()].filter(Boolean).join(', ');
const date = new Date().toISOString().slice(0, 10);

const md: string[] = [];
md.push('# WCAG 2.2 AA report', '');
md.push(
  `Generated by \`npm run a11y:report\` on ${date}, from \`${commit}\`. Do not edit: change the matrix in`,
  '[wcag-coverage.md](wcag-coverage.md) and run the report again.',
  '',
  `Timeline: \`${timeline}\`.${axe?.skipped.length ? ` Views that couldn't be opened, so weren't checked: ${axe.skipped.join(', ')}.` : ''}`,
  '',
  `Checks run: ${ran || 'none'}.${axe ? ` axe-core ${axe.version} over ${axe.views.length} views (${widths.join(' and ')} px; the views in \`scripts/lib/ui-states.ts\`).` : ''}`,
  '',
);
md.push('## Summary', '');
md.push('| | Criteria | Of the applicable |', '|---|---:|---:|');
md.push(`| Applicable (A and AA, without 4.1.1) | ${applicable.length} of ${rows.length} | |`);
for (const cov of ['Automated', 'Partial', 'Manual'] as const) md.push(`| Coverage: ${cov} | ${count(cov)} | ${pct(count(cov), applicable.length)} |`);
md.push(`| With at least some automated check | ${automatedSome} | ${pct(automatedSome, applicable.length)} |`);
md.push(`| Exercised by this run (a check tested something) | ${exercised.length} | ${pct(exercised.length, applicable.length)} |`);
md.push(`| **Failing a check** | **${failing.length}** | |`, '');
md.push(
  '"Exercised" counts a criterion only when one of its checks ran and tested something: an axe rule that found no',
  'element to test (no images, say) does not count. A pass means the checks found nothing wrong, not that the',
  'criterion is met; Partial and Manual criteria still need a person (see the matrix).',
  '',
);

if (failing.length) {
  md.push('## Failing', '');
  for (const r of failing) {
    md.push(`### ${r.c.sc} ${r.c.name} (${r.c.level})`, '');
    for (const a of r.axeFailed)
      md.push(`- axe \`${a.id}\` (${a.help}): ${a.violations} elements in ${a.failedIn.map((f) => `${f.view} (${f.nodes})`).join(', ')}. E.g. \`${a.failedIn[0].example.replace(/`/g, "'")}\``);
    for (const [id, res] of r.checkResults)
      if (res === 'fail') {
        md.push(`- \`${id}\`:`);
        for (const f of checks.get(id)!.failures.slice(0, 12)) md.push(`  - ${f.replace(/\s+/g, ' ')}`);
        const more = checks.get(id)!.failures.length - 12;
        if (more > 0) md.push(`  - … and ${more} more`);
      }
    md.push('');
  }
}

md.push('## Every criterion', '');
md.push('| SC | Level | Coverage | Result | axe rules (tested / found nothing) | Other checks | Matrix status |', '|---|---|---|---|---|---|---|');
for (const r of rows) {
  const axeAll = axe ? [...axe.rules.values()].filter((x) => x.scs.includes(r.c.sc)) : [];
  const axeCell = !axe ? 'not run' : axeAll.length ? `${r.axeTested.length} / ${axeAll.length - r.axeTested.length}${r.axeIncomplete ? `; ${r.axeIncomplete} to review` : ''}` : '—';
  const other = r.checkResults.map(([id, res]) => `${id}: ${res}`).join(', ') || '—';
  const result = r.result === 'fail' ? '**fail**' : r.result;
  md.push(`| ${r.c.sc} ${r.c.name} | ${r.c.level} | ${r.c.coverage} | ${result} | ${axeCell} | ${other} | ${r.c.status} |`);
}
md.push('');
md.push(
  '"To review" counts elements axe could not decide (axe\'s "incomplete"), such as text over an image; a person',
  'checks them.',
  '',
);
if (out) writeFileSync(out, md.join('\n'));

console.log('');
console.log(`Applicable criteria: ${applicable.length}. Some automated check: ${automatedSome} (${pct(automatedSome, applicable.length)}). Exercised by this run: ${exercised.length}. Failing: ${failing.length}${failing.length ? ` (${failing.map((r) => r.c.sc).join(', ')})` : ''}.`);
console.log(out ? `Wrote ${out}` : `States: ${onlyStates.join(', ')} (report not written; --out to write it).`);
process.exit(failing.length ? 1 : 0);
