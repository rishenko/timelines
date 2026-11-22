// Lifespans worked out from phases (2026-11-21). Rows with phases carried a typed lifespan that only repeated them:
// the first phase's start to the last phase's end. docs/data-format.md ("Lifespan, phases or a row?") says to leave
// the lifespan out on such a row, so the app works it out from the phases. A typed lifespan stays only where the
// row carried on through a gap between its phases (Babylonia after the Kassites).
//
// For each row listed:
//   - A date claim on the lifespan's start that the first phase lacks moves to that phase's startDates (and the same
//     for the end and the last phase). Each such claim is about the same edge: when the row, and so its first
//     phase, began. No claim is dropped.
//   - The typed lifespan goes.
// A row's lifespan may hold only start, end, startDates and endDates (anything else stops the script), and its edges
// must equal its first phase's start and last phase's end (except an uncited end listed in END_DIFFERS).
//
// Re-runnable: a row with no typed lifespan is left alone.
//   node scripts/ancient-classical/derived-lifespans.ts && npm run data -- build ancient-classical
import { open } from '../lib/dataset-edit.ts';

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Approved by the author 2026-11-21 (pilot: the first three). Kept typed: babylonia, macedon (310–305 BCE), sumer
// (2350–2112 BCE) and han (23–25 CE), which carried on through a gap between phases; elam, whose lifespan holds a
// start claim no phase can (Elam proper from 2700 BCE, after the Proto-Elamite period).
const ROWS = [
  'rome-republic-empire', 'hittites', 'harappan',
  'minoan', 'greece', 'pharaonic-egypt', 'ptolemaic-roman-egypt', 'canaan', 'assyria',
  'zhou', 'jin-china', 'southern-dynasties', 'northern-dynasties',
  'mycenaean',
];
// Rows whose typed end differed from their last phase's, and why the phase's end is used instead.
const END_DIFFERS: Record<string, string> = {
  mycenaean: "the typed 1050 BCE had no claim; the Postpalatial phase cites Knodell 2021 (1070/1040) and Wikipedia's Helladic table (1050, Low Aegean), so the end now follows the Dating menu",
};

const ed = open('data-src/ancient-classical.json', '2026-11-21');
const key = (c: Json) => JSON.stringify(c);

/** Adds the lifespan's claims for one edge to the phase's, keeping the phase's own first and skipping repeats. */
function moveClaims(from: Json[] | undefined, phase: Json, field: 'startDates' | 'endDates') {
  if (!from?.length) return 0;
  const have = new Set((phase[field] ?? []).map(key));
  const add = from.filter((c) => !have.has(key(c)));
  if (add.length) phase[field] = [...(phase[field] ?? []), ...add];
  return add.length;
}

for (const id of ROWS) {
  const t = ed.data.tracks.find((x: Json) => x.id === id);
  if (!t) throw new Error(`no row ${id}`);
  if (!t.span) continue;
  if (!t.phases?.length) throw new Error(`${id}: no phases to work its lifespan out from`);
  const extra = Object.keys(t.span).filter((k) => !['start', 'end', 'startDates', 'endDates'].includes(k));
  if (extra.length) throw new Error(`${id}: lifespan has ${extra.join(', ')}; move by hand`);
  const first = t.phases[0];
  const last = t.phases[t.phases.length - 1];
  const endOk = t.span.end === last.end || (END_DIFFERS[id] && !t.span.endDates);
  if (t.span.start !== first.start || !endOk)
    throw new Error(`${id}: lifespan ${t.span.start}–${t.span.end} ≠ phases ${first.start}–${last.end}`);
  const moved = moveClaims(t.span.startDates, first, 'startDates') + moveClaims(t.span.endDates, last, 'endDates');
  delete t.span;
  console.log(`${id}: typed lifespan dropped${moved ? `; ${moved} claim(s) moved to its phases` : ''}${END_DIFFERS[id] ? `; end: ${END_DIFFERS[id]}` : ''}`);
}
ed.save();
