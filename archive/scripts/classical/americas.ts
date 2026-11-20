// The Classical World, seventh region pass (2026-11-18): the Americas — Teotihuacan, Cuicuilco and Xitle, Monte Albán,
// the Epi-Olmec and the earliest Long Count dates, the Maya cities (El Mirador, Tikal, Calakmul, Copán, Palenque) and
// Siyaj K'ak', the Andean cultures (Chavín, Paracas, Nazca, Moche, Recuay, Lima, Tiwanaku, Wari), and North America
// (Adena, Hopewell, Hohokam, Dorset). Every date was quoted verbatim from the cited Wikipedia page by a fetch agent;
// values seen only in a page summary are not used. No page carried an AI-text or LLM-translation banner. See
// docs/classical-sources.md, seventh pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts.
//   node scripts/classical/americas.ts && npm run data:classical
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-teotihuacan', 'Teotihuacan', 'Teotihuacan'],
  ['wp-pyramid-sun', 'Pyramid of the Sun', 'Pyramid_of_the_Sun'],
  ['wp-monte-alban', 'Monte Albán', 'Monte_Alb%C3%A1n'],
  ['wp-zapotec', 'Zapotec civilization', 'Zapotec_civilization'],
  ['wp-cuicuilco', 'Cuicuilco', 'Cuicuilco'],
  ['wp-epi-olmec', 'Epi-Olmec culture', 'Epi-Olmec_culture'],
  ['wp-olmecs', 'Olmecs', 'Olmecs'],
  ['wp-long-count', 'Mesoamerican Long Count calendar', 'Mesoamerican_Long_Count_calendar'],
  ['wp-cholula', 'Cholula (Mesoamerican site)', 'Cholula_(Mesoamerican_site)'],
  ['wp-el-mirador', 'El Mirador', 'El_Mirador'],
  ['wp-tikal', 'Tikal', 'Tikal'],
  ['wp-calakmul', 'Calakmul', 'Calakmul'],
  ['wp-copan', 'Copán', 'Cop%C3%A1n'],
  ['wp-palenque', 'Palenque', 'Palenque'],
  ['wp-siyaj-kak', 'Siyaj K’ak’', 'Siyaj_K%27ak%27'],
  ['wp-moche', 'Moche culture', 'Moche_culture'],
  ['wp-nazca', 'Nazca culture', 'Nazca_culture'],
  ['wp-nazca-lines', 'Nazca Lines', 'Nazca_Lines'],
  ['wp-tiwanaku', 'Tiwanaku', 'Tiwanaku'],
  ['wp-wari', 'Wari culture', 'Wari_culture'],
  ['wp-paracas', 'Paracas culture', 'Paracas_culture'],
  ['wp-chavin', 'Chavín culture', 'Chav%C3%ADn_culture'],
  ['wp-lima-culture', 'Lima culture', 'Lima_culture'],
  ['wp-recuay', 'Recuay culture', 'Recuay_culture'],
  ['wp-huaca-del-sol', 'Huaca del Sol', 'Huaca_del_Sol'],
  ['wp-adena', 'Adena culture', 'Adena_culture'],
  ['wp-hopewell', 'Hopewell tradition', 'Hopewell_tradition'],
  ['wp-hohokam', 'Hohokam', 'Hohokam'],
  ['wp-dorset', 'Dorset culture', 'Dorset_culture'],
] as const)
  ed.wikipedia(key, title, slug);

// Overlap events from the skeleton move from their region rows onto the new rows.
const moveTo = (uuid: string, track: string) => {
  ed.data.events.find((e: { uuid: string }) => e.uuid === uuid).tracks = [track];
};

