// Island Southeast Asia and Oceania, c. 3500–330 BCE: the most important events only (first pass,
// 2026-11-18). Taiwan, the Philippines and Indonesia form one region; the Marianas, Lapita (Melanesia to
// Fiji, Tonga and Samoa) and Australia form another. groups.ts puts both in a new top-level group between
// East & Southeast Asia and the Americas. Every date was quoted verbatim from the cited Wikipedia page by
// a fetch agent. "Years ago" and BP values are converted by subtracting 1950, as for BP elsewhere
// (docs/ancient-sources.md, judgment call 15). Not used: *Puyuma people* (the Beinan culture redirect),
// which carries an AI-generated-text warning. See docs/ancient-sources.md, eighth pass.
// Re-runnable: it replaces what it added before. Run after asia.ts and before groups.ts.
//   node scripts/additions/pacific.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-austronesian', 'Austronesian peoples', 'Austronesian_peoples'],
  ['wp-dapenkeng', 'Dapenkeng culture', 'Dapenkeng_culture'],
  ['wp-prehistory-taiwan', 'Prehistory of Taiwan', 'Prehistory_of_Taiwan'],
  ['wp-prehistory-philippines', 'Prehistory of the Philippines', 'Prehistory_of_the_Philippines'],
  ['wp-kalanay', 'Kalanay Cave', 'Kalanay_Cave'],
  ['wp-prehistoric-indonesia', 'Prehistoric Indonesia', 'Prehistoric_Indonesia'],
  ['wp-buni', 'Buni culture', 'Buni_culture'],
  ['wp-mariana', 'Mariana Islands', 'Mariana_Islands'],
  ['wp-lapita', 'Lapita culture', 'Lapita_culture'],
  ['wp-teouma', 'Teouma', 'Teouma'],
  ['wp-fiji-history', 'History of Fiji', 'History_of_Fiji'],
  ['wp-tonga-history', 'History of Tonga', 'History_of_Tonga'],
  ['wp-samoa-history', 'History of Samoa', 'History_of_Samoa'],
  ['wp-polynesians', 'Polynesians', 'Polynesians'],
  ['wp-dingo', 'Dingo', 'Dingo'],
  ['wp-prehistory-australia', 'Prehistory of Australia', 'Prehistory_of_Australia'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (after Korea and Japan; groups.ts moves them into their group) ----------
ed.tracks(
  [
    { id: 'island-sea', name: 'Taiwan and Island Southeast Asia', color: '#3a8a7a' },
    { id: 'taiwan', name: 'Taiwan', color: '#4a9a8a', parent: 'island-sea' },
    { id: 'philippines', name: 'Philippines', color: '#3a7a8a', parent: 'island-sea' },
    { id: 'indonesia', name: 'Indonesia', color: '#5a8a6a', parent: 'island-sea' },
    { id: 'oceania', name: 'Oceania', color: '#2a7a9a' },
    { id: 'marianas', name: 'Mariana Islands', color: '#3a6a9a', parent: 'oceania' },
    {
      id: 'lapita', name: 'Lapita culture (Melanesia to Fiji, Tonga and Samoa)', color: '#2a8aaa', parent: 'oceania',
      span: {
        start: 'c. 1600 BCE', end: 'c. 500 BCE',
        startDates: [C(1600, 'wp-lapita', "lead ('at around 1600 to 500 BCE')"), R(1350, 1300, 'wp-mariana', "History > Early ('the earliest Lapita artifacts are dated to around 1350 to 1300 BCE')")],
      },
    },
    { id: 'australia', name: 'Australia and the Torres Strait', color: '#8a6a3a', parent: 'oceania' },
  ],
  { after: 'korea-japan' },
);

// ---------- events: Taiwan and Island Southeast Asia ----------
ed.event({
  uuid: 'taiwan-farmers', title: 'First farmers in Taiwan: the Dapenkeng culture', start: 'c. 3500 BCE', end: 'c. 2500 BCE', tracks: ['taiwan'],
  descr: 'Farmers from what is now the southeast coast of China settle the island. Dapenkeng pottery is thick and gritty, impressed with cord marks; the people farm and hunt but rely heavily on marine shells and fish. Around 2500 BC the culture develops into locally differentiated cultures throughout Taiwan.',
  sources: [S('wp-dapenkeng', 'infobox, lead and Characteristics'), S('wp-prehistory-taiwan', 'lead and Neolithic'), S('wp-austronesian', 'Neolithic China')],
  startDates: [
    C(3500, 'wp-dapenkeng', 'infobox'),
    R(4000, 3000, 'wp-dapenkeng', "lead ('between 4000 and 3000 BC')"),
    C(3050, 'wp-prehistory-taiwan', "lead ('Around 5,000 years ago')"),
    C(4000, 'wp-austronesian', "Neolithic China (radiocarbon: 'as late as 4000 BCE')"),
  ],
  endDates: [C(2500, 'wp-dapenkeng', 'infobox and Characteristics')],
});
ed.event({
  uuid: 'out-of-taiwan', title: 'Out of Taiwan: the Austronesian expansion', start: 'c. 3000 BCE', end: 'c. 1500 BCE', tracks: ['taiwan', 'philippines'],
  descr: 'Austronesians were the first humans with seafaring vessels that could cross large distances on the open ocean; they used sails some time before 2000 BCE. The Out-of-Taiwan hypothesis is the current scientific consensus for the settlement of the Philippines.',
  sources: [S('wp-austronesian', 'lead, Geographic distribution and Migration from Taiwan'), S('wp-prehistory-philippines', 'Neolithic Austronesian migrations'), S('wp-polynesians', 'Origins')],
  startDates: [C(3000, 'wp-austronesian', "lead ('from Taiwan, c. 3000 to 1500 BCE')"), C(3000, 'wp-polynesians', "Origins ('between 3000 and 1000 BC')")],
  endDates: [C(1500, 'wp-austronesian', 'lead and Migration from Taiwan'), C(1000, 'wp-polynesians', 'Origins')],
  links: [{ to: 'taiwan-farmers', kind: 'related' }],
});
ed.event({
  uuid: 'batanes', title: 'Austronesians reach the Batanes Islands', start: 'c. 2200 BCE', tracks: ['philippines'],
  descr: 'The Batanes are the northernmost islands of the Philippines.',
  sources: [S('wp-austronesian', 'lead'), S('wp-prehistory-philippines', 'Genetic studies (2013 study)')],
  links: [{ to: 'out-of-taiwan', kind: 'part-of' }],
});
ed.event({
  uuid: 'maritime-jade-road', title: 'The Maritime Jade Road', start: 'c. 2000 BCE', end: '1000 CE', tracks: ['taiwan', 'philippines'],
  descr: 'One of the most extensive sea-based trade networks of a single material in the prehistoric world: jade is mined in Taiwan and processed mainly in the Philippines, and the route reaches Vietnam, Thailand, Malaysia and Indonesia. Taiwanese nephrite appears in the northern Philippines between 1850 and 1350 BC; lingling-o ornaments crafted in Luzon use Taiwanese stone. In Taiwan, jade ornaments are made from about 2500 BC and peak between 1500 BC and 1 AD in the Beinan culture.',
  sources: [S('wp-prehistory-philippines', 'Neolithic Austronesian migrations (Maritime Jade Road)'), S('wp-prehistory-taiwan', 'Neolithic')],
  startDates: [
    C(2000, 'wp-prehistory-philippines', "'from 2000 BCE-1000 CE'; 'Jade artifacts have been found dated to 2000 BC'"),
    R(1850, 1350, 'wp-prehistory-taiwan', "Neolithic ('Nephrite from Taiwan began to appear in the northern Philippines between 1850 and 1350 BC')"),
  ],
});
ed.event({
  uuid: 'philippines-metal', title: 'Metal tools in the Philippines', start: 'c. 500 BCE', tracks: ['philippines'],
  descr: 'Metal tools appear somewhere around 500 BC (Jocano: between 500 BC and 1 AD); other evidence points to iron in the ninth and tenth centuries BC.',
  sources: [S('wp-prehistory-philippines', 'Metal Age')],
  startDates: [C(500, 'wp-prehistory-philippines', "'somewhere around 500 BC'"), R(1000, 800, 'wp-prehistory-philippines', "iron 'during the ninth and tenth centuries B.C.'")],
});
ed.event({
  uuid: 'kalanay', title: 'Kalanay Cave pottery', start: 'c. 400 BCE', tracks: ['philippines'],
  descr: 'Pottery dated 400 BC to AD 1500, similar to that of the Sa Huỳnh culture of southern Vietnam; iron and bronze artifacts were found at the site. It names the Sa Huỳnh–Kalanay interaction sphere, an Iron Age maritime trading network associated with the Austronesian peoples.',
  sources: [S('wp-kalanay', 'lead and Other findings')],
  links: [{ to: 'sa-huynh-trade', kind: 'related' }],
});
ed.event({
  uuid: 'austronesians-indonesia', title: 'Austronesian speakers reach Indonesia', start: 'c. 2050 BCE', tracks: ['indonesia'],
  descr: 'Austronesian speakers arrive around 4,000 years ago, after Austroasiatic speakers from Indochina (around 6,300–5,000 years ago).',
  sources: [S('wp-prehistoric-indonesia', 'Austroasiatic migration and admixture; Austronesian migration and expansion')],
  links: [{ to: 'out-of-taiwan', kind: 'part-of' }],
});
ed.event({
  uuid: 'buni', title: 'Buni culture in northern West Java', start: 'c. 400 BCE', end: 'c. 100 CE', tracks: ['indonesia'],
  descr: 'A clay pottery culture on the coast of northern West Java, Jakarta and Banten, known for incised geometric decoration; burial gifts date from 400 BC to AD 100. The kingdom of Tarumanagara is probably its successor.',
  sources: [S('wp-buni', 'infobox, lead and Characteristics')],
  endDates: [C('100 CE', 'wp-buni', 'infobox and lead'), C('500 CE', 'wp-buni', "lead ('probably survived until 500 AD')")],
});

// ---------- events: Oceania ----------
ed.event({
  uuid: 'marianas-settled', title: 'First settlement of the Mariana Islands', start: 'c. 1450 BCE', tracks: ['marianas', 'philippines'],
  descr: 'Migrants from the Philippines arrive with red-slipped, circle-stamped and punctate-stamped pottery, earlier than the first Lapita artifacts (around 1350–1300 BCE). The Chamorro language is most closely related to the Philippine languages.',
  sources: [S('wp-mariana', 'History > Early'), S('wp-austronesian', 'Migration from Taiwan')],
  startDates: [R(1500, 1400, 'wp-mariana', "History > Early ('around 1500 to 1400 BCE')"), C(1500, 'wp-austronesian', "Migration ('by 1500 BCE or even earlier')")],
  links: [{ to: 'out-of-taiwan', kind: 'part-of' }],
});
ed.event({
  uuid: 'lapita-bismarck', title: 'The Lapita culture appears in the Bismarck Archipelago', start: 'c. 1600 BCE', end: 'c. 1200 BCE', tracks: ['lapita'],
  descr: 'A Neolithic Austronesian people who make dentate-stamped pottery with distinctive geometric designs and keep pigs, dogs and chickens; their villages stand on the beach rather than inland. The complex appears suddenly.',
  sources: [S('wp-lapita', 'lead, Artifact dating and Origin'), S('wp-polynesians', 'Origins'), S('wp-tonga-history', 'The Lapita Period')],
  startDates: [
    C(1600, 'wp-lapita', "Artifact dating ('between 1,600 and 1,200 BCE')"),
    C(1550, 'wp-lapita', "Origin ('around 3,500 years ago')"),
    C(1500, 'wp-polynesians', "Origins ('around 1500 BC')"),
    C(1500, 'wp-tonga-history', "The Lapita Period ('began from Papua New Guinea in 1500 BC')"),
    R(1350, 1300, 'wp-mariana', 'History > Early (earliest Lapita artifacts)'),
  ],
  endDates: [C(1200, 'wp-lapita', 'Artifact dating')],
  links: [{ to: 'out-of-taiwan', kind: 'related' }, { to: 'marianas-settled', kind: 'related' }],
});
ed.event({
  uuid: 'lapita-melanesia', title: 'Lapita settlers reach the Solomons, Vanuatu and New Caledonia', start: 'c. 1200 BCE', tracks: ['lapita'],
  descr: 'Lapita designs appear in these islands in a period later than 1,200 BCE.',
  sources: [S('wp-lapita', 'Artifact dating'), S('wp-austronesian', "Migration ('by 1200 BCE')")],
  links: [{ to: 'lapita-bismarck', kind: 'causes' }],
});
ed.event({
  uuid: 'teouma', title: 'Teouma cemetery, Vanuatu', start: 'c. 1000 BCE', tracks: ['lapita'],
  descr: 'The oldest known cemetery in the Pacific Islands. Skulls were removed and replaced with cone shell rings, showing a ceremonial culture.',
  sources: [S('wp-teouma', 'lead and Archaeology'), S('wp-lapita', 'Burial customs')],
  startDates: [
    C(1000, 'wp-lapita', "Burial customs ('in use around 1000 BCE')"),
    R(1250, 1050, 'wp-teouma', "Archaeology ('between approximately 3200 and 3000 years old')"),
    R(1000, 800, 'wp-teouma', "lead ('the ninth and tenth centuries BC')"),
  ],
});
ed.event({
  uuid: 'fiji-settled', title: 'Lapita settlers reach Fiji', start: 'c. 1050 BCE', tracks: ['lapita'],
  descr: 'Pottery shows Austronesian settlement; a large influx of people with predominantly Melanesian genetics follows about the beginning of the Common Era. Moturiki shows settlement from 600 BC, possibly 900 BC.',
  sources: [S('wp-fiji-history', 'lead and Early settlement and development of Fijian culture'), S('wp-lapita', 'Artifact dating')],
  startDates: [
    R(1100, 1000, 'wp-fiji-history', "Early settlement ('around 1100–1000 BC')"),
    R(1500, 1000, 'wp-fiji-history', "lead ('around 1,500–1,000 BC')"),
    C(1000, 'wp-lapita', "Artifact dating ('around 1,000 BCE')"),
  ],
  links: [{ to: 'lapita-melanesia', kind: 'causes' }],
});
ed.event({
  uuid: 'tonga-settled', title: 'Lapita settlers reach Tongatapu, the first island settled in Polynesia', start: 'c. 1050 BCE', tracks: ['lapita'],
  descr: 'Carbon dating places the Lapita landfall first in Tongatapu; a shell at Pea dates the occupation to 3180 ± 100 BP.',
  sources: [S('wp-tonga-history', 'lead, Pre-contact and The Lapita Period'), S('wp-lapita', 'Lapita in Polynesia')],
  startDates: [
    C(1050, 'wp-tonga-history', "lead ('around 3000 years ago')"),
    C(900, 'wp-tonga-history', "The Lapita Period ('By 2850 BP (900 BC)')"),
    C(1230, 'wp-tonga-history', "Pre-contact ('3180 ± 100 BP')", { margin: 100 }),
    C(900, 'wp-lapita', "Lapita in Polynesia ('dating back to 900 BCE')"),
  ],
  links: [{ to: 'fiji-settled', kind: 'related' }],
});
ed.event({
  uuid: 'samoa-settled', title: 'Lapita settlers reach Samoa', start: 'c. 1200 BCE', tracks: ['lapita'],
  descr: 'Dated from Lapita pottery sherds found throughout the islands; the site at Mulifanua suggests a Lapita settlement in roughly 1000 BCE.',
  sources: [S('wp-samoa-history', 'lead and Early history'), S('wp-lapita', 'Distribution')],
  startDates: [
    R(1500, 900, 'wp-samoa-history', "Early history ('around 2900–3500 years before the present (1500-900 BCE)')"),
    C(1550, 'wp-samoa-history', "lead ('some 3,500 years ago')"),
    C(1000, 'wp-lapita', "Distribution (Mulifanua, 'roughly 1000 BCE')"),
  ],
  links: [{ to: 'tonga-settled', kind: 'related' }],
});
ed.event({
  uuid: 'plain-ware', title: 'Pottery decoration ends: the Polynesian Plain Ware period', start: 'c. 700 BCE', end: 'c. 400 CE', tracks: ['lapita'],
  descr: 'Two hundred years after arriving, settlers in Tonga stop decorating their pots; by 400 AD they make none, and in Samoa pottery-making appears to stop suddenly. Fiji, Samoa and Tonga remain the furthest extent of the Austronesian expansion in the Pacific for about 1,500 years.',
  sources: [S('wp-tonga-history', 'The Lapita Period; The Polynesian Plain Ware Period'), S('wp-samoa-history', 'Early history'), S('wp-polynesians', 'Origins')],
  startDates: [C(700, 'wp-tonga-history', "heading ('2650–1550 BP (700 BC – 400 AD)')")],
  endDates: [C('400 CE', 'wp-tonga-history', "Polynesian Plain Ware ('By 1550 BP (400 AD)')"), C('1 CE', 'wp-lapita', "Lapita in Polynesia (Samoa plainware 'ceases abruptly … around 1 CE')")],
});
ed.event({
  uuid: 'torres-strait', title: 'First settlement of the Torres Strait Islands', start: 'c. 2050 BCE', tracks: ['australia'],
  descr: 'The Torres Strait Islanders were seafarers who lived by seasonal horticulture.',
  sources: [S('wp-prehistory-australia', "lead ('around 4,000 years ago')")],
});
ed.event({
  uuid: 'dingo', title: 'The dingo reaches Australia', start: 'c. 2050 BCE', tracks: ['australia'],
  descr: 'A widely held view, based on sediment dating, is that dingoes arrived about 4,000 years ago and took 500 years to spread around the continent. The oldest remains, from the Madura Caves in Western Australia, are estimated at 3,450 years old (directly carbon dated in 2018 to 3,348–3,081 years ago).',
  sources: [S('wp-dingo', 'lead and History'), S('wp-prehistory-australia', 'Changes c. 4000 years ago')],
  startDates: [
    C(2050, 'wp-dingo', "History ('first arrived in Australia 4,000 YBP')"),
    C(2050, 'wp-prehistory-australia', "Changes c. 4000 years ago ('about 4,000 years ago')"),
    C(1500, 'wp-dingo', "History (Madura Caves, '3,450 YBP')"),
    R(1398, 1131, 'wp-dingo', "History (2018 direct date, '3,348 and 3,081 YBP')"),
  ],
});

const meta = ed.data.meta;
meta.subtitle = 'Europe, the Mediterranean, Africa, the Near East, Iran, the Steppe, South and East Asia, Island Southeast Asia and Oceania, and the Americas, c. 3500–330 BCE';
if (!meta.description.includes('Oceania'))
  meta.description = meta.description.replace('Korea and Japan, and the Americas', 'Korea and Japan, Taiwan and Island Southeast Asia, Oceania, and the Americas');

ed.save();
