// Runs a python script with the project's venv, whatever the platform: node scripts/py.ts <venv folder> <script> [args…]. A package
// script can't name .venv/bin/python (it is .venv/Scripts/python.exe on Windows), so it names this.
import { spawnSync } from 'node:child_process';
import { venvPython } from './lib/platform.ts';

const [venv, ...rest] = process.argv.slice(2);
if (!venv || !rest.length) {
  console.error('usage: node scripts/py.ts <venv folder> <script> [args…]');
  process.exit(2);
}
process.exit(spawnSync(venvPython(venv), ['-X', 'utf8', '-I', ...rest], { stdio: 'inherit' }).status ?? 1);
