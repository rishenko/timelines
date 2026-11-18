// Ancient Civilizations: period rows as phases on one row (scripts/lib/phases.ts has the rules). Started 2026-11-18
// with Egypt as a pilot, then every civilization whose periods were sub-rows, at the author's request. Only periods
// of one civilization become phases; separate states stay rows (Xia, Shang and Zhou; Aram-Damascus and Bit-Adini).
// No date is added or changed: each phase is its period row's lifespan and claims.
// Earlier scripts (europe.ts, africa.ts, peoples.ts…) still create some period rows or put events on them, so this
// runs after all of them, before groups.ts.
//   node scripts/additions/phases.ts && npm run data -- build ancient
import { open } from '../lib/dataset-edit.ts';
import { convertToPhases } from '../lib/phases.ts';

const ed = open('data-src/ancient-near-east.json');

convertToPhases(ed, [
  {
    row: { id: 'pharaonic-egypt', name: 'Pharaonic Egypt', color: '#d4a72c', parent: 'egypt' },
    periods: ['eg-predynastic', 'eg-early', 'eg-old', 'eg-fip', 'eg-middle', 'eg-sip', 'eg-new', 'eg-tip', 'eg-late'],
  },
  { row: { id: 'rome' }, periods: ['rome-kingdom', 'rome-republic'] },
  { row: { id: 'greece' }, periods: ['greece-archaic', 'greece-classical'] },
  {
    row: { id: 'minoan' },
    periods: ['minoan-prepalatial', 'minoan-protopalatial', 'minoan-neopalatial', 'minoan-monopalatial', 'minoan-postpalatial'],
  },
  { row: { id: 'mycenaean' }, periods: ['myc-early', 'myc-palatial', 'myc-postpalatial'] },
  { row: { id: 'canaan' }, periods: ['can-eba', 'can-mba', 'can-lba'] },
  { row: { id: 'hittites' }, periods: ['hit-old', 'hit-middle', 'hit-new'] },
  { row: { id: 'assyria' }, periods: ['as-early', 'as-old', 'as-middle', 'as-neo'] },
  // Isin–Larsa and the First Dynasty overlap (rivals until Hammurabi), so their names stack
  { row: { id: 'babylonia' }, periods: ['bab-isin-larsa', 'bab-old', 'bab-kassite', 'bab-neo'] },
  // a blank gap 2350–2112 BCE: the Akkadian Empire, its own row
  { row: { id: 'sumer' }, periods: ['sum-uruk', 'sum-jemdet', 'sum-ed', 'sum-ur3'] },
  { row: { id: 'elam' }, periods: ['elam-proto', 'elam-old', 'elam-middle', 'elam-neo'] },
  { row: { id: 'harappan' }, periods: ['ind-early', 'ind-mature', 'ind-late'] },
  { row: { id: 'zhou' }, periods: ['zhou-western', 'zhou-eastern'] },
]);

ed.save();
