// Second pass on the early Holocene and Neolithic, c. 10,000–3500 BCE (2026-11-18): gaps left by the first
// pass. Near East (Karahan Tepe, Nevalı Çori, Aşıklı Höyük, Abu Hureyra, Byblos, the Yarmukian, Jarmo, Tell
// Brak), Africa (Ounjougou, Early Khartoum), Europe (the Pesse canoe, Doggerland and the Storegga tsunami,
// Ertebølle, Dimini, Hamangia, Lengyel, Michelsberg, Goseck, Barnenez, Knap of Howar), East and Southeast Asia
// (Bacsonian, Cishan, Houli, Daxi, Majiabang) and the Americas (Caverna da Pedra Pintada, the Spirit Cave
// mummy). Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; "years ago" and BP
// are converted by subtracting 1950 (judgment call 15). Not found (404): Khartoum Mesolithic, Kuahuqiao culture,
// Shangshan site, Ñanchóc. *Prehistoric Iberia* was read only in summary, so Iberia is not added yet.
// See docs/ancient-sources.md, eleventh pass.
// Re-runnable: it replaces what it added before. Run after neolithic-world.ts and before groups.ts.
//   node scripts/additions/neolithic-2.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-karahan', 'Karahan Tepe', 'Karahan_Tepe'],
  ['wp-nevali-cori', 'Nevalı Çori', 'Neval%C4%B1_%C3%87ori'],
  ['wp-asikli', 'Aşıklı Höyük', 'A%C5%9F%C4%B1kl%C4%B1_H%C3%B6y%C3%BCk'],
  ['wp-abu-hureyra', 'Tell Abu Hureyra', 'Tell_Abu_Hureyra'],
  ['wp-byblos', 'Byblos', 'Byblos'],
  ['wp-yarmukian', 'Yarmukian culture', 'Yarmukian_culture'],
  ['wp-jarmo', 'Jarmo', 'Jarmo'],
  ['wp-tell-brak', 'Tell Brak', 'Tell_Brak'],
  ['wp-ounjougou', 'Ounjougou', 'Ounjougou'],
  ['wp-shaheinab', 'Esh Shaheinab', 'Esh_Shaheinab'],
  ['wp-pesse', 'Pesse canoe', 'Pesse_canoe'],
  ['wp-doggerland', 'Doggerland', 'Doggerland'],
  ['wp-storegga', 'Storegga Slide', 'Storegga_Slide'],
  ['wp-ertebolle', 'Ertebølle culture', 'Erteb%C3%B8lle_culture'],
  ['wp-dimini', 'Dimini', 'Dimini'],
  ['wp-hamangia', 'Hamangia culture', 'Hamangia_culture'],
  ['wp-lengyel', 'Lengyel culture', 'Lengyel_culture'],
  ['wp-michelsberg', 'Michelsberg culture', 'Michelsberg_culture'],
  ['wp-goseck', 'Goseck circle', 'Goseck_Circle'],
  ['wp-barnenez', 'Barnenez', 'Barnenez'],
  ['wp-knap-of-howar', 'Knap of Howar', 'Knap_of_Howar'],
  ['wp-hoabinhian', 'Hoabinhian', 'Hoabinhian'],
  ['wp-spirit-cave-thai', 'Spirit Cave (Thailand)', 'Spirit_Cave_(Thailand)'],
  ['wp-cishan', 'Cishan culture', 'Cishan_culture'],
  ['wp-houli', 'Houli culture', 'Houli_culture'],
  ['wp-daxi', 'Daxi culture', 'Daxi_culture'],
  ['wp-majiabang', 'Majiabang culture', 'Majiabang_culture'],
  ['wp-pedra-pintada', 'Caverna da Pedra Pintada', 'Caverna_da_Pedra_Pintada'],
  ['wp-spirit-cave-mummy', 'Spirit Cave mummy', 'Spirit_Cave_mummy'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
ed.track({ id: 'yarmukian', name: 'Yarmukian culture (Pottery Neolithic)', color: '#7a6a5a', parent: 'levant', span: { start: 'c. 6400 BCE', end: 'c. 6000 BCE' } }, { after: 'ppnb' });
ed.tracks(
  [
    { id: 'jarmo', name: 'Jarmo', color: '#6a7a5a', parent: 'mesopotamia', span: { start: 'c. 7090 BCE', end: 'c. 4950 BCE' } },
    { id: 'tell-brak', name: 'Tell Brak (Upper Mesopotamia)', color: '#5a6a4a', parent: 'mesopotamia' },
  ],
  { before: 'hassuna' },
);
ed.track({ id: 'ounjougou', name: 'Ounjougou', color: '#9a7a4a', parent: 'sub-saharan' }, { before: 'green-sahara' });
ed.track({ id: 'ertebolle', name: 'Ertebølle culture', color: '#4a6a7a', parent: 'europe', span: { start: 'c. 5400 BCE', end: 'c. 3950 BCE' } }, { after: 'mesolithic-north' });
ed.tracks(
  [
    { id: 'lengyel', name: 'Lengyel culture', color: '#6a5a8a', parent: 'europe', span: { start: 'c. 5000 BCE', end: 'c. 4000 BCE' } },
    { id: 'michelsberg', name: 'Michelsberg culture', color: '#5a6a8a', parent: 'europe', span: { start: 'c. 4400 BCE', end: 'c. 3500 BCE' } },
  ],
  { after: 'lbk' },
);
ed.track({ id: 'hoabinhian', name: 'Hoabinhian foragers', color: '#5a7a5a', parent: 'se-asia', span: { start: 'c. 10000 BCE', end: 'c. 2000 BCE' } }, { before: 'ban-chiang' });
ed.tracks(
  [
    { id: 'cishan', name: 'Cishan culture', color: '#8a8a5a', parent: 'china', span: { start: 'c. 6500 BCE', end: 'c. 5000 BCE' } },
    { id: 'houli', name: 'Houli culture', color: '#7a7a6a', parent: 'china', span: { start: 'c. 6500 BCE', end: 'c. 5500 BCE' } },
    { id: 'daxi', name: 'Daxi culture', color: '#6a7a7a', parent: 'china', span: { start: 'c. 5000 BCE', end: 'c. 3300 BCE' } },
    { id: 'majiabang', name: 'Majiabang culture', color: '#5a8a7a', parent: 'china', span: { start: 'c. 5000 BCE', end: 'c. 3350 BCE' } },
  ],
  { after: 'peiligang' },
);
ed.track({ id: 'amazon', name: 'Amazon (Caverna da Pedra Pintada)', color: '#4a7a3a', parent: 'south-america' }, { before: 'cueva-manos' });

// ---------- Near East ----------
ed.event({
  uuid: 'karahan-tepe', title: 'Karahan Tepe', start: 'c. 9750 BCE', end: 'c. 9400 BCE', tracks: ['gobekli'],
  descr: 'Possibly the earliest known human village. It lies in the same region as Göbekli Tepe, predates its construction by several centuries, and archaeologists believe the sites are related.',
  sources: [S('wp-karahan', 'infobox, lead and History')],
  startDates: [C(9750, 'wp-karahan', 'infobox and History'), R(10000, 9500, 'wp-karahan', 'lead')],
  links: [{ to: 'gobekli-tepe', kind: 'related' }],
});
ed.event({
  uuid: 'nevali-cori', title: 'Nevalı Çori: temples and monumental sculpture', start: 'c. 8400 BCE', end: 'c. 8100 BCE', tracks: ['gobekli'],
  descr: 'Some of the world’s oldest known temples and monumental sculpture, in the Taş Tepeler tradition; similar structures are known only from Göbekli Tepe.',
  sources: [S('wp-nevali-cori', 'infobox, lead, Houses and Sculpture')],
  links: [{ to: 'gobekli-tepe', kind: 'related' }],
});
ed.event({
  uuid: 'asikli', title: 'Aşıklı Höyük settled', start: 'c. 8200 BCE', end: 'c. 7400 BCE', tracks: ['catalhoyuk'],
  descr: 'One of the earliest Aceramic Neolithic sites on the Anatolian plateau, considerably smaller than nearby Çatalhöyük.',
  sources: [S('wp-asikli', 'infobox, lead and Dates')],
});
ed.event({
  uuid: 'abu-hureyra', title: 'Abu Hureyra: a farming village on the Euphrates', start: 'c. 8600 BCE', end: 'c. 5800 BCE', tracks: ['ppnb'],
  descr: 'One of the most important sites in the study of the origins of agriculture; its first domesticated cereals came about around 10,000 years ago, and basket weaving there dates back to 6500 BC.',
  sources: [S('wp-abu-hureyra', 'lead, Second occupation, Transition from foraging to farming and Agriculture')],
});
ed.event({
  uuid: 'byblos-settled', title: 'Byblos first settled', start: 'c. 7900 BCE', tracks: ['ppnb'],
  descr: 'In the Pre-Pottery Neolithic B; Byblos has been continuously inhabited since 5000 BC.',
  sources: [S('wp-byblos', 'lead and Neolithic and Chalcolithic levels')],
  startDates: [R(8800, 7000, 'wp-byblos', "lead ('between 8800 and 7000 BC')")],
});
ed.event({
  uuid: 'yarmukian', title: 'Yarmukian culture', start: 'c. 6400 BCE', end: 'c. 6000 BCE', tracks: ['yarmukian'],
  descr: 'A Pottery Neolithic A culture of the Levant, existing alongside the Lodian (Jericho IX) and Nizzanim cultures.',
  sources: [S('wp-yarmukian', 'infobox and lead')],
});
ed.event({
  uuid: 'jarmo', title: 'Jarmo, an early farming village', start: 'c. 7090 BCE', end: 'c. 4950 BCE', tracks: ['jarmo'],
  descr: 'An agricultural community contemporary with Jericho and Çatalhöyük, at its height between 6200 and 5800 BC; its art marks the inception of the Art of Mesopotamia.',
  sources: [S('wp-jarmo', 'infobox, lead, The village and Pottery and religion')],
});
ed.event({
  uuid: 'tell-brak-settled', title: 'Tell Brak settled', start: 'c. 6500 BCE', tracks: ['tell-brak'],
  descr: 'The earliest small settlement belongs to the proto-Halaf culture; Halaf and Northern Ubaid phases follow.',
  sources: [S('wp-tell-brak', 'infobox, lead, history table and Early settlement')],
});
ed.event({
  uuid: 'tell-brak-city', title: 'Tell Brak becomes one of the first cities', start: 'c. 4200 BCE', end: 'c. 3600 BCE', tracks: ['tell-brak'],
  descr: 'Urbanisation begins in the late 5th millennium BCE; in Period E (c. 4200–3900 BC) the city’s walls are built, and by early Period F (c. 3800–3600 BC) it covers 130 hectares. It is one of the earliest known cities in the world; later an Urukean colony is established there.',
  sources: [S('wp-tell-brak', 'lead, Brak Period E and Brak Period F')],
  links: [{ to: 'uruk-expansion', kind: 'related' }],
});

// ---------- Africa ----------
ed.event({
  uuid: 'ounjougou-pottery', title: 'Ounjougou: the earliest pottery in Africa', start: 'c. 9500 BCE', tracks: ['ounjougou'],
  descr: 'Before 9400 BCE Niger-Congo speakers independently created and used mature ceramic technology; the pottery makers later migrate, and pottery at Bir Kiseiba in Egypt resembles Ounjougou’s.',
  sources: [S('wp-ounjougou', 'lead and Early Holocene')],
  startDates: [R(10000, 9500, 'wp-ounjougou', "Early Holocene ('during the first half of the 10th millennium BC')"), C(9400, 'wp-ounjougou', "Early Holocene ('Prior to 9400 BCE')")],
});
ed.event({
  uuid: 'early-khartoum', title: 'Early Khartoum pottery makers', start: 'c. 6850 BCE', end: 'c. 3050 BCE', tracks: ['nubia'],
  descr: 'From a time before food production began in Africa; sites in Sudan such as Esh Shaheinab are some of the earliest examples of pottery-making in Africa.',
  sources: [S('wp-shaheinab', "lead ('Early Khartoum (8800 to 5000 BP)') and Pottery")],
});

// ---------- Europe ----------
ed.event({
  uuid: 'pesse-canoe', title: 'The Pesse canoe, the world’s oldest known boat', start: 'c. 8040 BCE', end: 'c. 7510 BCE', tracks: ['mesolithic-north'],
  descr: 'Made in the early Mesolithic.',
  sources: [S('wp-pesse', 'infobox and lead')],
  links: [{ to: 'dufuna-canoe', kind: 'related' }],
});
ed.event({
  uuid: 'doggerland', title: 'Doggerland floods: Britain is cut off', start: 'c. 6500 BCE', tracks: ['mesolithic-north'],
  descr: 'Rising seas inundate Doggerland between 10,000 and 7,000 years ago, cutting the British peninsula off from the mainland by around 6500 BCE; Dogger Bank remains an island until at least 5000 BCE. Doggerland may have been Europe’s most prosperous hunting, fowling and fishing ground in the Mesolithic.',
  sources: [S('wp-doggerland', 'lead, Formation and Disappearance')],
});
ed.event({
  uuid: 'storegga', title: 'The Storegga Slide tsunami', start: 'c. 6200 BCE', tracks: ['mesolithic-north'],
  descr: 'Structural failures of the continental shelf cause underwater landslides and a tsunami in the North Atlantic; one hypothesis holds that it flooded much of Doggerland’s remaining coast.',
  sources: [S('wp-storegga', 'lead and Description'), S('wp-doggerland', 'Disappearance')],
  startDates: [R(6225, 6170, 'wp-storegga', 'lead (carbon dating)')],
  links: [{ to: 'doggerland', kind: 'related' }, { to: 'event-8-2-ka', kind: 'related' }],
});
ed.event({
  uuid: 'ertebolle', title: 'Ertebølle hunter-fishers make pottery', start: 'c. 5400 BCE', end: 'c. 3950 BCE', tracks: ['ertebolle'],
  descr: 'A hunter-gatherer and fisher culture of the end of the Mesolithic, roughly contemporary with the Linear Pottery culture; shortly after 4,100 BCE it spreads along the Baltic coast, and it is then replaced by the Funnelbeaker culture.',
  sources: [S('wp-ertebolle', 'infobox and lead')],
});
ed.event({
  uuid: 'hamangia', title: 'Hamangia culture: “The Thinker”', start: 'c. 5250 BCE', end: 'c. 4500 BCE', tracks: ['balkan-neolithic'],
  descr: 'Known for exceptional clay figures, including The Thinker and Sitting Woman (c. 4900 BC); it is followed by the Varna culture.',
  sources: [S('wp-hamangia', 'infobox, Genesis and successor, Art and Gallery')],
  links: [{ to: 'varna', kind: 'related' }],
});
ed.event({
  uuid: 'dimini', title: 'Dimini culture: abstract painted vessels', start: 'c. 4800 BCE', end: 'c. 3200 BCE', tracks: ['balkan-neolithic'],
  descr: 'Characteristic of the Later Neolithic in eastern Thessaly. An "invasion theory" has it conquering the Sesklo culture around 5000 BC; Lyritzis’s thermoluminescence dates instead show it appearing about 4800 BC, four centuries before Sesklo’s end.',
  sources: [S('wp-dimini', 'infobox, History and Antiquity')],
});
ed.event({
  uuid: 'goseck', title: 'The Goseck circle', start: 'c. 4900 BCE', end: 'c. 4700 BCE', tracks: ['lbk'],
  descr: 'Perhaps the oldest and best known of the circular enclosures of the Central European Neolithic, presented as a ritual or cult structure; it dates to the transition from Linear Pottery to Stroke-ornamented ware.',
  sources: [S('wp-goseck', 'infobox, lead, History and Astronomical alignment')],
});
ed.event({
  uuid: 'lengyel', title: 'Lengyel culture: the dawn of the Chalcolithic in Central Europe', start: 'c. 5000 BCE', end: 'c. 4000 BCE', tracks: ['lengyel'],
  descr: 'Copper beads and ribbons mark the dawn of the Chalcolithic in Central Europe. It follows the Linear Pottery culture and overlaps the Funnelbeaker culture.',
  sources: [S('wp-lengyel', 'infobox, lead and Description')],
});
ed.event({
  uuid: 'michelsberg', title: 'Michelsberg culture', start: 'c. 4400 BCE', end: 'c. 3500 BCE', tracks: ['michelsberg'],
  descr: 'Undecorated tulip beakers, hilltop settlements and enclosures; it emerges in northeastern France and plays an instrumental role in establishing the Funnelbeaker culture. Its Kapellenberg tumulus shows the influence of the Castellic culture of Brittany.',
  sources: [S('wp-michelsberg', 'infobox, lead, History, Settlements and Finds')],
});
ed.event({
  uuid: 'barnenez', title: 'Barnenez cairn', start: 'c. 4850 BCE', end: 'c. 4000 BCE', tracks: ['megaliths'],
  descr: 'One of the earliest megalithic monuments in Europe, remarkable for its megalithic art; built in two phases (4850–4250 and 4450–4000 BC).',
  sources: [S('wp-barnenez', 'infobox, lead and History')],
});
ed.event({
  uuid: 'knap-of-howar', title: 'Knap of Howar, the oldest stone house in northern Europe', start: 'c. 3800 BCE', end: 'c. 2800 BCE', tracks: ['megaliths'],
  descr: 'It may be the oldest preserved stone house in northern Europe, earlier than the similar houses at Skara Brae.',
  sources: [S('wp-knap-of-howar', 'infobox and lead')],
});

// ---------- East and Southeast Asia ----------
ed.event({
  uuid: 'bacsonian', title: 'Bacsonian culture', start: 'c. 8000 BCE', end: 'c. 4000 BCE', tracks: ['hoabinhian'],
  descr: 'Often regarded as a variation of the Hoabinhian, a lithic techno-complex. At Spirit Cave in Thailand, Gorman claimed early plant remains, but Higham and Thosarat find no grounds for linking the site with agriculture; it has no ceramics until after 6800 BCE (Solheim).',
  sources: [S('wp-hoabinhian', 'lead and Hoabinhian and plant domestication'), S('wp-spirit-cave-thai', 'Plant domestication')],
});
ed.event({
  uuid: 'cishan', title: 'Cishan millet farmers', start: 'c. 6500 BCE', end: 'c. 5000 BCE', tracks: ['cishan'],
  descr: 'Farming of broomcorn millet, stored in over 500 pits; pigs are the main source of meat, and nets are made of hemp. Dates of 10,000 years ago for its millet have been questioned. It is followed by the Yangshao culture.',
  sources: [S('wp-cishan', 'infobox, lead and Type site')],
  links: [{ to: 'peiligang', kind: 'related' }],
});
ed.event({
  uuid: 'houli', title: 'Houli culture in Shandong', start: 'c. 6500 BCE', end: 'c. 5500 BCE', tracks: ['houli'],
  descr: 'Rice, broomcorn millet and foxtail millet are found at its sites (rice at Yuezhang AMS-dated to 8010–7700 BP, not confirmed as domesticated); people live in square semi-subterranean houses and rely mostly on hunting and fishing.',
  sources: [S('wp-houli', 'infobox, lead, Archaeological findings and Yuezhang')],
});
ed.event({
  uuid: 'daxi', title: 'Daxi culture: rice and walled settlements', start: 'c. 5000 BCE', end: 'c. 3300 BCE', tracks: ['daxi'],
  descr: 'The Daxi people cultivate rice extensively, and their sites are some of the earliest in China with moats and walled settlements.',
  sources: [S('wp-daxi', 'infobox, lead and Material culture')],
});
ed.event({
  uuid: 'majiabang', title: 'Majiabang culture: paddy rice and jade', start: 'c. 5000 BCE', end: 'c. 3350 BCE', tracks: ['majiabang'],
  descr: 'Paddy fields at Caoxieshan and Chuodun; jade ornaments, and a wooden scull and oar. It coexists with the Hemudu culture and is succeeded by the Liangzhu culture.',
  sources: [S('wp-majiabang', 'infobox, lead, Rice cultivation, Tools, Jade and Related cultures')],
  links: [{ to: 'hemudu', kind: 'related' }],
});

// ---------- Americas ----------
ed.event({
  uuid: 'pedra-pintada', title: 'Caverna da Pedra Pintada: the earliest cave paintings in the Americas', start: 'c. 9250 BCE', end: 'c. 8050 BCE', tracks: ['amazon'],
  descr: 'Human presence about 11,200 to 10,000 years ago, with spear points and Brazil nuts; its paintings are the earliest known cave paintings in the Americas.',
  sources: [S('wp-pedra-pintada', 'lead, Rediscovery, Findings and Paintings')],
});
ed.event({
  uuid: 'spirit-cave-mummy', title: 'The Spirit Cave mummy', start: 'c. 7420 BCE', tracks: ['archaic-na'],
  descr: 'The oldest human mummy found in North America, wrapped in a rabbit-skin blanket and woven tule matting.',
  sources: [S('wp-spirit-cave-mummy', 'infobox, lead, Discovery and Identity and dating')],
});

ed.save();
