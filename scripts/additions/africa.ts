// Africa beyond Egypt, c. 3500–330 BCE: the most important events only (first pass, 2026-11-17).
// Nubia (A-Group, C-Group, Kerma, Kush) and Africa south of the Sahara (Punt, Dʿmt, Tichitt, Nok, the
// Bantu expansion) as new regions, and the Garamantes in North Africa. Every date was quoted verbatim
// from the cited Wikipedia page by a fetch agent (see docs/ancient-sources.md, sixth pass).
// Re-runnable: it replaces what it added before. Run after europe.ts, mediterranean.ts and steppe.ts.
//   node scripts/additions/africa.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');

for (const [key, title, slug] of [
  ['wp-a-group', 'A-Group culture', 'A-Group_culture'],
  ['wp-kerma', 'Kerma culture', 'Kerma_culture'],
  ['wp-thutmose-i', 'Thutmose I', 'Thutmose_I'],
  ['wp-buhen', 'Buhen', 'Buhen'],
  ['wp-kush', 'Kingdom of Kush', 'Kingdom_of_Kush'],
  ['wp-napata', 'Napata', 'Napata'],
  ['wp-meroe', 'Meroë', 'Mero%C3%AB'],
  ['wp-piye', 'Piye', 'Piye'],
  ['wp-taharqa', 'Taharqa', 'Taharqa'],
  ['wp-psamtik-ii', 'Psamtik II', 'Psamtik_II'],
  ['wp-punt', 'Land of Punt', 'Land_of_Punt'],
  ['wp-dmt', 'Dʿmt', 'D%CA%BFmt'],
  ['wp-nok', 'Nok culture', 'Nok_culture'],
  ['wp-bantu', 'Bantu expansion', 'Bantu_expansion'],
  ['wp-garamantes', 'Garamantes', 'Garamantes'],
  ['wp-tichitt', 'Dhar Tichitt', 'Dhar_Tichitt'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
// Nubia: a group inside Egypt (renamed "Egypt and Nubia", the Nile valley), after Egypt's own periods.
// Sub-Saharan Africa: a new region before North Africa. Then Egypt moves below Anatolia (author's choice,
// 2026-11-17): node scripts/reorder-regions.ts data-src/ancient-near-east.json <order in docs/ancient-sources.md>
ed.tracks(
  [
    { id: 'nubia', name: 'Nubia', color: '#a0603a', parent: 'egypt' },
    {
      id: 'a-group', name: 'A-Group culture', color: '#b07a4a', parent: 'nubia',
      span: {
        start: 'c. 3500 BCE', end: 'c. 2900 BCE',
        startDates: [R(4000, 3001, 'wp-a-group', "lead ('from the 4th millennium BC')")],
        endDates: [C(2900, 'wp-a-group', "lead ('fell 200 years later c. 2900 BC')"), C(3100, 'wp-a-group', "History > B-Group ('came to an end around 3100 BC')")],
      },
    },
    // No span: the *C-Group culture* page carries a warning that it may contain text from a large language
    // model, so it is not used (the author's decision, 2026-11-17). The row holds what other pages say.
    { id: 'c-group', name: 'C-Group culture (Lower Nubia)', color: '#9a7a5a', parent: 'nubia' },
    { id: 'kerma', name: 'Kerma', color: '#8a4a2a', parent: 'nubia', span: { start: 'c. 2500 BCE', end: 'c. 1500 BCE' } },
    {
      id: 'kush', name: 'Kingdom of Kush (Napata, Meroë)', color: '#b0502a', parent: 'nubia',
      span: {
        start: 'c. 780 BCE', end: 'c. 350 CE',
        startDates: [
          C(780, 'wp-kush', 'infobox (Established)'),
          C(1070, 'wp-kush', "Formation ('Kush became an independent kingdom' around 1070 BC)"),
          C(1000, 'wp-kush', "Formation ('began to emerge around 1000 BC')"),
        ],
      },
    },
  ],
  { after: 'eg-late' },
);
ed.tracks(
  [
    { id: 'sub-saharan', name: 'Sub-Saharan Africa', color: '#7a8a3a' },
    { id: 'punt', name: 'Land of Punt (Horn of Africa)', color: '#9a8a3a', parent: 'sub-saharan', span: { start: 'c. 2500 BCE', end: 'c. 980 BCE' } },
    {
      id: 'dmt', name: 'Dʿmt (Eritrea and Tigray)', color: '#8a6a4a', parent: 'sub-saharan',
      span: {
        start: 'c. 750 BCE', end: 'c. 400 BCE',
        startDates: [
          C(800, 'wp-dmt', "infobox ('8th c. BC'): start of century"),
          C(701, 'wp-dmt', 'infobox: end of century'),
          C(980, 'wp-dmt', "short description ('c. 980–400 BCE')"),
        ],
        endDates: [C(400, 'wp-dmt', "History ('approximately 800/700–400 BC')"), C(301, 'wp-dmt', "infobox ('4th c. BC'): end of century")],
      },
    },
    {
      id: 'tichitt', name: 'Tichitt culture (Mauritania)', color: '#a08a5a', parent: 'sub-saharan',
      span: {
        start: 'c. 2000 BCE', end: 'c. 300 BCE',
        startDates: [C(2000, 'wp-tichitt', 'lead'), C(2600, 'wp-tichitt', "Chronology ('Pre-Tichitt … 2600 to 1900 BCE')")],
        endDates: [C(300, 'wp-tichitt', 'lead'), C(400, 'wp-tichitt', "Chronology ('Late Tichitt … 1000 to 400 BCE')")],
      },
    },
    { id: 'nok', name: 'Nok culture (Nigeria)', color: '#b0703a', parent: 'sub-saharan', span: { start: 'c. 1500 BCE', end: 'c. 1 BCE' } },
    { id: 'bantu', name: 'Bantu expansion', color: '#6a7a3a', parent: 'sub-saharan', span: { start: 'c. 4000 BCE', end: 'c. 500 CE' } },
  ],
  { before: 'north-africa' },
);
ed.track(
  {
    id: 'garamantes', name: 'Garamantes (Fezzan)', color: '#a07a5a', parent: 'north-africa',
    span: {
      start: 'c. 1000 BCE', end: 'c. 690 CE',
      startDates: [C(1000, 'wp-garamantes', "lead ('at least as early as 1000 BC')"), C(600, 'wp-garamantes', "Origin and prehistory ('From the 6th century BCE … a powerful polity')")],
      endDates: [C('667 CE', 'wp-garamantes', "lead ('late 7th century AD')"), C('700 CE', 'wp-garamantes', 'lead: end of century')],
    },
  },
  { after: 'cyrene' },
);

// ---------- events: Nubia ----------
ed.event({
  uuid: 'a-group-height', title: 'A-Group culture at its height', start: 'c. 3100 BCE', tracks: ['a-group'],
  descr: 'The first powerful society in Nubia, with commercial ties to Egypt. Agriculture first appears in the Terminal A-Group period (c. 3200–3000 BCE).',
  sources: [S('wp-a-group', 'lead and Overview')],
});
ed.event({
  uuid: 'gebel-sheikh-suleiman', title: 'An early pharaoh defeats the A-Group', start: 'c. 3000 BCE', tracks: ['a-group', 'eg-early'],
  descr: 'The relief of Gebel Sheikh Suleiman likely shows an early pharaoh, possibly Djer, victorious over A-Group Nubians. One account has the First Dynasty destroying the A-Group around 3100 BCE.',
  sources: [S('wp-a-group', 'image caption and History > B-Group')],
});
ed.event({
  uuid: 'c-group-appears', title: 'Early C-Group culture appears in Lower Nubia', start: 'c. 2300 BCE', tracks: ['c-group'],
  descr: '',
  sources: [S('wp-kerma', "History > Early Kerma ('By 2300 BC, the Early C-Group culture was also appearing in Lower Nubia')")],
});
ed.event({
  uuid: 'buhen-fortress', title: 'Senusret III fortifies Buhen', start: 'c. 1860 BCE', tracks: ['kerma', 'eg-middle'],
  descr: 'Senusret III campaigns four times into Kush and builds a line of forts within signalling distance of one another; Buhen, below the Second Cataract, is the northernmost.',
  sources: [S('wp-buhen', 'Fortress')],
});
ed.event({
  uuid: 'classic-kerma', title: 'Classic Kerma: the kingdom at its peak', start: 'c. 1750 BCE', end: 'c. 1500 BCE', tracks: ['kerma'],
  descr: 'Contemporary with the Second Intermediate Period. At its zenith Kerma partners with the Hyksos against Egypt.',
  sources: [S('wp-kerma', 'lead, Site and periodisation and Classic Kerma')],
  startDates: [C(1750, 'wp-kerma', 'Site and periodisation'), C(1700, 'wp-kerma', "lead ('latest phase, lasting from about 1700 to 1500 BC')")],
});
ed.event({
  uuid: 'kushites-take-buhen', title: 'Kushites capture Buhen', start: 'c. 1675 BCE', tracks: ['kerma', 'eg-sip'],
  descr: 'The fortress falls to the Kushites during the 13th Dynasty; Ahmose I retakes it at the start of the 18th.',
  sources: [S('wp-buhen', "Fortress and The Buhen Horse ('initial sacking … circa 1675 BC')")],
});
ed.event({
  uuid: 'kerma-invades-egypt', title: 'Kerma invades deep into Egypt', start: 'c. 1575 BCE', end: 'c. 1550 BCE', tracks: ['kerma', 'eg-sip'],
  descr: 'Recorded in the tomb of Sobeknakht II.',
  sources: [S('wp-kerma', 'Classic Kerma')],
});
ed.event({
  uuid: 'kerma-destroyed', title: 'Thutmose I conquers Kush and destroys Kerma', start: 'c. 1504 BCE', tracks: ['kerma', 'eg-new'],
  descr: 'Egypt annexes Nubia and Thutmose I builds a fortress at Tombos near the Third Cataract. Nubian rebellions continue for about 220 years.',
  sources: [S('wp-kerma', 'Late Kerma and Egyptian conquest'), S('wp-kush', 'Egyptian Nubia'), S('wp-thutmose-i', 'Military achievements')],
  startDates: [C(1504, 'wp-kerma', "Late Kerma ('annexation of Nubia … c. 1504 BC')"), R(1506, 1493, 'wp-thutmose-i', 'infobox (reign, low chronology)')],
});
ed.event({
  uuid: 'kush-independent', title: 'Kush becomes independent, centred at Napata', start: 'c. 1070 BCE', tracks: ['kush', 'eg-tip'],
  descr: 'As the New Kingdom disintegrates, Kush becomes an independent kingdom, possibly a successor of Kerma.',
  sources: [S('wp-kush', 'Formation')],
});
ed.event({
  uuid: 'alara', title: 'Alara, first Kushite king known by name', start: 'c. 780 BCE', tracks: ['kush'],
  descr: '',
  sources: [S('wp-kush', "Formation ('between 800 and 760 BC')")],
  startDates: [R(800, 760, 'wp-kush', 'Formation')],
});
ed.event({
  uuid: 'piye-conquers-egypt', title: 'Piye conquers Egypt', start: 'c. 727 BCE', tracks: ['kush', 'eg-tip'],
  descr: 'In his twentieth year the Kushite king Piye invades against Tefnakht of Sais, wins at Herakleopolis and takes Hermopolis after a five-month siege. He then returns to his homeland in Nubia, never to return to Egypt.',
  sources: [S('wp-kush', 'Rule over Egypt'), S('wp-piye', 'Conquest of Egypt')],
  links: [{ to: 'kushite-dynasty', kind: 'part-of' }],
});
ed.addRow('kushite-dynasty', 'kush');
ed.event({
  uuid: 'taharqa', title: 'Reign of Taharqa', start: '690 BCE', end: '664 BCE', tracks: ['kush', 'eg-tip'],
  descr: "A king of the 25th Dynasty, one of the Black Pharaohs. He defeats the Assyrians in 674 BCE but loses Memphis to Esarhaddon in 671, retakes it in 669, and dies in 664. The Kush page says he died at Napata, the Taharqa page at Thebes.",
  sources: [S('wp-taharqa', 'infobox, lead and War between Taharqa and Assyria'), S('wp-kush', 'Assyrian conquest of Egypt')],
  links: [{ to: 'kushite-dynasty', kind: 'part-of' }],
});
ed.addRow('assyria-egypt', 'kush');
ed.addRow('sack-of-thebes', 'kush');
ed.event({
  uuid: 'napata-sacked', title: 'Psamtik II sacks Napata', start: 'c. 592 BCE', tracks: ['kush', 'eg-late'],
  descr: 'The Egyptian army fights its way to Pnubs (Kerma) and Napata, which is sacked under the Kushite king Aspelta.',
  sources: [S('wp-psamtik-ii', 'Campaigns and battles'), S('wp-napata', 'lead'), S('wp-meroe', 'History')],
  startDates: [C(592, 'wp-psamtik-ii', "Campaigns and battles ('a foray into Nubia in 592 BC')"), C(593, 'wp-napata', "lead ('In 593 BC, it was sacked')")],
});
ed.event({
  uuid: 'meroe-capital', title: 'Kush moves its capital to Meroë', start: 'c. 591 BCE', tracks: ['kush'],
  descr: 'Aspelta moves the capital far south of Napata, just after the Egyptian sack. The royal burial ground follows only around 280 BCE, and the main temple of Amun stays at Napata.',
  sources: [S('wp-kush', "infobox and Meroitic period ('possibly c. 591 BC')"), S('wp-meroe', 'History and First Meroitic Period')],
  links: [{ to: 'napata-sacked', kind: 'causes' }],
});

// ---------- events: Africa south of the Sahara ----------
ed.event({
  uuid: 'sahure-punt', title: 'First recorded expedition to Punt', start: 'c. 2450 BCE', tracks: ['punt', 'eg-old'],
  descr: "Organised by Sahure of the Fifth Dynasty. Recent evidence places Punt in northwestern Eritrea.",
  sources: [S('wp-punt', 'lead and Egyptian expeditions to Punt')],
  startDates: [R(2500, 2401, 'wp-punt', "Egyptian expeditions ('Fifth Dynasty (25th century BC)')")],
});
ed.event({
  uuid: 'hannu-punt', title: 'Hannu sails to Punt', start: 'c. 2000 BCE', tracks: ['punt', 'eg-middle'],
  descr: 'An officer of Mentuhotep III (11th Dynasty) organises one or more voyages to Punt.',
  sources: [S('wp-punt', 'Egyptian expeditions to Punt')],
});
ed.addRow('punt', 'punt');
ed.event({
  uuid: 'dmt-first-king', title: 'First-listed known ruler of Dʿmt', start: 'c. 700 BCE', end: 'c. 650 BCE', tracks: ['dmt'],
  descr: "A contemporary of the Sabaean ruler Karib'il Watar. Dʿmt was an Ethio-Sabaean kingdom, its capital may have been Yeha, where the temple of Ilmuqah still stands.",
  sources: [S('wp-dmt', 'lead, History and Known rulers')],
});
ed.event({
  uuid: 'tichitt-millet', title: 'Millet domesticated at Tichitt', start: 'c. 1800 BCE', tracks: ['tichitt'],
  descr: 'The crop was fully domesticated by 1100 BCE at the latest. Plateau settlements are built from about 1400 BCE.',
  sources: [S('wp-tichitt', 'Agriculture and lead')],
  startDates: [R(1900, 1700, 'wp-tichitt', "Agriculture ('around 1900 to 1700 BCE')"), C(1100, 'wp-tichitt', "Agriculture ('by at least 1100 BCE')")],
});
ed.event({
  uuid: 'classic-tichitt', title: 'Classic Tichitt', start: '1600 BCE', end: '1000 BCE', tracks: ['tichitt'],
  descr: 'Pastoralists and farmers on the cliffs of Dhar Tichitt; they are thought to be ancestors of the Soninke. The chronology is contentious.',
  sources: [S('wp-tichitt', 'Chronology and lead')],
});
ed.event({
  uuid: 'nok-terracottas', title: 'Nok terracotta sculptures', start: 'c. 900 BCE', end: 'c. 300 BCE', tracks: ['nok'],
  descr: 'The earliest Nok terracottas may date from about 900 BCE. The Middle Nok period (c. 900–300 BCE) sees a dramatic increase in sites, terracotta fragments and iron objects.',
  sources: [S('wp-nok', 'lead and Ceramics')],
});
ed.event({
  uuid: 'nok-iron', title: 'Iron smelting in the Nok culture', start: 'c. 650 BCE', tracks: ['nok'],
  descr: 'Iron metallurgy may have developed independently here.',
  sources: [S('wp-nok', 'lead and Iron metallurgy')],
  startDates: [R(750, 550, 'wp-nok', "lead ('between 750 BCE and 550 BCE')"), R(900, 701, 'wp-nok', "Iron metallurgy ('in the 9th century BCE or 8th century BCE')")],
});
ed.event({
  uuid: 'bantu-split', title: 'Bantu languages split into East and West', start: 'c. 2500 BCE', end: 'c. 1200 BCE', tracks: ['bantu'],
  descr: 'The expansion most likely began in the highlands between Cameroon and Nigeria.',
  sources: [S('wp-bantu', 'Theories on expansion')],
});
ed.event({
  uuid: 'bantu-500', title: 'Bantu speakers reach Lake Victoria and Angola', start: 'c. 500 BCE', tracks: ['bantu'],
  descr: 'The Western Stream reaches the southern edge of the rainforest and central Angola; the Eastern Stream, with Urewe pottery and one of the oldest iron-smelting centres in Africa, reaches west of Lake Victoria.',
  sources: [S('wp-bantu', 'lead, Western Stream and Eastern Stream')],
});

// ---------- events: the Garamantes ----------
ed.event({
  uuid: 'herodotus-garamantes', title: 'Herodotus describes the Garamantes', start: 'c. 450 BCE', tracks: ['garamantes'],
  descr: 'The earliest written record of them: "a very great nation" who herded cattle and farmed dates.',
  sources: [S('wp-garamantes', 'History')],
  startDates: [C(500, 'wp-garamantes', "History ('5th century BC'): start of century"), C(401, 'wp-garamantes', 'History: end of century')],
});

ed.data.tracks.find((t: { id: string }) => t.id === 'egypt').name = 'Egypt and Nubia';

const meta = ed.data.meta;
for (const id of ['nubia', 'sub-saharan']) if (!meta.collapsed.includes(id)) meta.collapsed.push(id);
meta.subtitle = 'Europe, the Mediterranean, Africa, the Near East, Iran, the Steppe, the Indus, China and the Americas, c. 3500–330 BCE';
meta.description = meta.description.replace('North Africa,', 'North Africa, Nubia, Africa south of the Sahara,');

ed.save();
