import type { TrackKind } from '../types.ts';

/** The row form's "Kind of row" choices, in the order shown. */
export const TRACK_KIND_OPTIONS: [TrackKind, string][] = [
  ['polity', 'A state, people or group'],
  ['person', 'A person'],
  ['theme', 'A theme: a network, route or movement'],
  ['group', 'A group of rows: a region or collection'],
  ['organization', 'An organization: an alliance, bloc or league'],
  ['conflict', 'A conflict: a war'],
];
