// The Caucasus, c. 3700–330 BCE: the most important events only (first pass, 2026-11-18). A new region in
// the Ancient Near East group (groups.ts places it). Every date was quoted verbatim from the cited
// Wikipedia page by a fetch agent. Not used: *Trialeti–Vanadzor culture*, which carries an
// AI-generated-text warning. See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after pacific.ts and before groups.ts.
//   node scripts/additions/caucasus.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-maykop', 'Maykop culture', 'Maykop_culture'],
  ['wp-kura-araxes', 'Kura–Araxes culture', 'Kura%E2%80%93Araxes_culture'],
  ['wp-colchian', 'Colchian culture', 'Colchian_culture'],
  ['wp-colchis', 'Colchis', 'Colchis'],
  ['wp-lchashen', 'Lchashen–Metsamor culture', 'Lchashen%E2%80%93Metsamor_culture'],
  ['wp-koban', 'Koban culture', 'Koban_culture'],
  ['wp-diauehi', 'Diauehi', 'Diauehi'],
] as const)
  ed.wikipedia(key, title, slug);

ed.tracks(
  [
    { id: 'caucasus', name: 'Caucasus', color: '#7a5a8a' },
    {
      id: 'maykop', name: 'Maykop culture (North Caucasus)', color: '#8a5a7a', parent: 'caucasus',
      span: { start: 'c. 3700 BCE', end: 'c. 3000 BCE' },
    },
    {
      id: 'kura-araxes', name: 'Kura–Araxes culture', color: '#6a5a9a', parent: 'caucasus',
      span: {
        start: 'c. 3400 BCE', end: 'c. 2000 BCE',
        startDates: [C(3400, 'wp-kura-araxes', 'infobox'), C(4000, 'wp-kura-araxes', "lead ('from about 4000 BC')")],
        endDates: [C(2000, 'wp-kura-araxes', 'infobox and lead'), R(2700, 2600, 'wp-kura-araxes', "lead ('may have disappeared as early as 2600 or 2700 BC')")],
      },
    },
    {
      id: 'colchis', name: 'Colchian culture and Colchis', color: '#9a6a5a', parent: 'caucasus',
      span: { start: 'c. 2700 BCE', end: '131 CE', endDates: [C('131 CE', 'wp-colchis', 'infobox (Colchis)'), C(700, 'wp-colchian', 'lead (the Colchian culture)')] },
    },
    { id: 'lchashen', name: 'Lchashen–Metsamor culture (Armenia)', color: '#7a6a8a', parent: 'caucasus', span: { start: 'c. 1500 BCE', end: 'c. 700 BCE' } },
    {
      id: 'koban', name: 'Koban culture (north-central Caucasus)', color: '#5a6a7a', parent: 'caucasus',
      span: {
        start: 'c. 1200 BCE', end: 'c. 350 BCE',
        startDates: [C(1200, 'wp-koban', 'lead'), R(1300, 1200, 'wp-koban', "Description ('possibly ... the 13th century BC')"), R(1400, 600, 'wp-colchian', 'Metallurgy (Koban culture c. 1400–600 BC)')],
      },
    },
    {
      id: 'diauehi', name: 'Diauehi (Daiaeni)', color: '#8a7a6a', parent: 'caucasus',
      span: { start: 'c. 1150 BCE', end: 'c. 750 BCE', startDates: [R(1200, 1100, 'wp-diauehi', "infobox ('12th century BC')")], endDates: [R(800, 700, 'wp-diauehi', "infobox ('8th century BCE')")] },
    },
  ],
  { after: 'urartu' },
);

