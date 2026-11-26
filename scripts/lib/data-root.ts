// Where the data lives: one root per machine, one fixed tree under it (Workbench "2026-11-25 Timelines data root layout"). The same
// answers as pipelines/common/data_root.py: both read pipelines/common/data-root.json and pass pipelines/common/data-root.cases.json.
//   root, first match wins: $TIMELINES_DATA (the old variable, kept as an override for a pass), $TIMELINES_DATA_ROOT, "dataRoot" in
//   timelines.local.json at the repo root (gitignored), else ~/data. A folder's own old variable (TIMELINES_STAGES, REGRESSION_INPUTS) wins for it.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const CONFIG = JSON.parse(readFileSync(path.join(REPO, 'pipelines/common/data-root.json'), 'utf8')) as {
  default: string;
  localFile: string;
  rootEnv: string[];
  tree: Record<string, string>;
  overrideEnv: Record<string, string>;
};

export type DataFolder = keyof typeof CONFIG.tree | string;

export interface Where {
  env?: NodeJS.ProcessEnv | Record<string, string>;
  repo?: string;
  home?: string;
  /** path.posix or path.win32: the platform's separators (tests; the default is this machine's). */
  pathmod?: path.PlatformPath;
  /** the content of timelines.local.json, when the caller already has it (tests); else it is read from the repo folder. */
  repoFile?: { dataRoot?: string } | null;
}

const expand = (p: string, home: string, mod: path.PlatformPath) => (p === '~' || /^~[\\/]/.test(p) ? mod.join(home, p.slice(2)) : p);

export function dataRoot({ env = process.env, repo = REPO, home = homedir(), pathmod = path, repoFile }: Where = {}): string {
  for (const name of CONFIG.rootEnv) if (env[name]) return expand(env[name]!, home, pathmod);
  let local = repoFile;
  if (local === undefined) {
    const file = path.join(repo, CONFIG.localFile);
    try {
      local = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { dataRoot?: string }) : null;
    } catch {
      local = null;
    }
  }
  return expand(local?.dataRoot || CONFIG.default, home, pathmod);
}

/** The folder `name` of the tree (and `parts` under it): its own old variable if set, else <root>/<name>. */
export function where(name: DataFolder, parts: string[] = [], w: Where = {}): string {
  const { env = process.env, home = homedir(), pathmod = path } = w;
  if (!(name in CONFIG.tree)) throw new Error(`${name} is not in the data tree: ${Object.keys(CONFIG.tree).join(', ')}`);
  const own = env[CONFIG.overrideEnv[name] ?? ''];
  const base = own ? expand(own, home, pathmod) : pathmod.join(dataRoot(w), CONFIG.tree[name]);
  return pathmod.join(base, ...parts);
}
