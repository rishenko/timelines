// ARCHIVED: already applied to data-src/ancient-near-east.json on 2026-11-17. Kept as a template for
// bulk edits (adding regions, sources, tracks and events; reordering rows). Re-running it fails on
// purpose, because the sources and tracks it adds already exist. New scripts should write through
// scripts/lib/source-format.ts instead of their own formatter.
// Adds the Levant, Iran, Indus, China, the Americas and Assyria detail to the ancient dataset source.
// Run once: node add-regions.mjs <path to data-src/ancient-near-east.json>
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const d = JSON.parse(readFileSync(file, 'utf8'));
const ACC = '2026-11-17';

// ---------- helpers ----------
const wp = (key, title, slug) => {
  if (d.sources[key]) throw new Error('source exists: ' + key);
  d.sources[key] = { name: `Wikipedia: ${title}`, url: `https://en.wikipedia.org/wiki/${slug}`, tags: ['wikipedia'], accessed: ACC };
};
const yr = (y) => (typeof y === 'number' ? `${y} BCE` : y);
const C = (y, k, loc, o = {}) => ({
  year: yr(y),
  ...(o.margin ? { margin: o.margin } : {}),
  ...(o.chron ? { chronology: o.chron } : {}),
  source: { sourceKey: k, sourceLocation: loc },
  ...(o.note ? { note: o.note } : {}),
});
const S = (k, loc) => ({ sourceKey: k, sourceLocation: loc });
const trackIds = new Set(d.tracks.map((t) => t.id));
const T = (t) => {
  if (trackIds.has(t.id)) throw new Error('track exists: ' + t.id);
  trackIds.add(t.id);
  return t;
};
const newEvents = [];
const E = (e) => newEvents.push(e);

// ---------- sources ----------
// Levant
wp('wp-canaan', 'Canaan', 'Canaan');
wp('wp-ugarit', 'Ugarit', 'Ugarit');
wp('wp-ebla', 'Ebla', 'Ebla');
wp('wp-phoenicia', 'Phoenicia', 'Phoenicia');
wp('wp-tyre', 'Tyre, Lebanon', 'Tyre,_Lebanon');
wp('wp-ugaritic-alphabet', 'Ugaritic alphabet', 'Ugaritic_alphabet');
wp('wp-proto-sinaitic', 'Proto-Sinaitic script', 'Proto-Sinaitic_script');
wp('wp-phoenician-alphabet', 'Phoenician alphabet', 'Phoenician_alphabet');
wp('wp-philistines', 'Philistines', 'Philistines');
wp('wp-israel', 'Kingdom of Israel (Samaria)', 'Kingdom_of_Israel_(Samaria)');
wp('wp-judah', 'Kingdom of Judah', 'Kingdom_of_Judah');
wp('wp-aram', 'Aram-Damascus', 'Aram-Damascus');
wp('wp-merneptah-stele', 'Merneptah Stele', 'Merneptah_Stele');
// Assyria
wp('wp-assyria', 'Assyria', 'Assyria');
wp('wp-early-assyria', 'Early Assyrian period', 'Early_Assyrian_period');
wp('wp-old-assyria', 'Old Assyrian period', 'Old_Assyrian_period');
wp('wp-middle-assyria', 'Middle Assyrian Empire', 'Middle_Assyrian_Empire');
wp('wp-shamshi-adad', 'Shamshi-Adad I', 'Shamshi-Adad_I');
wp('wp-tp3', 'Tiglath-Pileser III', 'Tiglath-Pileser_III');
wp('wp-ashurbanipal', 'Ashurbanipal', 'Ashurbanipal');
// Iran and Central Asia
wp('wp-elam', 'Elam', 'Elam');
wp('wp-proto-elamite', 'Proto-Elamite (period)', 'Proto-Elamite');
wp('wp-susa', 'Susa', 'Susa');
wp('wp-jiroft', 'Jiroft culture', 'Jiroft_culture');
wp('wp-chogha-zanbil', 'Chogha Zanbil', 'Chogha_Zanbil');
wp('wp-linear-elamite', 'Linear Elamite', 'Linear_Elamite');
wp('wp-medes', 'Medes', 'Medes');
wp('wp-urartu', 'Urartu', 'Urartu');
wp('wp-achaemenid', 'Achaemenid Empire', 'Achaemenid_Empire');
wp('wp-cyrus', 'Cyrus the Great', 'Cyrus_the_Great');
wp('wp-dilmun', 'Dilmun', 'Dilmun');
wp('wp-bmac', 'Bactria–Margiana Archaeological Complex', 'Bactria%E2%80%93Margiana_Archaeological_Complex');
wp('wp-mannaea', 'Mannaea', 'Mannaeans');
// Indus
wp('wp-ivc', 'Indus Valley Civilisation', 'Indus_Valley_civilisation');
wp('wp-mohenjo', 'Mohenjo-daro', 'Mohenjo-daro');
wp('wp-harappa', 'Harappa', 'Harappa');
wp('wp-dholavira', 'Dholavira', 'Dholavira');
wp('wp-lothal', 'Lothal', 'Lothal');
wp('wp-indus-script', 'Indus script', 'Indus_script');
wp('wp-mehrgarh', 'Mehrgarh', 'Mehrgarh');
wp('wp-meluhha', 'Meluhha', 'Meluhha');
// China
wp('wp-longshan', 'Longshan culture', 'Longshan_culture');
wp('wp-liangzhu', 'Liangzhu culture', 'Liangzhu_culture');
wp('wp-erlitou', 'Erlitou culture', 'Erlitou_culture');
wp('wp-xia', 'Xia dynasty', 'Xia_dynasty');
wp('wp-shang', 'Shang dynasty', 'Shang_dynasty');
wp('wp-anyang', 'Anyang', 'Anyang');
wp('wp-oracle-bone', 'Oracle bone script', 'Oracle_bone_script');
wp('wp-sanxingdui', 'Sanxingdui', 'Sanxingdui');
wp('wp-zhou', 'Zhou dynasty', 'Zhou_dynasty');
wp('wp-muye', 'Battle of Muye', 'Battle_of_Muye');
// Americas
wp('wp-caral-supe', 'Caral–Supe civilization', 'Norte_Chico_civilization');
wp('wp-caral', 'Caral', 'Caral');
wp('wp-chavin', 'Chavín culture', 'Chav%C3%ADn_culture');
wp('wp-olmecs', 'Olmecs', 'Olmecs');
wp('wp-san-lorenzo', 'San Lorenzo Tenochtitlán', 'San_Lorenzo_Tenochtitl%C3%A1n');
wp('wp-la-venta', 'La Venta', 'La_Venta');
wp('wp-poverty-point', 'Poverty Point', 'Poverty_Point');
wp('wp-watson-brake', 'Watson Brake', 'Watson_Brake');
wp('wp-valdivia', 'Valdivia culture', 'Valdivia_culture');
wp('wp-maya', 'Maya civilization', 'Maya_civilization');
wp('wp-el-mirador', 'El Mirador', 'El_Mirador');

// ---------- chronologies (China) ----------
d.chronologies['xszcp'] = {
  name: 'Xia–Shang–Zhou Chronology Project',
  group: 'China',
  default: true,
  description: 'Dates from the Chinese government project commissioned in 1996: Xia c. 2070–1600 BCE, Shang c. 1600–1046 BCE, the Zhou conquest in 1046 BCE. Doubts persist on these dates, and many Western scholars consider the Xia unproven.',
  source: S('wp-xia', 'lead and infobox footnote'),
};
d.chronologies['liu-xin'] = {
  name: 'Traditional (Liu Xin)',
  group: 'China',
  description: 'The traditional chronology computed by Liu Xin (1st century BCE): Xia 2205–1766 BCE, the Zhou conquest in 1122 BCE.',
  source: S('wp-xia', 'Chronology'),
};

