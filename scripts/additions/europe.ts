// Europe, c. 3500–330 BCE: the most important events only (first pass, 2026-11-17).
// Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; values that came only
// from page summaries are left out. Re-runnable: it replaces what it added before.
//   node scripts/additions/europe.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');

// ---------- sources ----------
for (const [key, title, slug] of [
  ['wp-stonehenge', 'Stonehenge', 'Stonehenge'],
  ['wp-newgrange', 'Newgrange', 'Newgrange'],
  ['wp-malta-temples', 'Megalithic Temples of Malta', 'Megalithic_Temples_of_Malta'],
  ['wp-otzi', 'Ötzi', '%C3%96tzi'],
  ['wp-corded-ware', 'Corded Ware culture', 'Corded_Ware_culture'],
  ['wp-bell-beaker', 'Bell Beaker culture', 'Bell_Beaker_culture'],
  ['wp-unetice', 'Únětice culture', '%C3%9An%C4%9Btice_culture'],
  ['wp-nordic-ba', 'Nordic Bronze Age', 'Nordic_Bronze_Age'],
  ['wp-urnfield', 'Urnfield culture', 'Urnfield_culture'],
  ['wp-hallstatt', 'Hallstatt culture', 'Hallstatt_culture'],
  ['wp-la-tene', 'La Tène culture', 'La_T%C3%A8ne_culture'],
  ['wp-etruscans', 'Etruscan civilization', 'Etruscan_civilization'],
  ['wp-founding-rome', 'Founding of Rome', 'Founding_of_Rome'],
  ['wp-roman-kingdom', 'Roman Kingdom', 'Roman_Kingdom'],
  ['wp-roman-republic', 'Roman Republic', 'Roman_Republic'],
  ['wp-allia', 'Battle of the Allia', 'Battle_of_the_Allia'],
  ['wp-archaic-greece', 'Archaic Greece', 'Archaic_Greece'],
  ['wp-classical-greece', 'Classical Greece', 'Classical_Greece'],
  ['wp-olympics', 'Ancient Olympic Games', 'Ancient_Olympic_Games'],
  ['wp-greek-colonisation', 'Greek colonisation', 'Greek_colonisation'],
  ['wp-greek-alphabet', 'Greek alphabet', 'Greek_alphabet'],
  ['wp-marathon', 'Battle of Marathon', 'Battle_of_Marathon'],
  ['wp-salamis', 'Battle of Salamis', 'Battle_of_Salamis'],
  ['wp-peloponnesian-war', 'Peloponnesian War', 'Peloponnesian_War'],
  ['wp-philip-ii', 'Philip II of Macedon', 'Philip_II_of_Macedon'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
// Europe goes first (westernmost), next to the Aegean.
ed.tracks(
  [
    { id: 'europe', name: 'Europe', color: '#5b6e8f' },
    { id: 'megaliths', name: 'Megalith builders', color: '#7a8494', parent: 'europe' },
    { id: 'corded-ware', name: 'Corded Ware culture', color: '#8a7a5a', parent: 'europe', span: { start: 'c. 2900 BCE', end: 'c. 2300 BCE' } },
    { id: 'bell-beaker', name: 'Bell Beaker culture', color: '#a0784a', parent: 'europe', span: { start: 'c. 2800 BCE', end: 'c. 1800 BCE' } },
    { id: 'unetice', name: 'Únětice culture', color: '#9a8a3a', parent: 'europe', span: { start: 'c. 2300 BCE', end: 'c. 1600 BCE' } },
    {
      id: 'nordic-ba', name: 'Nordic Bronze Age', color: '#4f7f8f', parent: 'europe',
      span: {
        start: 'c. 1750 BCE', end: 'c. 500 BCE',
        startDates: [C(1750, 'wp-nordic-ba', "infobox ('c. 2000/1750–500 BC')"), C(2000, 'wp-nordic-ba', 'infobox (2000/1750)')],
      },
    },
    { id: 'urnfield', name: 'Urnfield culture', color: '#7f6a8a', parent: 'europe', span: { start: 'c. 1300 BCE', end: 'c. 750 BCE' } },
    { id: 'hallstatt', name: 'Hallstatt culture', color: '#6a8a6a', parent: 'europe', span: { start: '1200 BCE', end: '450 BCE' } },
    { id: 'la-tene', name: 'La Tène (Celts)', color: '#4f8a5a', parent: 'europe', span: { start: 'c. 450 BCE', end: 'c. 1 BCE' } },
    { id: 'etruscans', name: 'Etruscans', color: '#a0523a', parent: 'europe', span: { start: '900 BCE', end: '27 BCE' } },
    { id: 'rome', name: 'Rome', color: '#8f2f3a', parent: 'europe', span: { start: 'c. 753 BCE', end: '27 BCE' } },
    { id: 'rome-kingdom', name: 'Roman Kingdom (traditional)', color: '#a3444e', parent: 'rome', span: { start: 'c. 753 BCE', end: 'c. 509 BCE' } },
    { id: 'rome-republic', name: 'Roman Republic', color: '#7a2532', parent: 'rome', span: { start: 'c. 509 BCE', end: '27 BCE' } },
  ],
  { before: 'aegean' },
);

// Archaic and Classical Greece continue the Aegean region after the Dark Ages.
ed.tracks(
  [
    { id: 'greece', name: 'Archaic and Classical Greece', color: '#3a5fa8', parent: 'aegean', span: { start: 'c. 800 BCE', end: '323 BCE' } },
    { id: 'greece-archaic', name: 'Archaic period', color: '#5277b8', parent: 'greece', span: { start: 'c. 800 BCE', end: '480 BCE' } },
    {
      id: 'greece-classical', name: 'Classical period', color: '#2f5196', parent: 'greece',
      span: {
        start: 'c. 480 BCE', end: '323 BCE',
        startDates: [C(480, 'wp-classical-greece', 'infobox (c. 480–323 BC)'), C(510, 'wp-classical-greece', "lead ('the fall of the last Athenian tyrant in 510 BC')")],
      },
    },
  ],
  { after: 'myc-postpalatial' },
);

// ---------- events: prehistoric Europe ----------
ed.event({
  uuid: 'malta-temples', title: 'Megalithic temples of Malta', start: 'c. 3600 BCE', end: 'c. 2500 BCE', tracks: ['megaliths'],
  descr: 'Temple complexes built in three phases (Ġgantija, Saflieni, Tarxien). Tarxien remained in use until 2500 BCE.',
  sources: [S('wp-malta-temples', "lead and Temple phases ('Based on recalibrated radiocarbon dating')")],
});
ed.event({
  uuid: 'otzi', title: 'Ötzi the Iceman dies in the Alps', start: 'c. 3230 BCE', tracks: ['europe'],
  descr: 'A Copper Age man, about 45 years old when he died. His body was discovered in 1991.',
  sources: [S('wp-otzi', 'infobox and Initial analysis')],
  startDates: [C(3230, 'wp-otzi', 'infobox (died c. 3230 BC)'), R(3359, 3105, 'wp-otzi', "Initial analysis ('lived between 3359 and 3105 BC')")],
});
ed.event({
  uuid: 'newgrange', title: 'Newgrange passage tomb', start: 'c. 3100 BCE', tracks: ['megaliths'],
  descr: 'A Neolithic monument, about 500 years older than the current form of Stonehenge. Its first period of use lasted around 1,000 years.',
  sources: [S('wp-newgrange', 'lead and Construction')],
  startDates: [C(3100, 'wp-newgrange', 'Construction'), R(3000, 2500, 'wp-newgrange', "Construction ('Some put its period of construction … at 3000 to 2500 BC')")],
});
ed.event({
  uuid: 'stonehenge-begun', title: 'Stonehenge begun', start: 'c. 3100 BCE', tracks: ['megaliths'],
  descr: 'The first stage, an earthwork. Building continued in phases until about 1600 BCE.',
  sources: [S('wp-stonehenge', "lead and 'Stonehenge 1 (c. 3100 BC)'")],
});
ed.event({
  uuid: 'stonehenge-sarsens', title: 'Stonehenge: the sarsen circle raised', start: 'c. 2600 BCE', end: 'c. 2400 BCE', tracks: ['megaliths'],
  descr: 'The great sarsen stones are placed; the bluestones follow between 2400 and 2200 BCE (radiocarbon).',
  sources: [S('wp-stonehenge', 'lead')],
});
ed.event({
  uuid: 'nebra-disc', title: 'Nebra sky disc', start: 'c. 1800 BCE', end: 'c. 1600 BCE', tracks: ['unetice'],
  descr: 'Associated with the Bornhöck mound (c. 1800 BCE), an Únětice princely grave.',
  sources: [S('wp-unetice', "History of research (caption 'Early Bronze Age, 1800–1600 BC') and Barrows")],
});
ed.event({
  uuid: 'kivik', title: "Kivik 'King's Grave'", start: 'c. 1400 BCE', tracks: ['nordic-ba'],
  descr: 'A Bronze Age burial.',
  sources: [S('wp-nordic-ba', 'Burials')],
});
ed.event({
  uuid: 'wehringen', title: 'Wehringen cart grave', start: 'c. 778 BCE', tracks: ['hallstatt'],
  descr: "A cart burial, one of the few Hallstatt finds with a 'solid dating'.",
  sources: [S('wp-hallstatt', 'Absolute dating')],
  startDates: [C(778, 'wp-hallstatt', "Absolute dating ('778 ± 5 BC')", { margin: 5 })],
});

// ---------- events: Rome ----------
ed.event({
  uuid: 'founding-of-rome', title: 'Founding of Rome (traditional)', start: 'c. 753 BCE', tracks: ['rome-kingdom'],
  descr: "Legend credits Romulus. Varro's 753 BCE became the basis of the Roman calendar; ancient writers disagreed, and most modern historians treat the accounts as fiction. Archaeologically, hilltop villages united by the later 8th century BCE.",
  sources: [S('wp-founding-rome', 'lead, Ancient tradition, Chronological disagreements, Archaeology'), S('wp-roman-kingdom', 'infobox')],
  startDates: [
    C(753, 'wp-founding-rome', 'lead (Varronian chronology)'),
    C(752, 'wp-founding-rome', 'Chronological disagreements (Fasti Capitolini)'),
    C(751, 'wp-founding-rome', 'Chronological disagreements (Cato, Diodorus: 751/50)'),
    C(750, 'wp-founding-rome', 'Chronological disagreements (Polybius: 750/49)'),
    C(748, 'wp-founding-rome', 'Chronological disagreements (Fabius Pictor: 748/47)'),
    C(814, 'wp-founding-rome', 'Chronological disagreements (Timaeus)'),
    C(729, 'wp-founding-rome', 'Chronological disagreements (Cincius Alimentus: 729/28)'),
  ],
});
ed.event({
  uuid: 'roman-republic-founded', title: 'Monarchy overthrown: the Roman Republic', start: 'c. 509 BCE', tracks: ['rome-kingdom', 'rome-republic'],
  descr: 'By tradition the last king, Tarquinius Superbus, is expelled and the first consuls are elected.',
  sources: [S('wp-roman-kingdom', 'infobox and lead'), S('wp-roman-republic', 'infobox')],
});
ed.event({
  uuid: 'gallic-sack', title: 'Gauls defeat Rome at the Allia and sack the city', start: 'c. 387 BCE', tracks: ['rome-republic', 'la-tene'],
  descr: 'Celts under Brennus defeat the Romans and sack Rome. The traditional (Varronian) date is 390 BCE; modern historians consider c. 387 the most probable.',
  sources: [S('wp-allia', 'infobox and Date of the battle'), S('wp-la-tene', 'History')],
  startDates: [C(387, 'wp-allia', 'Date of the battle (Polybius; most probable)'), C(390, 'wp-allia', 'Date of the battle (Varronian, traditional)')],
});
ed.event({
  uuid: 'latin-league', title: 'Latin League dissolved', start: '338 BCE', tracks: ['rome-republic'],
  descr: "The league of Latin cities is dissolved.",
  sources: [S('wp-roman-republic', 'infobox')],
});

// ---------- events: Greece ----------
ed.event({
  uuid: 'greek-alphabet', title: 'Greek alphabet', start: 'c. 800 BCE', tracks: ['greece-archaic'],
  descr: 'In use since the late 9th or early 8th century BCE; still used today.',
  sources: [S('wp-greek-alphabet', 'infobox and lead')],
});
ed.event({
  uuid: 'first-olympiad', title: 'First Olympic Games (traditional)', start: '776 BCE', tracks: ['greece-archaic'],
  descr: 'Traditionally dated to 776 BCE (Aristotle); an Olympiad count gives 765, and scholars disagree on when the games began.',
  sources: [S('wp-olympics', 'lead and History')],
  startDates: [C(776, 'wp-olympics', 'lead (traditional)'), C(765, 'wp-olympics', 'History > Olympiad calendar')],
});
ed.event({
  uuid: 'greek-colonisation', title: 'Greek colonisation', start: 'c. 750 BCE', end: 'c. 550 BCE', tracks: ['greece-archaic'],
  descr: 'Greek cities found colonies abroad, particularly in the 8th–6th centuries BCE.',
  sources: [S('wp-greek-colonisation', "lead and map caption ('Archaic period: 750–550 BC')")],
});
ed.event({
  uuid: 'solon', title: 'Solon reforms Athens', start: '594 BCE', tracks: ['greece-archaic'],
  descr: "Solon is appointed 'archon and mediator' in 594/3 BCE.",
  sources: [S('wp-archaic-greece', 'Political developments')],
  startDates: [C(594, 'wp-archaic-greece', "Political developments ('In 594/3 BC')"), C(593, 'wp-archaic-greece', 'Political developments')],
});
ed.event({
  uuid: 'cleisthenes', title: "Cleisthenes' reforms in Athens", start: '508 BCE', tracks: ['greece-archaic'],
  descr: 'After the fall of the last Athenian tyrant (510 BCE). Classical Greece calls it the first significant event of the 5th century.',
  sources: [S('wp-classical-greece', '5th century BC'), S('wp-marathon', 'Background')],
  startDates: [C(508, 'wp-classical-greece', "5th century BC ('the first significant event … in 508 BC')"), C(507, 'wp-marathon', "Background ('Cleisthenes was thus restored to Athens (507 BC)')")],
});
ed.event({
  uuid: 'marathon', title: 'Battle of Marathon', start: '490 BCE', tracks: ['greece-archaic', 'persia'],
  descr: "The Persians are defeated in their first invasion of Greece.",
  sources: [S('wp-marathon', 'infobox and lead')],
  links: [{ to: 'greco-persian-wars', kind: 'part-of' }],
});
ed.event({
  uuid: 'salamis', title: 'Battle of Salamis', start: '480 BCE', tracks: ['greece-classical', 'persia'],
  descr: "A naval battle during Xerxes' invasion of Greece (481–479 BCE).",
  sources: [S('wp-salamis', 'infobox and lead')],
  links: [{ to: 'greco-persian-wars', kind: 'part-of' }],
});
ed.event({
  uuid: 'peloponnesian-war', title: 'Peloponnesian War', start: '431 BCE', end: '404 BCE', tracks: ['greece-classical'],
  descr: 'Athens and Sparta fight for hegemony over Greece; Persia backs Sparta from 413 and Athens surrenders in 404.',
  sources: [S('wp-peloponnesian-war', 'infobox and lead')],
});
ed.event({
  uuid: 'philip-ii', title: 'Reign of Philip II of Macedon', start: 'c. 359 BCE', end: '336 BCE', tracks: ['greece-classical'],
  descr: 'King of Macedon from 359 BCE. He is assassinated in 336 and immediately succeeded by his son Alexander.',
  sources: [S('wp-philip-ii', 'infobox and lead')],
});
ed.event({
  uuid: 'chaeronea', title: 'Philip II wins the Battle of Chaeronea', start: '338 BCE', tracks: ['greece-classical'],
  descr: 'The next year (337 BCE) Philip becomes hegemon of the Hellenic League.',
  sources: [S('wp-philip-ii', 'lead')],
  links: [{ to: 'philip-ii', kind: 'part-of' }],
});

// ---------- meta ----------
const meta = ed.data.meta;
for (const id of ['rome', 'greece']) if (!meta.collapsed.includes(id)) meta.collapsed.push(id);
meta.subtitle = 'Europe, the Mediterranean, the Near East, Iran, the Indus, China and the Americas, c. 3500–330 BCE';
meta.description =
  'Bronze Age and early Iron Age civilizations: Europe, the western Mediterranean, North Africa, the Aegean and Greece, Anatolia, the Levant, Egypt, Mesopotamia and Assyria, Iran, the Indus Valley, China, and the Americas.';

ed.save();
