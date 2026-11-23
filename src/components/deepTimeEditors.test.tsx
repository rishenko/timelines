// @vitest-environment jsdom
// The event form and its claims edit deep-time years (calendar.beforePresent) as text, "251.902137 Ma", with each claim's
// margin as a length, "24 kyr"; saving unchanged keeps every digit, and a bad date or margin stops the save.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, TimelineEvent } from '../types.ts';

afterEach(cleanup);

const ago = (n: number) => 1950 - n;
const deep = (): Dataset => {
  const d = plainTimeline();
  d.meta.calendar = { before: 'BP', after: 'AP', yearZero: true, beforePresent: { present: 1950, circaShare: 0.01 } };
  return d;
};
const mk = (d: Dataset, over: Partial<TimelineEvent>): TimelineEvent => ({
  uuid: 'pt', title: 'End-Permian extinction', descr: '', start: ago(251_902_137), tracks: [d.tracks[0].id], sources: [{ sourceKey: Object.keys(d.sources)[0], sourceLocation: '' }], ...over,
});
const open = (d: Dataset, e: TimelineEvent) => {
  const onSave = vi.fn();
  render(<EventForm initial={e} isNew={false} data={d} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
  return onSave;
};
const save = async () => act(async () => void fireEvent.click(screen.getByText('Save changes')));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('deep-time event editor', () => {
  it('shows the start as text with every digit, and saving unchanged keeps the event exactly', async () => {
    const d = deep();
    const e = mk(d, {
      end: ago(66_000_001),
      startDates: [{ year: ago(251_902_137), margin: 24_000, source: { sourceKey: Object.keys(d.sources)[0], sourceLocation: 'p. 3' } }, { year: ago(252_000_000), margin: 500_000 }],
    });
    const onSave = open(d, e);
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('251.902137 Ma');
    expect((screen.getAllByLabelText('Margin')[0] as HTMLInputElement).value).toBe('24 kyr');
    expect((screen.getAllByLabelText('Margin')[1] as HTMLInputElement).value).toBe('500 kyr');
    await save();
    expect(onSave.mock.calls[0][0]).toEqual({ ...e });
  });

  it('an edited date and margin are stored as whole years; a ± written with the date sets the margin', async () => {
    const d = deep();
    const e = mk(d, { startDates: [{ year: ago(252_000_000) }] });
    const onSave = open(d, e);
    type('Start', '251.902 Ma');
    type('Date', '251.902 Ma ± 24 ka');
    await save();
    const saved = onSave.mock.calls[0][0] as TimelineEvent;
    expect(saved.start).toBe(ago(251_902_000));
    expect(saved.startDates?.[0]).toMatchObject({ year: ago(251_902_000), margin: 24_000 });
  });

  it('the margin field wins over a ± typed with the date', async () => {
    const d = deep();
    const onSave = open(d, mk(d, { startDates: [{ year: ago(252_000_000) }] }));
    type('Date', '252 Ma ± 1 Ma');
    type('Margin', '0.5 Myr');
    await save();
    expect((onSave.mock.calls[0][0] as TimelineEvent).startDates?.[0].margin).toBe(500_000);
  });

  it('a date or margin that cannot be read stops the save and says why', async () => {
    const d = deep();
    const onSave = open(d, mk(d, { startDates: [{ year: ago(252_000_000), margin: 1000 }] }));
    type('Start', 'long ago');
    type('Margin', 'about a lot');
    await save();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join('\n')).toMatch(/Write a date like.*\n?.*Write a length like|Write a length like.*Write a date like|Write a date like/s);
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
  });

  it('other calendars keep year and era fields', () => {
    const d = plainTimeline();
    open(d, mk(d, { start: -500 }));
    expect(screen.getByLabelText('Start era')).toBeTruthy();
  });
});
