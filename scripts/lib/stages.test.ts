import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stagePath, stagesRoot } from './stages.ts';

describe('stage paths', () => {
  it('puts a stage under <root>/<layer>/<stage>/<key>', () => {
    expect(stagePath('L2', 'rulers', 'abc123', { TIMELINES_STAGES: '/s' })).toBe(join('/s', 'L2', 'rulers', 'abc123')); // a real filesystem path: the OS's own separators
    expect(stagePath('L2', 'rulers', undefined, { TIMELINES_STAGES: '/s' })).toBe(join('/s', 'L2', 'rulers', 'current'));
  });
  it('defaults to ~/data/stages', () => expect(stagesRoot({})).toMatch(/data[\\/]stages$/));
  it('refuses names and keys that could leave the folder', () => {
    expect(() => stagePath('L2', '../x', 'k', {})).toThrow();
    expect(() => stagePath('L2', 'rulers', '../k', {})).toThrow();
  });
});
