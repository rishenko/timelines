// Restack a PR on its base without the hand steps (Workbench "2026-11-24 Timelines team retrospectives", pass 9 theme 2).
//   npm run restack -- <pr> [--base <branch>] [--inputs <dir>] [--refreeze] [--push] [--keep] [--dir <worktree>]
//
// 1. Reads the head ref and the base from `gh pr view` (never from notes). A head on a fork is refused.
// 2. Makes a throwaway worktree at the PR head (fetch and push go over HTTPS to the repo from `gh`, not `origin`).
// 3. Merges the base. A conflict only in generated files takes the base's version; any other conflict stops (a person resolves it). A conflict in reigns.json (the freeze writes it, data:regen only reads it) stops unless --refreeze is set.
// 4. --refreeze: for each timeline with a pipelines/<generator>/reigns.json, strips every reign the head's and the base's reigns.json held
//    out of data-src (an excluded reign left behind makes the freeze drop its replacement as a duplicate), re-freezes from --inputs
//    (the regression inputs checkout, kc3-inputs/<timeline>), and restores data-src.
// 5. Ends in `npm run data:regen` (the one regen route; no generator list of its own), commits, then prints lost/added/changed events
//    per timeline against the base, then runs `npm run data:regen -- --check` and freeze_regression.py.
// 6. Pushes only with --push, and only as a plain fast-forward (never a force-push). Stops at the first failure and leaves the worktree.
//
// Needs gh logged in, REGEN_PYTHON (the extractor's Python) and the dumps ($TIMELINES_DATA) for the regen steps.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const pr = args.find((a) => /^\d+$/.test(a));
const opt = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const flag = (f: string) => args.includes(f);
if (!pr) {
  console.error('usage: npm run restack -- <pr> [--base <branch>] [--inputs <dir>] [--refreeze] [--push] [--keep] [--dir <worktree>]');
  process.exit(2);
}