// ---------- rows ----------
ed.tracks(
  [
    {
      id: 'dorset', name: 'Dorset culture', color: '#6a8aa0', parent: 'arctic',
      span: { start: '500 BCE', end: '1500 CE', endDates: [C('1500 CE', 'wp-dorset', 'infobox and lead'), C('1000 CE', 'wp-dorset', "lead ('perhaps as early as 1000')")] },
    },
  ],
  { after: 'arctic' },
);
ed.tracks(
  [
    { id: 'adena', name: 'Adena culture', color: '#7a6a4a', parent: 'north-america', span: { start: 'c. 500 BCE', end: 'c. 100 CE' } },
    { id: 'hopewell', name: 'Hopewell tradition', color: '#5a7a4a', parent: 'north-america', span: { start: '100 BCE', end: '500 CE' } },
    { id: 'hohokam', name: 'Hohokam', color: '#b07a4a', parent: 'north-america', span: { start: '300 CE', end: '1500 CE' } },
  ],
  { after: 'north-america' },
);
ed.tracks(
  [
    {
      id: 'teotihuacan', name: 'Teotihuacan', color: '#9a4a3a', parent: 'mesoamerica',
      span: { start: 'c. 100 BCE', end: '750 CE', endDates: [C('750 CE', 'wp-teotihuacan', 'infobox (abandoned)'), C('550 CE', 'wp-teotihuacan', "lead (sacked and burned 'around 550 CE')")] },
    },
    {
      id: 'cuicuilco', name: 'Cuicuilco', color: '#7a5a4a', parent: 'mesoamerica',
      span: {
        start: 'c. 1000 BCE', end: 'c. 280 CE',
        endDates: [
          C('280 CE', 'wp-cuicuilco', "lead (Xitle, 'between 245 and 315 CE')", { margin: 35 }),
          C('400 CE', 'wp-cuicuilco', "End of the culture ('By the year 400 CE')"),
          C('175 CE', 'wp-cuicuilco', "End of the culture ('around AD 150 to 200')", { margin: 25 }),
        ],
      },
    },
    { id: 'epi-olmec', name: 'Epi-Olmec (Tres Zapotes)', color: '#5a6a4a', parent: 'mesoamerica', span: { start: 'c. 300 BCE', end: 'c. 250 CE' } },
    {
      id: 'zapotec', name: 'Monte Albán (Zapotec)', color: '#8a6a3a', parent: 'mesoamerica',
      span: {
        start: 'c. 500 BCE', end: 'c. 950 CE',
        endDates: [C('950 CE', 'wp-monte-alban', "Site history ('c. AD 900-1000')", { margin: 50 }), C('700 CE', 'wp-zapotec', 'infobox (capital to AD 700)')],
      },
    },
    {
      id: 'el-mirador', name: 'El Mirador', color: '#4a7a5a', parent: 'mesoamerica',
      span: {
        start: 'c. 550 BCE', end: 'c. 150 CE',
        startDates: [R(600, 501, 'wp-el-mirador', "infobox ('Built 6th century BC')")],
        endDates: [C('150 CE', 'wp-el-mirador', 'History > Preclassic collapse'), C('250 CE', 'wp-el-mirador', 'lead (Preclassic, 1000 BC – 250 AD)')],
      },
    },
    {
      id: 'tikal', name: 'Tikal', color: '#3a6a4a', parent: 'mesoamerica',
      span: { start: 'c. 350 BCE', end: 'c. 900 CE', startDates: [R(400, 301, 'wp-tikal', "infobox and lead ('4th century BC')")] },
    },
    {
      id: 'calakmul', name: 'Calakmul (Kaan)', color: '#6a3a4a', parent: 'mesoamerica',
      span: {
        start: 'c. 325 BCE', end: 'c. 950 CE',
        startDates: [R(400, 250, 'wp-calakmul', "infobox ('Built 400–250 BC')")],
        endDates: [C('950 CE', 'wp-calakmul', "infobox ('Abandoned 10th century')", { margin: 50 })],
      },
    },
    {
      id: 'copan', name: 'Copán', color: '#4a5a7a', parent: 'mesoamerica',
      span: {
        start: '426 CE', end: 'c. 917 CE',
        endDates: [C('917 CE', 'wp-copan', "lead ('in the early 10th century')", { margin: 17 }), C('850 CE', 'wp-copan', "infobox ('c. 9th century')", { margin: 50 })],
      },
    },
    { id: 'palenque', name: 'Palenque', color: '#7a4a6a', parent: 'mesoamerica', span: { start: 'c. 226 BCE', end: 'c. 799 CE' } },
  ],
  { after: 'mesoamerica' },
);
ed.tracks(
  [
    { id: 'moche', name: 'Moche', color: '#9a5a3a', parent: 'south-america', span: { start: '100 CE', end: '800 CE' } },
    { id: 'recuay', name: 'Recuay', color: '#7a6a5a', parent: 'south-america', span: { start: '200 BCE', end: '600 CE' } },
    { id: 'chavin', name: 'Chavín', color: '#5a5a3a', parent: 'south-america', span: { start: 'c. 900 BCE', end: 'c. 250 BCE' } },
    { id: 'lima-culture', name: 'Lima culture', color: '#8a7a5a', parent: 'south-america', span: { start: 'c. 100 CE', end: 'c. 650 CE' } },
    { id: 'paracas', name: 'Paracas', color: '#a0603a', parent: 'south-america', span: { start: 'c. 800 BCE', end: 'c. 100 BCE' } },
    {
      id: 'nazca', name: 'Nazca', color: '#b0703a', parent: 'south-america',
      span: {
        start: 'c. 100 BCE', end: 'c. 800 CE',
        startDates: [C(100, 'wp-nazca', 'infobox and lead'), C(200, 'wp-nazca-lines', "lead ('Nazca phase, from 200 BC')")],
        endDates: [C('800 CE', 'wp-nazca', 'infobox and lead'), C('750 CE', 'wp-nazca', "History > Decline ('by 750 AD')")],
      },
    },
    {
      id: 'wari', name: 'Wari', color: '#6a4a3a', parent: 'south-america',
      span: {
        start: 'c. 450 CE', end: 'c. 1000 CE',
        startDates: [C('450 CE', 'wp-wari', "infobox ('5th century')", { margin: 50 }), C('500 CE', 'wp-wari', "lead ('from about 500')")],
        endDates: [C('1000 CE', 'wp-wari', 'lead'), C('950 CE', 'wp-wari', "infobox ('10th century')", { margin: 50 })],
      },
    },
    {
      id: 'tiwanaku', name: 'Tiwanaku', color: '#4a6a8a', parent: 'south-america',
      span: {
        start: 'c. 110 CE', end: 'c. 1050 CE',
        startDates: [C('110 CE', 'wp-tiwanaku', "Site history ('around AD 110 (50–170, 68% probability)')", { margin: 60 })],
        endDates: [C('1050 CE', 'wp-tiwanaku', 'infobox (abandoned)'), C('1000 CE', 'wp-tiwanaku', "Site history ('collapsed around AD 1000')")],
      },
    },
  ],
  { after: 'south-america' },
);
moveTo('dorset-begins', 'dorset');
moveTo('adena-mounds', 'adena');
moveTo('monte-alban', 'zapotec');