// ---------- tracks ----------
const idx = (id) => d.tracks.findIndex((t) => t.id === id);
const take = (id) => d.tracks.splice(idx(id), 1)[0];
const insertAfter = (afterId, ...ts) => d.tracks.splice(idx(afterId) + 1, 0, ...ts);

// Assyria moves from "Other powers" into Mesopotamia and gets its periods.
const assyria = take('assyria');
assyria.parent = 'mesopotamia';
delete assyria.chronology; // inherits Middle from Mesopotamia
assyria.span = {
  start: 'c. 2600 BCE', end: '609 BCE',
  startDates: [C(2600, 'wp-assyria', 'infobox (Foundation of Assur)'), C(2500, 'wp-early-assyria', "Origins of Assur ('c. 2600 BC or c. 2500 BC')")],
};
insertAfter('bab-neo',
  assyria,
  T({ id: 'as-early', name: 'Early Assyrian period', color: '#a65d82', parent: 'assyria', span: { start: 'c. 2600 BCE', end: 'c. 2025 BCE' } }),
  T({ id: 'as-old', name: 'Old Assyrian period', color: '#b0688c', parent: 'assyria', span: { start: 'c. 2025 BCE', end: 'c. 1364 BCE' } }),
  T({ id: 'as-middle', name: 'Middle Assyrian Empire', color: '#8f4468', parent: 'assyria', span: { start: 'c. 1363 BCE', end: '912 BCE' } }),
  T({ id: 'as-neo', name: 'Neo-Assyrian Empire', color: '#7d3159', parent: 'assyria', span: { start: '911 BCE', end: '609 BCE' } }),
);

// Levant, after Mesopotamia's rows.
insertAfter('as-neo',
  T({ id: 'levant', name: 'Levant', color: '#9a6a2f' }),
  T({ id: 'canaan', name: 'Canaan', color: '#a8773a', parent: 'levant', span: { start: 'c. 3500 BCE', end: 'c. 1200 BCE' } }),
  T({ id: 'can-eba', name: 'Early Bronze Age', color: '#b9894b', parent: 'canaan', span: { start: 'c. 3500 BCE', end: 'c. 2000 BCE' } }),
  T({ id: 'can-mba', name: 'Middle Bronze Age', color: '#a87a3c', parent: 'canaan', span: { start: 'c. 2000 BCE', end: 'c. 1550 BCE' } }),
  T({ id: 'can-lba', name: 'Late Bronze Age', color: '#966a30', parent: 'canaan', span: { start: 'c. 1550 BCE', end: 'c. 1200 BCE' } }),
  T({ id: 'ebla', name: 'Ebla', color: '#b5653a', parent: 'levant', chronology: 'middle',
    span: { start: 'c. 3500 BCE', end: 'c. 1600 BCE' } }),
  T({ id: 'ugarit', name: 'Ugarit', color: '#c27d4c', parent: 'levant',
    span: { start: 'c. 1500 BCE', end: 'c. 1185 BCE',
      endDates: [C(1185, 'wp-ugarit', 'infobox and History'), C(1190, 'wp-ugarit', 'destruction infobox (c. 1190 BC)')] } }),
  T({ id: 'phoenicia', name: 'Phoenician cities', color: '#8b3a62', parent: 'levant', span: { start: 'c. 1200 BCE', end: '332 BCE' } }),
  T({ id: 'israel-judah', name: 'Israel and Judah', color: '#5f7c9a', parent: 'levant', span: { start: 'c. 930 BCE', end: 'c. 587 BCE' } }),
  T({ id: 'philistines', name: 'Philistines', color: '#7f8d55', parent: 'levant', span: { start: 'c. 1175 BCE', end: '604 BCE' } }),
  T({ id: 'aram', name: 'Aram-Damascus', color: '#a35f4f', parent: 'levant',
    span: { start: 'c. 1150 BCE', end: '732 BCE',
      startDates: [C(1200, 'wp-aram', "infobox ('c. 12th century BCE'): start of century"), C(1101, 'wp-aram', "infobox: end of century; lead says 'late 12th century'")] } }),
);

// Urartu joins Anatolia, after the Hittites.
insertAfter('hit-new',
  T({ id: 'urartu', name: 'Urartu', color: '#9a5a48', parent: 'anatolia',
    span: { start: '860 BCE', end: '590 BCE',
      endDates: [C(590, 'wp-urartu', 'infobox (Median conquest)'), C(547, 'wp-urartu', 'infobox (Achaemenid conquest, 590 BC/547 BC)')] } }),
);

// Iran and Central Asia, after the Aegean.
const persia = take('persia');
persia.parent = 'iran';
persia.span = { start: '550 BCE', end: '330 BCE' };
insertAfter('myc-postpalatial',
  T({ id: 'iran', name: 'Iran & Central Asia', color: '#2f8a8a' }),
  T({ id: 'elam', name: 'Elam', color: '#3a9a96', parent: 'iran', chronology: 'middle',
    span: { start: 'c. 3200 BCE', end: '539 BCE',
      startDates: [C(3200, 'wp-elam', 'infobox (3200–539 BC)'), C(2700, 'wp-elam', 'History of Iran navbox (Elam 2700–539, after Proto-Elamite)')],
      endDates: [C(539, 'wp-elam', 'infobox'), C(540, 'wp-elam', 'contents (Neo-Elamite period c. 1100 – 540 BC)')] } }),
  T({ id: 'elam-proto', name: 'Proto-Elamite', color: '#4fa8a3', parent: 'elam',
    span: { start: 'c. 3200 BCE', end: 'c. 2700 BCE',
      startDates: [C(3200, 'wp-proto-elamite', 'header (c. 3200–2700 BCE)'), C(3100, 'wp-proto-elamite', "lead ('c. 3100 BC to 2700 BC')")] } }),
  T({ id: 'elam-old', name: 'Old Elamite', color: '#3d9893', parent: 'elam', span: { start: 'c. 2700 BCE', end: 'c. 1500 BCE' } }),
  T({ id: 'elam-middle', name: 'Middle Elamite', color: '#2d8580', parent: 'elam', span: { start: 'c. 1500 BCE', end: 'c. 1100 BCE' } }),
  T({ id: 'elam-neo', name: 'Neo-Elamite', color: '#46918d', parent: 'elam',
    span: { start: 'c. 1100 BCE', end: '539 BCE',
      endDates: [C(539, 'wp-elam', 'contents (Neo-Elamite III, 646–539 BC)'), C(540, 'wp-elam', 'contents (Neo-Elamite period c. 1100 – 540 BC)')] } }),
  T({ id: 'jiroft', name: 'Jiroft culture', color: '#5a9e7a', parent: 'iran',
    span: { start: 'c. 2500 BCE', end: 'c. 2200 BCE',
      startDates: [C(2500, 'wp-jiroft', "Discovery ('heyday was from 2500 BC to 2200 BC')"), C(3050, 'wp-jiroft', "infobox ('5000 BP to 4200 BP'; BP counts from 1950)")],
      endDates: [C(2200, 'wp-jiroft', 'heyday'), C(2250, 'wp-jiroft', 'infobox (4200 BP)')] } }),
  T({ id: 'bmac', name: 'Oxus civilization (BMAC)', color: '#6b9a52', parent: 'iran',
    span: { start: 'c. 2250 BCE', end: 'c. 1700 BCE',
      startDates: [C(2250, 'wp-bmac', 'header (c. 2250–1700 BC)'), C(2400, 'wp-mannaea', 'History of Iran navbox (Oxus Civilization c. 2400–1700)')] } }),
  T({ id: 'mannaea', name: 'Mannaea', color: '#5b8f9e', parent: 'iran', span: { start: '850 BCE', end: '616 BCE' } }),
  T({ id: 'medes', name: 'Medes', color: '#3f7f9e', parent: 'iran', span: { start: '678 BCE', end: '550 BCE' } }),
  persia,
);

