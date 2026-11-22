// @vitest-environment jsdom
// The event editor's category picker: an unchanged category keeps its membership and sources, a new one cites the
// event's first source, a sub-kind beside its own kind is refused, and without a source the picker waits for one.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import type { Dataset, TimelineEvent } from '../types.ts';
import medieval from '../../public/timelines/medieval.json';

afterEach(cleanup);

const data = medieval as unknown as Dataset;
const byId = (id: string) => structuredClone(data.events.find((e) => e.uuid === id)!);

function open(e: TimelineEvent) {
  const onSave = vi.fn();
  render(<EventForm initial={e} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
  return onSave;
}
const pick = (label: string, value: string) => act(() => void fireEvent.change(screen.getByLabelText(label), { target: { value } }));
const save = async (onSave: ReturnType<typeof vi.fn>) => {
  await act(async () => void fireEvent.click(screen.getByText('Save changes')));
  return onSave.mock.calls[0]?.[0] as TimelineEvent | undefined;
};

describe('event editor: categories', () => {
  it('keeps an unchanged category as it was, and a new second one cites the event’s first source', async () => {
    const e = byId('exodus-from-cahokia');
    const was = e.memberships!.find((m) => m.facet === 'category')!;
    const onSave = open(e);
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('place');
    pick('Second category', 'religion');
    const saved = (await save(onSave))!;
    expect(saved.memberships).toEqual([was, { facet: 'category', value: 'religion', sources: [e.sources[0]] }]);
  });

  it('removing the categories leaves no category memberships', async () => {
    const onSave = open(byId('exodus-from-cahokia'));
    pick('Category', '');
    const saved = (await save(onSave))!;
    expect(saved.memberships).toBeUndefined();
  });

  it('refuses a sub-kind beside its own kind', async () => {
    const onSave = open(byId('exodus-from-cahokia'));
    pick('Category', 'conflict');
    pick('Second category', 'siege');
    expect(await save(onSave)).toBeUndefined();
    expect(screen.getByText(/already part of the main one/)).toBeTruthy();
  });

  it('waits for a source: without one the picker is off and says why', () => {
    const e = byId('exodus-from-cahokia');
    e.sources = [];
    delete e.memberships;
    open(e);
    expect((screen.getByLabelText('Category') as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/Add a source first/)).toBeTruthy();
  });
});
