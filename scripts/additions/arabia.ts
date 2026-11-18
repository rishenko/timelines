// Arabia beyond Dilmun, c. 3200–330 BCE: the most important events only (first pass, 2026-11-18). A new
// region in the Ancient Near East group (groups.ts places it): the Oman Peninsula (Hafit, Umm al-Nar, Wadi
// Suq: ancient Magan), Saba, Qataban, and North Arabia (Tayma, Dadan/Lihyan). Every date was quoted
// verbatim from the cited Wikipedia page by a fetch agent. Not used: *Ma'in* (Minaeans), whose banner
// cites the LLM translation guideline. *Umm an-Nar culture* and *Dedan (Arabia)* do not exist; their dates
// come from *Magan* and *Lihyan*. See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after caucasus.ts and before groups.ts.
//   node scripts/additions/arabia.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-hafit', 'Hafit period', 'Hafit_period'],
  ['wp-wadi-suq', 'Wadi Suq culture', 'Wadi_Suq_culture'],
  ['wp-magan', 'Magan (civilization)', 'Magan_(civilization)'],
  ['wp-sheba', 'Sheba', 'Sheba'],
  ['wp-marib-dam', 'Marib Dam', 'Marib_Dam'],
  ['wp-qataban', 'Qataban', 'Qataban'],
  ['wp-tayma', 'Tayma', 'Tayma'],
  ['wp-lihyan', 'Lihyan', 'Lihyan'],
] as const)
  ed.wikipedia(key, title, slug);

ed.tracks(
  [
    { id: 'arabia', name: 'Arabia', color: '#b0784a' },
    { id: 'oman', name: 'Oman Peninsula (Magan)', color: '#a06a3a', parent: 'arabia' },
    {
      id: 'saba', name: 'Saba (Sheba)', color: '#c08a4a', parent: 'arabia',
      span: {
        start: 'c. 1000 BCE', end: '275 CE',
        startDates: [R(1000, 800, 'wp-sheba', "lead ('between c. 1000 BCE and c. 800 BCE')"), C(1200, 'wp-sheba', "Emergence ('estimates placing it around 1200 BCE')")],
      },
    },
    {
      id: 'qataban', name: 'Qataban', color: '#a07a5a', parent: 'arabia',
      span: { start: 'c. 1000 BCE', end: 'c. 200 CE', endDates: [C('200 CE', 'wp-qataban', 'lead (late 2nd century CE)'), C('100 CE', 'wp-qataban', 'lead (late 1st century CE)')] },
    },
    { id: 'north-arabia', name: 'North Arabia (Tayma and Dadan)', color: '#9a7a4a', parent: 'arabia' },
  ],
  { before: 'dilmun' },
);

// ---------- Oman Peninsula ----------
ed.event({
  uuid: 'hafit', title: 'Hafit period: beehive tombs', start: 'c. 3200 BCE', end: 'c. 2600 BCE', tracks: ['oman'],
  descr: 'Named for the distinctive beehive burials first found on Jebel Hafit. Finds show trading links to Mesopotamia in the Jemdat Nasr period (3100–2900 B.C.).',
  sources: [S('wp-hafit', 'infobox, lead and Discoveries')],
});
ed.event({
  uuid: 'umm-an-nar', title: 'Umm al-Nar period: Magan, copper source for Mesopotamia', start: 'c. 2600 BCE', end: 'c. 2000 BCE', tracks: ['oman'],
  descr: 'Magan supplies copper and diorite to Mesopotamia; trade between the Indus Valley and Sumer passes through Magan, which also trades with Iran and Bactria. Sumerian cuneiform texts of around 2300 BCE name it.',
  sources: [S('wp-magan', 'lead, Early Dynastic period, Ur III period and Commerce')],
  startDates: [C(2600, 'wp-magan', "Early Dynastic period ('the Umm al-Nar period (2600–2000 BCE)')"), R(2800, 2700, 'wp-hafit', "Discoveries (Hafit–Umm al-Nar transition, 'approximately 2800 to 2700 BCE')")],
});
ed.event({
  uuid: 'magan-akkad', title: 'Akkad campaigns against Magan', start: 'c. 2250 BCE', tracks: ['oman', 'akkad'],
  descr: 'Sargon of Akkad boasts that his ports hold boats from Tilmun, Magan and Meluhha; his successor Naram-Sin conquers Magan.',
  sources: [S('wp-magan', 'Akkadian period')],
  startDates: [R(2300, 2200, 'wp-magan', "Akkadian period ('in the twenty-third century BCE')")],
  links: [{ to: 'naram-sin', kind: 'related' }, { to: 'meluhha-sargon', kind: 'related' }],
});
ed.event({
  uuid: 'magan-ur3', title: 'Ur-Nammu brings back the ships of Magan', start: 'c. 2100 BCE', tracks: ['oman', 'sum-ur3'],
  descr: 'Trade between the two resumes (c. 2100 BC) in the Ur III period.',
  sources: [S('wp-magan', 'Ur III period and Commerce')],
  startDates: [C(2100, 'wp-magan', "Commerce ('trade resumed ... (c. 2100 BC)')"), R(2113, 2096, 'wp-magan', 'Ur III period (Ur-Nammu, 2113–2096 BCE)')],
  links: [{ to: 'ur-nammu', kind: 'related' }],
});
ed.event({
  uuid: 'wadi-suq', title: 'Wadi Suq period', start: 'c. 2000 BCE', end: 'c. 1300 BCE', tracks: ['oman'],
  descr: 'The transition from Umm al-Nar took some 200 years and more. Trade links run east to the Indus Valley and west to Mesopotamia, and links with Tilmun (Dilmun) persist.',
  sources: [S('wp-wadi-suq', 'infobox, lead, History and Artefacts')],
});

