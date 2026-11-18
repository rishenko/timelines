// The Neolithic of the Near East and Egypt, c. 10,000–3500 BCE (2026-11-18, the author's request to take the
// timeline back to 9000 BCE). New rows in the Levant, Anatolia, Mesopotamia, Iran & Central Asia, the Caucasus
// and Egypt. Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; "years ago" and
// BP are converted by subtracting 1950 (judgment call 15). No page read carried an AI-text warning. See
// docs/ancient-sources.md, tenth pass.
// Re-runnable: it replaces what it added before. Run after fill-gaps.ts and before groups.ts.
//   node scripts/additions/neolithic-near-east.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-ppna', 'Pre-Pottery Neolithic A', 'Pre-Pottery_Neolithic_A'],
  ['wp-ppnb', 'Pre-Pottery Neolithic B', 'Pre-Pottery_Neolithic_B'],
  ['wp-jericho', 'Jericho', 'Jericho'],
  ['wp-jericho-tower', 'Tower of Jericho', 'Tower_of_Jericho'],
  ['wp-ain-ghazal', 'Ayn Ghazal (archaeological site)', 'Ayn_Ghazal_(archaeological_site)'],
  ['wp-ghassulian', 'Ghassulian', 'Ghassulian'],
  ['wp-gobekli', 'Göbekli Tepe', 'G%C3%B6bekli_Tepe'],
  ['wp-catalhoyuk', 'Çatalhöyük', '%C3%87atalh%C3%B6y%C3%BCk'],
  ['wp-cayonu', 'Çayönü', '%C3%87ay%C3%B6n%C3%BC'],
  ['wp-hassuna', 'Hassuna culture', 'Hassuna_culture'],
  ['wp-samarra', 'Samarra culture', 'Samarra_culture'],
  ['wp-halaf', 'Halaf culture', 'Halaf_culture'],
  ['wp-ubaid', 'Ubaid period', 'Ubaid_period'],
  ['wp-eridu', 'Eridu', 'Eridu'],
  ['wp-ganj-dareh', 'Ganj Dareh', 'Ganj_Dareh'],
  ['wp-chogha-golan', 'Chogha Golan', 'Chogha_Golan'],
  ['wp-chogha-mish', 'Chogha Mish', 'Chogha_Mish'],
  ['wp-sialk', 'Tepe Sialk', 'Tepe_Sialk'],
  ['wp-jeitun', 'Jeitun', 'Jeitun'],
  ['wp-shahr-e-sukhteh', 'Shahr-e Sukhteh', 'Shahr-e_Sukhteh'],
  ['wp-shulaveri', 'Shulaveri–Shomu culture', 'Shulaveri%E2%80%93Shomu_culture'],
  ['wp-nabta', 'Nabta Playa', 'Nabta_Playa'],
  ['wp-prehistoric-egypt', 'Prehistoric Egypt', 'Prehistoric_Egypt'],
  ['wp-merimde', 'Merimde culture', 'Merimde_culture'],
  ['wp-badarian', 'Badarian culture', 'Badarian_culture'],
  ['wp-naqada', 'Naqada culture', 'Naqada_culture'],
  ['wp-naqada-i', 'Naqada I', 'Naqada_I'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
ed.tracks(
  [
    { id: 'ppna', name: 'Pre-Pottery Neolithic A (Levant)', color: '#9a7a5a', parent: 'levant', span: { start: 'c. 10000 BCE', end: 'c. 8800 BCE', startDates: [C(10000, 'wp-ppna', 'lead and infobox'), C(9600, 'wp-gobekli', 'Dawn of village life')] } },
    {
      id: 'ppnb', name: 'Pre-Pottery Neolithic B (Levant)', color: '#8a6a4a', parent: 'levant',
      span: { start: 'c. 8800 BCE', end: 'c. 6500 BCE', endDates: [C(6500, 'wp-ppnb', 'lead and infobox'), C(6000, 'wp-ppnb', "Lifestyle ('8,700–6,000 BC')")] },
    },
    { id: 'ghassulian', name: 'Ghassulian culture (southern Levant)', color: '#7a5a3a', parent: 'levant', span: { start: 'c. 4400 BCE', end: 'c. 3800 BCE', endDates: [C(3800, 'wp-ghassulian', 'infobox'), C(3500, 'wp-ghassulian', 'lead')] } },
  ],
  { before: 'canaan' },
);
ed.tracks(
  [
    { id: 'gobekli', name: 'Göbekli Tepe and the Taş Tepeler', color: '#a0704a', parent: 'anatolia', span: { start: 'c. 9500 BCE', end: 'c. 8000 BCE' } },
    { id: 'cayonu', name: 'Çayönü', color: '#906a4a', parent: 'anatolia', span: { start: 'c. 8630 BCE', end: 'c. 6800 BCE' } },
    { id: 'catalhoyuk', name: 'Çatalhöyük', color: '#b07a4a', parent: 'anatolia', span: { start: 'c. 7500 BCE', end: 'c. 5600 BCE', startDates: [C(7500, 'wp-catalhoyuk', 'lead'), C(7100, 'wp-catalhoyuk', 'infobox')] } },
  ],
  { before: 'hittites' },
);
ed.tracks(
  [
    { id: 'hassuna', name: 'Hassuna culture', color: '#7a8a5a', parent: 'mesopotamia', span: { start: 'c. 7000 BCE', end: 'c. 6000 BCE' } },
    { id: 'halaf', name: 'Halaf culture', color: '#6a8a6a', parent: 'mesopotamia', span: { start: 'c. 6100 BCE', end: 'c. 5100 BCE' } },
    { id: 'samarra', name: 'Samarra culture', color: '#8a9a5a', parent: 'mesopotamia', span: { start: 'c. 5500 BCE', end: 'c. 4800 BCE', startDates: [C(5500, 'wp-samarra', 'lead and infobox'), C(6000, 'wp-samarra', 'chronology table')] } },
    {
      id: 'ubaid', name: 'Ubaid period', color: '#5a7a4a', parent: 'mesopotamia',
      span: { start: 'c. 6500 BCE', end: 'c. 3800 BCE', startDates: [C(6500, 'wp-ubaid', 'lead and infobox'), C(5500, 'wp-ubaid', 'lead (in the south)')] },
    },
  ],
  { before: 'mitanni' },
);
ed.tracks(
  [
    { id: 'chogha-golan', name: 'Chogha Golan (Zagros)', color: '#8a6a5a', parent: 'iran', span: { start: 'c. 10050 BCE', end: 'c. 7650 BCE' } },
    { id: 'ganj-dareh', name: 'Ganj Dareh', color: '#7a6a5a', parent: 'iran', span: { start: 'c. 8200 BCE', end: 'c. 7600 BCE' } },
    { id: 'jeitun', name: 'Jeitun (Central Asia)', color: '#9a8a5a', parent: 'iran', span: { start: 'c. 7200 BCE', end: 'c. 4500 BCE' } },
    { id: 'chogha-mish', name: 'Chogha Mish (Susiana)', color: '#8a5a4a', parent: 'iran', span: { start: 'c. 6800 BCE', end: 'c. 4400 BCE' } },
    { id: 'sialk', name: 'Tepe Sialk', color: '#9a6a4a', parent: 'iran' },
    { id: 'shahr-e-sukhteh', name: 'Shahr-e Sukhteh', color: '#a07a5a', parent: 'iran', span: { start: 'c. 3550 BCE', end: 'c. 2300 BCE' } },
  ],
  { before: 'elam' },
);
ed.track({ id: 'shulaveri', name: 'Shulaveri–Shomu culture', color: '#7a6a9a', parent: 'caucasus', span: { start: 'c. 6000 BCE', end: 'c. 5000 BCE' } }, { before: 'maykop' });
ed.tracks(
  [
    { id: 'nabta', name: 'Nabta Playa (Western Desert)', color: '#b09060', parent: 'egypt' },
    { id: 'lower-egypt-neolithic', name: 'Lower Egypt Neolithic (Faiyum A, Merimde)', color: '#a08050', parent: 'egypt' },
    { id: 'upper-egypt-predynastic', name: 'Upper Egypt (Badarian, Naqada I)', color: '#c09050', parent: 'egypt' },
  ],
  { before: 'eg-predynastic' },
);

// ---------- Levant ----------
ed.event({
  uuid: 'jericho-founded', title: 'Jericho, the first town', start: 'c. 9000 BCE', tracks: ['ppna'],
  descr: 'Jericho is thought to be the world’s first town; it is the type site of the Pre-Pottery Neolithic A and B, defined by Kathleen Kenyon. PPNA people lived in tiny circular mud-brick dwellings, cultivated crops and hunted wild game, without pottery. The PPNA succeeds the Natufian culture.',
  sources: [S('wp-ppna', 'lead and Settlements'), S('wp-jericho', 'infobox, lead and Stone Age')],
});
ed.event({
  uuid: 'jericho-tower', title: 'The Tower of Jericho', start: 'c. 8000 BCE', tracks: ['ppna'],
  descr: 'One of the world’s oldest towers and oldest stone buildings, built against the wall inside the town at the end of the PPNA; its construction is estimated to have taken 11,000 working days. Barkai and Liran suggest astronomical and social purposes.',
  sources: [S('wp-jericho-tower', 'infobox, lead, Structure and Purpose'), S('wp-ppna', 'Settlements (caption)')],
  links: [{ to: 'jericho-founded', kind: 'related' }],
});
ed.event({
  uuid: 'animal-domestication', title: 'Goats, sheep, pigs and cattle domesticated', start: 'c. 9000 BCE', end: 'c. 8000 BCE', tracks: ['ppnb', 'cayonu'],
  descr: 'About 9000 BCE for goats and sheep, 8500 BCE for pigs and 8000 BCE for cattle. Çayönü is possibly the place where the pig was first domesticated.',
  sources: [S('wp-ppnb', 'Domestication of animals'), S('wp-cayonu', 'Origin of domestication')],
});
ed.event({
  uuid: 'plastered-skulls', title: 'Plastered skulls of the Levant', start: 'c. 9000 BCE', end: 'c. 6000 BCE', tracks: ['ppnb'],
  descr: 'Made in the Pre-Pottery Neolithic B, they are some of the oldest forms of art in the Middle East. In this period houses become rectilinear with thick white plaster floors; plaster work may have led to the discovery of pottery.',
  sources: [S('wp-ppnb', 'Lifestyle')],
});
ed.event({
  uuid: 'ain-ghazal', title: '’Ain Ghazal and its plaster statues', start: 'c. 7000 BCE', tracks: ['ppnb'],
  descr: 'At its prime around 7000 BCE some 3,000 people live here, four to five times contemporary Jericho. Its 32 plaster figures, some two-headed, are among the oldest large statues ever found. After 6500 BC the population drops to about one sixth.',
  sources: [S('wp-ain-ghazal', 'infobox, lead, Background and Statues')],
});
ed.event({
  uuid: 'event-8-2-ka', title: 'The 8.2-kiloyear climate event', start: 'c. 6200 BCE', tracks: ['ppnb'],
  descr: 'Approximately 8,200 years before the present. At ’Ain Ghazal the population drops sharply after 6500 BC, a decline its page links to this event.',
  sources: [S('wp-ppnb', 'Extent'), S('wp-ain-ghazal', 'Background')],
});
ed.event({
  uuid: 'ghassulian', title: 'Ghassulian villages: copper and painted walls', start: 'c. 4400 BCE', end: 'c. 3800 BCE', tracks: ['ghassulian'],
  descr: 'Mixed farming hamlets with remarkable polychrome wall paintings (including the "Ghassulian Star"); they smelted copper and buried their dead in stone dolmens. The culture correlates closely with the Amratian of Egypt.',
  sources: [S('wp-ghassulian', 'infobox, lead, Origins and Dates')],
});

// ---------- Anatolia ----------
ed.event({
  uuid: 'gobekli-tepe', title: 'Göbekli Tepe: circular enclosures with stone pillars', start: 'c. 9500 BCE', end: 'c. 8000 BCE', tracks: ['gobekli'],
  descr: 'Popularly called the world’s first temples: at least 20 large enclosures with stone pillars, carved with reliefs of animals, built by hunter-gatherers who supplemented their diet with early domesticated cereal. The earliest exposed structures date to 9500–9000 BCE. Karahan Tepe and other nearby sites share its architecture and iconography.',
  sources: [S('wp-gobekli', 'infobox, lead, Dawn of village life and Chronology'), S('wp-ppna', 'Settlements (caption)')],
});
ed.event({
  uuid: 'cayonu-copper', title: 'Copper and malachite workshop at Çayönü', start: 'c. 6850 BCE', tracks: ['cayonu'],
  descr: 'A specialised workshop found in 2026. Çayönü belongs to the Taş Tepeler tradition of Göbekli Tepe and is an early example of agriculture, implemented from the 9th millennium BC.',
  sources: [S('wp-cayonu', 'lead, Archaeology and Origin of domestication')],
  startDates: [R(6900, 6800, 'wp-cayonu', "Archaeology ('approximately 6900–6800 BCE')")],
});
ed.event({
  uuid: 'catalhoyuk', title: 'Çatalhöyük', start: 'c. 7500 BCE', end: 'c. 5600 BCE', tracks: ['catalhoyuk'],
  descr: 'A settlement of domestic buildings with no obvious public buildings, with 18 successive layers of buildings and flourishing around 7000 BC. Ornate murals in some of the larger rooms include what is frequently cited as the world’s oldest map; over 2,500 clay figurines have been found, and some skulls were plastered and painted. About 600–800 people lived there in an average year of the middle phase (6700–6500 BC).',
  sources: [S('wp-catalhoyuk', 'infobox, lead, Archaeology and Culture')],
  startDates: [C(7500, 'wp-catalhoyuk', 'lead'), C(7100, 'wp-catalhoyuk', 'infobox')],
});

// ---------- Mesopotamia ----------
ed.event({
  uuid: 'hassuna', title: 'Hassuna: the first farmers of northern Mesopotamia', start: 'c. 6000 BCE', tracks: ['hassuna'],
  descr: 'By around 6000 BC people had moved into the foothills of northernmost Mesopotamia, making cream-slipped pottery painted in red; Umm Dabaghiyah is believed to have the region’s earliest pottery.',
  sources: [S('wp-hassuna', 'lead, Description and phases')],
});
ed.event({
  uuid: 'halaf', title: 'Halaf culture: painted pottery and the first stamp seals', start: 'c. 6100 BCE', end: 'c. 5100 BCE', tracks: ['halaf'],
  descr: 'The earliest systematic plant motifs in Near Eastern prehistoric art and the earliest known stamp seals in the Near East; Halaf-influenced material is found throughout Greater Mesopotamia. Most scholars see its end as a Halafian adoption of the Ubaid culture.',
  sources: [S('wp-halaf', 'infobox, lead, Origin and Pottery')],
});
ed.event({
  uuid: 'samarra', title: 'Samarra culture: early irrigation', start: 'c. 5500 BCE', end: 'c. 4800 BCE', tracks: ['samarra'],
  descr: 'Irrigation and flax at Tell es-Sawwan show a prosperous settled culture; it is best known for fine pottery decorated with stylised animals, and was the precursor of the Ubaid period.',
  sources: [S('wp-samarra', 'infobox and lead')],
  startDates: [C(5500, 'wp-samarra', 'lead and infobox'), C(6000, 'wp-samarra', 'chronology table')],
});
ed.event({
  uuid: 'oueili', title: 'Tell el-’Oueili: the oldest known site in southern Mesopotamia', start: 'c. 6250 BCE', tracks: ['ubaid'],
  descr: 'Its Ubaid 0 levels are older than those of Eridu. The earliest settlements south of Uruk date to the eighth millennium BC.',
  sources: [S('wp-ubaid', 'Dating and climate')],
  startDates: [R(6500, 6000, 'wp-ubaid', "Climate ('the Ubaid 0 levels at Oueili (6500-6000 BC)')")],
});
ed.event({
  uuid: 'eridu', title: 'Eridu founded', start: 'c. 5400 BCE', tracks: ['ubaid'],
  descr: 'Built on a virgin sand dune, it was traditionally the earliest city of southern Mesopotamia in the Sumerian King List. Eighteen superimposed mudbrick temples stand at the site, and twelve clay tokens from its Ubaid levels are precursors of proto-cuneiform.',
  sources: [S('wp-eridu', 'infobox, lead and Ubaid period')],
  startDates: [C(5400, 'wp-eridu', 'Ubaid period'), R(5500, 5300, 'wp-eridu', 'infobox')],
  links: [{ to: 'proto-cuneiform', kind: 'related' }],
});

// ---------- Iran & Central Asia, Caucasus ----------
ed.event({
  uuid: 'chogha-golan', title: 'Chogha Golan: domesticated emmer wheat', start: 'c. 7850 BCE', tracks: ['chogha-golan'],
  descr: 'The earliest record of long-term plant management in Iran: people lived mainly on wild plants and hunting, and domesticated emmer appears about 2,000 years after wild barley is first found (around 9,800 BP).',
  sources: [S('wp-chogha-golan', 'infobox, lead and Archaeobotany')],
});
ed.event({
  uuid: 'ganj-dareh', title: 'Ganj Dareh: the earliest domesticated goats', start: 'c. 8200 BCE', tracks: ['ganj-dareh'],
  descr: 'The earliest evidence for goat domestication in the world; two-row barley is the only domesticated crop found so far.',
  sources: [S('wp-ganj-dareh', 'infobox and Research history')],
  links: [{ to: 'animal-domestication', kind: 'related' }],
});
ed.event({
  uuid: 'jeitun', title: 'Jeitun: the oldest arable farming in Central Asia', start: 'c. 7200 BCE', end: 'c. 4500 BCE', tracks: ['jeitun'],
  descr: 'Villagers kept sheep and goats that were already domesticated, and built with sun-dried clay blocks. The culture may have begun before 7000 BC.',
  sources: [S('wp-jeitun', 'lead, Jeitun culture, Agriculture and Excavations')],
});
ed.event({
  uuid: 'chogha-mish', title: 'Chogha Mish settled', start: 'c. 6800 BCE', tracks: ['chogha-mish'],
  descr: 'Its Early Susiana period is contemporary with Ubaid 1 in southern Mesopotamia. The main monumental building is destroyed in the early 5th millennium BC, and the site declines about 4400 BC.',
  sources: [S('wp-chogha-mish', 'lead and History')],
});
ed.event({
  uuid: 'sialk', title: 'Tepe Sialk settled', start: 'c. 5750 BCE', tracks: ['sialk'],
  descr: 'Tombs of Sialk I contain pottery. Later, silver metallurgy at the site is radiocarbon-dated to 3660–3520 B.C., and Sialk IV has links with Uruk-period Mesopotamia and with Proto-Elamite Susa.',
  sources: [S('wp-sialk', 'History, Sialk I, Sialk IV and Silver metallurgy')],
  startDates: [R(6000, 5500, 'wp-sialk', "History ('around 6000–5500 BC')")],
});
ed.event({
  uuid: 'shahr-e-sukhteh', title: 'Shahr-e Sukhteh founded', start: 'c. 3550 BCE', tracks: ['shahr-e-sukhteh'],
  descr: 'In Period I it has connections with the Proto-Elamite cities of Khuzestan and Fars; later it is in contact with the pre-Harappan centres of the Indus valley.',
  sources: [S('wp-shahr-e-sukhteh', 'infobox, Archaeology, Period I and Period II')],
});
ed.event({
  uuid: 'shulaveri-wine', title: 'Shulaveri–Shomu: the earliest winemaking', start: 'c. 6000 BCE', tracks: ['shulaveri'],
  descr: 'The earliest evidence for winemaking and grape cultivation in the Near East. Goats, sheep, cows, pigs and dogs are kept from the earliest phase; around 5900 BC villagers at Gadachrili attempt to divert the Shulaveri river to nearby fields, the oldest water management in the Caucasus.',
  sources: [S('wp-shulaveri', 'infobox, lead, Subsistence and Earliest grapes')],
});

// ---------- Egypt ----------
ed.event({
  uuid: 'nabta-playa', title: 'Nabta Playa: herders and early pottery', start: 'c. 7500 BCE', tracks: ['nabta'],
  descr: 'One of the earliest sites of the Nubian Neolithic. People begin to make pottery locally around 6800 BC, and larger settlements appear by the 7th millennium BC; domesticated cattle reach northeast Africa in the late 7th millennium BC.',
  sources: [S('wp-nabta', 'infobox, lead and Early history')],
});
ed.event({
  uuid: 'nabta-circle', title: 'Nabta Playa stone circle', start: 'c. 4800 BCE', tracks: ['nabta'],
  descr: 'May be among the world’s earliest known archaeoastronomical devices; a megalith period follows, about 4500 to 3600 BC. Researchers see the site as an early evolution of the Hathor cult.',
  sources: [S('wp-nabta', 'Astronomical observation, Recent research and Religious ties')],
});
ed.event({
  uuid: 'faiyum-a', title: 'Faiyum A: the earliest farming culture in the Nile Valley', start: 'c. 5600 BCE', end: 'c. 4400 BCE', tracks: ['lower-egypt-neolithic'],
  descr: 'Weaving is evidenced for the first time; goats and sheep had been introduced from the Neolithic Levant around 6000 BCE. Neolithic settlements appear all over Egypt from around 6210 BC.',
  sources: [S('wp-prehistoric-egypt', 'Faiyum A culture and Neolithic anthropology')],
});
ed.event({
  uuid: 'merimde', title: 'Merimde culture', start: 'c. 4800 BCE', end: 'c. 4300 BCE', tracks: ['lower-egypt-neolithic'],
  descr: 'Cattle, sheep, goats and pigs are kept; its later phase corresponds to the Faiyum A and Badari cultures.',
  sources: [S('wp-merimde', 'infobox and lead'), S('wp-prehistoric-egypt', 'Merimde culture')],
  startDates: [C(4800, 'wp-merimde', 'infobox and lead'), C(5000, 'wp-prehistoric-egypt', 'Merimde culture')],
});
ed.event({
  uuid: 'badarian', title: 'Badarian culture: the earliest farming in Upper Egypt', start: 'c. 4400 BCE', end: 'c. 4000 BCE', tracks: ['upper-egypt-predynastic'],
  descr: 'They keep cattle, sheep and goats, give livestock and dogs ceremonial burial, and make black-topped pottery; the Western Desert was probably the most influential of its sources.',
  sources: [S('wp-badarian', 'infobox, lead and Cultural features')],
  startDates: [C(4400, 'wp-badarian', 'lead'), C(5000, 'wp-badarian', "lead ('might have already emerged by 5000 BC')")],
});
ed.event({
  uuid: 'naqada-i', title: 'Naqada I (Amratian)', start: 'c. 3900 BCE', end: 'c. 3650 BCE', tracks: ['upper-egypt-predynastic'],
  descr: 'Obsidian and a little gold are imported from Nubia, and charcoal from Nekhen tombs is cedar from Lebanon. Werner Kaiser’s chronology starts the Naqada culture c. 4000 BC.',
  sources: [S('wp-naqada', 'Werner Kaiser and Monuments'), S('wp-naqada-i', 'infobox, lead and Commerce and crafts')],
  startDates: [C(3900, 'wp-naqada', 'Werner Kaiser'), C(4000, 'wp-naqada-i', 'lead'), C(3750, 'wp-naqada-i', 'infobox')],
});

ed.save();
