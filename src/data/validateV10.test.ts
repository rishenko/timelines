import { describe, expect, it } from 'vitest';
import { validateDataset } from './validate.ts';
import { everyField } from './fixtures/everyField.ts';

// v10: meta.compress, whether a timeline opens with gaps shortened (on unless false).
const withCompress = (compress: unknown) => ({ ...everyField, meta: { ...everyField.meta, compress } });

describe('meta.compress (v10)', () => {
  it('takes true or false', () => {
    expect(validateDataset(withCompress(true))).toEqual([]);
    expect(validateDataset(withCompress(false))).toEqual([]);
  });

  it('refuses anything else, with a clear message', () => {
    for (const bad of ['no', 0, null])
      expect(validateDataset(withCompress(bad))).toContain('meta.compress must be true or false.');
  });
});
