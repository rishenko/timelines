// The Classical World: periods as phases (scripts/lib/phases.ts has the rules), 2026-11-18, at the author's request,
// following the Ancient timeline. Only periods of one state, or successive dynasties of one half of China, become
// phases; separate powers stay rows (Seleucid, Parthian and Sasanian; Maurya, Shunga and Gupta; Qin, the Three
// Kingdoms, the Sixteen Kingdoms, Sui and Tang; the Eastern Roman Empire, which outlives the period).
//   - Converted rows: the Northern and the Southern dynasties each become one row; the Roman Republic and Empire one
//     row; Ptolemaic and Roman Egypt one row. Their lifespans and claims are unchanged.
//   - New phases inside a row: Han (Western Han, Xin, Eastern Han) and Jin (Western, Eastern), from their dynasty
//     pages (read 2026-11-18). Xin is cited from the Han page: the Xin page carries a translation banner that points
//     to an LLM-translation guideline. The 23–25 CE gap in Han (the Gengshi Emperor) is read only in summary, so it
//     stays blank. No page states when Roman Egypt became "Byzantine", so Egypt isn't split there.
// Runs after every region pass and summary-only.ts (they define these rows), before collapsed.ts.
//   node scripts/classical/phases.ts && npm run data -- build classical
import { C, open } from '../lib/dataset-edit.ts';
import { convertToPhases } from '../lib/phases.ts';

const ed = open('data-src/classical.json', '2026-11-18');

convertToPhases(ed, [
  {
    row: { id: 'southern-dynasties', name: 'Southern dynasties', color: '#6a5a8a', parent: 'china' },
    periods: ['liu-song', 'southern-qi', 'liang', 'chen'],
    names: { 'liu-song': 'Liu Song', liang: 'Liang', chen: 'Chen' },
  },
  {
    // Eastern and Western Wei, then Northern Qi and Northern Zhou, ruled side by side: their names stack
    row: { id: 'northern-dynasties', name: 'Northern dynasties', color: '#4a6a8a', parent: 'china' },
    periods: ['northern-wei', 'eastern-wei', 'western-wei', 'northern-qi', 'northern-zhou'],
  },
  {
    row: { id: 'rome-republic-empire', name: 'Rome (Republic, then Empire)', color: '#a33a3a', parent: 'rome' },
    periods: ['roman-republic', 'roman-empire'],
  },
  {
    row: { id: 'ptolemaic-roman-egypt', name: 'Ptolemaic and Roman Egypt', color: '#a8844a', parent: 'egypt' },
    periods: ['ptolemaic', 'roman-egypt'],
  },
]);

const phase = (name: string, from: number | string, to: number | string, key: string, loc: string) => ({
  name,
  start: typeof from === 'number' ? `${from} BCE` : from,
  end: typeof to === 'number' ? `${to} BCE` : to,
  startDates: [C(from, key, loc)],
  endDates: [C(to, key, loc)],
});

const row = (id: string) => {
  const t = ed.data.tracks.find((x: { id: string }) => x.id === id);
  if (!t) throw new Error(`no row ${id}`);
  return t;
};

row('han').phases = [
  phase('Western Han', 202, '9 CE', 'wp-han', 'History, heading "Western Han (202 BC – 9 AD)"'),
  phase('Xin', '9 CE', '23 CE', 'wp-han', 'infobox ("9–23 AD: Xin"; Historical era "Xin dynasty 9–23 AD")'),
  phase('Eastern Han', '25 CE', '220 CE', 'wp-han', 'History, heading "Eastern Han (25–220 AD)"'),
];
row('jin-china').phases = [
  phase('Western Jin', '266 CE', '316 CE', 'wp-jin', 'lead ("Western Jin (266–316 CE)") and History heading'),
  phase('Eastern Jin', '317 CE', '420 CE', 'wp-jin', 'lead ("Eastern Jin (317–420 CE)") and History heading'),
];

ed.save();
