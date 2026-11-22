// The checks to run before asking for review, one line each ("ok" or "FAIL" and what it found):
//   main      the branch has main merged in (fetches main first; --no-fetch uses the local origin/main) and would
//             merge without conflicts
//   tsc       tsc -b
//   lint      oxlint: errors fail, warnings are counted
//   tests     the suite, with your local timelines when they're set up (npm run test:private's rule), else without
//   docs      npm run docs:check
//   compare   npm run data:compare for each compiled timeline the branch changes, against where it left main; its
//             count of differences (which a data change is meant to have), failing only if the compare can't run
//   a11y      with --timeline <id>: builds, serves on --port (default 4599), runs npm run a11y:report on that timeline
//             (written to a temporary file, never docs/wcag-report.md) and prints its summary line
//   npm run pr:check [-- --timeline <id>] [--port 4599] [--no-fetch]
// Exits with 1 if any check fails. Paste the lines into the PR's Checks section.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lastLine, localData, quietVitest, run } from './lib/quiet.ts';

const args = process.argv.slice(2);
const opt = (flag: string) => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};
const timeline = opt('--timeline');
const port = opt('--port') ?? '4599';
const REPO = 'https://github.com/rishenko/timelines.git';

let failed = 0;
const line = (ok: boolean, name: string, detail: string) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(8)}${detail}`);
};

// ---- main merged in, and no conflicts ----
let fetched = '';
if (!args.includes('--no-fetch')) {
  const f = run('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'fetch', '-q', REPO, 'main:refs/remotes/origin/main']);
  if (!f.ok) fetched = ' (fetch failed: local origin/main)';
}
const main = run('git', ['rev-parse', '--short', 'origin/main']).out.trim();
const behind = Number(run('git', ['rev-list', '--count', 'HEAD..origin/main']).out.trim());
const conflicts = !run('git', ['merge-tree', '--write-tree', 'HEAD', 'origin/main']).ok;
line(
  !behind && !conflicts,
  'main',
  behind
    ? `${behind} commit(s) behind origin/main ${main}${conflicts ? ', with conflicts' : ''}: merge it (plain merge)${fetched}`
    : `up to date with origin/main ${main}${fetched}`,
);

// ---- tsc, lint ----
const tsc = run('npx', ['tsc', '-b']);
line(tsc.ok, 'tsc', tsc.ok ? 'clean' : `${tsc.out.split('\n').filter((l) => / error TS/.test(l)).length} error(s): ${lastLine(tsc.out).slice(0, 160)}`);
const lint = run('npx', ['oxlint']);
const count = (kind: string) => lint.out.split('\n').filter((l) => l.includes(`: ${kind} `)).length;
const warnings = count('warning');
const errors = count('error');
line(lint.ok, 'lint', `${errors} error(s), ${warnings} warning(s)`);

// ---- tests ----
const dir = localData();
const env = { ...process.env };
if (dir) env.TIMELINES_LOCAL_DATA = dir;
else delete env.TIMELINES_LOCAL_DATA;
const t = quietVitest([], env);
line(t.ok, 'tests', `${t.summary}${dir ? ' (with local timelines)' : ' (no local timelines set up)'}`);
for (const f of t.failures.slice(0, 10)) console.log(`        ${f}`);
if (t.failures.length > 10) console.log(`        … ${t.failures.length - 10} more`);

// ---- docs ----
const docs = run('npm', ['run', '-s', 'docs:check']);
const gaps = docs.out.split('\n').filter((l) => l.trim() && !l.startsWith('docs check'));
line(docs.ok, 'docs', docs.ok ? 'ok' : `${lastLine(docs.out)}; first: ${gaps[0]?.slice(0, 140)}`);

// ---- data:compare on each compiled timeline the branch changes ----
const base = run('git', ['merge-base', 'HEAD', 'origin/main']).out.trim();
const changed = run('git', ['diff', '--name-only', base, '--', 'public/timelines/'])
  .out.split('\n')
  .filter((f) => f.endsWith('.json') && !f.endsWith('index.json'));
if (!changed.length) line(true, 'compare', 'no compiled timeline changed');
const tmp = mkdtempSync(join(tmpdir(), 'pr-check-'));
for (const file of changed) {
  const before = join(tmp, file.split('/').pop()!);
  const old = run('git', ['show', `${base}:${file}`]);
  if (!old.ok) {
    line(true, 'compare', `${file}: new file`);
    continue;
  }
  writeFileSync(before, old.out);
  const c = run('npm', ['run', '-s', 'data:compare', '--', before, file]);
  // differences aren't a failure (a data change is meant to make some); only an error is. Read them with data:compare.
  const summary = c.out.split('\n').find((l) => /^\d+ difference/.test(l));
  line(!!summary, 'compare', `${file}: ${(summary ?? lastLine(c.out)).slice(0, 160)}`);
}

// ---- a11y summary on one timeline ----
if (timeline) {
  const build = run('npm', ['run', '-s', 'build']);
  if (!build.ok) line(false, 'a11y', `build failed: ${lastLine(build.out).slice(0, 160)}`);
  else {
    const server = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { stdio: 'ignore', detached: true });
    await new Promise((r) => setTimeout(r, 3000));
    const out = join(tmp, 'wcag-report.md');
    const a = run('node', ['scripts/a11y-report.ts', '--url', `http://localhost:${port}/`, '--timeline', timeline, '--out', out]);
    try {
      process.kill(-server.pid!);
    } catch {
      // already gone
    }
    const summary = a.out.split('\n').find((l) => l.startsWith('Applicable criteria')) ?? lastLine(a.out);
    line(a.ok, 'a11y', `${timeline}: ${summary.slice(0, 200)}`);
  }
}

process.exit(failed ? 1 : 0);
