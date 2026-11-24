// Every field of a row or an event is either set by its form (TRACK_FORM_FIELDS, EVENT_FORM_FIELDS: then clearing it in
// the form removes it) or kept as it is (lib/keepFields.ts). A field added to src/types.ts must be set in the schema's
// every-field fixture (the build enforces that), so this test fails until someone decides which it is (Dev B's review of
// #175: a form-managed field left off its list can't be cleared).
import { describe, expect, it } from 'vitest';
import { everyField } from '../data/fixtures/everyField.ts';
import { EVENT_FORM_FIELDS, TRACK_FORM_FIELDS } from './formFields.ts';

/** Fields the forms don't edit and keep as they are, each with why. */
const KEPT = {
  track: { roles: "a war's sides (schema 11.1): edited in the file, not the form yet" },
  event: {} as Record<string, string>,
};

const keysOf = (items: object[]) => [...new Set(items.flatMap((x) => Object.keys(x)))].sort();

describe("every field is the form's or kept", () => {
  it('rows', () => {
    const unplaced = keysOf(everyField.tracks).filter((k) => !TRACK_FORM_FIELDS.includes(k) && !(k in KEPT.track));
    expect(unplaced, 'add each to TRACK_FORM_FIELDS (the form sets it) or KEPT.track (kept as it is)').toEqual([]);
  });
  it('events', () => {
    const unplaced = keysOf(everyField.events).filter((k) => !EVENT_FORM_FIELDS.includes(k) && !(k in KEPT.event));
    expect(unplaced, 'add each to EVENT_FORM_FIELDS (the form sets it) or KEPT.event (kept as it is)').toEqual([]);
  });
  it('lists only real fields', () => {
    const track = keysOf(everyField.tracks), event = keysOf(everyField.events);
    expect(TRACK_FORM_FIELDS.filter((k) => !track.includes(k))).toEqual([]);
    expect(EVENT_FORM_FIELDS.filter((k) => !event.includes(k))).toEqual([]);
  });
});