// ---------- Mesoamerica: the highlands and the Gulf ----------
ed.event({
  uuid: 'olmec-decline', title: 'The Olmec heartland is abandoned', start: '400 BCE', end: '350 BCE', tracks: ['mesoamerica', 'epi-olmec'],
  descr: 'By about 400 BC the major Olmec centres are abandoned; between 400 and 350 BC the population of the eastern heartland drops precipitously. Tres Zapotes continues to be occupied well past 400 BC.',
  sources: [S('wp-olmecs', 'lead and Decline'), S('wp-epi-olmec', 'Cultural context')],
});
ed.event({
  uuid: 'cholula-pyramid', title: 'The Great Pyramid of Cholula begun', start: 'c. 300 BCE', tracks: ['mesoamerica'],
  descr: 'Its initial stages probably date to the Terminal Formative; its last construction phase is between CE 750 and 950. By volume, 4.45 million cubic meters.',
  sources: [S('wp-cholula', 'lead, History and Great Pyramid')],
  startDates: [C(300, 'wp-cholula', "Great Pyramid ('originally built in 300 BCE')")],
});
ed.event({
  uuid: 'early-long-count', title: 'The earliest Long Count dates', start: '36 BCE', end: '32 BCE', tracks: ['epi-olmec'],
  descr: 'Chiapa de Corzo Stela 2 reads 6 December 36 BCE (or 9 October 182 CE), and Tres Zapotes Stela C 1 September 32 BCE, the second oldest Long Count date yet discovered.',
  sources: [S('wp-long-count', 'Earliest Long Counts table and Correlations caption'), S('wp-epi-olmec', 'Script and calendrics')],
  links: [{ to: 'maya-script', kind: 'related' }],
});
ed.event({
  uuid: 'la-mojarra', title: 'La Mojarra Stela 1', start: '156 CE', tracks: ['epi-olmec'],
  descr: 'An Isthmian-script text with Long Count dates of 143 and 156 CE, combining images of rulers with script and calendar dates.',
  sources: [S('wp-long-count', 'Earliest Long Counts table'), S('wp-olmecs', 'Artifacts'), S('wp-epi-olmec', 'Cultural context')],
});
ed.event({
  uuid: 'monte-alban-capital', title: 'Monte Albán, capital of the Zapotec', start: 'c. 100 BCE', end: 'c. 200 CE', tracks: ['zapotec'],
  descr: 'In the Terminal Formative (Monte Albán II) the city of an estimated 17,200 becomes the capital of a large-scale expansionist polity; by 200 Zapotec influence reaches from Quiotepec in the north to Ocelotepec and Chiltepec in the south.',
  sources: [S('wp-monte-alban', 'lead and Site history'), S('wp-zapotec', 'History')],
  links: [{ to: 'monte-alban', kind: 'related' }],
});
ed.event({
  uuid: 'pyramid-of-the-sun', title: 'The Pyramid of the Sun', start: 'c. 150 CE', tracks: ['teotihuacan'],
  descr: 'The largest pyramid at Teotihuacan, whose earliest buildings date to about 200 BCE and whose major monuments are under construction until about 250 CE.',
  sources: [S('wp-pyramid-sun', 'infobox, lead and History'), S('wp-teotihuacan', 'lead and Origins and foundation')],
  startDates: [C('100 CE', 'wp-teotihuacan', "Origins and foundation ('completed by 100 CE')"), C('200 CE', 'wp-pyramid-sun', "lead ('constructed about 200 AD')")],
});
ed.event({
  uuid: 'xitle', title: 'Xitle erupts: Cuicuilco is buried', start: 'c. 280 CE', tracks: ['cuicuilco'],
  descr: 'The city, with some 20,000 people at its peak, is destroyed by the eruption; the lava field covers about 80 km². The eruption may have prompted a mass emigration out of the central valley.',
  sources: [S('wp-cuicuilco', 'lead, History and End of the culture'), S('wp-teotihuacan', 'Origins and foundation')],
  startDates: [
    C('280 CE', 'wp-cuicuilco', "lead ('between 245 and 315 CE')", { margin: 35 }),
    C('400 CE', 'wp-cuicuilco', "End of the culture ('By the year 400 CE')"),
    C('175 CE', 'wp-cuicuilco', "End of the culture ('around AD 150 to 200')", { margin: 25 }),
  ],
});
ed.event({
  uuid: 'feathered-serpent', title: 'The Temple of the Feathered Serpent is desecrated', start: 'c. 300 CE', tracks: ['teotihuacan'],
  descr: 'Power shifts from the temple to the Avenue of the Dead sometime between 250 and 350.',
  sources: [S('wp-teotihuacan', 'History > Period II')],
});
ed.event({
  uuid: 'teotihuacan-peak', title: 'Teotihuacan at its height', start: '350 CE', end: '650 CE', tracks: ['teotihuacan'],
  descr: 'In Period III the city of around 100,000 people, about half the population of the Valley of Mexico, has 2,000 buildings over 18 square kilometers; at its zenith, perhaps in the first half of the first millennium, it is the largest city in the Americas. It includes a neighbourhood of ethnic Zapotecs.',
  sources: [S('wp-teotihuacan', 'lead and History > Period III'), S('wp-monte-alban', 'Site history')],
});
ed.event({
  uuid: 'teotihuacan-burned', title: 'Teotihuacan is sacked and burned', start: 'c. 550 CE', tracks: ['teotihuacan'],
  descr: 'Its major monuments are systematically burned; the collapse may be related to the extreme weather of 535–536. The city never regains its population, though it may last until the 7th or 8th century.',
  sources: [S('wp-teotihuacan', 'lead, Etymology and Period IV')],
});

