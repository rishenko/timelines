// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TrackForm } from './TrackForm.tsx';
import { plainTimeline } from '../test/fixtures.ts';
import type { Track } from '../types.ts';

afterEach(cleanup);

const data = plainTimeline();
const quay = data.tracks.find((t) => t.id === 'quay')!;

function open(initial: Track | null) {
  const onSave = vi.fn();
  render(<TrackForm initial={initial} data={data} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
  return onSave;
}

describe('TrackForm phases', () => {
  it('saves a row with its phases unchanged, claims included', async () => {
    const onSave = open(quay);
    expect(screen.getAllByLabelText('Phase name').map((el) => (el as HTMLInputElement).value)).toEqual([
      'First Council',
      'Second Council',
      'Third Council',
    ]);
    fireEvent.click(screen.getByText('Save track'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].phases).toEqual(quay.phases);
  });

  it('adds a phase and stores the list in date order', async () => {
    const onSave = open({ id: 'france', name: 'France', color: '#123456' });
    fireEvent.click(screen.getByText('+ Add a phase'));
    fireEvent.click(screen.getByText('+ Add a phase'));
    const names = screen.getAllByLabelText('Phase name');
    const starts = screen.getAllByLabelText('Phase start');
    const ends = screen.getAllByLabelText('Phase end');
    fireEvent.change(names[0], { target: { value: 'Second Republic' } });
    fireEvent.change(starts[0], { target: { value: '4848 L' } });
    fireEvent.change(ends[0], { target: { value: '4852 L' } });
    fireEvent.change(names[1], { target: { value: 'July Monarchy' } });
    fireEvent.change(starts[1], { target: { value: '4830 L' } });
    fireEvent.change(ends[1], { target: { value: 'c. 4848 L' } });
    fireEvent.click(screen.getByText('Save track'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].phases).toEqual([
      { name: 'July Monarchy', start: 4830, end: 4848, circa: true },
      { name: 'Second Republic', start: 4848, end: 4852 },
    ]);
  });

  it('refuses a phase without a name or with an end before its start', async () => {
    const onSave = open({ id: 'x', name: 'X', color: '#123456' });
    fireEvent.click(screen.getByText('+ Add a phase'));
    fireEvent.change(screen.getByLabelText('Phase start'), { target: { value: '10 L' } });
    fireEvent.change(screen.getByLabelText('Phase end'), { target: { value: '5 L' } });
    fireEvent.click(screen.getByText('Save track'));
    expect(await screen.findByText('Give the phase a name.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Phase name'), { target: { value: 'Backwards' } });
    fireEvent.click(screen.getByText('Save track'));
    expect(await screen.findByText('The end is before the start.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('TrackForm accessibility', () => {
  it('ties an error to its field and moves focus there', async () => {
    open({ id: 'x', name: 'X', color: '#123456' });
    fireEvent.click(screen.getByText('+ Add a phase'));
    fireEvent.change(screen.getByLabelText('Phase start'), { target: { value: '10 L' } });
    fireEvent.change(screen.getByLabelText('Phase end'), { target: { value: '20 L' } });
    fireEvent.click(screen.getByText('Save track'));
    const message = await screen.findByText('Give the phase a name.');
    const field = screen.getByLabelText('Phase name');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(field);
  });

  it('a field without an error is not marked invalid', () => {
    open(quay);
    expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBeNull();
  });

  it('announces dated claims as a list, with each Remove button saying which claim', () => {
    open(quay);
    const list = screen.getByRole('list', { name: 'Dated claims for the end' });
    expect(list.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Remove claim 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove claim 2' })).toBeTruthy();
  });
});

describe('TrackForm page link and Wikidata id', () => {
  const linked: Track = {
    id: 'harbor',
    name: 'Harbor',
    color: '#123456',
    url: 'https://en.wikipedia.org/wiki/Harbor',
    ids: { wikidata: 'Q283202' },
  };

  it('keeps a row’s link and id when it is saved unchanged', async () => {
    const onSave = open(linked);
    fireEvent.click(screen.getByText('Save track'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ url: linked.url, ids: { wikidata: 'Q283202' } });
  });

  it('clearing both fields removes them', async () => {
    const onSave = open(linked);
    fireEvent.change(screen.getByLabelText('Page about this row (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Wikidata id (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save track'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].url).toBeUndefined();
    expect(onSave.mock.calls[0][0].ids).toBeUndefined();
  });

  it('refuses an unsafe link and a malformed id, with the error tied to the field', async () => {
    const onSave = open({ id: 'x', name: 'X', color: '#123456' });
    const url = screen.getByLabelText('Page about this row (optional)');
    fireEvent.change(url, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByText('Save track'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/https:\/\//);
    expect(url.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(url, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Wikidata id (optional)'), { target: { value: 'egypt' } });
    fireEvent.click(screen.getByText('Save track'));
    expect(await screen.findByText(/like Q11768/)).toBeTruthy();
    expect(screen.queryByText(/starts with https/)).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });
});
