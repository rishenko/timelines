import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv.ts';

describe('parseCsv', () => {
  it('reads quotes, doubled quotes, commas and newlines inside a field, and CRLF', () => {
    const rows = parseCsv('a,b,c\r\n1,"x, ""y""",3\n"line\nbreak",,z\n');
    expect(rows).toEqual([{ a: '1', b: 'x, "y"', c: '3' }, { a: 'line\nbreak', b: '', c: 'z' }]);
  });
});
