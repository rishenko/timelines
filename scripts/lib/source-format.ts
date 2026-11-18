// Writes a timeline source file (data-src/*.json) in the compact style used in this repo: anything
// that fits in 150 columns stays on one line, so each source, claim and short event reads as one row.
// Every script that edits a source file writes it through here, so formatting stays stable.
import { readFileSync, writeFileSync } from 'node:fs';

const WIDTH = 150;

const inline = (v: unknown) =>
  JSON.stringify(v, null, 1)
    .replace(/\n\s*/g, ' ')
    .replace(/\[ /g, '[')
    .replace(/ \]/g, ']');

export function formatSource(v: unknown, ind = ''): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  const one = inline(v);
  if (ind.length + one.length <= WIDTH) return one;
  const n = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => n + formatSource(x, n)).join(',\n') + '\n' + ind + ']';
  return (
    '{\n' +
    Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => n + JSON.stringify(k) + ': ' + formatSource(x, n))
      .join(',\n') +
    '\n' +
    ind +
    '}'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readSource = (file: string): any => JSON.parse(readFileSync(file, 'utf8'));
export const writeSource = (file: string, data: unknown) => writeFileSync(file, formatSource(data) + '\n');
