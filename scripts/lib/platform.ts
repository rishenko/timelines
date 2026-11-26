// Where the Windows PC differs from the Mac, in one place: the venv's python path, and spawning npm/npx/python without a shell on
// a platform that needs one. Pure functions, so the mapping is tested on the Mac.
import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** The interpreter inside a venv folder: bin/python on macOS and Linux, Scripts/python.exe on Windows. */
export const venvPython = (venv: string, platform: NodeJS.Platform = process.platform): string =>
  // the separators of the platform asked for (a test on one machine can ask for the other's), this machine's own by default
  (platform === process.platform ? path : platform === 'win32' ? path.win32 : path.posix).join(venv, platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

/**
 * The extractor's Python: $REGEN_PYTHON, else the extract venv's interpreter, else `python3`. On Windows there is no python3 (bare
 * `python` is the Store stub, which exits 9009), so with neither it answers `missing` instead of a fallback that fails later.
 */
export function extractPython(
  env: Record<string, string | undefined> = process.env,
  exists: (p: string) => boolean = existsSync,
  platform: NodeJS.Platform = process.platform,
): { python: string; missing?: string } {
  if (env.REGEN_PYTHON) return { python: env.REGEN_PYTHON };
  const venv = venvPython('pipelines/extract/.venv', platform);
  if (exists(venv)) return { python: venv };
  if (platform === 'win32') return { python: venv, missing: `no venv found at ${venv}; create it (pipelines/README.md) or set REGEN_PYTHON to the extractor's python.exe` };
  return { python: 'python3' };
}

/**
 * The one command line Windows runs for a command: npm and npx are .cmd shims, which Node starts only through a shell; Python
 * installs and venvs there have python.exe but no python3.exe, and print in the code page (cp1252) unless in UTF-8 mode
 * (-X utf8: -I ignores PYTHONUTF8). The arguments are plain words, so quoting only covers spaces and quotes.
 */
export const windowsLine = (cmd: string, rest: string[]): string =>
  (cmd === 'python3' ? ['python', '-X', 'utf8', ...rest] : [cmd, ...rest]).map((a) => (/[\s"]/.test(a) ? `"${a}"` : a)).join(' ');

/** spawnSync that works for npm, npx and python3 on every platform (a shell with one command line on Windows, plain elsewhere). */
export function spawnCmd(cmd: string, rest: string[], opts: SpawnSyncOptions = {}): SpawnSyncReturns<string | Buffer> {
  return process.platform === 'win32' ? spawnSync(windowsLine(cmd, rest), { ...opts, shell: true }) : spawnSync(cmd, rest, opts);
}