// ---------- Saba and Qataban ----------
ed.event({
  uuid: 'marib-dam', title: 'The Great Dam of Marib', start: 'c. 750 BCE', tracks: ['saba'],
  descr: 'The most reliable information dates the dam to about the 8th century BC; one tentative dating puts a first construction around 1750–1700 BC. Around 500 BC its height is raised to 7 metres.',
  sources: [S('wp-marib-dam', 'lead, Ancient dam and Construction'), S('wp-sheba', "infobox ('8th Century BC: Construction of the Marib Dam')")],
  startDates: [R(800, 700, 'wp-marib-dam', "Ancient dam ('about the 8th century BC')"), R(1750, 1700, 'wp-marib-dam', 'infobox and Construction (tentative)')],
});
ed.event({
  uuid: 'saba-height', title: 'Saba at the height of its power', start: 'c. 750 BCE', end: 'c. 550 BCE', tracks: ['saba'],
  descr: 'Saba takes part in the extremely lucrative spice trade; a continuous record of inscriptions begins in the 8th century BCE, when Akkadian cuneiform texts start to mention the Sabaeans. Its mukarrib Karib’il establishes diplomatic contacts with the Assyrian emperor Sennacherib. After the 6th century BCE it cannot keep its supremacy.',
  sources: [S('wp-sheba', 'lead, Era of the mukarribs, Era of the kings and Sources')],
  startDates: [R(800, 700, 'wp-sheba', "Era of the mukarribs ('between the 8th and 6th centuries BCE')")],
  endDates: [R(600, 500, 'wp-sheba', 'Era of the mukarribs')],
});
ed.event({
  uuid: 'karibil-watar', title: 'Conquests of Karib’il Watar of Saba', start: 'c. 620 BCE', end: 'c. 600 BCE', tracks: ['saba', 'qataban'],
  descr: 'Qataban and Ḥaḍramawt are at first his allies; during the 6th century BCE Qataban comes under Saba’s control.',
  sources: [S('wp-sheba', 'infobox (ruler list and 8th–7th century conquests)'), S('wp-qataban', 'Kingdom')],
});
ed.event({
  uuid: 'qataban-timna', title: 'Qataban becomes a state centred on Timna', start: 'c. 600 BCE', tracks: ['qataban'],
  descr: 'The earliest settlements in Qataban date from the 11th–10th centuries BCE. Qataban regains its independence from Saba in the late 5th century BCE, and by the 3rd century BCE challenges Saba’s supremacy.',
  sources: [S('wp-qataban', 'Prehistory and Kingdom')],
  startDates: [R(650, 550, 'wp-qataban', "Kingdom ('by the late 7th or early 6th century BCE')")],
});

// ---------- North Arabia ----------
ed.event({
  uuid: 'tayma-egypt', title: 'Tayma under Egyptian hegemony', start: 'c. 1186 BCE', tracks: ['north-arabia', 'eg-new'],
  descr: 'An inscription at Tayma was commissioned by Ramesses III (r. 1186–1155 BC). Monumental architecture disappears from Tayma by the end of the Early Iron Age (12th–9th centuries BC).',
  sources: [S('wp-tayma', 'Under Egyptian hegemony')],
});
ed.event({
  uuid: 'tayma-assyria', title: 'Assyria controls Tayma', start: 'c. 744 BCE', tracks: ['north-arabia', 'as-neo'],
  descr: 'From the 8th century BC Tayma is under the Assyrian Empire, as under Tiglath-Pileser III (744–727 BC); an inscription of Sennacherib (705–681 BC) records gifts of the people of Tema.',
  sources: [S('wp-tayma', 'Mesopotamian hegemony')],
  links: [{ to: 'tiglath-pileser-iii', kind: 'related' }],
});
ed.event({
  uuid: 'nabonidus-tayma', title: 'Nabonidus makes Tayma his base', start: 'c. 552 BCE', tracks: ['north-arabia', 'bab-neo'],
  descr: 'The Neo-Babylonian ruler campaigns in northwestern Arabia and rules from Tayma; he eliminates the kings of both Taymāʾ and Dadān.',
  sources: [S('wp-tayma', 'Mesopotamian hegemony'), S('wp-lihyan', 'Timeline')],
  links: [{ to: 'nabonidus', kind: 'part-of' }],
});
ed.event({
  uuid: 'lihyan', title: 'The kingdom of Lihyan at Dadan', start: 'c. 450 BCE', tracks: ['north-arabia'],
  descr: 'Most likely founded after Nabonidus arrived in north-west Arabia; it flourished for at least a century and a half. F. Winnett’s longer chronology places its beginning in the 6th century BC. The Gulf of Aqaba was called the Gulf of Lihyan.',
  sources: [S('wp-lihyan', 'infobox, lead and Timeline')],
  startDates: [R(500, 400, 'wp-lihyan', "infobox ('Established 5th century BC')"), R(600, 500, 'wp-lihyan', 'Timeline (Winnett)')],
});

ed.save();
