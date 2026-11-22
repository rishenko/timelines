// Shared by scripts/pr-check.ts and scripts/test-quiet.ts: run a command quietly, find the private timelines, and
// run vitest with one line per failure.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export interface Run {
  ok: boolean;
  out: string;
}

/** Runs a command and keeps its output (stdout and stderr together) instead of printing it. */
export function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): Run {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env, maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** The last non-empty line of some output. */
export const lastLine = (s: string) =>
  s
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .pop() ?? '';

/**
 * Where your local (private) timelines are, for TIMELINES_LOCAL_DATA: the variable itself when it's set, otherwise
 * the first line of `local-data.local` (ignored by git) in this checkout or in the main clone that its worktrees share.
 * Undefined when neither is there.
 */
export function localData(): string | undefined {
  if (process.env.TIMELINES_LOCAL_DATA) return process.env.TIMELINES_LOCAL_DATA;
  const common = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const roots = ['.', common.ok ? dirname(common.out.trim()) : '.'];
  for (const root of roots) {
    const file = resolve(root, 'local-data.local');
    if (existsSync(file)) return readFileSync(file, 'utf8').split('\n')[0].trim().replace(/^~(?=\/|$)/, homedir()) || undefined;
  }
  return undefined;
}

interface JsonResult {
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: { name: string; message?: string; assertionResults: { status: string; fullName: string; failureMessages: string[] }[] }[];
}

/**
 * Runs vitest with a JSON report and returns one summary line plus one line per failure (file › test: first line
 * of the message), so a run never needs repeating to read it.
 */
export function quietVitest(files: string[], env: NodeJS.ProcessEnv): { ok: boolean; summary: string; failures: string[] } {
  const out = join(mkdtempSync(join(tmpdir(), 'vitest-')), 'r.json');
  const r = run('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], env);
  if (!existsSync(out)) return { ok: false, summary: 'vitest did not run', failures: [lastLine(r.out)] };
  const j = JSON.parse(readFileSync(out, 'utf8')) as JsonResult;
  const failures: string[] = [];
  const root = process.cwd() + '/';
  for (const f of j.testResults) {
    const file = f.name.replace(root, '');
    const failed = f.assertionResults.filter((a) => a.status === 'failed');
    for (const a of failed) failures.push(`${file} › ${a.fullName}: ${(a.failureMessages[0] ?? '').split('\n')[0].slice(0, 200)}`);
    // a file that failed to load has no tests to blame
    if (!failed.length && f.message) failures.push(`${file}: ${f.message.split('\n')[0].slice(0, 200)}`);
  }
  const skipped = j.numPendingTests + j.numTodoTests;
  const summary = `${j.numPassedTests} passed, ${j.numFailedTests} failed, ${skipped} skipped`;
  // vitest can fail with no failed test (an unhandled error, a failed setup): say why
  if (!r.ok && !failures.length) failures.push(`vitest exited with an error: ${lastLine(r.out).slice(0, 200)}`);
  return { ok: r.ok && !failures.length, summary, failures };
}
