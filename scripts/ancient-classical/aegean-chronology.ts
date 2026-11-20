// The Aegean dating systems on the Bronze Age rows only (2026-11-20, at the author's request). The Aegean group
// carried the High (radiocarbon) Aegean chronology, so every row under it inherited it, and Hellenistic events
// (Chaeronea, Pydna, Pergamon) said "Dated by the High (radiocarbon) Aegean chronology". The High and Low Aegean
// chronologies are used only by Minoan events (the first palaces, their destruction, LM IB, Thera) and the
// Mycenaean phases, so the chronology now sits on the three Bronze Age rows (Cycladic, Minoan, Mycenaean) and not on
// the group. Dates are unchanged: rows that lose the chronology had no claims tagged with it.
// Re-runnable.
//   node scripts/ancient-classical/aegean-chronology.ts && npm run data -- build ancient-classical
import { open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json');
const row = (id: string) => {
  const t = ed.data.tracks.find((x: { id: string }) => x.id === id);
  if (!t) throw new Error(`no row ${id}`);
  return t;
};

delete row('aegean').chronology;
for (const id of ['cycladic', 'minoan', 'mycenaean']) {
  // chronology sits right after the colour, as on the other rows that carry one
  const t = row(id);
  const entries = Object.entries(t).filter(([k]) => k !== 'chronology');
  const at = entries.findIndex(([k]) => k === 'color') + 1;
  entries.splice(at, 0, ['chronology', 'aegean-high']);
  Object.keys(t).forEach((k) => delete t[k]);
  Object.assign(t, Object.fromEntries(entries));
}
ed.save();