// Indus, China, Americas before "Other powers".
const before = (id, ...ts) => d.tracks.splice(idx(id), 0, ...ts);
before('other',
  T({ id: 'indus', name: 'Indus Valley', color: '#b5552b' }),
  T({ id: 'harappan', name: 'Harappan civilization', color: '#c0643a', parent: 'indus',
    span: { start: 'c. 3300 BCE', end: 'c. 1300 BCE',
      startDates: [C(3300, 'wp-ivc', 'lead and infobox'), C(3700, 'wp-harappa', "Ravi Phase ('a 2025 study puts it as early as about 3700 BC')")] } }),
  T({ id: 'ind-early', name: 'Early Harappan', color: '#cf7a4f', parent: 'harappan', span: { start: 'c. 3300 BCE', end: 'c. 2600 BCE' } }),
  T({ id: 'ind-mature', name: 'Mature Harappan', color: '#b44e24', parent: 'harappan', span: { start: 'c. 2600 BCE', end: 'c. 1900 BCE' } }),
  T({ id: 'ind-late', name: 'Late Harappan', color: '#c98a66', parent: 'harappan', span: { start: 'c. 1900 BCE', end: 'c. 1300 BCE' } }),

  T({ id: 'china', name: 'China', color: '#b0302f', chronology: 'xszcp' }),
  T({ id: 'liangzhu', name: 'Liangzhu culture', color: '#4f9a6a', parent: 'china', span: { start: '3300 BCE', end: '2300 BCE' } }),
  T({ id: 'longshan', name: 'Longshan culture', color: '#7a6a4a', parent: 'china',
    span: { start: 'c. 3000 BCE', end: 'c. 1900 BCE',
      endDates: [C(1900, 'wp-longshan', 'infobox and lead'), C(2000, 'wp-longshan', 'Late period (2600 to 2000 BC)')] } }),
  T({ id: 'xia', name: 'Xia dynasty (traditional; disputed)', color: '#c58a7a', parent: 'china',
    span: { start: 'c. 2070 BCE', end: 'c. 1600 BCE',
      startDates: [
        C(2070, 'wp-xia', 'Chronology (Xia–Shang–Zhou Chronology Project)', { chron: 'xszcp' }),
        C(2205, 'wp-xia', 'Chronology (Liu Xin, 2205–1766 BC)', { chron: 'liu-xin' }),
        C(1989, 'wp-xia', 'Chronology (current text of the Bamboo Annals, 1989–1558 BC)'),
        C(1953, 'wp-xia', 'Chronology (Pankenier, 1953–1555 BC)'),
      ],
      endDates: [
        C(1600, 'wp-xia', 'Chronology (Xia–Shang–Zhou Chronology Project)', { chron: 'xszcp' }),
        C(1766, 'wp-xia', 'Chronology (Liu Xin)', { chron: 'liu-xin' }),
        C(1558, 'wp-xia', 'Chronology (Bamboo Annals)'),
        C(1555, 'wp-xia', 'Chronology (Pankenier)'),
      ] } }),
  T({ id: 'erlitou', name: 'Erlitou culture', color: '#a8604a', parent: 'china',
    span: { start: 'c. 1750 BCE', end: 'c. 1530 BCE',
      startDates: [C(1750, 'wp-erlitou', 'infobox (2007 radiocarbon study, c. 1750–1530 BC)'), C(1900, 'wp-erlitou', 'infobox (general estimates, c. 1900–1500 BC)')],
      endDates: [C(1530, 'wp-erlitou', 'infobox (2007 radiocarbon study)'), C(1500, 'wp-erlitou', "lead ('1750–1500 BC') and general estimates")] } }),
  T({ id: 'shang', name: 'Shang dynasty', color: '#9c2a2a', parent: 'china',
    span: { start: 'c. 1600 BCE', end: 'c. 1046 BCE',
      startDates: [C(1600, 'wp-shang', 'infobox', { chron: 'xszcp' }), C(1766, 'wp-xia', 'Chronology (Liu Xin: Xia ends 1766 BC)', { chron: 'liu-xin' })],
      endDates: [
        C(1046, 'wp-muye', 'infobox and footnote a (Xia–Shang–Zhou Chronology Project)', { chron: 'xszcp' }),
        C(1122, 'wp-muye', 'Dating (Liu Xin)', { chron: 'liu-xin' }),
        C(1027, 'wp-muye', 'Dating (old-text Bamboo Annals)'),
        C(1074, 'wp-muye', "Dating ('at least 44 different dates … ranging from 1130 to 1018 BC')", { margin: 56 }),
      ] } }),
  T({ id: 'sanxingdui', name: 'Sanxingdui', color: '#b8923a', parent: 'china', span: { start: 'c. 1700 BCE', end: 'c. 1150 BCE' } }),
  T({ id: 'zhou', name: 'Zhou dynasty', color: '#7a2f4f', parent: 'china',
    span: { start: 'c. 1046 BCE', end: '256 BCE',
      startDates: [C(1046, 'wp-zhou', 'lead', { chron: 'xszcp' }), C(1122, 'wp-muye', 'Dating (Liu Xin)', { chron: 'liu-xin' }), C(1045, 'wp-zhou', 'lead (Nivison and Shaughnessy)')] } }),
  T({ id: 'zhou-western', name: 'Western Zhou', color: '#8a3d5e', parent: 'zhou',
    span: { start: 'c. 1046 BCE', end: '771 BCE',
      startDates: [C(1046, 'wp-zhou', 'lead', { chron: 'xszcp' }), C(1122, 'wp-muye', 'Dating (Liu Xin)', { chron: 'liu-xin' }), C(1045, 'wp-zhou', 'lead (Nivison and Shaughnessy)')] } }),
  T({ id: 'zhou-eastern', name: 'Eastern Zhou', color: '#6b2744', parent: 'zhou', span: { start: '771 BCE', end: '256 BCE' } }),

  T({ id: 'americas', name: 'Americas', color: '#2f7a5a' }),
  T({ id: 'mound-builders', name: 'Mound builders (Louisiana)', color: '#6f8f4a', parent: 'americas' }),
  T({ id: 'olmec', name: 'Olmecs', color: '#3f8a6a', parent: 'americas',
    span: { start: 'c. 1200 BCE', end: 'c. 400 BCE',
      startDates: [C(1200, 'wp-olmecs', 'infobox and lead'), C(1400, 'wp-olmecs', "Overview ('c. 1400–400 BC'); Origins ('traditionally … between 1400 BC and 1200 BC')"), C(1550, 'wp-olmecs', "Origins (El Manatí: 'at least 1600–1500 BC')", { margin: 50 })] } }),
  T({ id: 'maya', name: 'Maya (Preclassic)', color: '#4f9a7e', parent: 'americas', span: { start: 'c. 2000 BCE', end: '250 CE' } }),
  T({ id: 'valdivia', name: 'Valdivia culture', color: '#5a8a9a', parent: 'americas',
    span: { start: 'c. 3500 BCE', end: 'c. 1500 BCE',
      startDates: [C(3500, 'wp-valdivia', 'lead'), C(3800, 'wp-valdivia', 'infobox (3800 - 1500 BC)')] } }),
  T({ id: 'caral-supe', name: 'Caral–Supe (Norte Chico)', color: '#3a7a8a', parent: 'americas',
    span: { start: 'c. 3500 BCE', end: 'c. 1800 BCE',
      startDates: [C(3500, 'wp-caral-supe', 'lead (first city, Huaricanga)'), C(3100, 'wp-caral-supe', "lead ('From 3100 BCE onward, large-scale … settlement … clearly apparent')")] } }),
  T({ id: 'chavin', name: 'Chavín culture', color: '#2f6a7a', parent: 'americas', span: { start: '900 BCE', end: '250 BCE' } }),
);

