import { describe, expect, it } from 'vitest';
import { extractPython, venvPython, windowsLine } from './platform.ts';

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
  it('picks the extractor python: REGEN_PYTHON, then the venv, then python3 (never on Windows: it says what is missing)', () => {
    const none = () => false;
    expect(extractPython({ REGEN_PYTHON: 'x' }, none, 'win32')).toEqual({ python: 'x' });
    expect(extractPython({}, (p) => p.endsWith('bin/python'), 'darwin')).toEqual({ python: 'pipelines/extract/.venv/bin/python' });
    expect(extractPython({}, none, 'darwin')).toEqual({ python: 'python3' });
    const win = extractPython({}, none, 'win32');
    expect(win.missing).toMatch(/no venv found at pipelines\\extract\\\.venv\\Scripts\\python\.exe; .*REGEN_PYTHON/);
    expect(extractPython({}, (p) => p.endsWith('python.exe'), 'win32').missing).toBeUndefined();
  });
});
