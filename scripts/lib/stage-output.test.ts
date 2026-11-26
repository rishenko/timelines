import { describe, expect, it } from 'vitest';
import { stdoutTail } from './stage-output.ts';

describe('stdoutTail', () => {
  it('indents the last lines of a failed stage and drops blank ones', () => {
    expect(stdoutTail('a\n\nb\nc\n', 2)).toBe('      b\n      c');
  });
  it('is empty when the stage printed nothing', () => {
    expect(stdoutTail('')).toBe('');
    expect(stdoutTail(null)).toBe('');
  });
  it('keeps 15 lines by default', () => {
    const out = Array.from({ length: 40 }, (_, i) => `l${i}`).join('\n');
    expect(stdoutTail(out).split('\n')).toHaveLength(15);
    expect(stdoutTail(out).endsWith('l39')).toBe(true);
  });
});