// ---------- the Maya ----------
ed.event({
  uuid: 'el-mirador-height', title: 'El Mirador at its height', start: '300 BCE', end: '1 CE', tracks: ['el-mirador'],
  descr: 'The city and its sister centres in the Mirador Basin thrive between 300 BC and the Common Era; major construction at Tikal begins around 400–300 BC.',
  sources: [S('wp-el-mirador', 'History'), S('wp-tikal', 'Preclassic')],
});
ed.event({
  uuid: 'preclassic-collapse', title: 'The Preclassic Maya collapse', start: 'c. 150 CE', tracks: ['el-mirador', 'mesoamerica'],
  descr: 'El Mirador is abandoned, as are nearly all other major sites in the area, by about 150 AD, after building a large defensive wall. Tikal may have benefited from the collapse.',
  sources: [S('wp-el-mirador', 'History > Preclassic collapse'), S('wp-tikal', 'Early Classic')],
});
ed.event({
  uuid: 'tikal-stela-29', title: 'Tikal Stela 29', start: '292 CE', tracks: ['tikal'],
  descr: 'The first unequivocally Maya artifact; Stela 46 at El Palmar is said to hold the earliest Long Count of a lowland Maya site (AD 180).',
  sources: [S('wp-long-count', 'Earliest Long Counts')],
});
ed.event({
  uuid: 'siyaj-kak', title: 'Siyaj K’ak’ conquers Tikal', start: '378 CE', end: '379 CE', tracks: ['tikal', 'teotihuacan'],
  descr: 'In January 378 the warlord conquers Tikal; in 378 and 379 he oversees the replacement of the kings of Tikal, Uaxactun and Copán. There is evidence that one of the ruling dynasties of Tikal was founded by conquerors from Teotihuacan.',
  sources: [S('wp-siyaj-kak', 'lead and Overview'), S('wp-teotihuacan', 'Year 378'), S('wp-tikal', 'lead')],
});
ed.event({
  uuid: 'copan-dynasty', title: 'K’inich Yax K’uk’ Mo’ founds the Copán dynasty', start: '426 CE', tracks: ['copan'],
  descr: 'A new dynasty whose founder was probably from Tikal: K’uk’ Mo’ Ajaw is installed on the throne in AD 426, using a title borne a generation earlier by Siyaj K’ak’. He dies between 435 and 437.',
  sources: [S('wp-copan', 'History, Rulers and Founding')],
  links: [{ to: 'siyaj-kak', kind: 'related' }],
});
ed.event({
  uuid: 'palenque-dynasty', title: 'K’uk’ Bahlam I founds the Palenque dynasty', start: '431 CE', tracks: ['palenque'],
  descr: 'He governs for four years from 431.',
  sources: [S('wp-palenque', 'Rulers and Early Classic')],
});
ed.event({
  uuid: 'tikal-defeated-562', title: 'Calakmul defeats Tikal', start: '562 CE', tracks: ['tikal', 'calakmul'],
  descr: 'A Caracol text says Sky Witness of Calakmul defeated Tikal and sacrificed its king Wak Chan K’awiil. The defeat begins a 130-year hiatus at Tikal and marks the division between the Early and Late Classic.',
  sources: [S('wp-calakmul', 'Tikal defeat'), S('wp-tikal', 'Early Classic')],
});
ed.event({
  uuid: 'calakmul-palenque', title: 'Calakmul sacks Palenque', start: '599 CE', end: '611 CE', tracks: ['calakmul', 'palenque'],
  descr: 'Calakmul and its client states attack Palenque in 599 and again in 611; Palenque rebuilds in response.',
  sources: [S('wp-palenque', 'History and Early Classic')],
});
ed.event({
  uuid: 'pakal', title: 'K’inich Janaab’ Pakal rules Palenque', start: '615 CE', end: '683 CE', tracks: ['palenque'],
  descr: 'He comes to the throne at 12, after his mother Sak K’uk’ steps down; he marries Lady Tzakbu Ajaw in 624 and enlarges the Palace in 654, 661 and 668. His Temple of the Inscriptions is begun perhaps as early as 675.',
  sources: [S('wp-palenque', 'History, Late Classic and Temple of the Inscriptions')],
});