// Dilmun goes under "Other powers".
insertAfter('mitanni', T({ id: 'dilmun', name: 'Dilmun (Bahrain)', color: '#8a8f6a', parent: 'other' }));

// ---------- events ----------
// --- Assyria ---
E({ uuid: 'assur-independent', title: 'Assur becomes an independent city-state', start: 'c. 2025 BCE', tracks: ['as-old'],
  descr: 'Under Puzur-Ashur I, after the collapse of the Third Dynasty of Ur. One page credits independence to an earlier ruler, Ushpia, around 2090 BCE.',
  sources: [S('wp-old-assyria', 'infobox'), S('wp-early-assyria', 'Under the Third Dynasty of Ur')],
  startDates: [C(2025, 'wp-old-assyria', 'infobox', { chron: 'middle' }), C(2090, 'wp-early-assyria', "Under the Third Dynasty of Ur ('beginning with Ushpia c. 2090 BC')")],
  links: [{ to: 'ur-nammu', kind: 'related' }] });
E({ uuid: 'shamshi-adad', title: 'Shamshi-Adad I conquers Assur', start: 'c. 1808 BCE', end: 'c. 1776 BCE', tracks: ['as-old'],
  descr: 'An Amorite conqueror takes Assur and builds a kingdom across northern Mesopotamia, ruling from Shubat-Enlil. It falls apart soon after his death.',
  sources: [S('wp-old-assyria', 'Conquests of Shamshi-Adad'), S('wp-shamshi-adad', 'lead')],
  startDates: [C(1808, 'wp-old-assyria', "Conquests ('in c. 1808 BC')", { chron: 'middle' }), C(1809, 'wp-shamshi-adad', "Early life ('around 1809 BC')")],
  endDates: [C(1776, 'wp-shamshi-adad', 'Death (Year 18 of Hammurabi)')] });
E({ uuid: 'assyria-mitanni-vassal', title: 'Assyria under Mitanni', start: 'c. 1430 BCE', end: 'c. 1360 BCE', tracks: ['as-old', 'mitanni'],
  descr: 'Assyria is a vassal of Mitanni for about 70 years, until it breaks free in the early 14th century.',
  sources: [S('wp-old-assyria', 'infobox (Subjugation under Mitanni c. 1430–1360 BC)'), S('wp-middle-assyria', 'Formation and rise')],
  links: [{ to: 'ashur-uballit', kind: 'causes' }] });
E({ uuid: 'tukulti-ninurta', title: 'Reign of Tukulti-Ninurta I', start: 'c. 1243 BCE', end: 'c. 1207 BCE', tracks: ['as-middle'],
  descr: 'The Middle Assyrian Empire at its height. He builds a new capital, Kar-Tukulti-Ninurta (c. 1233 BCE), and is assassinated about 1207 BCE.',
  sources: [S('wp-middle-assyria', 'infobox and lead'), S('wp-assyria', 'infobox (capitals)')] });
E({ uuid: 'tiglath-pileser-i', title: 'Reign of Tiglath-Pileser I', start: '1114 BCE', end: '1076 BCE', tracks: ['as-middle'],
  descr: 'A second Middle Assyrian expansion after the decline of c. 1206–1115 BCE.',
  sources: [S('wp-middle-assyria', 'infobox (kings; second expansion 1114–1056 BC)')] });
E({ uuid: 'kalhu-capital', title: 'Ashurnasirpal II makes Nimrud (Kalhu) the capital', start: '879 BCE', tracks: ['as-neo'],
  descr: 'Nimrud remains the capital until 706 BCE.',
  sources: [S('wp-assyria', 'infobox (capitals: Nimrud 879–706 BC)')] });
E({ uuid: 'tiglath-pileser-iii', title: 'Reign of Tiglath-Pileser III', start: '745 BCE', end: '727 BCE', tracks: ['as-neo'],
  descr: 'Takes power in a revolt and turns Assyria into a far larger empire: he defeats Urartu (743), conquers Damascus (732) and Babylonia (729).',
  sources: [S('wp-tp3', 'infobox and lead')] });
E({ uuid: 'dur-sharrukin', title: 'Sargon II moves the capital to Dur-Sharrukin', start: '706 BCE', tracks: ['as-neo'],
  descr: 'The new city is the capital for only a year: after Sargon dies in battle in 705 BCE, Sennacherib moves the capital to Nineveh, where it stays until 612 BCE.',
  sources: [S('wp-assyria', 'infobox (capitals: Dur-Sharrukin 706–705 BC; Nineveh 705–612 BC)')] });
E({ uuid: 'ashurbanipal', title: 'Reign of Ashurbanipal', start: '669 BCE', end: '631 BCE', tracks: ['as-neo'],
  descr: 'The last great Neo-Assyrian king. He wins a civil war against his brother Shamash-shum-ukin, king of Babylon (652–648), and destroys Elam. Assyria falls about two decades after his death.',
  sources: [S('wp-ashurbanipal', 'infobox and lead')] });
E({ uuid: 'shamash-shum-ukin', title: 'Babylon revolts under Shamash-shum-ukin', start: '652 BCE', end: '648 BCE', tracks: ['as-neo', 'babylonia'],
  descr: "Ashurbanipal's brother, king of Babylon, rebels. He dies when Babylon falls after a siege in 648 BCE.",
  sources: [S('wp-ashurbanipal', 'lead')] });

// --- Levant: Canaan ---
E({ uuid: 'tyre-founded', title: 'Tyre founded (by tradition)', start: 'c. 2750 BCE', tracks: ['can-eba'],
  descr: "Herodotus' informants, the priests of Tyre, told him the city had been founded 2,300 years before his visit (around 450 BCE).",
  sources: [S('wp-tyre', 'infobox and History')] });
E({ uuid: 'proto-sinaitic', title: 'Proto-Sinaitic: the earliest alphabet', start: 'c. 1850 BCE', tracks: ['can-mba', 'eg-middle'],
  descr: 'Inscriptions from Sinai and Egypt adapting Egyptian hieroglyphs to write a Semitic language; the ancestor of the Phoenician alphabet. Scholars argue for an early date (around 1850 BCE) or a late one (around 1550 BCE).',
  sources: [S('wp-proto-sinaitic', 'lead')],
  startDates: [C(1850, 'wp-proto-sinaitic', "lead ('an early date, around 1850 BC')"), C(1550, 'wp-proto-sinaitic', "lead ('a late date, around 1550 BC')")] });

// --- Ebla ---
E({ uuid: 'ebla-settled', title: 'Ebla first settled', start: 'c. 3500 BCE', tracks: ['ebla'],
  descr: 'A small settlement in the Early Bronze Age that grows into a major Syrian city.',
  sources: [S('wp-ebla', 'lead and Early Bronze')] });
E({ uuid: 'ebla-archives', title: 'Ebla archives', start: 'c. 2400 BCE', end: 'c. 2300 BCE', tracks: ['ebla'],
  descr: 'The age of the archives (Mardikh IIB1): thousands of cuneiform tablets in Sumerian and Eblaite, ending with the burning of palace G.',
  sources: [S('wp-ebla', 'Mardikh IIB1'), S('wp-ebla', "lead (archive 'dated to 2500 BC–2350 BC')")] });