const ROOT = join(import.meta.dirname, '..');
const TIMELINES: Record<string, string> = { 'modern-states': 'modern-states', medieval: 'medieval', 'ancient-classical': 'ancient' }; // timeline -> generator dir
const GENERATED = [/^data-src\//, /^public\/timelines\//, /^docs\/.*-key-events\.md$/, /^pipelines\/v2\/emitted\//];

type R = { status: number | null; stdout: string; stderr: string };
function run(cwd: string, cmd: string, a: string[], env: NodeJS.ProcessEnv = process.env): R {
  const r = spawnSync(cmd, a, { cwd, encoding: 'utf8', env, maxBuffer: 1 << 28 });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
function must(cwd: string, cmd: string, a: string[], what: string, env?: NodeJS.ProcessEnv): R {
  const r = run(cwd, cmd, a, env);
  if (r.status !== 0) stop(`${what} failed (exit ${r.status}): ${(r.stderr || r.stdout).trim().split('\n').slice(-6).join('\n')}`);
  return r;
}
function stop(msg: string): never {
  console.error(`restack #${pr} STOPPED: ${msg}`);
  if (wt) console.error(`worktree left at ${wt}`);
  process.exit(1);
}
const say = (m: string) => console.log(`[restack #${pr}] ${m}`);

// 1. the PR, from GitHub
const info = JSON.parse(must(ROOT, 'gh', ['pr', 'view', pr, '--json', 'headRefName,headRepositoryOwner,baseRefName,state,isCrossRepository,url'], 'gh pr view').stdout);
if (info.state !== 'OPEN') stop(`PR is ${info.state}`);
if (info.isCrossRepository) stop('the head is on a fork; restack refuses forks');
const head: string = info.headRefName;
const base: string = opt('--base') ?? info.baseRefName;
const repo = /github\.com\/([^/]+\/[^/]+)\/pull/.exec(info.url)?.[1] ?? stop('cannot read the repo from the PR url');
const remote = `https://github.com/${repo}.git`;
say(`${repo} head=${head} base=${base}`);

// 2. worktree at the fetched head
const wt = opt('--dir') ?? join(homedir(), 'Documents/GitHub', `${repo.split('/')[1]}-rs-${pr}`);
if (existsSync(wt)) stop(`${wt} already exists; remove it or pass --dir`);
const fetched = must(ROOT, 'git', ['ls-remote', remote, `refs/heads/${head}`], 'ls-remote').stdout.split('\t')[0];
must(ROOT, 'git', ['fetch', '-q', remote, `+refs/heads/${head}:refs/restack/${pr}/head`, `+refs/heads/${base}:refs/restack/${pr}/base`], 'git fetch refs');
must(ROOT, 'git', ['worktree', 'add', '-q', '--detach', wt, `refs/restack/${pr}/head`], 'git worktree add');
const tip = must(wt, 'git', ['rev-parse', 'HEAD'], 'rev-parse HEAD').stdout.trim();
if (tip !== fetched) stop(`head moved while fetching (${tip} vs ${fetched}); run again`);
if (!existsSync(join(wt, 'node_modules'))) {
  say('npm ci');
  must(wt, 'npm', ['ci', '--silent'], 'npm ci');
}

// reigns.json uuids held by the head, before the merge (for the strip)
const reignUuids = (dir: string, gen: string): Set<string> => {
  const p = join(dir, 'pipelines', gen, 'reigns.json');
  return existsSync(p) ? new Set<string>((JSON.parse(readFileSync(p, 'utf8')).events ?? []).map((e: { uuid: string }) => e.uuid)) : new Set();
};
const headReigns = Object.fromEntries(Object.entries(TIMELINES).map(([t, g]) => [t, reignUuids(wt, g)]));

// the base's events, for the lost/added/changed report
const eventsAt = (ref: string, t: string): Map<string, string> => {
  const r = run(wt, 'git', ['show', `${ref}:data-src/${t}.json`]);
  if (r.status !== 0) return new Map();
  return new Map((JSON.parse(r.stdout).events ?? []).map((e: { uuid: string }) => [e.uuid, JSON.stringify(e)]));
};

// 3. merge the base
const m = run(wt, 'git', ['merge', '--no-commit', '--no-ff', `refs/restack/${pr}/base`]);
if (m.status !== 0) {
  const conflicted = run(wt, 'git', ['diff', '--name-only', '--diff-filter=U']).stdout.trim().split('\n').filter(Boolean);
  const reignFiles = conflicted.filter((f) => /^pipelines\/[^/]+\/reigns\.json$/.test(f));
  if (reignFiles.length && !flag('--refreeze')) stop(`${reignFiles.join(', ')} conflicts: the freeze writes it (data:regen only reads it), so taking the base's copy would drop the PR's frozen reigns; re-run with --refreeze --inputs <dir>`);
  const other = conflicted.filter((f) => !GENERATED.some((re) => re.test(f)) && !reignFiles.includes(f));
  if (!conflicted.length || other.length) stop(`the merge conflicts outside generated files (resolve by hand): ${(other.length ? other : [m.stderr.trim()]).join(', ')}`);
  say(`conflicts only in ${conflicted.length} generated file(s)${reignFiles.length ? ' (reigns.json: the refreeze rebuilds it)' : ''}: taking the base's version`);
  for (const f of conflicted) {
    must(wt, 'git', ['checkout', '--theirs', '--', f], `take the base's ${f}`); // merging the base into the head: "theirs" is the base
    must(wt, 'git', ['add', '--', f], 'git add');
  }
}

// 4. refreeze
if (flag('--refreeze')) {
  const inputs = opt('--inputs') ?? process.env.REGRESSION_INPUTS ?? stop('--refreeze needs --inputs <regression-inputs dir> (or REGRESSION_INPUTS)');
  const py = process.env.REGEN_PYTHON ?? 'python3';
  for (const [t, g] of Object.entries(TIMELINES)) {
    if (!existsSync(join(wt, 'pipelines', g, 'reigns.json'))) continue;
    const strip = new Set([...headReigns[t], ...reignUuids(wt, g)]);
    const file = join(wt, 'data-src', `${t}.json`);
    const original = readFileSync(file, 'utf8');
    const d = JSON.parse(original);
    d.events = d.events.filter((e: { uuid: string }) => !strip.has(e.uuid));
    writeFileSync(file, JSON.stringify(d));
    say(`refreeze ${t} (stripped ${strip.size} reign uuids from data-src first)`);
    const f = run(wt, py, ['-I', 'pipelines/extract/reigns_freeze.py', '--timeline', t, '--dir', join(inputs, 'kc3-inputs', t), '--update', '--without-extras', '--term-labels', join(inputs, 'kc3-inputs', 'term-labels.json')]);
    writeFileSync(file, original);
    if (f.status !== 0) stop(`reigns_freeze ${t} failed: ${(f.stderr || f.stdout).trim().split('\n').slice(-4).join('\n')}`);
    say(`  ${f.stdout.trim().split('\n').slice(-1)[0].slice(0, 120)}`);
  }
}

// 5. the one regen route, commit, report, checks
say('npm run data:regen (about 8 minutes)');
must(wt, 'npm', ['run', 'data:regen', '--silent'], 'data:regen');
must(wt, 'git', ['add', '-A'], 'git add -A');
const commit = run(wt, 'git', ['commit', '-q', '-m', `Merge ${base} into ${head} (restack) and regenerate`]);
if (commit.status !== 0 && !/nothing to commit/.test(commit.stdout + commit.stderr)) stop(`git commit failed: ${commit.stderr}`);

for (const t of Object.keys(TIMELINES)) {
  const before = eventsAt(`refs/restack/${pr}/base`, t);
  const after = eventsAt('HEAD', t);
  const lost = [...before.keys()].filter((u) => !after.has(u)).length;
  const added = [...after.keys()].filter((u) => !before.has(u)).length;
  const changed = [...after].filter(([u, j]) => before.has(u) && before.get(u) !== j).length;
  say(`${t} vs ${base}: lost ${lost}, added ${added}, changed ${changed}`);
}

say('data:regen --check');
must(wt, 'npm', ['run', 'data:regen', '--silent', '--', '--check'], 'data:regen --check');
if (flag('--inputs') || process.env.REGRESSION_INPUTS) {
  const inputs = opt('--inputs') ?? process.env.REGRESSION_INPUTS!;
  say('freeze_regression');
  const fr = run(wt, process.env.REGEN_PYTHON ?? 'python3', ['-I', 'pipelines/extract/freeze_regression.py', join(inputs, 'kc3-inputs')]);
  if (fr.status !== 0) stop(`freeze_regression failed: ${(fr.stdout + fr.stderr).trim().split('\n').slice(-6).join('\n')}`);
} else say('freeze_regression skipped (no --inputs); run it before pushing');

// 6. push (plain fast-forward) and clean up
if (flag('--push')) {
  must(wt, 'git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', remote, `HEAD:refs/heads/${head}`], 'git push (fast-forward only; refused if the remote moved)');
  say(`pushed ${head}; re-run inherit/approve per the review rules`);
} else say('not pushed (pass --push)');
if (!flag('--keep') && flag('--push')) {
  run(ROOT, 'git', ['worktree', 'remove', '--force', wt]);
  for (const r of ['head', 'base']) run(ROOT, 'git', ['update-ref', '-d', `refs/restack/${pr}/${r}`]);
} else say(`worktree kept at ${wt}`);