ed.event({
  uuid: 'maykop-kurgan', title: 'Maykop culture: royal kurgan, gold and silver', start: 'c. 3700 BCE', end: 'c. 3000 BCE', tracks: ['maykop'],
  descr: 'The culture takes its name from a royal burial. More than 7000 gold and some 1000 silver objects are known; wheels date to the second half of the fourth millennium, and the Maykop animal style is more than a thousand years older than the Scythian. Contemporaneous with the late Uruk period in Mesopotamia; the Yamnaya culture lies to the north.',
  sources: [S('wp-maykop', 'lead, Territory, Horse breeding, Culture and Art')],
  links: [{ to: 'uruk-expansion', kind: 'related' }],
});
ed.event({
  uuid: 'kura-araxes-spread', title: 'Kura–Araxes culture spreads into eastern Anatolia', start: 'c. 3000 BCE', tracks: ['kura-araxes'],
  descr: 'Early Kura–Araxes pottery appears at Sos Höyük as early as 3500–3300 BC; around 3000 BCE Arslantepe sees widespread burning and destruction, and the culture spreads north in the Caucasus by 3000 BC. It traded with Mesopotamia and Asia Minor, and its precocious metallurgy strongly influenced surrounding regions.',
  sources: [S('wp-kura-araxes', 'lead, Expansion, Economy and Metallurgy')],
  startDates: [C(3000, 'wp-kura-araxes', 'lead and Expansion'), C(3100, 'wp-kura-araxes', "Expansion (Summers: 'end of Uruk IV phase c. 3100 BC')")],
});
ed.event({
  uuid: 'shengavit', title: 'Shengavit settlement', start: 'c. 3200 BCE', end: 'c. 2500 BCE', tracks: ['kura-araxes'],
  descr: 'Inhabited from about 3200 to 2500 BC (calibrated), and used irregularly until 2200 BC.',
  sources: [S('wp-kura-araxes', 'Settlements')],
});
ed.event({
  uuid: 'tiglath-daiaeni', title: 'Tiglath-Pileser I defeats Sien of Daiaeni', start: '1112 BCE', tracks: ['diauehi', 'as-middle'],
  descr: 'Daiaeni appears in 12th-century BC Assyrian sources as part of the Nairi confederation. Later its king Asia submits to Shalmaneser III in 845 BC.',
  sources: [S('wp-diauehi', 'lead and history')],
  links: [{ to: 'tiglath-pileser-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'colchis-consolidates', title: 'Colchian culture', start: 'c. 1250 BCE', tracks: ['colchis'],
  descr: 'Known in Greek mythology as the destination of the Argonauts; the name is thought to derive from the Urartian Qulḫa. Colchian metalsmiths made distinctive axes with incised geometric or zoomorphic decoration.',
  sources: [S('wp-colchis', 'infobox, lead and Name'), S('wp-colchian', 'Metallurgy')],
  startDates: [R(1300, 1200, 'wp-colchis', "infobox ('13th century BC')")],
});
ed.event({
  uuid: 'lchashen-chariot', title: 'Lchashen–Metsamor: cyclopean fortresses and a four-wheeled chariot', start: 'c. 1500 BCE', tracks: ['lchashen'],
  descr: 'A fully preserved four-wheeled chariot was found at Lchashen; cyclopean fortresses spread at the end of the Bronze Age. The culture is linked with the Etiuni tribal union of Urartian inscriptions.',
  sources: [S('wp-lchashen', 'lead and Description')],
});
ed.event({
  uuid: 'koban-bronze', title: 'Koban culture: advanced metallurgy', start: 'c. 1050 BCE', end: 'c. 650 BCE', tracks: ['koban'],
  descr: 'Major centres from around the 11th to the 7th century BC show an advanced stage of metallurgy (bronze swords; axes with iron inlay at Klin-Yar, c. 700 BC). Jaimoukha links the end of the culture to Scythian invasions.',
  sources: [S('wp-koban', 'Settlements, Description, The arts and Ethnic affiliation')],
  startDates: [R(1100, 1000, 'wp-koban', "Settlements ('around 11th century BC')")],
  endDates: [R(700, 600, 'wp-koban', "Settlements ('around the 7th century BC')")],
});
ed.event({
  uuid: 'sarduri-colchis', title: 'Sarduri II of Urartu invades Colchis', start: '744 BCE', tracks: ['colchis', 'urartu'],
  descr: 'Two invasions (744/743 BCE); Sarduri II inscribed his victory over Qulḫa on a stele.',
  sources: [S('wp-colchis', "infobox ('Two invasions of Sardur II of Urartu — 744/743 BC') and Name")],
  links: [{ to: 'urartu-sarduri', kind: 'related' }],
});
ed.event({
  uuid: 'argishti-diauehi', title: 'Argishti I of Urartu defeats Utupursi of Diauehi', start: '783 BCE', tracks: ['diauehi', 'urartu', 'lchashen'],
  descr: 'Menua (810–785 BC) had conquered part of Diauehi; Argishti I defeats King Utupursi and annexes his possessions. His crossing of the Araxes begins the decline of the Lchashen–Metsamor culture.',
  sources: [S('wp-diauehi', 'Urartu period'), S('wp-lchashen', 'Later history')],
});
ed.event({
  uuid: 'colchis-cimmerians', title: 'Cimmerian and Scythian invasions of Colchis', start: '720 BCE', tracks: ['colchis', 'cimmerians'],
  descr: 'Dated by the infobox of the Colchis page.',
  sources: [S('wp-colchis', 'infobox')],
});
ed.event({
  uuid: 'colchis-greeks', title: 'Greek colonies in western Georgia', start: 'c. 550 BCE', tracks: ['colchis', 'greece-archaic'],
  descr: 'Greek colonies are established in the 6th century BC.',
  sources: [S('wp-colchian', 'Geography and periodization')],
  startDates: [R(600, 500, 'wp-colchian', "Geography ('in the 6th century BC')")],
  links: [{ to: 'greek-colonisation', kind: 'part-of' }],
});

ed.save();
