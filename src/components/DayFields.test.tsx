// @vitest-environment jsdom
// The editors ask for months and days where a timeline is dated in them (it offers a zoom step below a year), and
// keep asking for years alone elsewhere.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventForm } from './EventForm.tsx';
import { TrackForm } from './TrackForm.tsx';
import { plainTimeline } from '../test/fixtures.ts';
import type { Dataset, TimelineEvent } from '../types.ts';

afterEach(cleanup);

const dayData = (): Dataset => {
  const d = plainTimeline();
  d.meta.increments = ['day', 'month', 1, 10, 50, 100];
  return d;
};

function openEvent(data: Dataset, initial: TimelineEvent) {
  const onSave = vi.fn();
  render(<EventForm initial={initial} isNew={false} data={data} onSave={onSave} onCancel={() => {}} onCreateTrack={() => {}} onCreateSource={() => {}} />);
  return onSave;
}

describe('month and day fields', () => {
  it('are not shown for a timeline dated in years', () => {
    const d = plainTimeline();
    openEvent(d, d.events[0]);
    expect(screen.queryByLabelText('Start month')).toBeNull();
    expect(screen.getByText(/Spans multiple years/)).toBeTruthy();
  });

  it('save an event dated in days', async () => {
    const d = dayData();
    const e = { ...d.events[0], start: 70, end: undefined, ongoing: undefined, startDates: undefined, endDates: undefined };
    const onSave = openEvent(d, e);
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Start day'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText(/Has an end date/));
    fireEvent.change(screen.getByLabelText('End', { selector: 'input' }), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('End month'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('End day'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ start: 70, startMonth: 7, startDay: 1, end: 70, endMonth: 11, endDay: 18 });
  });

  it('refuse an end date before the start date in the same year', async () => {
    const d = dayData();
    const e = { ...d.events[0], start: 70, startMonth: 7, startDay: 1, end: 70, endMonth: 6, endDay: 1, ongoing: undefined, startDates: undefined, endDates: undefined };
    const onSave = openEvent(d, e);
    fireEvent.click(screen.getByRole('button', { name: /^Save/ }));
    await waitFor(() => expect(screen.getByText('The end date is before the start date.')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('let a row editor type phases as dates', async () => {
    const d = dayData();
    const onSave = vi.fn();
    render(<TrackForm initial={{ id: 'reich', name: 'Reich', color: '#123456' }} data={d} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('+ Add a phase'));
    fireEvent.change(screen.getByLabelText('Phase name'), { target: { value: 'Weimar' } });
    fireEvent.change(screen.getByLabelText('Phase start'), { target: { value: '9 November 70 L' } });
    fireEvent.change(screen.getByLabelText('Phase end'), { target: { value: 'March 85 L' } });
    fireEvent.click(screen.getByText('Save track'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].phases[0]).toMatchObject({ start: 70, startMonth: 11, startDay: 9, end: 85, endMonth: 3 });
  });
});