E({ uuid: 'ebla-first-destruction', title: 'First destruction of Ebla', start: 'c. 2300 BCE', tracks: ['ebla'],
  descr: 'Palace G burns. Who destroyed it is debated: suggestions include the Akkadian kings and, for the earlier dates, Eannatum or Lugalzagesi.',
  sources: [S('wp-ebla', 'First destruction')],
  startDates: [C(2300, 'wp-ebla', 'First destruction', { chron: 'middle' }), C(2400, 'wp-ebla', 'First destruction (Pettinato, later view)'), C(2500, 'wp-ebla', 'First destruction (Pettinato, earlier view)')] });
E({ uuid: 'ebla-mursili', title: 'Mursili I destroys Ebla', start: 'c. 1600 BCE', tracks: ['ebla', 'hit-old'],
  descr: 'The Hittite king ends the third kingdom of Ebla, during the same campaigns that took Aleppo and Babylon.',
  sources: [S('wp-ebla', 'lead')],
  links: [{ to: 'mursili-aleppo', kind: 'related' }] });

// --- Ugarit ---
E({ uuid: 'ugaritic-alphabet', title: 'Ugaritic alphabet', start: 'c. 1400 BCE', tracks: ['ugarit'],
  descr: 'A 30-letter alphabet written in cuneiform signs on clay. It falls out of use when Ugarit is destroyed.',
  sources: [S('wp-ugaritic-alphabet', 'lead')],
  startDates: [C(1400, 'wp-ugaritic-alphabet', "lead ('c. 1400 or 1300 BCE')"), C(1300, 'wp-ugaritic-alphabet', 'lead')] });
E({ uuid: 'niqmaddu-ii', title: 'Niqmaddu II: Ugarit becomes a Hittite vassal', start: 'c. 1350 BCE', end: 'c. 1315 BCE', tracks: ['ugarit', 'hit-new'],
  descr: 'Ugarit, which had corresponded with Egypt in the Amarna letters, passes into the Hittite sphere.',
  sources: [S('wp-ugarit', 'Late Bronze Age')] });
E({ uuid: 'ugarit-destroyed', title: 'Ugarit destroyed', start: 'c. 1185 BCE', tracks: ['ugarit'],
  descr: "Destroyed during the Late Bronze Age collapse, in the reign of its last king, Ammurapi. Letters from the city's final days mention enemy ships.",
  sources: [S('wp-ugarit', 'infobox and History')],
  startDates: [C(1185, 'wp-ugarit', 'History'), C(1190, 'wp-ugarit', 'destruction infobox')],
  links: [{ to: 'bronze-age-collapse', kind: 'part-of' }] });

// --- Phoenicia ---
E({ uuid: 'phoenician-alphabet', title: 'Phoenician alphabet', start: 'c. 1050 BCE', tracks: ['phoenicia'],
  descr: 'A 22-letter consonantal alphabet, ancestor of the Greek, Latin, Aramaic and Hebrew scripts. 1050 BCE is the conventional date; arrowheads from c. 1100 BCE carry early examples.',
  sources: [S('wp-phoenician-alphabet', 'infobox and Origin')],
  startDates: [C(1050, 'wp-phoenician-alphabet', 'infobox'), C(1100, 'wp-phoenician-alphabet', "Inscriptions (arrowheads 'dated c. 1100 BC')")],
  links: [{ to: 'proto-sinaitic', kind: 'succeeds' }] });
E({ uuid: 'hiram-i', title: 'Hiram I: Tyre becomes the leading Phoenician city', start: '969 BCE', end: '936 BCE', tracks: ['phoenicia'],
  descr: 'Tyre becomes the dominant city-state under Hiram I.',
  sources: [S('wp-phoenicia', 'infobox')] });
E({ uuid: 'carthage-founded', title: 'Carthage founded', start: '814 BCE', tracks: ['phoenicia'],
  descr: 'Tyrian colonists found Carthage in North Africa; in Roman accounts, led by Dido.',
  sources: [S('wp-phoenicia', 'infobox')] });
E({ uuid: 'tyre-babylon', title: 'Tyre under Babylonian rule', start: '572 BCE', tracks: ['phoenicia', 'bab-neo'],
  descr: 'Tyre comes under Neo-Babylonian rule.',
  sources: [S('wp-tyre', 'History')] });
E({ uuid: 'siege-of-tyre', title: 'Alexander the Great takes Tyre', start: '332 BCE', tracks: ['phoenicia'],
  descr: 'After a siege during which he builds a causeway to the island city. Eight thousand Tyrians die and 30,000 are sold into slavery.',
  sources: [S('wp-tyre', 'History')] });

// --- Israel and Judah ---
E({ uuid: 'merneptah-stele', title: 'Merneptah Stele names "Israel"', start: 'c. 1208 BCE', tracks: ['can-lba', 'eg-new'],
  descr: "Carved in Merneptah's fifth year, it lists Ashkelon, Gezer, Yanoam and Israel among the defeated: the earliest mention of Israel outside the Bible.",
  sources: [S('wp-merneptah-stele', 'infobox and Description')],
  links: [{ to: 'merneptah', kind: 'part-of' }] });
E({ uuid: 'kingdom-israel', title: 'Kingdom of Israel (Samaria)', start: 'c. 930 BCE', end: 'c. 720 BCE', tracks: ['israel-judah'],
  descr: 'The northern kingdom, from Jeroboam I to Hoshea. Its capital moves from Shechem and Tirzah to Samaria (from c. 880 BCE).',
  sources: [S('wp-israel', 'infobox')] });
E({ uuid: 'kingdom-judah', title: 'Kingdom of Judah', start: 'c. 930 BCE', end: 'c. 587 BCE', tracks: ['israel-judah'],
  descr: 'The southern kingdom, ruled by the House of David from Jerusalem, from Rehoboam to Zedekiah.',
  sources: [S('wp-judah', 'infobox')] });
E({ uuid: 'fall-of-samaria', title: 'Assyria conquers Israel', start: 'c. 720 BCE', tracks: ['israel-judah', 'as-neo'],
  descr: 'The Neo-Assyrian Empire ends the northern kingdom after campaigns from 732 BCE; Sargon II deports 27,290 Israelites.',
  sources: [S('wp-israel', 'lead and Conquest by the Neo-Assyrian Empire (732–720 BCE)')],
  links: [{ to: 'kingdom-israel', kind: 'conquers' }] });

// --- Philistines ---
E({ uuid: 'philistines-settle', title: 'Philistines settle in Canaan', start: 'c. 1175 BCE', tracks: ['philistines'],
  descr: 'Amid the Late Bronze Age collapse. Typically Philistine artifacts appear in Canaan in the 12th century; the link to the Sea Peoples Ramesses III fought is a hypothesis.',
  sources: [S('wp-philistines', 'lead and History')],
  links: [{ to: 'battle-of-delta', kind: 'related' }] });
E({ uuid: 'philistia-destroyed', title: 'Nebuchadnezzar II destroys the Philistine cities', start: '604 BCE', tracks: ['philistines', 'bab-neo'],
  descr: 'After a revolt, Babylon destroys Ashkelon, Gaza, Aphek and Ekron and deports their people.',
  sources: [S('wp-philistines', 'lead and History')],
  startDates: [C(604, 'wp-philistines', 'lead'), C(603, 'wp-philistines', "History ('In 604/603 BC')")] });

