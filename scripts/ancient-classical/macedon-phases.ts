// Macedon as one row with its dynasties as phases (2026-11-20, at the author's request). The combined timeline had
// two rows for one kingdom: Ancient's Macedon (c. 650–168 BCE) and Classical's Antigonid Macedon (306–168 BCE),
// both linked to the same article. The Antigonid row goes; its event (Pydna) moves to Macedon.
//
// Phases, from Wikipedia's *Antigonid dynasty* (read 2026-11-20; no AI or translation notice). Its lead says the
// Argead dynasty was "followed by the Antipatrid and Antigonid dynasties":
//   - Argead: from the row's own start to "In 310/309 BC, Cassander commanded Glaucias to secretly assassinate the
//     14-year-old Alexander IV … the Macedonian Argead dynasty became extinct" (History).
//   - Antipatrid: "Cassander (r. 305 – 297 BC), son of Antipater" (History) until Demetrius, "in 294 BC", made
//     himself "king of Macedon" (History).
//   - Antigonid: "Antigonids ruled much of Hellenistic Greece from 294 until their defeat at the Battle of Pydna in
//     168 BC" (lead); the dynasty table calls Demetrius I "the first Antigonid king of Macedon". The page's 306 BC
//     (Antigonus I takes the title of king) is not used: he did not rule Macedon.
// 310–305, before Cassander's reign, stays blank: the page gives no dynasty for it.
// Re-runnable.
//   node scripts/ancient-classical/macedon-phases.ts && npm run data -- build ancient-classical
import { C, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-20');
const d = ed.data;
ed.wikipedia('wp-antigonid', 'Antigonid dynasty', 'Antigonid_dynasty');

for (const e of d.events) if (e.tracks.includes('antigonid')) e.tracks = [...new Set(e.tracks.map((t: string) => (t === 'antigonid' ? 'macedon' : t)))];
d.tracks = d.tracks.filter((t: { id: string }) => t.id !== 'antigonid');
d.meta.collapsed = (d.meta.collapsed ?? []).filter((id: string) => id !== 'antigonid');

const macedon = d.tracks.find((t: { id: string }) => t.id === 'macedon');
if (!macedon) throw new Error('no row macedon');
const A = 'wp-antigonid';
macedon.phases = [
  {
    name: 'Argead dynasty',
    start: macedon.span.start,
    end: '310 BCE',
    ...(macedon.span.startDates ? { startDates: macedon.span.startDates } : {}),
    endDates: [C(310, A, "History ('In 310/309 BC' Alexander IV is killed: 'the Macedonian Argead dynasty became extinct')"), C(309, A, 'History (310/309 BC)')],
  },
  {
    name: 'Antipatrid dynasty',
    start: '305 BCE',
    end: '294 BCE',
    startDates: [C(305, A, "History ('Cassander (r. 305 – 297 BC), son of Antipater')")],
    endDates: [C(294, A, "History ('in 294 BC' Demetrius makes himself king of Macedon)")],
  },
  {
    name: 'Antigonid dynasty',
    start: '294 BCE',
    end: '168 BCE',
    startDates: [C(294, A, "lead ('from 294 until their defeat at the Battle of Pydna in 168 BC'); dynasty table")],
    endDates: [C(168, A, "lead ('the Battle of Pydna in 168 BC')")],
  },
];
ed.save();
