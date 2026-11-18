// The early Holocene and Neolithic outside the Near East, c. 9300–3500 BCE (2026-11-18, the author's request
// to take the timeline back to 9000 BCE): North and Sub-Saharan Africa, Europe, South Asia, China, Korea and
// Japan, New Guinea and the Americas. Every date was quoted verbatim from the cited Wikipedia page by a fetch
// agent; "years ago" and BP are converted by subtracting 1950 (judgment call 15). No page read carried an
// AI-text warning. Not found (404): Shangshan culture, Khartoum Neolithic. See docs/ancient-sources.md, tenth
// pass. Also sets the timeline's subtitle, description and a 1000-year zoom step for the longer range.
// Re-runnable: it replaces what it added before. Run after neolithic-near-east.ts and before groups.ts.
//   node scripts/additions/neolithic-world.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-capsian', 'Capsian culture', 'Capsian_culture'],
  ['wp-gobero', 'Gobero', 'Gobero'],
  ['wp-dufuna', 'Dufuna canoe', 'Dufuna_canoe'],
  ['wp-star-carr', 'Star Carr', 'Star_Carr'],
  ['wp-maglemosian', 'Maglemosian culture', 'Maglemosian_culture'],
  ['wp-lepenski-vir', 'Lepenski Vir', 'Lepenski_Vir'],
  ['wp-neolithic-europe', 'Neolithic Europe', 'Neolithic_Europe'],
  ['wp-sesklo', 'Sesklo', 'Sesklo'],
  ['wp-starcevo', 'Starčevo–Körös–Criș culture', 'Star%C4%8Devo%E2%80%93K%C3%B6r%C3%B6s%E2%80%93Cri%C8%99_culture'],
  ['wp-cardial', 'Cardium pottery', 'Cardium_pottery'],
  ['wp-lbk', 'Linear Pottery culture', 'Linear_Pottery_culture'],
  ['wp-vinca', 'Vinča culture', 'Vin%C4%8Da_culture'],
  ['wp-varna', 'Varna Necropolis', 'Varna_Necropolis'],
  ['wp-carnac', 'Carnac stones', 'Carnac_stones'],
  ['wp-mehrgarh', 'Mehrgarh', 'Mehrgarh'],
  ['wp-bhirrana', 'Bhirrana', 'Bhirrana'],
  ['wp-lahuradewa', 'Lahuradewa', 'Lahuradewa'],
  ['wp-pengtoushan', 'Pengtoushan culture', 'Pengtoushan_culture'],
  ['wp-jiahu', 'Jiahu', 'Jiahu'],
  ['wp-peiligang', 'Peiligang culture', 'Peiligang_culture'],
  ['wp-xinglongwa', 'Xinglongwa culture', 'Xinglongwa_culture'],
  ['wp-yangshao', 'Yangshao culture', 'Yangshao_culture'],
  ['wp-hemudu', 'Hemudu culture', 'Hemudu_culture'],
  ['wp-hongshan', 'Hongshan culture', 'Hongshan_culture'],
  ['wp-dawenkou', 'Dawenkou culture', 'Dawenkou_culture'],
  ['wp-jeulmun', 'Jeulmun pottery period', 'Jeulmun_pottery_period'],
  ['wp-kuk', 'Kuk Swamp', 'Kuk_Swamp'],
  ['wp-guila-naquitz', 'Guilá Naquitz Cave', 'Guil%C3%A1_Naquitz_Cave'],
  ['wp-maize', 'Maize', 'Maize'],
  ['wp-koster', 'Koster Site', 'Koster_Site'],
  ['wp-windover', 'Windover Archeological Site', 'Windover_Archeological_Site'],
  ['wp-plano', 'Plano cultures', 'Plano_cultures'],
  ['wp-cueva-manos', 'Cueva de las Manos', 'Cueva_de_las_Manos'],
  ['wp-paloma', 'Paloma (archaeological site)', 'Paloma_(archaeological_site)'],
  ['wp-huaca-prieta', 'Huaca Prieta', 'Huaca_Prieta'],
  ['wp-potato', 'Potato', 'Potato'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
ed.track({ id: 'capsian', name: 'Capsian culture (Algeria and Tunisia)', color: '#a08a5a', parent: 'north-africa', span: { start: 'c. 9000 BCE', end: 'c. 5400 BCE' } }, { after: 'sahara' });
ed.track({ id: 'green-sahara', name: 'Green Sahara peoples (Gobero, Dufuna)', color: '#7a9a5a', parent: 'sub-saharan' }, { before: 'punt' });
ed.tracks(
  [
    { id: 'mesolithic-north', name: 'Mesolithic northern Europe (Star Carr, Maglemosian)', color: '#5a7a6a', parent: 'europe', span: { start: 'c. 9300 BCE', end: 'c. 6000 BCE' } },
    { id: 'lepenski-vir', name: 'Lepenski Vir', color: '#6a7a8a', parent: 'europe', span: { start: 'c. 7200 BCE', end: 'c. 6000 BCE', startDates: [C(7200, 'wp-lepenski-vir', 'lead'), C(9500, 'wp-lepenski-vir', 'lead (9500/7200)')] } },
    { id: 'balkan-neolithic', name: 'Neolithic Greece and the Balkans', color: '#8a6a6a', parent: 'europe' },
    { id: 'cardial', name: 'Cardial Ware (Mediterranean)', color: '#6a8aa0', parent: 'europe', span: { start: 'c. 6400 BCE', end: 'c. 5500 BCE' } },
    { id: 'lbk', name: 'Linear Pottery culture', color: '#7a6a9a', parent: 'europe', span: { start: 'c. 5500 BCE', end: 'c. 4500 BCE' } },
  ],
  { before: 'megaliths' },
);
ed.tracks(
  [
    {
      id: 'mehrgarh', name: 'Mehrgarh', color: '#a07a4a', parent: 'indus',
    },
    { id: 'early-india', name: 'Early farming in northern India (Bhirrana, Lahuradewa)', color: '#9a6a3a', parent: 'indus' },
  ],
  { before: 'harappan' },
);
ed.tracks(
  [
    { id: 'pengtoushan', name: 'Pengtoushan culture', color: '#6a8a6a', parent: 'china', span: { start: 'c. 7500 BCE', end: 'c. 6100 BCE' } },
    { id: 'peiligang', name: 'Peiligang culture and Jiahu', color: '#8a7a5a', parent: 'china', span: { start: 'c. 7000 BCE', end: 'c. 5000 BCE' } },
    { id: 'xinglongwa', name: 'Xinglongwa culture', color: '#7a6a5a', parent: 'china', span: { start: 'c. 6200 BCE', end: 'c. 5000 BCE', endDates: [C(5000, 'wp-xinglongwa', 'infobox'), C(5400, 'wp-xinglongwa', 'lead')] } },
    { id: 'hemudu', name: 'Hemudu culture', color: '#5a7a5a', parent: 'china', span: { start: 'c. 5500 BCE', end: 'c. 3300 BCE' } },
    { id: 'yangshao', name: 'Yangshao culture', color: '#a0603a', parent: 'china', span: { start: 'c. 5000 BCE', end: 'c. 3000 BCE' } },
    { id: 'hongshan', name: 'Hongshan culture', color: '#6a8a8a', parent: 'china', span: { start: 'c. 4700 BCE', end: 'c. 2900 BCE' } },
    { id: 'dawenkou', name: 'Dawenkou culture', color: '#8a5a5a', parent: 'china', span: { start: 'c. 4300 BCE', end: 'c. 2600 BCE' } },
  ],
  { before: 'liangzhu' },
);
ed.tracks(
  [
    { id: 'jeulmun', name: 'Jeulmun pottery period (Korea)', color: '#8a5a7a', parent: 'korea-japan', span: { start: 'c. 8000 BCE', end: 'c. 1500 BCE' } },
    { id: 'jomon-early', name: 'Jōmon (Initial and Early)', color: '#9a7a6a', parent: 'korea-japan', span: { start: '8500 BCE', end: '3520 BCE' } },
  ],
  { before: 'gojoseon' },
);
ed.track({ id: 'new-guinea', name: 'New Guinea highlands (Kuk Swamp)', color: '#4a8a6a', parent: 'oceania' }, { before: 'marianas' });
ed.tracks(
  [
    { id: 'plano', name: 'Plano cultures', color: '#8a7a4a', parent: 'north-america', span: { start: 'c. 9000 BCE', end: 'c. 6000 BCE' } },
    { id: 'archaic-na', name: 'Early and Middle Archaic (Koster, Windover)', color: '#6a6a4a', parent: 'north-america' },
  ],
  { before: 'mound-builders' },
);
ed.track({ id: 'oaxaca-archaic', name: 'Early domestication (Guilá Naquitz, Balsas)', color: '#5a8a4a', parent: 'mesoamerica' }, { before: 'mokaya' });
ed.tracks(
  [
    { id: 'cueva-manos', name: 'Cueva de las Manos', color: '#a05a4a', parent: 'south-america', span: { start: 'c. 7300 BCE', end: '700 CE' } },
    { id: 'andes-archaic', name: 'Early Andean farmers and fishers', color: '#7a7a4a', parent: 'south-america' },
  ],
  { before: 'valdivia' },
);

// ---------- Africa ----------
ed.event({
  uuid: 'capsian', title: 'Capsian hunters of Algeria and Tunisia', start: 'c. 9000 BCE', end: 'c. 5400 BCE', tracks: ['capsian'],
  descr: 'An Epipalaeolithic tradition whose first phase overlaps the African humid period, in open savanna; they hunted game from aurochs and hartebeest to hares and snails. Historical linguists tentatively link it with the earliest Afroasiatic speakers in Africa.',
  sources: [S('wp-capsian', 'infobox and lead')],
});
ed.event({
  uuid: 'gobero', title: 'Gobero: the oldest cemetery in the Sahara', start: 'c. 7700 BCE', end: 'c. 6200 BCE', tracks: ['green-sahara'],
  descr: 'Kiffian fisher-gatherers, makers of pottery with wavy lines, live beside a large lake in the Green Sahara (7500–3500 BCE); after a gap (6200–5200 BCE) Tenerian people herd domesticated cattle there. At least 182 burials include a man buried with a turtle carapace and a grave decorated with flowers.',
  sources: [S('wp-gobero', 'infobox, lead, Site, Excavations, Kiffian culture, Tenerian culture and Burials')],
  startDates: [C(7700, 'wp-gobero', 'Site (Phase II)'), C(8000, 'wp-gobero', 'lead and infobox')],
});
ed.event({
  uuid: 'dufuna-canoe', title: 'The Dufuna canoe, Africa’s oldest boat', start: 'c. 6250 BCE', tracks: ['green-sahara'],
  descr: 'The second-oldest known boat in the world, after the Pesse canoe.',
  sources: [S('wp-dufuna', 'infobox, lead and Background')],
  startDates: [C(6250, 'wp-dufuna', 'infobox'), R(6556, 6388, 'wp-dufuna', 'Background (radiocarbon)'), R(6164, 6005, 'wp-dufuna', 'Background (radiocarbon)')],
});

// ---------- Europe ----------
ed.event({
  uuid: 'star-carr', title: 'Star Carr', start: 'c. 9300 BCE', end: 'c. 8480 BCE', tracks: ['mesolithic-north'],
  descr: 'Britain’s oldest structure and the earliest known carpentry in Europe; a pendant found in 2015 is thought to be the oldest Mesolithic art in Britain. Occupation lasts about 800 years.',
  sources: [S('wp-star-carr', 'infobox, lead, Settlement and artefacts and Post-2000 investigations')],
  startDates: [R(9335, 9275, 'wp-star-carr', 'Settlement and artefacts')],
  endDates: [R(8525, 8440, 'wp-star-carr', 'Settlement and artefacts')],
});
ed.event({
  uuid: 'maglemosian', title: 'Maglemosian hunters of the north', start: 'c. 9000 BCE', end: 'c. 6000 BCE', tracks: ['mesolithic-north'],
  descr: 'They appear to have domesticated the dog; bark huts survive, and they fished with a characteristic leister spear.',
  sources: [S('wp-maglemosian', 'infobox, lead, table and Characteristics')],
  endDates: [C(6000, 'wp-maglemosian', 'lead and infobox'), C(6400, 'wp-maglemosian', 'table (Late Maglemosian)')],
});
ed.event({
  uuid: 'lepenski-vir', title: 'Lepenski Vir: fish-faced sculptures', start: 'c. 6300 BCE', end: 'c. 6000 BCE', tracks: ['lepenski-vir'],
  descr: 'The late architectural phase, with numerous fish sculptures with human-like faces. From about 7500 BC Early European Farmers arriving from Asia Minor begin to settle the Balkans and the Danube valley.',
  sources: [S('wp-lepenski-vir', 'lead and Archaeogenetics')],
});
ed.event({
  uuid: 'farming-greece', title: 'Farming reaches Greece', start: 'c. 7000 BCE', tracks: ['balkan-neolithic'],
  descr: 'Neolithic material culture came to Europe via western Anatolia. Farming spread from the Aegean to Britain in about 2,500 years (6500–4000 BC), at about 1 km a year; the Sesklo culture is called the earliest known Neolithic culture of Europe.',
  sources: [S('wp-neolithic-europe', 'lead and Archaeology'), S('wp-sesklo', 'infobox and lead')],
  startDates: [C(7000, 'wp-neolithic-europe', 'lead'), C(6500, 'wp-neolithic-europe', 'Archaeology (Knossos, Franchthi Cave, Thessaly)'), C(7510, 'wp-sesklo', 'infobox (pre-Sesklo)')],
  links: [{ to: 'catalhoyuk', kind: 'related' }],
});
ed.event({
  uuid: 'starcevo', title: 'Starčevo–Körös–Criș farmers', start: 'c. 6200 BCE', end: 'c. 4500 BCE', tracks: ['balkan-neolithic'],
  descr: 'Dated by the infobox; the body gives about 5500–4500, and other sources 6200–5200.',
  sources: [S('wp-starcevo', 'infobox and Characteristics')],
  startDates: [C(6200, 'wp-starcevo', 'infobox'), C(5500, 'wp-starcevo', 'Characteristics')],
  links: [{ to: 'farming-greece', kind: 'related' }],
});
ed.event({
  uuid: 'cardial', title: 'Cardial Ware farmers spread along the Mediterranean', start: 'c. 6400 BCE', end: 'c. 5500 BCE', tracks: ['cardial'],
  descr: 'Pottery impressed with cockle shells, from Epirus and Corfu (6400–6200 BC) to the Atlantic coasts of Portugal and Morocco; it reaches Iberia in probably no more than 100–200 years. Its people were closely related to the earlier Neolithic farmers of north-west Anatolia.',
  sources: [S('wp-cardial', 'infobox, lead, The Mediterranean Neolithic and Genetics')],
});
ed.event({
  uuid: 'lbk', title: 'Linear Pottery farmers spread across central Europe', start: 'c. 5500 BCE', end: 'c. 4500 BCE', tracks: ['lbk'],
  descr: 'Appearing about 5600–5400 BC on the middle Danube, the culture spreads about 1,500 km in 360 years, building long houses.',
  sources: [S('wp-lbk', 'infobox, lead, Culture and Geography')],
  links: [{ to: 'starcevo', kind: 'related' }],
});
ed.event({
  uuid: 'vinca', title: 'Vinča culture: early copper smelting and Vinča symbols', start: 'c. 5400 BCE', end: 'c. 4500 BCE', tracks: ['balkan-neolithic'],
  descr: 'It has the earliest known example of copper smelting, and its symbols are conjectured by some to be the earliest proto-writing.',
  sources: [S('wp-vinca', 'infobox, lead and Chronology')],
  startDates: [C(5400, 'wp-vinca', 'infobox and lead'), C(5700, 'wp-vinca', 'Chronology (Chapman 1981)')],
});
ed.event({
  uuid: 'varna', title: 'Varna Necropolis: the oldest gold', start: 'c. 4569 BCE', end: 'c. 4340 BCE', tracks: ['balkan-neolithic'],
  descr: 'The oldest gold treasure and jewellery in the world, dated by radiocarbon in 2006.',
  sources: [S('wp-varna', 'infobox, lead and Chronology')],
  startDates: [C(4569, 'wp-varna', 'Chronology'), C(4600, 'wp-varna', 'lead')],
  endDates: [C(4340, 'wp-varna', 'Chronology'), C(4200, 'wp-varna', 'lead')],
});
ed.event({
  uuid: 'carnac', title: 'The Carnac stones', start: 'c. 4500 BCE', end: 'c. 3300 BCE', tracks: ['megaliths'],
  descr: 'A dense collection of megalithic sites near the south coast of Brittany; the tumulus at Tumiac was raised between 4790 and 4530 BC, contemporary with the rich Varna burials.',
  sources: [S('wp-carnac', 'lead, Tumuli and Tumiac')],
  links: [{ to: 'varna', kind: 'related' }],
});

// ---------- South Asia ----------
ed.event({
  uuid: 'mehrgarh', title: 'Mehrgarh: the earliest farming in South Asia', start: 'c. 7000 BCE', tracks: ['mehrgarh'],
  descr: 'A farming village of unbaked mud brick; barley and zebu cattle were probably domesticated locally, and drilled teeth show proto-dentistry. Its dating is debated (Jarrige: before 7000 BCE; Mutin and Zazzo: 5250–4650 BCE). Its culture later migrated into the Indus Valley and became the Indus Valley Civilisation.',
  sources: [S('wp-mehrgarh', 'lead, Period I, Lifestyle, History and Notes')],
  startDates: [C(7000, 'wp-mehrgarh', 'lead and Notes (Jarrige)'), R(5250, 4650, 'wp-mehrgarh', 'Period I (Mutin and Zazzo)')],
});
ed.event({
  uuid: 'bhirrana', title: 'Bhirrana’s earliest levels (Hakra ware)', start: 'c. 7400 BCE', tracks: ['early-india'],
  descr: 'Charcoal from the lowest levels gave 7570–7180 BCE, said to predate the Indus Valley civilisation; other excavators date these levels much later (Garge: from about 4600 BCE).',
  sources: [S('wp-bhirrana', 'infobox, lead and Dating')],
  startDates: [R(7570, 7180, 'wp-bhirrana', 'Notes (Dikshit and Rami)'), R(6689, 6201, 'wp-bhirrana', 'Notes (second date)'), C(4600, 'wp-bhirrana', 'Dating (Garge 2010)')],
});
ed.event({
  uuid: 'lahuradewa', title: 'Lahuradewa: early rice and pottery in the Ganges plain', start: 'c. 6500 BCE', tracks: ['early-india'],
  descr: 'Rice from Period IA is AMS-dated to the 7th millennium BCE, but whether it was cultivated or gathered wild is debated; its pottery is the oldest evidence of ceramics in the Indian Subcontinent. Irfan Habib gives 4220–2879 BCE.',
  sources: [S('wp-lahuradewa', 'lead')],
  startDates: [R(7000, 6000, 'wp-lahuradewa', "lead ('the 7th millennium BCE')"), R(4220, 2879, 'wp-lahuradewa', 'lead (Irfan Habib)')],
});

// ---------- China, Korea and Japan ----------
ed.event({
  uuid: 'pengtoushan-rice', title: 'Domesticated rice at Pengtoushan', start: 'c. 8000 BCE', tracks: ['pengtoushan'],
  descr: 'Rice residues carbon-dated to 8200–7800 BC show that rice had been domesticated; by 4000 BC evidence of rice domestication in the region is abundant.',
  sources: [S('wp-pengtoushan', 'Rice cultivation')],
  startDates: [R(8200, 7800, 'wp-pengtoushan', 'Rice cultivation')],
});
ed.event({
  uuid: 'jiahu', title: 'Jiahu: bone flutes, carved signs and fermented drink', start: 'c. 7000 BCE', end: 'c. 5700 BCE', tracks: ['peiligang'],
  descr: 'The earliest Peiligang site: 33 flutes carved from crane wing bones, eleven pictographic symbols on tortoise shell and bone, foxtail millet and rice, alcohol fermented from rice, honey, grapes and hawthorn, and the earliest common-carp aquaculture. A flood ends it around 5700 BC.',
  sources: [S('wp-jiahu', 'infobox, lead, Inscriptions, Agriculture and Pottery and alcohol production'), S('wp-peiligang', 'Jiahu')],
});
ed.event({
  uuid: 'peiligang', title: 'Peiligang millet farmers', start: 'c. 7000 BCE', end: 'c. 5000 BCE', tracks: ['peiligang'],
  descr: 'Cultivating millet and raising pigs, they make some of the oldest pottery in ancient China; their society is egalitarian. They are followed by the Yangshao culture.',
  sources: [S('wp-peiligang', 'infobox, lead and Peiligang culture')],
});
ed.event({
  uuid: 'xinglongwa', title: 'Xinglongwa: the earliest ditched village in China', start: 'c. 6200 BCE', tracks: ['xinglongwa'],
  descr: 'Houses built in rows; 120 pit-houses at the type site. In the richest grave a man is buried with a pair of pigs and jade objects, and millet remains are found.',
  sources: [S('wp-xinglongwa', 'infobox and lead')],
});
ed.event({
  uuid: 'hemudu', title: 'Hemudu: stilt houses and early rice', start: 'c. 5500 BCE', end: 'c. 3300 BCE', tracks: ['hemudu'],
  descr: 'One of the earliest rice-growing cultures; its people live in long stilt houses and make black pottery, carved jade, ivory, bone whistles and a red lacquer bowl.',
  sources: [S('wp-hemudu', 'infobox, lead and Material culture')],
});
ed.event({
  uuid: 'yangshao', title: 'Yangshao painted pottery (Banpo phase)', start: 'c. 5000 BCE', end: 'c. 4000 BCE', tracks: ['yangshao'],
  descr: 'Millet farmers who also grow some rice and raise pigs; they make white, red and black painted pottery. A dragon statue of the fifth millennium BC is the world’s oldest known dragon depiction. Scholars trace a line from Yangshao to the Longshan and Shang cultures.',
  sources: [S('wp-yangshao', 'infobox, lead, Phases, Origins, Subsistence, Crafts and Social structure')],
});
ed.event({
  uuid: 'hongshan', title: 'Hongshan jade dragons', start: 'c. 4700 BCE', end: 'c. 2900 BCE', tracks: ['hongshan'],
  descr: 'Known for jade pig dragons and embryo dragons, among the earliest jade working; it interacts with the contemporary Yangshao, and its jades show considerable kinship with some Shang jades.',
  sources: [S('wp-hongshan', 'infobox, lead, Historical context, Artifacts and Development of Chinese civilization')],
});
ed.event({
  uuid: 'dawenkou', title: 'Dawenkou culture', start: 'c. 4300 BCE', end: 'c. 2600 BCE', tracks: ['dawenkou'],
  descr: 'Turquoise, jade and ivory are common; the earliest alligator drums appear here. It co-exists with the Yangshao culture and has a lead role in generating Longshan.',
  sources: [S('wp-dawenkou', 'infobox, lead, Chronology and Interactions with other cultures')],
});
ed.event({
  uuid: 'jeulmun', title: 'Early Jeulmun pit-house villages', start: 'c. 6000 BCE', end: 'c. 3500 BCE', tracks: ['jeulmun'],
  descr: 'Small semi-permanent settlements with pit-houses. Gosan-ni pottery has been dated to 10,000 BC, though more dating is needed.',
  sources: [S('wp-jeulmun', 'infobox, lead, Incipient Jeulmun and Early Jeulmun')],
});
ed.event({
  uuid: 'jomon-peach', title: 'Domesticated peaches reach Jōmon Japan from China', start: 'c. 4700 BCE', end: 'c. 4400 BCE', tracks: ['jomon-early'],
  descr: 'In the Early Jōmon, a period that saw an explosion in population. Jōmon pottery, decorated by impressing cords into wet clay, is among the oldest in the world.',
  sources: [S('wp-jomon', 'Chronology, Early Jōmon, Early agriculture and Pottery')],
});

// ---------- New Guinea ----------
ed.event({
  uuid: 'kuk-drainage', title: 'Kuk Swamp: drainage ditches and early agriculture', start: 'c. 7050 BCE', tracks: ['new-guinea'],
  descr: 'One of the places where people independently developed agriculture; the native crop taro was grown, and drainage ditches date back to about 9,000 years ago.',
  sources: [S('wp-kuk', 'lead and History')],
});
ed.event({
  uuid: 'kuk-bananas', title: 'Bananas and sugar cane planted at Kuk', start: 'c. 4950 BCE', end: 'c. 4450 BCE', tracks: ['new-guinea'],
  descr: 'Eumusa bananas; a managed grassland of 6950–6550 years ago points to deliberate planting.',
  sources: [S('wp-kuk', 'lead and History')],
});

// ---------- Americas ----------
ed.event({
  uuid: 'plano', title: 'Plano bison hunters', start: 'c. 9000 BCE', end: 'c. 6000 BCE', tracks: ['plano'],
  descr: 'They hunted Bison antiquus, forcing stampedes off cliffs.',
  sources: [S('wp-plano', 'infobox, History and Distinguishing characteristics')],
});
ed.event({
  uuid: 'koster-dogs', title: 'The oldest dogs in the Americas (Koster)', start: 'c. 7950 BCE', tracks: ['archaic-na'],
  descr: 'Dog burials about 9,900 years old at one of the oldest known cemetery sites in eastern North America, occupied from the early Archaic (7500 BC).',
  sources: [S('wp-koster', 'lead')],
});
ed.event({
  uuid: 'windover', title: 'Windover pond burials', start: 'c. 6050 BCE', end: 'c. 5050 BCE', tracks: ['archaic-na'],
  descr: 'Hunter-gatherers bury their dead in the pond; brain tissue survives in 91 skulls, and graves hold woven palm-leaf fabrics and the earliest documented bottle gourd north of Mexico.',
  sources: [S('wp-windover', 'lead, Site, Deposition, Textiles and Bags and containers')],
});
ed.event({
  uuid: 'squash', title: 'Squash domesticated at Guilá Naquitz', start: 'c. 6050 BCE', tracks: ['oaxaca-archaic'],
  descr: 'The earliest known evidence for domestication of any crop on the continent: intentional breeding of squash (C. pepo) by no later than 8,000 years BP. Earlier AMS dates of 10,000 BP have been called into question.',
  sources: [S('wp-guila-naquitz', 'lead, Crop domestication and Timeline of domesticate changes')],
  startDates: [C(6050, 'wp-guila-naquitz', "Crop domestication ('no later than 8,000 years BP')"), C(8050, 'wp-guila-naquitz', 'Timeline (AMS 10,000 BP, questioned)')],
});
ed.event({
  uuid: 'maize-domesticated', title: 'Maize domesticated in southern Mexico', start: 'c. 7050 BCE', tracks: ['oaxaca-archaic'],
  descr: 'Domesticated by indigenous peoples from wild teosinte about 9,000 years ago.',
  sources: [S('wp-maize', 'lead')],
});
ed.event({
  uuid: 'cueva-manos', title: 'Cueva de las Manos: the first paintings', start: 'c. 7300 BCE', tracks: ['cueva-manos'],
  descr: 'The oldest-known cave paintings in South America, made in several waves until AD 700 by hunters of guanacos.',
  sources: [S('wp-cueva-manos', 'lead, History and Artwork')],
});
ed.event({
  uuid: 'potato', title: 'Potatoes domesticated around Lake Titicaca', start: 'c. 6550 BCE', tracks: ['andes-archaic'],
  descr: 'In southern Peru and northwestern Bolivia, about 7,000–10,000 years ago.',
  sources: [S('wp-potato', 'lead and History')],
  startDates: [R(8050, 5050, 'wp-potato', "lead ('about 7,000–10,000 years ago')")],
});
ed.event({
  uuid: 'paloma', title: 'Paloma, an early fishing village', start: 'c. 5700 BCE', end: 'c. 2800 BCE', tracks: ['andes-archaic'],
  descr: 'One of the earliest villages in the Americas dated stratigraphically; its diet was mainly fish and shellfish.',
  sources: [S('wp-paloma', 'lead and Subsistence activities')],
});
ed.event({
  uuid: 'huaca-prieta', title: 'Huaca Prieta: early maize and dyed cotton', start: 'c. 4700 BCE', tracks: ['andes-archaic'],
  descr: 'Corncobs from Paredones and Huaca Prieta may date from as early as 4700 BCE (Dolores Piperno); dyed cotton fabric found in 2016 is about 6000 years old.',
  sources: [S('wp-huaca-prieta', 'Early maize found and Early use of cotton and indigo dye')],
});

// ---------- the timeline's own settings ----------
const meta = ed.data.meta;
if (!meta.increments.includes(1000)) meta.increments = [...meta.increments, 1000];
// open on the whole range: at 500 years per tick 9000–330 BCE fits on a normal screen
meta.defaultIncrement = 500;
meta.subtitle = 'From the first farmers to the Iron Age: Europe, Africa, the Near East, Asia, Oceania and the Americas, c. 9000–330 BCE';
meta.description = meta.description.replace(/^Bronze Age and early Iron Age civilizations:/, 'Neolithic, Bronze Age and early Iron Age cultures and civilizations:');

ed.save();
