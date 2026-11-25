// The one route that rebuilds every generated file from its inputs (Workbench "2026-11-24 Timelines pipeline reproducibility audit").
//   npm run data:regen                 run the route, then write data-src/provenance/regen.json (the stamp)
//   npm run data:regen -- --check      run the route on a clean tree, fail if any generated file differs from the committed one, restore
//   npm run data:regen -- --verify     no dump, no generators: recompute the stamp's hashes and fail if an input or output differs
//   npm run data:regen -- --list       print the route's stages (name, host, needs, outputs)
// Needs the Wikipedia and Wikidata dumps ($TIMELINES_DATA, default ~/data) and the extractor's Python (REGEN_PYTHON, else
// pipelines/extract/.venv/bin/python, else python3). Nothing is typed into a generated file: new reigns go into extra-reigns.json, then this.
//
// The route (tier 2 of the audit): emit the v2 kinds from their committed inputs; Ancient's scripts, plans and periods (twice, the
// second run applies the categories the first one planned); Modern, Medieval, Earth and Life; compile; importance.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { argv, checkArgv, STAGES } from './regen-stages.ts';
import { dumpNames } from './lib/dump-names.ts';

const ROOT = join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const STAMP = 'data-src/provenance/regen.json';

const venv = join(ROOT, 'pipelines/extract/.venv/bin/python');
const PY = process.env.REGEN_PYTHON ?? (existsSync(venv) ? venv : 'python3');

// The route is the stage manifest (scripts/regen-stages.ts), run in list order.
const steps = STAGES.filter((s) => s.host === 'any').map((s) => ({ name: s.name, cmd: argv(s, PY), checks: s.checks ?? [] }));

/** Files the route reads (code, committed inputs, hand data) and files it writes. A file under an input glob that the stamp lacks fails the check. */
const INPUT_DIRS = ['pipelines', 'scripts/ancient-classical', 'scripts/lib'];
const INPUT_SKIP = [/(^|\/)__pycache__\//, /\.pyc$/, /(^|\/)\.venv\//, /^pipelines\/out\//, /^pipelines\/v2\/emitted\//, /\.test\.ts$/, /(^|\/)test_[^/]*\.py$/, /\/archive\//];
const OUTPUT_FILES = (): string[] => [
  ...list('data-src').filter((f) => f !== STAMP),
  ...list('public/timelines'),
  ...list('docs').filter((f) => /-key-events\.md$/.test(f)),
  ...list('pipelines/v2/emitted'),
];
// data-src holds hand-kept sources too (Ancient's base file, plans, seams); they are hashed as outputs because the route rewrites them.

function list(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const name of readdirSync(abs).sort()) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) out.push(...list(relative(ROOT, p)));
    else out.push(relative(ROOT, p).split('\\').join('/'));
  }
  return out;
}

const sha = (f: string) => createHash('sha256').update(readFileSync(join(ROOT, f))).digest('hex');
const inputFiles = () => INPUT_DIRS.flatMap(list).filter((f) => /\.(py|json|csv|txt|ts)$/.test(f) && !INPUT_SKIP.some((re) => re.test(f)));

const dumps = () => dumpNames(ROOT);

function stamp() {
  const hashes = (files: string[]) => Object.fromEntries(files.map((f) => [f, sha(f)]));
  return {
    note: 'Written by `npm run data:regen`: the dumps the route read and the sha256 of every file it reads (inputs) and writes (outputs). `npm run data:regen -- --verify` (and CI) recompute them. Do not edit.',
    dumps: dumps(),
    inputs: hashes(inputFiles()),
    outputs: hashes(OUTPUT_FILES()),
  };
}

function verify(): number {
  if (!existsSync(join(ROOT, STAMP))) {
    console.log(`regen stamp: ${STAMP} does not exist yet (the route has not been run and committed)`);
    return 1;
  }
  const saved = JSON.parse(readFileSync(join(ROOT, STAMP), 'utf8')) as ReturnType<typeof stamp>;
  const now = stamp();
  const problems: string[] = [];
  for (const kind of ['inputs', 'outputs'] as const) {
    for (const f of new Set([...Object.keys(saved[kind]), ...Object.keys(now[kind])])) {
      if (!(f in saved[kind])) problems.push(`${kind}: ${f} is not in the stamp`);
      else if (!(f in now[kind])) problems.push(`${kind}: ${f} is in the stamp but gone`);
      else if (saved[kind][f] !== now[kind][f]) problems.push(`${kind}: ${f} differs from the stamp`);
    }
  }
  if (!problems.length) {
    console.log(`regen stamp: ok (${Object.keys(now.inputs).length} inputs, ${Object.keys(now.outputs).length} outputs, dumps ${JSON.stringify(now.dumps)})`);
    return 0;
  }
  console.log(`regen stamp: ${problems.length} difference(s); run \`npm run data:regen\` and commit the result:`);
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
  if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`);
  return 1;
}

function git(...a: string[]) {
  return spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
}

function route(): boolean {
  for (const [i, s] of steps.entries()) {
    const t0 = Date.now();
    console.log(`[${i + 1}/${steps.length}] ${s.name}`);
    const r = spawnSync(s.cmd[0], s.cmd.slice(1), { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], env: process.env });
    console.log(`    ${r.status === 0 ? 'ok' : `FAILED (exit ${r.status})`} (${Math.round((Date.now() - t0) / 1000)} s)`);
    if (r.status !== 0) return false;
    for (const c of s.checks) {
      const cmd = checkArgv(c, PY);
      const cr = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', env: process.env });
      const last = `${cr.stdout ?? ''}${cr.stderr ?? ''}`.trim().split('\n').pop() ?? '';
      console.log(`    check ${c.name}: ${cr.status === 0 ? 'ok' : c.mode === 'gate' ? 'FAILED' : 'reported'} (${last.slice(0, 110)})`);
      if (cr.status !== 0 && c.mode === 'gate') return false;
    }
  }
  return true;
}

const PATHS = ['data-src', 'public/timelines', 'docs', 'pipelines'];

if (flag('--list')) {
  STAGES.forEach((s, i) => console.log(`${i + 1}. ${s.name} [${s.host}] needs: ${s.needs.join(', ') || '-'}; writes ${s.outs.length}${s.checks?.length ? `, checks: ${s.checks.map((c) => c.name).join('; ')}` : ''}: ${argv(s, PY).join(' ')}`));
} else if (flag('--verify')) {
  process.exit(verify());
} else if (flag('--check')) {
  const dirty = git('status', '--porcelain', '--', ...PATHS).stdout.trim();
  if (dirty) {
    console.error(`--check needs a clean tree under ${PATHS.join(', ')} (it restores them afterwards):\n${dirty}`);
    process.exit(2);
  }
  const ok = route();
  const changed = git('status', '--porcelain', '--', ...PATHS).stdout.trim();
  if (changed) git('checkout', '--', ...PATHS), git('clean', '-fdq', '--', ...PATHS.filter((p) => p !== 'pipelines'));
  if (!ok) process.exit(1);
  if (changed) {
    console.log(`data:regen --check: the route does not reproduce the committed files:\n${changed}`);
    process.exit(1);
  }
  console.log('data:regen --check: the route reproduces every committed file');
} else {
  if (!route()) process.exit(1);
  writeFileSync(join(ROOT, STAMP), JSON.stringify(stamp(), null, 1) + '\n');
  console.log(`wrote ${STAMP}`);
}
