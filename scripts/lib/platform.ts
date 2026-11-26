// Where the Windows PC differs from the Mac, in one place: the venv's python path, and spawning npm/npx/python without a shell on
// a platform that needs one. Pure functions, so the mapping is tested on the Mac.
import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';
import { join } from 'node:path';

/** The interpreter inside a venv folder: bin/python on macOS and Linux, Scripts/python.exe on Windows. */
export const venvPython = (venv: string, platform: NodeJS.Platform = process.platform): string =>
  join(venv, platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

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