// --- Aram ---
E({ uuid: 'hazael', title: 'Reign of Hazael of Damascus', start: '842 BCE', end: '796 BCE', tracks: ['aram'],
  descr: 'A usurper who fights the Assyrians and conquers Israel.',
  sources: [S('wp-aram', 'infobox and History')],
  endDates: [C(796, 'wp-aram', 'infobox'), C(805, 'wp-aram', "kings navbox ('842–805/796 BCE')")] });
E({ uuid: 'fall-of-damascus', title: 'Tiglath-Pileser III conquers Damascus', start: '732 BCE', tracks: ['aram', 'as-neo'],
  descr: 'Assyria annexes Aram-Damascus and executes its last king, Rezin.',
  sources: [S('wp-aram', 'infobox and History')],
  links: [{ to: 'tiglath-pileser-iii', kind: 'part-of' }] });

// --- Elam ---
E({ uuid: 'susa-founded', title: 'Susa founded', start: 'c. 4200 BCE', tracks: ['elam'],
  descr: 'The settlement that becomes the chief city of Elam.',
  sources: [S('wp-susa', 'infobox and lead')],
  startDates: [C(4200, 'wp-susa', "body ('as early as 4200 BC')"), C(4298, 'wp-susa', "infobox ('Built 4395-4200 BCE')", { margin: 98 })] });
E({ uuid: 'linear-elamite', title: 'Linear Elamite script', start: 'c. 2300 BCE', end: 'c. 1850 BCE', tracks: ['elam-old'],
  descr: 'A script for the Elamite language, associated with Puzur-Inshushinak (in power around 2150 BCE). Its decipherment was proposed in 2020–2022.',
  sources: [S('wp-linear-elamite', 'infobox and History')] });
E({ uuid: 'chogha-zanbil', title: 'Untash-Napirisha builds the ziggurat of Chogha Zanbil', start: 'c. 1250 BCE', tracks: ['elam-middle'],
  descr: 'A temple complex near Susa. Construction was sometime in the 14th or 13th century BCE; 1250 is the conventional date.',
  sources: [S('wp-chogha-zanbil', 'lead and History')] });
E({ uuid: 'susa-sacked', title: 'Ashurbanipal sacks Susa', start: '647 BCE', end: '646 BCE', tracks: ['elam-neo', 'as-neo'],
  descr: "Assyria's final campaigns against Elam destroy Susa and Chogha Zanbil (the latter 'about 645 BC').",
  sources: [S('wp-ashurbanipal', "lead ('in 665, 653 and 647–646')"), S('wp-chogha-zanbil', 'History')],
  chronology: 'middle' });

// --- Iran, others ---
E({ uuid: 'medes-assyria', title: 'Medes first appear in Assyrian records', start: '834 BCE', tracks: ['medes'],
  descr: 'Shalmaneser III sends a sortie against four settlements, one identified as Media. Medes appear in Assyrian texts from the 9th century BCE.',
  sources: [S('wp-medes', 'History > Assyrian intervention')] });
E({ uuid: 'mannaea-first', title: 'Mannaea first mentioned', start: '828 BCE', tracks: ['mannaea'],
  descr: "An inscription from Shalmaneser III's 30th year names Mannaea and its ruler Udaki.",
  sources: [S('wp-mannaea', 'Etymology of name')] });
E({ uuid: 'mannaea-medes', title: 'Medes annex Mannaea', start: 'c. 609 BCE', tracks: ['mannaea', 'medes'],
  descr: 'Mannaea is absorbed into the Median kingdom by the late 7th century BCE.',
  sources: [S('wp-mannaea', 'Location and lead')] });
E({ uuid: 'urartu-sarduri', title: 'Tiglath-Pileser III defeats Sarduri II of Urartu', start: '743 BCE', tracks: ['urartu', 'as-neo'],
  descr: 'Urartu had beaten Assyria at Arpad in 754 BCE; this victory reverses the balance.',
  sources: [S('wp-tp3', 'lead and Assyria before Tiglath-Pileser')] });
E({ uuid: 'darius-i', title: 'Reign of Darius the Great', start: '522 BCE', end: '486 BCE', tracks: ['persia'],
  descr: 'The Achaemenid Empire reaches its greatest extent; it fails to conquer Scythia (513) and Greece (492–490).',
  sources: [S('wp-achaemenid', 'infobox and lead')] });
E({ uuid: 'greco-persian-wars', title: 'Greco-Persian Wars', start: '499 BCE', end: '449 BCE', tracks: ['persia'],
  descr: 'From the Ionian Revolt to the end of hostilities; Persian invasions of Greece are repulsed in 492–490 and 480–479 BCE.',
  sources: [S('wp-achaemenid', 'infobox (historical era) and lead')] });
E({ uuid: 'persia-falls', title: 'Alexander conquers the Achaemenid Empire', start: '330 BCE', tracks: ['persia'],
  descr: 'The end of a Macedonian campaign that began in 336 BCE.',
  sources: [S('wp-achaemenid', 'lead')] });
E({ uuid: 'dilmun-height', title: 'Dilmun at its height', start: 'c. 2050 BCE', end: 'c. 1720 BCE', tracks: ['dilmun'],
  descr: 'A trading centre in Bahrain, between Mesopotamia and the Indus, prosperous in the first centuries of the 2nd millennium BCE, then declining from around 1720.',
  sources: [S('wp-dilmun', 'History')] });
E({ uuid: 'dilmun-last', title: 'Last mention of Dilmun', start: '567 BCE', tracks: ['dilmun'],
  descr: 'Neo-Babylonian records; after the fall of Babylon the name falls out of use.',
  sources: [S('wp-dilmun', 'History')] });

// --- Indus ---
E({ uuid: 'ravi-phase', title: 'Ravi (Hakra) phase at Harappa', start: 'c. 3300 BCE', end: 'c. 2800 BCE', tracks: ['ind-early'],
  descr: 'The first settlement at Harappa. A 2025 study dates its start as early as about 3700 BCE.',
  sources: [S('wp-harappa', "excavators' chronology and Ravi Phase")],
  startDates: [C(3300, 'wp-harappa', "excavators' chronology"), C(3700, 'wp-harappa', 'Ravi Phase (2025 study)')] });
E({ uuid: 'kot-diji', title: 'Kot Diji phase', start: 'c. 2800 BCE', end: 'c. 2600 BCE', tracks: ['ind-early'],
  descr: 'The last Early Harappan phase before the cities.',
  sources: [S('wp-harappa', "excavators' chronology")] });
E({ uuid: 'indus-script', title: 'Indus script', start: 'c. 2800 BCE', end: 'c. 1900 BCE', tracks: ['ind-early', 'ind-mature'],
  descr: 'Short inscriptions on seals and pottery; still undeciphered. A possible proto-script dates from c. 3500 BCE, and rare later graffiti until c. 1300 BCE.',
  sources: [S('wp-indus-script', 'infobox')] });
E({ uuid: 'mohenjo-daro', title: 'Mohenjo-daro', start: 'c. 2500 BCE', end: 'c. 1700 BCE', tracks: ['ind-mature'],
  descr: 'One of the largest cities of the Bronze Age, with planned streets, drainage and the Great Bath. Abandoned with the other large Indus cities.',
  sources: [S('wp-mohenjo', 'infobox and lead')] });
E({ uuid: 'dholavira', title: 'Dholavira', start: 'c. 2650 BCE', end: 'c. 1900 BCE', tracks: ['ind-mature'],
  descr: 'A walled city in Kutch with elaborate water reservoirs. Recent radiocarbon dating puts its first stage around 3500 BCE; after a desertion it was reoccupied until c. 1450 BCE.',
  sources: [S('wp-dholavira', 'infobox, Location and Timeline')],
  startDates: [C(2650, 'wp-dholavira', 'infobox and Timeline (Bisht)'), C(3350, 'wp-dholavira', "Timeline ('recent C14 datings': Stage I c. 3500-3200 BCE)", { margin: 150 })],
  endDates: [C(1900, 'wp-dholavira', 'infobox'), C(1450, 'wp-dholavira', "Location ('reoccupied until c. 1450 BCE')")] });
