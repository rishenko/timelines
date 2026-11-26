// @vitest-environment jsdom
// A timeline that names a calendar plugin (calendar.system, schema 11.4) edits its event dates as that calendar writes
// them, "Age of Lanterns 12", read back through its parse; one it can't read stops the save.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, TimelineEvent } from '../types.ts';

afterEach(cleanup);

const ages = (): Dataset => {
  const d = plainTimeline();
  d.meta.calendar = { before: 'BT', after: 'AT', yearZero: false, system: 'lantern-ages' };
  return d;
};
const mk = (d: Dataset, over: Partial<TimelineEvent>): TimelineEvent => ({
  uuid: 'lit', title: 'The first lantern is lit', descr: '', start: 412, tracks: [d.tracks[0].id], sources: [{ sourceKey: Object.keys(d.sources)[0], sourceLocation: '' }], ...over,
});
const open = (d: Dataset, e: TimelineEvent) => {
  const onSave = vi.fn();
  render(<EventForm initial={e} isNew={false} data={d} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
  return onSave;
};
const save = async () => act(async () => void fireEvent.click(screen.getByText('Save changes')));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('event editor with a calendar plugin', () => {
  it('shows the dates in its words, and saving unchanged keeps the event exactly', async () => {
    const d = ages();
    const e = mk(d, { end: 790 });
    const onSave = open(d, e);
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('Age of Lanterns 1');
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe('Age of Glass 1');
    expect(screen.queryByLabelText('Start era')).toBe(null);
    await save();
    expect(onSave.mock.calls[0][0]).toEqual({ ...e });
  });

  it('reads an edited date back through the calendar', async () => {
    const d = ages();
    const onSave = open(d, mk(d, {}));
    type('Start', 'Age of Tides 300');
    await save();
    expect((onSave.mock.calls[0][0] as TimelineEvent).start).toBe(300);
  });

  it("a date it can't read stops the save and gives an example in its words", async () => {
    const d = ages();
    const onSave = open(d, mk(d, {}));
    type('Start', '412 AT');
    await save();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join('\n')).toMatch(/Write a date as this timeline names it, like "Age of Tides 1"/);
  });
});
