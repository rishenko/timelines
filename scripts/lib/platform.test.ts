import { describe, expect, it } from 'vitest';
import { venvPython, windowsLine } from './platform.ts';

describe('platform', () => {
  it('names the venv interpreter for each platform', () => {
    expect(venvPython('pipelines/.venv', 'darwin')).toBe('pipelines/.venv/bin/python');
    expect(venvPython('pipelines/.venv', 'linux')).toBe('pipelines/.venv/bin/python');
    expect(venvPython('pipelines/.venv', 'win32')).toBe('pipelines\\.venv\\Scripts\\python.exe');
    expect(venvPython('pipelines/.venv')).toBe(process.platform === 'win32' ? 'pipelines\\.venv\\Scripts\\python.exe' : 'pipelines/.venv/bin/python');
  });
  it('writes the one command line Windows runs: python3 is python in UTF-8 mode, npm and npx stay, spaces are quoted', () => {
    expect(windowsLine('python3', ['-I', 'a.py'])).toBe('python -X utf8 -I a.py');
    expect(windowsLine('npx', ['vitest', 'run'])).toBe('npx vitest run');
    expect(windowsLine('npm', ['run', '--silent', 'lint'])).toBe('npm run --silent lint');
    expect(windowsLine('node', ['scripts/py.ts', 'my venv'])).toBe('node scripts/py.ts "my venv"');
  });
});
