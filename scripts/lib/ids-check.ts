// The id-stability check: every id a link can name (rows, events, eras, facets, regions, sources, tags, chronologies)
// that a compiled timeline had at the base revision must still be there, or be in the file's `redirects`. Compares
// the working tree with a git revision (`git show`), so no snapshot files are committed. See src/data/ids.ts.
//
//   npm run data -- ids [--check] [--base <rev>] [<dir> ...]
//
// <dir> defaults to public/timelines. Any folder of compiled timelines in a git repository works, so the private
// timelines run the same check in their own repository. --base defaults to origin/main. Without --check the report
// is printed and the exit code stays 0.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { migrate } from '../../src/data/migrate.ts';
import { RENAMEABLE, describeId, lostIds } from '../../src/data/ids.ts';
import type { Dataset } from '../../src/types.ts';

const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });

const isTimelineFile = (name: string) => name.endsWith('.json') && name !== 'index.json';

const load = (text: string) => migrate(JSON.parse(text)) as unknown as Dataset;

export interface IdsReport {
  /** One line per lost id, and per timeline file that disappeared. */
  problems: string[];
  /** Files compared. */
  compared: number;
}

/** Compares each timeline in `dir` with the same file at `base`. Files new since `base` have nothing to keep. */
export function checkIds(dir: string, base: string): IdsReport {
  const abs = resolve(dir);
  const top = git(abs, ['rev-parse', '--show-toplevel']).trim();
  const rel = relative(top, abs).split('\\').join('/');
  const baseFiles = git(top, ['ls-tree', '--name-only', base, '--', `${rel}/`])
    .split('\n')
    .map((p) => p.slice(rel.length + 1))
    .filter((n) => n && !n.includes('/') && isTimelineFile(n));
  const problems: string[] = [];
  let compared = 0;
  for (const name of baseFiles) {
    const file = join(dir, name);
    if (!existsSync(file)) {
      problems.push(`${file}: the timeline is gone (links to it no longer open)`);
      continue;
    }
    const before = load(git(top, ['show', `${base}:${rel}/${name}`]));
    const after = load(readFileSync(file, 'utf8'));
    compared++;
    for (const r of lostIds(before, after))
      problems.push(
        `${file}: ${describeId(r)} is gone; ${RENAMEABLE.has(r.kind) ? 'add it to redirects: its new id, or null if removed on purpose' : `add it to redirects as null if removed on purpose (a ${r.kind} can't redirect to a new id)`}`,
      );
  }
  return { problems, compared };
}

export function idsCommand(args: string[]) {
  const check = args.includes('--check');
  const b = args.indexOf('--base');
  const base = b >= 0 ? args[b + 1] : 'origin/main';
  if (!base) throw new Error('--base needs a git revision');
  const dirs = args.filter((a, i) => !a.startsWith('--') && (b < 0 || i !== b + 1));
  let compared = 0;
  const problems: string[] = [];
  for (const dir of dirs.length ? dirs : ['public/timelines']) {
    if (!existsSync(dir) || !readdirSync(dir).some(isTimelineFile)) throw new Error(`${dir}: no compiled timelines here`);
    const r = checkIds(dir, base);
    compared += r.compared;
    problems.push(...r.problems);
  }
  for (const p of problems) console.log(p);
  console.log(`ids: ${compared} timeline${compared === 1 ? '' : 's'} compared with ${base}; ${problems.length ? `${problems.length} problem${problems.length === 1 ? '' : 's'}` : 'no id lost'}`);
  if (check && problems.length) process.exitCode = 1;
}