E({ uuid: 'lothal', title: 'Lothal', start: 'c. 2300 BCE', end: 'c. 1900 BCE', tracks: ['ind-mature'],
  descr: 'A port town in Gujarat with a large basin often identified as a dockyard. A massive flood around 1900 BCE destroyed it.',
  sources: [S('wp-lothal', 'infobox, lead and decline')] });
E({ uuid: 'meluhha-sargon', title: 'Ships from Meluhha in Akkad', start: 'c. 2334 BCE', end: 'c. 2279 BCE', tracks: ['akkad', 'ind-mature'],
  descr: 'Sargon of Akkad mentions ships from Meluhha, Magan and Dilmun. Most scholars identify Meluhha with the Indus Valley.',
  sources: [S('wp-meluhha', 'lead and Sargon of Akkad')] });
E({ uuid: 'indus-seal-susa', title: 'Indus seal impression at Susa', start: 'c. 2400 BCE', end: 'c. 2100 BCE', tracks: ['ind-mature', 'elam-old'],
  descr: 'A cylinder-seal impression with Indus characters, found in a stratum at Susa: evidence of Indus–Mesopotamian contact.',
  sources: [S('wp-indus-script', 'Mesopotamia')] });
E({ uuid: 'mehrgarh-abandoned', title: 'Mehrgarh abandoned', start: 'c. 2500 BCE', tracks: ['ind-mature'],
  descr: 'One of the earliest farming sites in South Asia (from c. 5250 or 7000 BCE) is largely abandoned sometime between 2600 and 2000 BCE.',
  sources: [S('wp-mehrgarh', 'Period VII')],
  startDates: [C(2300, 'wp-mehrgarh', "Period VII ('between 2600 BCE and 2000 BCE')", { margin: 300 }), C(2500, 'wp-mehrgarh', 'Period VII (Michael Wood)')] });
E({ uuid: 'meluhha-last', title: 'Last Mesopotamian mention of Meluhha', start: 'c. 1760 BCE', tracks: ['bab-old', 'ind-late'],
  descr: 'Direct trade had already given way to trade through Dilmun, possibly as the Indus cities declined.',
  sources: [S('wp-meluhha', "Trading colony ('no known mentions of Meluhha after 1760 BCE')")] });

// --- China ---
E({ uuid: 'liangzhu-collapse', title: 'Liangzhu culture disappears', start: 'c. 2300 BCE', tracks: ['liangzhu'],
  descr: 'The jade-working culture of the Yangtze Delta, which flourished around 2500 BCE with a 290-hectare walled city, vanishes after a wet period, perhaps linked to the 4.2-kiloyear climate event.',
  sources: [S('wp-liangzhu', 'lead and Disappearance')] });
E({ uuid: 'yanshi', title: 'Walled city built at Yanshi', start: 'c. 1600 BCE', tracks: ['shang', 'erlitou'],
  descr: 'Near Erlitou. The Xia–Shang–Zhou Chronology Project treats it as the founding of the Shang.',
  sources: [S('wp-erlitou', 'Phases')] });
E({ uuid: 'yin-capital', title: 'Pan Geng moves the Shang capital to Yin (Anyang)', start: 'c. 1400 BCE', tracks: ['shang'],
  descr: 'The page dates this to the beginning of the 14th century BCE. Yin serves twelve kings until the Zhou conquest.',
  sources: [S('wp-anyang', 'History')] });
E({ uuid: 'wu-ding', title: 'Reign of Wu Ding', start: 'c. 1250 BCE', end: 'c. 1191 BCE', tracks: ['shang'],
  descr: 'The Shang at its zenith. His consort Fu Hao was a military leader. The oldest oracle-bone inscriptions date from his reign.',
  sources: [S('wp-shang', 'infobox'), S('wp-oracle-bone', 'lead')],
  startDates: [C(1250, 'wp-shang', 'infobox'), C(1225, 'wp-oracle-bone', "accession 'variously dated between 1250 and 1200 BC'", { margin: 25 }), C(1254, 'wp-oracle-bone', "radiocarbon '1254–1197 BC (±10 years)'", { margin: 10 })],
  endDates: [C(1191, 'wp-shang', 'infobox'), C(1197, 'wp-oracle-bone', 'radiocarbon', { margin: 10 })] });
E({ uuid: 'oracle-bones', title: 'Oracle-bone inscriptions', start: 'c. 1250 BCE', end: 'c. 1050 BCE', tracks: ['shang'],
  descr: 'Divination records on bones and shells from Yin: the earliest known Chinese writing. No identifiable writing before the 13th century BCE has been found.',
  sources: [S('wp-oracle-bone', 'infobox and lead')] });
E({ uuid: 'muye', title: 'Battle of Muye: Zhou conquers Shang', start: 'c. 1046 BCE', tracks: ['shang', 'zhou-western'],
  descr: 'King Wu of Zhou defeats Di Xin, the last Shang king. The day and month are certain but the year is not: at least 44 dates have been proposed.',
  sources: [S('wp-muye', 'infobox and Dating')],
  startDates: [
    C(1046, 'wp-muye', 'infobox (Xia–Shang–Zhou Chronology Project)', { chron: 'xszcp' }),
    C(1122, 'wp-muye', 'Dating (Liu Xin)', { chron: 'liu-xin' }),
    C(1027, 'wp-muye', 'Dating (old-text Bamboo Annals)'),
    C(1044, 'wp-muye', 'Dating (a reading of the Li gui inscription)'),
    C(1035, 'wp-muye', "Dating (radiocarbon wiggle-matching, 'between 1050 and 1020 BC')", { margin: 15 }),
    C(1074, 'wp-muye', "Dating ('44 different dates … ranging from 1130 to 1018 BC')", { margin: 56 }),
  ],
  links: [{ to: 'yin-capital', kind: 'conquers' }] });
E({ uuid: 'sanxingdui-city', title: 'Walled city at Sanxingdui', start: 'c. 1600 BCE', tracks: ['sanxingdui'],
  descr: 'A Bronze Age culture in Sichuan with no written records, famous for large bronze heads and masks (13th–12th century BCE).',
  sources: [S('wp-sanxingdui', 'Background')] });
E({ uuid: 'gonghe', title: 'Gonghe Regency', start: '841 BCE', end: '828 BCE', tracks: ['zhou-western'],
  descr: 'The earliest securely dated event in Chinese history.',
  sources: [S('wp-zhou', 'infobox')], chronology: 'xszcp' });
E({ uuid: 'zhou-east', title: 'Zhou capital moves east', start: '771 BCE', tracks: ['zhou-western', 'zhou-eastern'],
  descr: 'After the disaster at Mount Li, the court moves to Wangcheng: the end of the Western Zhou.',
  sources: [S('wp-zhou', 'infobox and lead')] });
E({ uuid: 'spring-autumn', title: 'Spring and Autumn period', start: 'c. 771 BCE', end: 'c. 481 BCE', tracks: ['zhou-eastern'],
  descr: 'Zhou kings lose real power to the states nominally under them.',
  sources: [S('wp-zhou', 'lead')],
  startDates: [C(771, 'wp-zhou', 'lead'), C(770, 'wp-zhou', 'navbox (c. 770 – c. 476 BC)')],
  endDates: [C(481, 'wp-zhou', 'lead'), C(476, 'wp-zhou', 'navbox')] });