// ---------- the Andes ----------
ed.event({
  uuid: 'chavin-new-temple', title: 'Chavín’s New Temple', start: 'c. 500 BCE', end: 'c. 200 BCE', tracks: ['chavin'],
  descr: 'Built after the Old Temple (c. 900–500 BCE); the culture ends around 250 BCE.',
  sources: [S('wp-chavin', 'infobox, lead and Architecture')],
});
ed.event({
  uuid: 'paracas-necropolis', title: 'The Paracas mummy bundles', start: 'c. 250 BCE', tracks: ['paracas'],
  descr: 'About 420 bodies dating to around 300–200 BCE. Burials at the necropolis of Wari Kayan continue until approximately 250 CE.',
  sources: [S('wp-paracas', 'Mummy bundles and lead')],
  startDates: [R(300, 201, 'wp-paracas', "Mummy bundles ('around 300–200 BCE')")],
});
ed.event({
  uuid: 'nazca-lines', title: 'The Nazca Lines', start: 'c. 200 BCE', end: '500 CE', tracks: ['nazca', 'paracas'],
  descr: 'The geoglyphs are created between 500 BC and 500 AD, in a Paracas phase (400–200 BC) and a Nazca phase (200 BC – 500 AD). 358 were known by 2022.',
  sources: [S('wp-nazca-lines', 'lead')],
  startDates: [C(200, 'wp-nazca-lines', 'lead (Nazca phase)'), C(400, 'wp-nazca-lines', 'lead (Paracas phase)'), C(500, 'wp-nazca-lines', "lead ('between 500 BC and 500 AD')")],
});
ed.event({
  uuid: 'huaca-del-sol', title: 'The Huaca del Sol', start: 'c. 450 CE', tracks: ['moche'],
  descr: 'By 450 AD eight stages of construction have been completed on the Moche adobe pyramid, built of over 130 million bricks.',
  sources: [S('wp-huaca-del-sol', 'lead')],
});
ed.event({
  uuid: 'nazca-decline', title: 'The Nazca decline', start: '500 CE', end: '750 CE', tracks: ['nazca'],
  descr: 'From 500 AD the civilization declines, with an El Niño triggering widespread, destructive flooding; by 750 it has fallen completely.',
  sources: [S('wp-nazca', 'History > Decline')],
});
ed.event({
  uuid: 'tiwanaku-rise', title: 'Tiwanaku grows to significance', start: '375 CE', end: '700 CE', tracks: ['tiwanaku'],
  descr: 'The city increases its power in the Titicaca basin from 200–500 AD and peaks in 500–600 AD.',
  sources: [S('wp-tiwanaku', 'Site history and Relationships')],
});
ed.event({
  uuid: 'pampa-grande', title: 'Late Moche: Pampa Grande', start: '600 CE', end: '700 CE', tracks: ['moche'],
  descr: 'Late Moche (500–800 AD) is a time of urban nucleation and then collapse; Pampa Grande is prominent in the Moche V period.',
  sources: [S('wp-moche', 'Background and Southern and Northern Moche')],
});
ed.event({
  uuid: 'wari-expansion', title: 'Wari expansion', start: 'c. 600 CE', tracks: ['wari', 'nazca', 'lima-culture'],
  descr: 'The Wari take control of villages in the Carahuarazo Valley around 600 A.D.; the Nazca and Lima pages date the arrival of the Wari in their regions to about 650. From around 600 cycles of drought and El Niño hit the Lima culture.',
  sources: [S('wp-wari', 'History'), S('wp-nazca', 'Arts > Pottery'), S('wp-lima-culture', 'Pachacamac and Decline')],
  startDates: [C('600 CE', 'wp-wari', 'History'), C('650 CE', 'wp-nazca', 'Arts > Pottery'), C('650 CE', 'wp-lima-culture', 'Pachacamac')],
});

// ---------- North America ----------
ed.event({
  uuid: 'hohokam-pioneer', title: 'Hohokam farming villages', start: 'c. 300 CE', end: '600 CE', tracks: ['hohokam'],
  descr: 'Ceramics appear shortly before 300 CE, and crops and agricultural skill increase between 300 and 500. By 600 a distinct Hohokam architecture with Mesoamerican similarities emerges, and agave becomes a major food source.',
  sources: [S('wp-hohokam', 'lead, Overview and Pioneer/Formative period')],
});

ed.save();
