import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dataRoot, where } from './data-root.ts';

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../pipelines/common/data-root.cases.json'), 'utf8')).cases as {
  name: string; platform: 'posix' | 'win32'; home: string; env: Record<string, string>; repoFile: { dataRoot?: string } | null; where: string; parts: string[]; expect: string;
}[];

describe('data root (the cases pipelines/common/test_data_root.py also passes)', () => {
  for (const c of cases) {
    it(c.name, () => {
      const pathmod = c.platform === 'win32' ? path.win32 : path.posix;
      expect(where(c.where, c.parts, { env: c.env, home: c.home, pathmod, repoFile: c.repoFile, repo: '/nowhere' })).toBe(c.expect);
    });
  }
  it('refuses a name that is not in the tree', () => expect(() => where('nope', [], { env: {}, home: '/h' })).toThrow(/not in the data tree/));
  it('defaults to ~/data with nothing set and no local file', () => expect(dataRoot({ env: {}, home: '/h', pathmod: path.posix, repoFile: null })).toBe('/h/data'));
});