E({ uuid: 'warring-states', title: 'Warring States period', start: 'c. 475 BCE', end: '221 BCE', tracks: ['zhou-eastern'],
  descr: 'Seven major states fight for supremacy. Qin deposes the last Zhou king in 256 BCE and unifies China in 221 BCE.',
  sources: [S('wp-zhou', 'lead and infobox')] });

// --- Americas ---
E({ uuid: 'watson-brake', title: 'Watson Brake mounds', start: 'c. 3500 BCE', end: 'c. 3000 BCE', tracks: ['mound-builders'],
  descr: 'An earthwork complex in Louisiana built by hunter-gatherers over about 500 years; abandoned around 2800 BCE. Among the oldest mound sites in North America.',
  sources: [S('wp-watson-brake', 'lead and Discovery and dating')] });
E({ uuid: 'poverty-point', title: 'Poverty Point', start: 'c. 1700 BCE', end: 'c. 1100 BCE', tracks: ['mound-builders'],
  descr: 'Monumental earthworks in Louisiana: six concentric ridges (mostly built 1600–1300 BCE) and large mounds. Recent syntheses put construction from as early as 1800 to as late as 1200 BCE.',
  sources: [S('wp-poverty-point', 'lead, Site description and History')],
  startDates: [C(1700, 'wp-poverty-point', 'lead'), C(1800, 'wp-poverty-point', 'History > Construction (recent syntheses)')],
  endDates: [C(1100, 'wp-poverty-point', 'lead'), C(1200, 'wp-poverty-point', 'History > Construction')] });
E({ uuid: 'caral', title: 'Caral', start: 'c. 2600 BCE', end: 'c. 2000 BCE', tracks: ['caral-supe'],
  descr: 'The best-known city of the Caral–Supe civilization, with platform mounds and sunken plazas. Its abandonment has been linked to a prolonged drought around 2200 BCE.',
  sources: [S('wp-caral', 'infobox and History'), S('wp-caral-supe', 'History and geography')],
  startDates: [C(2600, 'wp-caral', 'infobox'), C(2627, 'wp-caral', 'Scope of site (radiocarbon)')],
  endDates: [C(2000, 'wp-caral', 'infobox'), C(2020, 'wp-caral-supe', "History and geography (Shady: 'habitation from 2627 BCE to 2020 BCE')")] });
E({ uuid: 'caral-flutes', title: 'Caral flutes', start: 'c. 2170 BCE', tracks: ['caral-supe'],
  descr: 'Thirty-two flutes made of condor and pelican bone.',
  sources: [S('wp-caral', 'Musical instruments')],
  startDates: [C(2170, 'wp-caral', "Musical instruments ('radiocarbon dated to 2170±90 BC')", { margin: 90 })] });
E({ uuid: 'valdivia-pottery', title: 'Valdivia pottery', start: 'c. 3000 BCE', end: 'c. 2700 BCE', tracks: ['valdivia'],
  descr: 'Phase A on the coast of Ecuador, long thought the oldest pottery in South America.',
  sources: [S('wp-valdivia', 'Influences on Valdivia culture')] });
E({ uuid: 'san-lorenzo', title: 'San Lorenzo, the first Olmec centre', start: 'c. 1400 BCE', end: 'c. 900 BCE', tracks: ['olmec'],
  descr: 'The largest city in Mesoamerica from roughly 1200 to 900 BCE, known for its colossal stone heads. Destroyed in the 10th century BCE.',
  sources: [S('wp-san-lorenzo', 'lead and Description')] });
E({ uuid: 'la-venta', title: 'La Venta', start: 'c. 900 BCE', end: 'c. 400 BCE', tracks: ['olmec'],
  descr: 'The main Olmec centre after San Lorenzo, with a great earthen pyramid; all but abandoned by the beginning of the 4th century BCE.',
  sources: [S('wp-la-venta', 'Overview'), S('wp-olmecs', 'La Venta')] });
E({ uuid: 'la-venta-pyramid', title: 'La Venta Great Pyramid', start: 'c. 394 BCE', tracks: ['olmec'],
  descr: 'A radiocarbon date from Complex C, the great pyramid.',
  sources: [S('wp-la-venta', 'Complex C')],
  startDates: [C(394, 'wp-la-venta', "Complex C ('394 ± 30 BCE')", { margin: 30 })] });
E({ uuid: 'maya-cities', title: 'First Maya cities', start: 'c. 750 BCE', tracks: ['maya'],
  descr: 'Large structures appear in the Maya lowlands, for example at Nakbe.',
  sources: [S('wp-maya', 'lead')] });
E({ uuid: 'el-mirador', title: 'El Mirador', start: 'c. 550 BCE', end: 'c. 150 CE', tracks: ['maya'],
  descr: 'A huge Preclassic Maya city in the Mirador Basin, at its height from the 3rd century BCE.',
  sources: [S('wp-el-mirador', 'History')],
  startDates: [C(600, 'wp-el-mirador', "History ('from about the 6th century BC'): start of century"), C(501, 'wp-el-mirador', 'History: end of century')],
  endDates: [C('150 CE', 'wp-el-mirador', "History ('abandoned … by about 150 AD')")] });
E({ uuid: 'maya-script', title: 'Earliest Maya writing', start: 'c. 300 BCE', end: 'c. 200 BCE', tracks: ['maya'],
  descr: 'The earliest inscriptions in an identifiably Maya script, in the Petén Basin.',
  sources: [S('wp-maya', 'Writing and literacy')] });
E({ uuid: 'chavin-old-temple', title: 'Chavín de Huántar: Old Temple', start: 'c. 900 BCE', end: 'c. 500 BCE', tracks: ['chavin'],
  descr: 'The highland ceremonial centre of the Chavín culture; the New Temple follows from about 500 to 200 BCE.',
  sources: [S('wp-chavin', 'Architecture')] });

// ---------- changes to existing events ----------
const ev = (id) => {
  const e = d.events.find((x) => x.uuid === id);
  if (!e) throw new Error('no event ' + id);
  return e;
};
const addTrack = (id, t) => { const e = ev(id); if (!e.tracks.includes(t)) e.tracks.push(t); };
addTrack('battle-of-delta', 'philistines');
addTrack('jerusalem-587', 'israel-judah');
addTrack('jerusalem-597', 'israel-judah');
addTrack('fall-of-nineveh', 'medes');
addTrack('cyrus-revolt', 'medes');
addTrack('amarna-letters', 'ugarit');
addTrack('megiddo', 'can-lba');
addTrack('bronze-age-collapse', 'levant');

d.events.push(...newEvents);

// ---------- meta ----------
d.meta.subtitle = 'The Near East, Egypt, the Aegean, Iran, the Indus, China and the Americas, c. 3500–330 BCE';
d.meta.description = 'Bronze Age and early Iron Age civilizations: Mesopotamia and Assyria, the Levant, Egypt, Anatolia, the Aegean, Iran, the Indus Valley, China, and the Americas.';
d.meta.collapsed = [...d.meta.collapsed, 'assyria', 'canaan', 'elam', 'harappan', 'zhou'];

// Compact output: anything that fits in 150 columns stays on one line.
const inline = (v) => JSON.stringify(v, null, 1).replace(/\n\s*/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']');
const fmt = (v, ind = '') => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  const one = inline(v);
  if (ind.length + one.length <= 150) return one;
  const n = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => n + fmt(x, n)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.entries(v).map(([k, x]) => n + JSON.stringify(k) + ': ' + fmt(x, n)).join(',\n') + '\n' + ind + '}';
};
writeFileSync(file, fmt(d) + '\n');
console.log('added', newEvents.length, 'events;', d.tracks.length, 'tracks;', Object.keys(d.sources).length, 'sources');
