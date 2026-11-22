// @vitest-environment jsdom
// The source form: saving a source unchanged keeps every field (the form copies fields one by one), and the
// snapshot fields are checked.
import { isDeepStrictEqual } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SourceForm } from './SourceForm.tsx';
import { everyField } from '../data/fixtures/everyField.ts';
import type { Dataset } from '../types.ts';
import ancient from '../../public/timelines/ancient-classical.json';

afterEach(cleanup);

const fixture = everyField as Dataset;

/** Opens a source in the form and saves it unchanged: the key and source saved. */
async function save(data: Dataset, key: string) {
  const onSave = vi.fn();
  render(<SourceForm sourceKey={key} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getByText('Save source'));
  });
  return onSave.mock.calls[0];
}

describe('source form', () => {
  for (const [name, data] of [['every-field fixture', fixture], ['ancient-classical', ancient as unknown as Dataset]] as const)
    it(`${name}: saving unchanged keeps every source as it was`, async () => {
      const lost: string[] = [];
      for (const [key, source] of Object.entries(data.sources).slice(0, 40)) {
        const call = await save(data, key);
        if (call?.[0] !== key || !isDeepStrictEqual(call[1], source)) lost.push(`${key}: ${JSON.stringify(call?.[1])}`);
        cleanup();
      }
      expect(lost).toEqual([]);
    });

  it('checks the dump name and the revision id', async () => {
    const onSave = vi.fn();
    render(<SourceForm sourceKey="logbook" data={fixture} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Dump'), { target: { value: '2026-11-01' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save source'));
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name the snapshot like "enwiki-20261101".')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Dump'), { target: { value: 'enwiki-20261101' } });
    fireEvent.change(screen.getByLabelText('Page revision id'), { target: { value: '42' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save source'));
    });
    // the logbook has no link, so a revision has nothing to belong to
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Give the link too: a revision belongs to a page.')).toBeTruthy();
  });
});
