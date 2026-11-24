// The fields each editor form sets; any other field of the item is kept as it was (lib/keepFields.ts). Checked against
// the schema's every-field fixture by formFields.test.ts, so a new field must be placed in one list or the other.

/** The row fields this form sets; any other field of the row is kept as it was (lib/keepFields.ts). */
export const TRACK_FORM_FIELDS = ['id', 'name', 'color', 'parent', 'kind', 'image', 'url', 'ids', 'pinLast', 'chronology', 'span', 'phases', 'memberOf', 'memberships', 'context'];

/** The event fields this form sets; any other field of the event is kept as it was (lib/keepFields.ts). */
export const EVENT_FORM_FIELDS = ['uuid', 'title', 'descr', 'start', 'startMonth', 'startDay', 'end', 'endMonth', 'endDay', 'ongoing', 'ongoingSources', 'circa',
  'chronology', 'order', 'importance', 'startDates', 'endDates', 'tracks', 'sources', 'links', 'memberships',
  'edited']; // `edited` is set by the save itself (state/edits.ts)
