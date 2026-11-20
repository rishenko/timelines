// The Classical World, tenth region pass (2026-11-18): Island Southeast Asia and Oceania — the Bujang Valley, the Buni
// culture, Tarumanagara and Purnawarman, Kutai's yūpa inscriptions, Kalingga, the Sa Huỳnh–Kalanay trade sphere and
// lingling-o, Iron Age Taiwan; the Sa Huỳnh culture (under Southeast Asia); Fiji, Tonga and Samoa through the long
// pause, early (now superseded) dates for East Polynesia, and the first settlement of Pohnpei. Every date was quoted
// verbatim from the cited Wikipedia page by a fetch agent; values seen only in a page summary are not used. No page
// carried an AI-text or LLM-translation banner (*Polynesians* asks for help translating from Russian; treated as in
// the ancient Pacific pass). See docs/classical-sources.md, tenth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts and se-asia-tibet.ts.
//   node scripts/classical/island-sea-oceania.ts && npm run data:classical
import { open, C, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-bujang', 'Bujang Valley', 'Bujang_Valley'],
  ['wp-tarumanagara', 'Tarumanagara', 'Tarumanagara'],
  ['wp-ciaruteun', 'Ciaruteun inscription', 'Ciaruteun_inscription'],
  ['wp-kutai', 'Kutai', 'Kutai'],
  ['wp-prehistoric-indonesia', 'Prehistoric Indonesia', 'Prehistoric_Indonesia'],
  ['wp-kalingga', 'Kalingga kingdom', 'Kalingga_kingdom'],
  ['wp-lingling-o', 'Lingling-o', 'Lingling-o'],
  ['wp-prehistory-taiwan', 'Prehistory of Taiwan', 'Prehistory_of_Taiwan'],
  ['wp-polynesians', 'Polynesians', 'Polynesians'],
  ['wp-lapita', 'Lapita culture', 'Lapita_culture'],
  ['wp-samoa-history', 'History of Samoa', 'History_of_Samoa'],
  ['wp-tonga-history', 'History of Tonga', 'History_of_Tonga'],
  ['wp-fiji-history', 'History of Fiji', 'History_of_Fiji'],
  ['wp-marquesas', 'Marquesas Islands', 'Marquesas_Islands'],
  ['wp-nan-madol', 'Nan Madol', 'Nan_Madol'],
  ['wp-easter-island-history', 'History of Easter Island', 'History_of_Easter_Island'],
  ['wp-hawaii-history', 'History of Hawaii', 'History_of_Hawaii'],
  ['wp-prehistory-australia', 'Prehistory of Australia', 'Prehistory_of_Australia'],
  ['wp-dingo', 'Dingo', 'Dingo'],
  ['wp-fire-stick', 'Fire-stick farming', 'Fire-stick_farming'],
  ['wp-ubirr', 'Ubirr', 'Ubirr'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (west to east) ----------
ed.tracks(
  [
    {
      id: 'sa-huynh', name: 'Sa Huỳnh culture', color: '#7a6a4a', parent: 'se-asia',
      span: { start: 'c. 1000 BCE', end: 'c. 200 CE', endDates: [C('200 CE', 'wp-sa-huynh', "infobox and lead ('1000 BC and 200 AD')")] },
    },
  ],
  { after: 'champa' },
);
ed.tracks(
  [
    {
      id: 'bujang-valley', name: 'Bujang Valley (Kedah)', color: '#8a5a3a', parent: 'island-sea',
      span: {
        start: '110 CE', end: 'c. 1350 CE',
        startDates: [C('110 CE', 'wp-bujang', 'lead (Sungai Batu monument)'), C('450 CE', 'wp-bujang', "lead ('5th to 14th century CE')", { margin: 50 })],
        endDates: [C('1350 CE', 'wp-bujang', "lead ('5th to 14th century CE')", { margin: 50 })],
      },
    },
    {
      id: 'buni-culture', name: 'Buni culture (West Java)', color: '#6a7a4a', parent: 'island-sea',
      span: {
        start: 'c. 400 BCE', end: 'c. 100 CE',
        endDates: [C('100 CE', 'wp-buni', 'infobox and lead'), C('500 CE', 'wp-buni', "lead ('probably survived until 500 AD')")],
      },
    },
    {
      id: 'tarumanagara', name: 'Tarumanagara', color: '#9a6a2a', parent: 'island-sea',
      span: { start: 'c. 358 CE', end: '669 CE', endDates: [C('669 CE', 'wp-tarumanagara', 'infobox (invasion by Sriwijaya)')] },
    },
    { id: 'kalingga', name: 'Kalingga (Central Java)', color: '#7a4a5a', parent: 'island-sea', span: {
      start: 'c. 550 CE', end: 'c. 650 CE',
      startDates: [C('550 CE', 'wp-kalingga', "infobox and lead ('6th century')", { margin: 50 })],
      endDates: [C('650 CE', 'wp-kalingga', "infobox ('7th century')", { margin: 50 })],
    } },
    {
      id: 'kutai', name: 'Kutai (East Borneo)', color: '#5a5a8a', parent: 'island-sea',
      span: {
        start: '399 CE', end: '1635 CE',
        startDates: [C('399 CE', 'wp-kutai', 'lead and Kutai Martapura Kingdom'), C('350 CE', 'wp-kutai', "History of Indonesia sidebar ('Kutai Kingdom 350–1605')")],
      },
    },
    {
      id: 'sa-huynh-kalanay', name: 'Sa Huỳnh–Kalanay trade sphere', color: '#3a7a7a', parent: 'island-sea',
      span: {
        start: 'c. 500 BCE', end: 'c. 1500 CE',
        startDates: [C(500, 'wp-sa-huynh', "Trade network ('500 BC to AD 1500')"), C(400, 'wp-kalanay', "lead (pottery 'dated 400 BC to AD 1500')")],
      },
    },
    { id: 'taiwan-iron-age', name: 'Iron Age Taiwan', color: '#4a6a7a', parent: 'island-sea' },
  ],
  { after: 'island-sea' },
);
ed.data.events.find((e: { uuid: string }) => e.uuid === 'buni').tracks = ['buni-culture'];
ed.data.events.find((e: { uuid: string }) => e.uuid === 'kalanay').tracks = ['sa-huynh-kalanay'];

ed.tracks(
  [
    { id: 'australia', name: 'Aboriginal Australia', color: '#9a5a3a', parent: 'oceania' },
    { id: 'torres-strait', name: 'Torres Strait', color: '#6a6a4a', parent: 'oceania' },
    { id: 'fiji', name: 'Fiji', color: '#3a6a8a', parent: 'oceania' },
    { id: 'tonga-samoa', name: 'Tonga and Samoa', color: '#2a7a9a', parent: 'oceania' },
    { id: 'east-polynesia', name: 'East Polynesia', color: '#4a8aaa', parent: 'oceania' },
    {
      id: 'pohnpei', name: 'Pohnpei (Micronesia)', color: '#5a7a6a', parent: 'oceania',
      span: { start: 'c. 1 CE', end: 'c. 1628 CE', startDates: [C('1 CE', 'wp-nan-madol', "Archaeology ('probably around AD 1')", { margin: 50 })] },
    },
  ],
  { after: 'oceania' },
);

// ---------- Island Southeast Asia ----------
ed.event({
  uuid: 'lingling-o', title: 'The earliest surviving lingling-o', start: 'c. 500 BCE', tracks: ['sa-huynh-kalanay', 'taiwan-iron-age'],
  descr: 'Double-headed pendants and earrings carved from nephrite jade. The Maritime Jade Road between the Philippines and Taiwan, established around 2000 BC, peaks until 500 CE and wanes from then until 1000 CE; Philippine craftsmen work Taiwanese jade until around 1000 AD.',
  sources: [S('wp-lingling-o', 'lead and Batanes workshop site'), S('wp-kalanay', 'lead'), S('wp-prehistory-taiwan', 'Neolithic')],
});
ed.event({
  uuid: 'sungai-batu', title: 'The Sungai Batu brick monument', start: '110 CE', tracks: ['bujang-valley'],
  descr: 'A clay brick monument in the Bujang Valley, described as the oldest man-made structure recorded in Southeast Asia. Sites explored after 2008 are said to date from the 2nd century CE; Ptolemy wrote of the Golden Chersonese.',
  sources: [S('wp-bujang', 'lead, Archaeological research and History')],
});
ed.event({
  uuid: 'kutai-yupa', title: 'Mūlawarman’s yūpa inscriptions', start: 'c. 375 CE', tracks: ['kutai'],
  descr: 'Seven stone pillars at Kutai, the earliest known stone inscriptions in Indonesia, whose script is dated to the last half of the 4th century. They name Kudungga, his son Aśwawarman, founder of the dynasty, and his grandson Mūlawarman, but not the kingdom.',
  sources: [S('wp-kutai', 'Kutai Martapura Kingdom'), S('wp-prehistoric-indonesia', 'lead')],
  startDates: [C('375 CE', 'wp-kutai', "Kutai Martapura Kingdom ('last half the 4th century')", { margin: 25 })],
});
ed.event({
  uuid: 'faxian-java', title: 'Faxian stays on Java', start: '412 CE', end: '413 CE', tracks: ['tarumanagara'],
  descr: 'The monk stays on the island of Ye-po-ti, most probably western Java, for six months, from December 412 until May 413.',
  sources: [S('wp-tarumanagara', 'Historiography')],
  links: [{ to: 'faxian', kind: 'part-of' }],
});
ed.event({
  uuid: 'purnawarman', title: 'Purnawarman’s inscriptions', start: 'c. 450 CE', tracks: ['tarumanagara'],
  descr: 'The 5th-century ruler of Tarumanagara produces the earliest known inscriptions in Java. The Ciaruteun boulder, found near Ciampea in 1863, is the earliest to name the kingdom and bears his footprints, likened to Vishnu’s.',
  sources: [S('wp-tarumanagara', 'lead and Age of Purnawarman'), S('wp-ciaruteun', 'infobox, lead, History and Content')],
  startDates: [C('450 CE', 'wp-ciaruteun', "infobox ('early 5th century') and History ('5th century')", { margin: 50 }), C('450 CE', 'wp-tarumanagara', "lead ('5th-century ruler')", { margin: 50 })],
});
ed.event({
  uuid: 'taiwan-metal', title: 'Metal reaches Taiwan', start: 'c. 1 CE', tracks: ['taiwan-iron-age'],
  descr: 'Around the beginning of the Common Era, iron and other metals appear and artisans switch from jade to metal, glass and carnelian. By around AD 400, wrought iron is produced locally in bloomeries, possibly a technology from the Philippines.',
  sources: [S('wp-prehistory-taiwan', 'Neolithic and Metal Age')],
  startDates: [C('1 CE', 'wp-prehistory-taiwan', "Metal Age ('around the beginning of the Common Era')", { margin: 50 })],
});

// ---------- Australia and the Torres Strait ----------
// These pages give only round "years ago" figures; each is a claim with a wide margin, counted back from 1950.
ed.event({
  uuid: 'torres-strait-culture', title: 'A Torres Strait maritime culture', start: 'c. 550 BCE', tracks: ['torres-strait'],
  descr: 'The islands are first occupied around 4,000 years ago; by 2,500 years ago more of them are occupied and a distinctive maritime culture has emerged. Agriculture develops on some islands, and villages appear by 700 years ago.',
  sources: [S('wp-prehistory-australia', 'lead and Culture and technology')],
  startDates: [C(550, 'wp-prehistory-australia', "Culture and technology ('By 2,500 years ago')", { margin: 100 })],
});
ed.event({
  uuid: 'dingo-torres-strait', title: 'Dingoes in the Torres Strait', start: 'c. 150 BCE', tracks: ['torres-strait', 'australia'],
  descr: 'The earliest dingo remains in the Torres Strait date to 2,100 years before present; desiccated dingo flesh from Thylacine Hole on the Nullarbor Plain dates to 2,200. The earliest known dingo remains in Australia, from Western Australia, are about 3,450 years old.',
  sources: [S('wp-dingo', 'infobox, lead and History')],
  startDates: [C(150, 'wp-dingo', "History ('2,100 YBP')", { margin: 100 })],
});
ed.event({
  uuid: 'spear-barbs', title: 'Spear barbs give way to new tools', start: 'c. 50 BCE', tracks: ['australia'],
  descr: 'Spear barbs and tips peak about 2,000 years ago, then disappear from the archaeological record in south-eastern Australia, replaced by coastal shell fish hooks and bone points, axes for hunting possums and adzes for digging sticks; regular burning is part of this late Holocene shift. Shell fish hooks appear in Australia about 1,200 years ago.',
  sources: [S('wp-fire-stick', 'History'), S('wp-prehistory-australia', 'Culture and technology')],
  startDates: [C(50, 'wp-fire-stick', "History ('peaked about 2,000 years ago')", { margin: 100 })],
});
ed.event({
  uuid: 'ubirr', title: 'Most of Ubirr’s rock paintings', start: 'c. 50 BCE', tracks: ['australia'],
  descr: 'The rock faces at Ubirr, in Kakadu National Park, are painted and repainted continuously; most paintings there were created about 2,000 years ago, and some have been repainted into modern times. A painted thylacine shows an animal extinct in the area for about 2,000 years.',
  sources: [S('wp-ubirr', 'lead and Main gallery')],
  startDates: [C(50, 'wp-ubirr', "lead ('about 2000 years ago')", { margin: 100 })],
});

// ---------- Oceania ----------
ed.event({
  uuid: 'long-pause', title: 'The long pause in Polynesian settlement', start: 'c. 900 BCE', end: 'c. 700 CE', tracks: ['tonga-samoa', 'fiji'],
  descr: 'Having reached Fiji, Samoa and Tonga by around 900 BC, Polynesians stay at the furthest extent of the Austronesian expansion for some 1,500 years and lose the art of pottery. Around 700 AD they resume their migrations east, to the Cook Islands, French Polynesia and the Marquesas. One cited page, Wikipedia\'s Polynesians, carries a notice asking for text translated from the Russian article.',
  sources: [S('wp-polynesians', 'Origins')],
});
ed.event({
  uuid: 'melanesian-influx', title: 'A Melanesian influx into Fiji', start: 'c. 1 CE', tracks: ['fiji'],
  descr: 'About a thousand years after the first Austronesian settlers, a large influx of people with mainly Melanesian genetics arrives around the beginning of the Common Era.',
  sources: [S('wp-fiji-history', 'lead and Early settlement')],
  startDates: [C('1 CE', 'wp-fiji-history', "lead ('about the time of the beginning of the Common Era')", { margin: 50 })],
});
ed.event({
  uuid: 'plain-ware', title: 'Polynesian Plain Ware, and the end of pottery', start: '700 BCE', end: '400 CE', tracks: ['tonga-samoa', 'fiji'],
  descr: 'In Tonga, settlers stop decorating their pots two hundred years after arriving and make plain ware until about 400 AD, when they stop making pottery at all; the same happens in Fiji and Samoa. A Lapita hamlet grows into a village over a kilometre long.',
  sources: [S('wp-tonga-history', 'The Lapita Period and The Polynesian Plain Ware Period'), S('wp-lapita', 'Artifact dating')],
  endDates: [C('400 CE', 'wp-tonga-history', "Plain Ware Period ('By 1550 BP (400 AD)')"), C('1 CE', 'wp-lapita', "Artifact dating (Tonga 'by about 2,000 years ago')", { margin: 100 })],
});
ed.event({
  uuid: 'samoa-quiet', title: 'Samoa’s unrecorded centuries', start: '750 BCE', end: '1000 CE', tracks: ['tonga-samoa'],
  descr: 'Little is known about human activity in Samoa in this period, when pottery-making appears to stop suddenly; it may have been a time of mass migrations that led to the settlement of present-day Polynesia.',
  sources: [S('wp-samoa-history', 'Early history')],
});
ed.event({
  uuid: 'tonga-formative', title: 'Tonga’s Formative Dark Age', start: '400 CE', end: '1200 CE', tracks: ['tonga-samoa'],
  descr: 'The population of Tongatapu grows to between 17,000 and 25,000. The Tuʻi Tonga line may begin as early as 950 AD; the maritime empire does not begin until after 1200.',
  sources: [S('wp-tonga-history', 'The Formative Dark Age')],
});
ed.event({
  uuid: 'east-polynesia-early-dates', title: 'Early, superseded dates for East Polynesia', start: 'c. 300 CE', tracks: ['east-polynesia'],
  descr: 'Older estimates put people in the Marquesas before 100 AD, on Rapa Nui around 300–400 CE and in Hawaii around 300 (Kirch’s textbooks). Recent studies place the Society Islands at about 1025–1120, the rest of the Marquesas at 1190–1290, Hawaii at around 940–1130, and Rapa Nui possibly as late as 1200.',
  sources: [S('wp-marquesas', 'History'), S('wp-easter-island-history', 'First peoples'), S('wp-hawaii-history', 'Polynesian migration and arrival')],
  startDates: [C('350 CE', 'wp-easter-island-history', "First peoples ('around 300–400 CE')", { margin: 50 }), C('300 CE', 'wp-hawaii-history', "Polynesian migration and arrival (Kirch, 'about 300')")],
});
ed.event({
  uuid: 'pohnpei-settled', title: 'People on Pohnpei', start: 'c. 80 CE', end: '200 CE', tracks: ['pohnpei'],
  descr: 'Radiocarbon dating shows human activity at Nan Madol from around AD 80–200; the earliest settlement on Pohnpei was probably around AD 1. Islet building starts by the 8th or 9th century, and the megaliths around 1180.',
  sources: [S('wp-nan-madol', 'History and Archaeology')],
});

ed.save();
