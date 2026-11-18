// The rest of the Mediterranean, c. 3500–330 BCE: the most important events only (first pass,
// 2026-11-17). Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; values
// that came only from page summaries are left out. Re-runnable: it replaces what it added before.
// Run after europe.ts (it places rows next to Europe's).
//   node scripts/additions/mediterranean.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');

for (const [key, title, slug] of [
  ['wp-cycladic', 'Cycladic culture', 'Cycladic_culture'],
  ['wp-macedon', 'Macedonia (ancient kingdom)', 'Macedonia_(ancient_kingdom)'],
  ['wp-lydia', 'Lydia', 'Lydia'],
  ['wp-croesus', 'Croesus', 'Croesus'],
  ['wp-phrygia', 'Phrygia', 'Phrygia'],
  ['wp-midas', 'Midas', 'Midas'],
  ['wp-lycia', 'Lycia', 'Lycia'],
  ['wp-alashiya', 'Alashiya', 'Alashiya'],
  ['wp-cyprus-ancient', 'Ancient history of Cyprus', 'Ancient_history_of_Cyprus'],
  ['wp-odrysian', 'Odrysian kingdom', 'Odrysian_kingdom'],
  ['wp-terramare', 'Terramare culture', 'Terramare_culture'],
  ['wp-villanovan', 'Villanovan culture', 'Villanovan_culture'],
  ['wp-samnites', 'Samnites', 'Samnites'],
  ['wp-samnite-wars', 'Samnite Wars', 'Samnite_Wars'],
  ['wp-carthage', 'Ancient Carthage', 'Ancient_Carthage'],
  ['wp-alalia', 'Battle of Alalia', 'Battle_of_Alalia'],
  ['wp-himera', 'Battle of Himera (480 BC)', 'Battle_of_Himera_(480_BC)'],
  ['wp-sicilian-wars', 'Sicilian Wars', 'Sicilian_Wars'],
  ['wp-magna-graecia', 'Magna Graecia', 'Magna_Graecia'],
  ['wp-syracuse', 'History of Syracuse, Sicily', 'History_of_Syracuse,_Sicily'],
  ['wp-sicilian-expedition', 'Sicilian Expedition', 'Sicilian_Expedition'],
  ['wp-nuragic', 'Nuragic civilization', 'Nuragic_civilization'],
  ['wp-talaiotic', 'Talaiotic culture', 'Talaiotic_culture'],
  ['wp-los-millares', 'Los Millares', 'Los_Millares'],
  ['wp-argaric', 'Argaric culture', 'El_Argar_culture'],
  ['wp-tartessos', 'Tartessos', 'Tartessos'],
  ['wp-iberians', 'Iberians', 'Iberians'],
  ['wp-libu', 'Libu', 'Libu'],
  ['wp-cyrene', 'Cyrene, Libya', 'Cyrene,_Libya'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
// Aegean: the Cycladic culture comes first; Macedon after Archaic and Classical Greece.
ed.track({ id: 'cycladic', name: 'Cycladic culture', color: '#6a8fbf', parent: 'aegean', span: { start: 'c. 3100 BCE', end: 'c. 1000 BCE' } }, { before: 'minoan' });
ed.track(
  {
    id: 'macedon', name: 'Macedon', color: '#4a4f9a', parent: 'aegean',
    span: {
      start: 'c. 650 BCE', end: '168 BCE',
      startDates: [C(700, 'wp-macedon', "infobox ('c. 7th century'): start of century"), C(601, 'wp-macedon', 'infobox: end of century')],
    },
  },
  { after: 'greece-classical' },
);

// Anatolia: Phrygia, Lydia and Lycia after the Hittites, before Urartu (which sits next to Assyria).
ed.tracks(
  [
    { id: 'phrygia', name: 'Phrygia', color: '#b0704a', parent: 'anatolia', span: { start: '1200 BCE', end: 'c. 675 BCE' } },
    {
      id: 'lydia', name: 'Lydia', color: '#c08a3a', parent: 'anatolia',
      span: {
        start: 'c. 800 BCE', end: '546 BCE',
        startDates: [C(800, 'wp-lydia', "Origins ('At approximately around 800 BC')"), C(1200, 'wp-lydia', 'infobox (1200–546 BC)')],
        endDates: [C(546, 'wp-lydia', 'infobox and lead'), C(547, 'wp-croesus', "short description ('to 547 BC')")],
      },
    },
    {
      id: 'lycia', name: 'Lycia', color: '#9a6a5a', parent: 'anatolia',
      span: {
        start: 'c. 1400 BCE', end: '546 BCE',
        startDates: [C(1500, 'wp-lycia', "lead ('from 15–14th centuries BC (as Lukka)')"), C(1301, 'wp-lycia', 'lead (end of the 14th century)')],
        endDates: [C(546, 'wp-lycia', 'lead'), C(540, 'wp-lycia', "contents ('Acquisition by Cyrus the Great (circa 540 BC)')")],
      },
    },
  ],
  { before: 'urartu' },
);

// Cyprus: a row in the Levant region (as its own region it pushed Anatolia and Mesopotamia apart).
ed.track({ id: 'cyprus', name: 'Cyprus (Alashiya)', color: '#b07a2f', parent: 'levant' }, { after: 'aram' });

// Europe: Italian cultures before the Etruscans; the Samnites after Rome; Thrace at the end.
ed.tracks(
  [
    { id: 'terramare', name: 'Terramare culture', color: '#8a7a4a', parent: 'europe', span: { start: 'c. 1700 BCE', end: 'c. 1150 BCE' } },
    { id: 'villanovan', name: 'Villanovan culture', color: '#9a5a3a', parent: 'europe', span: { start: 'c. 900 BCE', end: 'c. 700 BCE' } },
  ],
  { before: 'etruscans' },
);
ed.track({ id: 'samnites', name: 'Samnites', color: '#7a4a3a', parent: 'europe' }, { after: 'rome-republic' });
ed.track(
  { id: 'odrysian', name: 'Odrysian kingdom (Thrace)', color: '#6a5a8a', parent: 'europe', span: { start: 'c. 480 BCE', end: 'c. 30 BCE' } },
  { after: 'samnites' },
);

// Western Mediterranean and North Africa: new regions, placed by `npm run row-order` afterwards.
ed.tracks(
  [
    { id: 'west-med', name: 'Western Mediterranean', color: '#3f7f8a' },
    { id: 'carthage', name: 'Carthage', color: '#7a3a6a', parent: 'west-med', span: { start: 'c. 814 BCE', end: '146 BCE' } },
    {
      id: 'magna-graecia', name: 'Magna Graecia and Sicily', color: '#4a6fb0', parent: 'west-med',
      span: {
        start: 'c. 750 BCE', end: '205 BCE',
        startDates: [C(800, 'wp-magna-graecia', "infobox ('Founded: 8th century BC'): start of century"), C(701, 'wp-magna-graecia', 'infobox: end of century')],
      },
    },
    { id: 'nuragic', name: 'Nuragic Sardinia', color: '#6a7a4a', parent: 'west-med', span: { start: 'c. 1800 BCE', end: '238 BCE' } },
    {
      id: 'talaiotic', name: 'Talaiotic Balearics', color: '#8a8a5a', parent: 'west-med',
      span: {
        start: 'c. 1000 BCE', end: '123 BCE',
        startDates: [
          C(1200, 'wp-talaiotic', "Periodization (recent Menorca: 'Early Talayotic (1200–500 BCE)')"),
          C(1050, 'wp-talaiotic', "Periodization (UAB: 'Pre-Talayotic (1050–850 BCE)')"),
          C(900, 'wp-talaiotic', "Periodization (University of the Balearic Islands: 'around 900 BCE')"),
        ],
      },
    },
    { id: 'iberia', name: 'Iberian Peninsula', color: '#a06a3a', parent: 'west-med' },
    {
      id: 'los-millares', name: 'Los Millares', color: '#a8804a', parent: 'iberia',
      span: {
        start: 'c. 3025 BCE', end: 'c. 2000 BCE',
        endDates: [C(2000, 'wp-los-millares', 'infobox'), C(1800, 'wp-los-millares', "Relationship to other cultures ('replaced around 1800 BC … by the El Argar culture')")],
      },
    },
    {
      id: 'el-argar', name: 'El Argar culture', color: '#9a6a2a', parent: 'iberia',
      span: {
        start: 'c. 2200 BCE', end: 'c. 1550 BCE',
        endDates: [C(1550, 'wp-argaric', 'lead (2200 BC and 1550 BC)'), C(1300, 'wp-argaric', 'infobox (c. 2200 — c. 1300 BC)')],
      },
    },
    {
      id: 'tartessos', name: 'Tartessos', color: '#b08a3a', parent: 'iberia',
      span: {
        start: 'c. 850 BCE', end: 'c. 450 BCE',
        startDates: [C(900, 'wp-tartessos', "Turuñuelo ('born around the 9th century BC'): start of century"), C(801, 'wp-tartessos', 'end of century')],
        endDates: [C(500, 'wp-tartessos', "Carbon dating ('abandoned in the 5th century BC'): start of century"), C(401, 'wp-tartessos', 'end of century')],
      },
    },
    {
      id: 'iberians', name: 'Iberians', color: '#8a5a2a', parent: 'iberia',
      span: {
        start: 'c. 600 BCE', end: '16 BCE',
        startDates: [C(600, 'wp-iberians', "History ('developed from the 6th century BC')"), C(700, 'wp-iberians', "lead (language 'from the 7th … century BC')")],
      },
    },
    { id: 'north-africa', name: 'North Africa', color: '#a88a5a' },
    { id: 'libyans', name: 'Libyans', color: '#b89a6a', parent: 'north-africa' },
    {
      id: 'cyrene', name: 'Cyrene', color: '#5a7ab0', parent: 'north-africa',
      span: { start: '631 BCE', end: '96 BCE', startDates: [C(631, 'wp-cyrene', 'infobox (traditional)'), C(650, 'wp-cyrene', "History ('mid-seventh century BC', archaeology)")] },
    },
  ],
  { after: 'sea-peoples' },
);

// ---------- events: Aegean ----------
ed.event({
  uuid: 'early-cycladic', title: 'Early Cycladic culture', start: 'c. 3100 BCE', end: 'c. 2300 BCE', tracks: ['cycladic'],
  descr: 'The island culture of the Cyclades evolves in three Early Cycladic phases, then shades into the archaeologically murkier Middle Cycladic around 2000 BCE.',
  sources: [S('wp-cycladic', 'Early Bronze Age and Chronology')],
});
ed.event({
  uuid: 'pella', title: 'Macedon moves its capital from Aigai to Pella', start: '399 BCE', tracks: ['macedon'],
  descr: 'Pella remains the capital until the kingdom ends in 168 BCE.',
  sources: [S('wp-macedon', 'infobox (capitals)')],
});
ed.addRow('philip-ii', 'macedon');
ed.addRow('chaeronea', 'macedon');

// ---------- events: Anatolia ----------
ed.event({
  uuid: 'midas', title: 'Reign of Midas of Phrygia', start: '740 BCE', end: 'c. 675 BCE', tracks: ['phrygia'],
  descr: 'The historical king behind the legends, whom most historians identify with Mita. Ancient writers date his death to around 695 (Eusebius) or 676 BCE (Julius Africanus).',
  sources: [S('wp-phrygia', 'infobox (kings)'), S('wp-midas', 'Midas (8th century BCE)')],
  endDates: [C(675, 'wp-phrygia', 'infobox'), C(695, 'wp-midas', 'Midas (8th century BCE) (Eusebius)'), C(676, 'wp-midas', 'Midas (8th century BCE) (Julius Africanus)')],
});
ed.event({
  uuid: 'phrygia-falls', title: 'Cimmerians destroy the kingdom of Phrygia', start: 'c. 675 BCE', tracks: ['phrygia'],
  descr: 'The end of the major power in Anatolia before Lydia.',
  sources: [S('wp-phrygia', 'infobox'), S('wp-lydia', 'Origins')],
  startDates: [C(675, 'wp-phrygia', "infobox ('Fall to the Cimmerians 675 BC')"), C(695, 'wp-midas', 'Eusebius (death of Midas)'), C(676, 'wp-midas', 'Julius Africanus (death of Midas)')],
});
ed.event({
  uuid: 'gyges-killed', title: 'Cimmerians sack Sardis; Gyges killed', start: '644 BCE', tracks: ['lydia'],
  descr: 'The third Cimmerian attack on Lydia.',
  sources: [S('wp-lydia', 'Mermnad Empire > Gyges')],
});
ed.event({
  uuid: 'lydian-coins', title: 'Lydian coins', start: 'c. 650 BCE', tracks: ['lydia'],
  descr: 'Electrum coins from Lydia, among the oldest in existence.',
  sources: [S('wp-lydia', "lead ('dated to around the 7th century BC')")],
  startDates: [C(700, 'wp-lydia', "lead ('around the 7th century BC'): start of century"), C(601, 'wp-lydia', 'lead: end of century')],
});
ed.event({
  uuid: 'croesus', title: 'Reign of Croesus', start: 'c. 585 BCE', end: 'c. 546 BCE', tracks: ['lydia'],
  descr: 'The last king of Lydia. After Cyrus conquers the Medes (550 BCE), Croesus attacks Persia and loses his kingdom.',
  sources: [S('wp-croesus', 'infobox and lead')],
  startDates: [C(585, 'wp-croesus', 'infobox and lead'), C(561, 'wp-croesus', "short description ('from 585 or 561')")],
});
ed.event({
  uuid: 'fall-of-sardis', title: 'Cyrus conquers Lydia', start: '546 BCE', tracks: ['lydia', 'persia'],
  descr: 'Lydia becomes a satrapy of the Achaemenid Empire.',
  sources: [S('wp-lydia', 'infobox and lead'), S('wp-achaemenid', 'infobox (Conquest of Lydia 547 BC)')],
  startDates: [C(546, 'wp-lydia', 'infobox and lead'), C(547, 'wp-achaemenid', 'infobox (historical era)')],
  links: [{ to: 'croesus', kind: 'conquers' }],
});

// ---------- events: Cyprus ----------
ed.event({
  uuid: 'cyprus-thutmose', title: 'Thutmose III subjugates Cyprus', start: 'c. 1455 BCE', tracks: ['cyprus', 'eg-new'],
  descr: 'Egypt claims Cyprus; the Hittites replace Egypt there in the 13th century BCE.',
  sources: [S('wp-cyprus-ancient', "Bronze age ('around 1450s BC')")],
  startDates: [R(1459, 1450, 'wp-cyprus-ancient', "Bronze age ('around 1450s BC')")],
});
ed.addRow('amarna-letters', 'cyprus');
ed.event({
  uuid: 'alashiya-submits', title: 'Alashiya submits to the Hittites', start: 'c. 1200 BCE', tracks: ['cyprus', 'hit-new'],
  descr: "Shortly before the Late Bronze Age collapse, Tudḫaliya IV and Šuppiluliuma II force Alashiya's king to sign a treaty of submission. Alashiya was a major source of copper for the Near East.",
  sources: [S('wp-alashiya', 'lead and Hittites')],
});
ed.event({
  uuid: 'cyprus-ten-kingdoms', title: 'Ten Cypriot kingdoms under Assyria', start: '673 BCE', end: '672 BCE', tracks: ['cyprus', 'as-neo'],
  descr: "Esarhaddon's prism lists ten city-kingdoms of Cyprus. Assyrian rule ends with the fall of the Neo-Assyrian Empire (609 BCE).",
  sources: [S('wp-cyprus-ancient', 'Assyrian conquest and the ten city-kingdoms')],
});
ed.event({
  uuid: 'cyprus-egypt', title: 'Amasis II of Egypt conquers Cyprus', start: '570 BCE', tracks: ['cyprus', 'eg-late'],
  descr: '',
  sources: [S('wp-cyprus-ancient', 'Egyptian rule')],
});
ed.event({
  uuid: 'cyprus-persia', title: 'Persia conquers Cyprus', start: '545 BCE', tracks: ['cyprus', 'persia'],
  descr: 'The Achaemenid Empire under Cyrus the Great takes Cyprus.',
  sources: [S('wp-cyprus-ancient', 'Persian rule')],
});

// ---------- events: Italy and Thrace ----------
ed.event({
  uuid: 'terramare-collapse', title: 'Terramare culture collapses', start: 'c. 1150 BCE', tracks: ['terramare'],
  descr: 'The Bronze Age Terramare culture enters a severe crisis around 1200 BCE and collapses about 1150.',
  sources: [S('wp-terramare', 'lead and Development and collapse')],
});
ed.event({
  uuid: 'samnite-wars', title: 'Samnite Wars', start: '343 BCE', end: '290 BCE', tracks: ['samnites', 'rome-republic'],
  descr: 'Three wars (343–341, 327–304, 298–290 BCE) in which Rome subjugates the Samnites, despite their great victory at the Caudine Forks (321).',
  sources: [S('wp-samnite-wars', 'infobox and Chronology'), S('wp-samnites', 'lead')],
});
ed.event({
  uuid: 'odrysian-founded', title: 'Teres I founds the Odrysian kingdom', start: 'c. 480 BCE', tracks: ['odrysian'],
  descr: 'A Thracian kingdom founded after the failed Persian invasion of Greece. Philip II of Macedon conquers it in 340 BCE; Seuthes III revives it around 330.',
  sources: [S('wp-odrysian', 'infobox and lead')],
});

// ---------- events: Western Mediterranean ----------
ed.addRow('carthage-founded', 'carthage');
ed.event({
  uuid: 'carthage-independent', title: 'Carthage independent of Tyre', start: 'c. 550 BCE', tracks: ['carthage'],
  descr: 'Independence from its mother city, Tyre.',
  sources: [S('wp-carthage', "infobox ('mid-6th century BC')")],
});
ed.event({
  uuid: 'alalia', title: 'Battle of Alalia', start: 'c. 538 BCE', tracks: ['carthage', 'etruscans'],
  descr: 'Etruscans and Carthaginians join forces against the Greeks, containing Greek expansion in Spain.',
  sources: [S('wp-alalia', 'infobox, lead, Prelude and Aftermath')],
  startDates: [R(540, 535, 'wp-alalia', "infobox ('Some time between 540 BC and 535 BC')")],
});
ed.event({
  uuid: 'sicilian-wars', title: 'Sicilian Wars', start: '580 BCE', end: '265 BCE', tracks: ['carthage', 'magna-graecia'],
  descr: 'Carthage and the Greek cities of Sicily fight for the island, from the first recorded clash (580) until the Punic Wars. Carthage keeps the west, the Greeks the east.',
  sources: [S('wp-sicilian-wars', 'infobox, lead and Background')],
});
ed.event({
  uuid: 'himera', title: 'Battle of Himera', start: '480 BCE', tracks: ['carthage', 'magna-graecia'],
  descr: "The Greeks of Sicily defeat Hamilcar's expedition, crippling Carthage's power on the island for decades. Tradition put it on the same day as Salamis; modern scholars reject that.",
  sources: [S('wp-himera', 'infobox and lead'), S('wp-syracuse', 'Greek era')],
  links: [{ to: 'sicilian-wars', kind: 'part-of' }],
});
ed.event({
  uuid: 'cumae', title: 'Cumae founded', start: 'c. 738 BCE', tracks: ['magna-graecia'],
  descr: 'A colony of Chalkis and Eretria in Italy.',
  sources: [S('wp-magna-graecia', 'List of Greek poleis (Kyme/Cumae)')],
  startDates: [R(750, 725, 'wp-magna-graecia', "List of Greek poleis ('c.750–725 BC')")],
});
ed.event({
  uuid: 'syracuse-founded', title: 'Syracuse founded', start: '733 BCE', tracks: ['magna-graecia'],
  descr: "Founded by Greek colonists from Corinth. Thucydides' 733 is considered the most reliable date.",
  sources: [S('wp-syracuse', 'lead and Foundation')],
  startDates: [C(733, 'wp-syracuse', 'Foundation (Thucydides, most reliable)'), C(758, 'wp-syracuse', 'Foundation (Marmor Parium)')],
});
ed.event({
  uuid: 'sybaris', title: 'Sybaris destroyed', start: 'c. 510 BCE', tracks: ['magna-graecia'],
  descr: 'The Greek city of Sybaris, prosperous from 600 BCE, is destroyed.',
  sources: [S('wp-magna-graecia', 'lead and History')],
});
ed.event({
  uuid: 'sicilian-expedition', title: 'Athenian expedition to Sicily', start: '415 BCE', end: '413 BCE', tracks: ['magna-graecia', 'greece-classical'],
  descr: 'Athens attacks Syracuse during the Peloponnesian War; the expedition is destroyed in 413 BCE.',
  sources: [S('wp-sicilian-expedition', 'infobox and lead'), S('wp-syracuse', 'Greek era'), S('wp-peloponnesian-war', "contents ('Sicilian Expedition (415–413 BC)')")],
  links: [{ to: 'peloponnesian-war', kind: 'part-of' }],
});
ed.event({
  uuid: 'nuraghi', title: 'Nuraghe towers built', start: 'c. 1800 BCE', end: 'c. 1100 BCE', tracks: ['nuragic'],
  descr: "Sardinia's nuraghe towers, built in large numbers from about 1800 BCE; construction had stopped by the 12th–11th century BCE.",
  sources: [S('wp-nuragic', 'lead')],
  endDates: [R(1200, 1001, 'wp-nuragic', "lead ('already stopped by the 12th–11th century BC')")],
});
ed.event({
  uuid: 'talaiotic-peak', title: 'Talaiotic culture at its height', start: 'c. 850 BCE', end: 'c. 500 BCE', tracks: ['talaiotic'],
  descr: 'The era of the talayots on Menorca and Mallorca. Decline sets in between 600 and 500 BCE, with the onset of Punic influence.',
  sources: [S('wp-talaiotic', "Funerary spaces ('maximum splendor … from 850-800 BCE to 500 BCE') and The Talayot")],
  startDates: [R(850, 800, 'wp-talaiotic', 'Funerary spaces')],
});
ed.event({
  uuid: 'tartessos-orientalizing', title: 'Tartessos: the Orientalizing phase', start: 'c. 750 BCE', end: 'c. 550 BCE', tracks: ['tartessos'],
  descr: 'The height of Tartessian metalwork in southern Iberia, before it gave way to the Classic Iberian culture.',
  sources: [S('wp-tartessos', 'Metallurgy')],
});

// ---------- events: North Africa ----------
ed.addRow('merneptah', 'libyans');
ed.event({
  uuid: 'libu-invasion', title: 'Libu and Sea Peoples invade Egypt', start: '1208 BCE', tracks: ['libyans', 'eg-new', 'sea-peoples'],
  descr: "In Merneptah's 5th year a Libyan coalition under Meryey, allied with Sea Peoples, is defeated.",
  sources: [S('wp-libu', 'Early history')],
  links: [{ to: 'merneptah', kind: 'part-of' }],
});
ed.event({
  uuid: 'cyrene-founded', title: 'Cyrene founded', start: '631 BCE', tracks: ['cyrene'],
  descr: 'Colonists from Thera led by Battus I found Cyrene, by Greek tradition in 631 BCE; archaeology puts Greek settlement in the mid-7th century.',
  sources: [S('wp-cyrene', 'infobox and History')],
  startDates: [C(631, 'wp-cyrene', 'infobox (tradition)'), C(650, 'wp-cyrene', 'History (archaeology)')],
});
ed.event({
  uuid: 'irasa', title: 'Cyrene defeats Egypt at Irasa', start: 'c. 570 BCE', tracks: ['cyrene', 'eg-late'],
  descr: 'The pharaoh Apries, called in by Adicran, is defeated at Irasa.',
  sources: [S('wp-cyrene', 'History')],
});
ed.event({
  uuid: 'barca-sacked', title: 'Persians sack Barca', start: '515 BCE', tracks: ['cyrene', 'persia'],
  descr: 'The Persian governor of Egypt, Aryandes, besieges and sacks the Cyrenaican city of Barca.',
  sources: [S('wp-cyrene', 'History')],
});

const meta = ed.data.meta;
for (const id of ['iberia']) if (!meta.collapsed.includes(id)) meta.collapsed.push(id);

ed.save();
