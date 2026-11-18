// Tribal and mobile peoples who shaped the major powers (2026-11-18, the author's list): Arameans,
// Amorites, Chaldeans, Hurrians, Kaska, Qedarites and the Rong and Di get rows, each next to the power
// they pressed; Suteans, Lullubi, Mushki, Shasu and Medjay appear as events only. Every date was
// quoted verbatim from the cited Wikipedia page by a fetch agent; summary-only values are in the gaps list.
// See docs/ancient-sources.md, "Peoples pass".
// The old Aram-Damascus row (id `aram`, from the base data) becomes "Arameans", with Aram-Damascus and
// Bit-Adini as sub-rows; its two events move to the Aram-Damascus sub-row.
// Re-runnable: it replaces what it added before. Run after ideas.ts and before groups.ts.
//   node scripts/additions/peoples.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-arameans', 'Arameans', 'Arameans'],
  ['wp-ahlamu', 'Ahlamu', 'Ahlamu'],
  ['wp-tp1', 'Tiglath-Pileser I', 'Tiglath-Pileser_I'],
  ['wp-bit-adini', 'Bit Adini', 'Bit_Adini'],
  ['wp-chaldea', 'Chaldea', 'Chaldea'],
  ['wp-merodach-baladan', 'Marduk-apla-iddina II', 'Marduk-apla-iddina_II'],
  ['wp-ashur-dan-ii', 'Ashur-dan II', 'Ashur-dan_II'],
  ['wp-amorites', 'Amorites', 'Amorites'],
  ['wp-hurrians', 'Hurrians', 'Hurrians'],
  ['wp-urkesh', 'Urkesh', 'Urkesh'],
  ['wp-kaskians', 'Kaskians', 'Kaskians'],
  ['wp-lullubi', 'Lullubi', 'Lullubi'],
  ['wp-mushki', 'Mushki', 'Mushki'],
  ['wp-qedarites', 'Qedarites', 'Qedarites'],
  ['wp-xirong', 'Xirong', 'Xirong'],
  ['wp-quanrong', 'Quanrong', 'Quanrong'],
  ['wp-beidi', 'Beidi', 'Beidi'],
  ['wp-zhongshan', 'Zhongshan (state)', 'Zhongshan_(state)'],
  ['wp-king-you', 'King You of Zhou', 'King_You_of_Zhou'],
  ['wp-shasu', 'Shasu', 'Shasu'],
  ['wp-medjay', 'Medjay', 'Medjay'],
] as const)
  ed.wikipedia(key, title, slug);

// --- Rows --------------------------------------------------------------------------------------------

// Arameans: the old `aram` row keeps its id (and links) but now stands for the people.
const oldAram = ed.data.tracks.find((t: { id: string }) => t.id === 'aram');
const damascusSpan =
  oldAram?.name === 'Aram-Damascus'
    ? oldAram.span
    : ed.data.tracks.find((t: { id: string }) => t.id === 'aram-damascus')?.span;
if (!damascusSpan) throw new Error('no Aram-Damascus span to carry over');
ed.track({
  id: 'aram', name: 'Arameans', color: '#a35f4f', parent: 'levant',
  span: {
    start: 'c. 1100 BCE', end: '732 BCE',
    startDates: [
      C(1100, 'wp-arameans', "Etymology ('inscriptions of Tiglath-Pileser I (c. 1100 BCE)')"),
      R(1150, 1101, 'wp-arameans', "lead ('late 12th century BCE')"),
    ],
  },
});
ed.tracks(
  [
    { id: 'aram-damascus', name: 'Aram-Damascus', color: '#a35f4f', parent: 'aram', span: damascusSpan },
    {
      id: 'bit-adini', name: 'Bit-Adini (Til Barsib)', color: '#b0705f', parent: 'aram',
      span: { start: 'c. 1000 BCE', end: '856 BCE', endDates: [R(856, 855, 'wp-bit-adini', "infobox ('c. 1000 BC–856-5 BC')")] },
    },
  ],
  { after: 'aram' },
);
for (const e of ed.data.events) e.tracks = e.tracks.map((t: string) => (t === 'aram' && ['hazael', 'fall-of-damascus'].includes(e.uuid) ? 'aram-damascus' : t));

ed.track(
  {
    id: 'amorites', name: 'Amorites', color: '#a07848', parent: 'mesopotamia',
    span: {
      start: 'c. 2500 BCE', end: 'c. 1595 BCE',
      startDates: [C(2500, 'wp-amorites', "lead ('appearing in Sumerian records c. 2500 BC')")],
      endDates: [C(1595, 'wp-amorites', "Fall ('the Amorite era ended in Mesopotamia ... Kassite dynasty ... around 1595 BC')")],
    },
  },
  { before: 'babylonia' },
);
ed.track(
  {
    id: 'chaldeans', name: 'Chaldeans', color: '#6f7f4a', parent: 'mesopotamia',
    span: {
      start: 'c. 900 BCE', end: '539 BCE',
      startDates: [R(940, 860, 'wp-chaldea', "Ancient Chaldeans ('migrated into Mesopotamia sometime between c. 940 and 860 BC')"), C(852, 'wp-chaldea', 'History (first written attestation, 852 BC)')],
      endDates: [C(539, 'wp-chaldea', "Ancient Chaldeans ('by the time Babylon fell in 539 BC, perhaps before')")],
    },
  },
  { after: 'babylonia' },
);
ed.track(
  {
    id: 'hurrians', name: 'Hurrians', color: '#7f63a0', parent: 'mesopotamia',
    span: {
      start: 'c. 2250 BCE', end: '672 BCE',
      startDates: [
        C(2254, 'wp-hurrians', "Early Bronze Age ('a firm hold on the area by the reign of Naram-Sin of Akkad (c. 2254–2218 BC)')"),
        C(2250, 'wp-urkesh', 'Rulers (Tupkish c. 2250 BC)'),
        C(2500, 'wp-urkesh', 'infobox (Urkesh built c. 2500 BC; lead: founded possibly by the Hurrians)'),
      ],
      endDates: [C(673, 'wp-hurrians', "Shupria ('until its conquest by Assyria in 673–672 BC')"), C(672, 'wp-hurrians', "Shupria ('673–672 BC')")],
    },
  },
  { before: 'mitanni' },
);
ed.track(
  {
    id: 'kaska', name: 'Kaska', color: '#8a6a4a', parent: 'anatolia',
    span: {
      start: 'c. 1450 BCE', end: 'c. 1115 BCE',
      startDates: [C(1450, 'wp-kaskians', "History ('reign of Hantili II, c. 1450 BC')")],
      endDates: [R(1130, 1101, 'wp-kaskians', "History (Tiglath-Pileser I, 'late in the 12th century BC'; then they disappear)")],
    },
  },
  { after: 'hittites' },
);
ed.track(
  {
    id: 'qedarites', name: 'Qedarites (Arabs)', color: '#b0884a', parent: 'arabia',
    span: {
      start: 'c. 853 BCE', end: 'c. 50 BCE',
      startDates: [C(853, 'wp-qedarites', 'Neo-Assyrian period (Battle of Qarqar)'), R(900, 801, 'wp-qedarites', "lead ('Attested from the 9th century BCE')")],
      endDates: [R(100, 1, 'wp-qedarites', 'infobox (absorbed into the Nabataean state, 1st century BCE)')],
    },
  },
  { after: 'north-arabia' },
);
ed.track({ id: 'rong-di', name: 'Rong and Di peoples', color: '#7a6a3a', parent: 'china' }, { after: 'zhou' });

// --- Arameans, Suteans and Chaldeans -----------------------------------------------------------------

ed.event({
  uuid: 'tp1-arameans', title: 'Tiglath-Pileser I fights the Arameans', start: 'c. 1100 BCE', tracks: ['aram', 'as-middle'],
  descr: 'The first certain reference to the Arameans: an inscription of Tiglath-Pileser I calls them the "Ahlamu of the land Armaya". He campaigns in the Levant against the Arameans and other tribal peoples; late in his reign Aramaean tribesmen put pressure on his realm.',
  sources: [S('wp-arameans', 'Etymology and Under Neo-Assyrian rule'), S('wp-tp1', 'Reign'), S('wp-ahlamu', 'History')],
  startDates: [C(1100, 'wp-arameans', 'Etymology (c. 1100 BCE)')],
  links: [{ to: 'tiglath-pileser-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'suteans-arameans-babylonia', title: 'Suteans and Arameans enter Babylonia', start: 'c. 1100 BCE', tracks: ['aram', 'babylonia'],
  descr: 'West Semitic-speaking tribes arrive from the Levant: the earliest waves are Suteans and Arameans, followed a century or so later by the Kaldu (Chaldeans).',
  sources: [S('wp-chaldea', 'lead and Ancient Chaldeans')],
  startDates: [C(1100, 'wp-chaldea', "Ancient Chaldeans ('appeared in Babylonia, c. 1100 BC')")],
  links: [{ to: 'chaldeans-attested', kind: 'related' }],
});
ed.event({
  uuid: 'aramean-states', title: 'Assyria withdraws; Aramean states take the west', start: '1056 BCE', end: 'c. 1015 BCE', tracks: ['aram', 'as-middle'],
  descr: 'The Middle Assyrian Empire shrinks rapidly after Ashur-bel-kala, its last great ruler, dies in 1056 BC. The Arameans gain independence and take firm control of Eber-Nari, and in the 11th and 10th centuries conquer Sam\'al (renamed Bît-Agushi) and Til Barsip, chief town of Bît-Adini.',
  sources: [S('wp-arameans', 'Aramean states')],
  startDates: [C(1056, 'wp-arameans', 'Aramean states (death of Ashur-bel-kala)')],
  endDates: [R(1033, 1001, 'wp-arameans', "Aramean states ('in the late 11th century BC')")],
});
ed.event({
  uuid: 'ashur-dan-ii-arameans', title: 'Ashur-dan II retakes land from the Arameans', start: '934 BCE', end: '912 BCE', tracks: ['aram', 'as-middle'],
  descr: 'The first Assyrian king to campaign regularly in over a century; his annals present the wars against the Aramaeans to the west as retaking Assyrian territory. His successor Adad-nirari II (911–891 BC) marches as far as the Balikh river and the middle Euphrates.',
  sources: [S('wp-ashur-dan-ii', 'infobox, lead, Accomplishments and Succession')],
});
ed.event({
  uuid: 'qarqar', title: 'Battle of Qarqar', start: '853 BCE', tracks: ['aram-damascus', 'bit-adini', 'qedarites', 'israel-judah', 'as-neo'],
  descr: 'A coalition led by Aram-Damascus and Israel meets Shalmaneser III of Assyria. The Qedarite Gindibuʾ brings 1000 camelry, and Aḫuni of Bit-Adini joins the Levantine states.',
  sources: [S('wp-qedarites', 'Neo-Assyrian period'), S('wp-bit-adini', 'History')],
});
ed.event({
  uuid: 'bit-adini-annexed', title: 'Shalmaneser III annexes Bit-Adini', start: '856 BCE', tracks: ['bit-adini', 'as-neo'],
  descr: 'The Aramean kingdom with its capital at Til Barsib is conquered and absorbed into the Assyrian Empire. (The page also places Aḫuni in the 853 Qarqar coalition, after this date.)',
  sources: [S('wp-bit-adini', 'infobox and History')],
  startDates: [R(856, 855, 'wp-bit-adini', "History ('In 856-5 BC')")],
});
ed.event({
  uuid: 'aramaic-lingua-franca', title: 'Aramaic becomes the lingua franca of the Assyrian empire', start: 'c. 750 BCE', tracks: ['aram', 'as-neo'],
  descr: 'Imperial Aramaic becomes the empire\'s common language under Tiglath-Pileser III; it stays a lingua franca under the Neo-Babylonian and Achaemenid empires.',
  sources: [S('wp-chaldea', 'Language'), S('wp-arameans', 'lead')],
  startDates: [R(760, 740, 'wp-chaldea', "Language ('in the mid-8th century BC')")],
  links: [{ to: 'tiglath-pileser-iii', kind: 'part-of' }],
});
ed.event({
  uuid: 'chaldeans-attested', title: 'Chaldeans first recorded', start: '852 BCE', tracks: ['chaldeans', 'as-neo'],
  descr: 'Shalmaneser III subjugates Mushallim-Marduk, chief of the Amukani tribe: the first written attestation of the Chaldeans. Their tribes include Bit-Yâkin, Bet-Dakuri, Bet-Adini, Bet-Amukkani and Bet-Shilani.',
  sources: [S('wp-chaldea', 'History')],
});
ed.event({
  uuid: 'marduk-apla-usur', title: 'A Chaldean takes the Babylonian throne', start: 'c. 780 BCE', tracks: ['chaldeans', 'babylonia'],
  descr: 'The Chaldeans come to historical prominence in Babylonia for the first time when Marduk-apla-usur usurps the throne.',
  sources: [S('wp-chaldea', 'History')],
  startDates: [C(780, 'wp-chaldea', "History ('in 780 BC')")],
});
ed.event({
  uuid: 'merodach-baladan', title: 'Marduk-apla-iddina II holds Babylon against Assyria', start: '722 BCE', end: '710 BCE', tracks: ['chaldeans', 'babylonia', 'as-neo'],
  descr: 'A Chaldean of the Bit-Yakin tribe seizes the Babylonian throne from Assyrian control. An Assyrian attempt to defeat him near Der in 720 fails, but Sargon II eventually drives him from Babylon.',
  sources: [S('wp-merodach-baladan', 'infobox and Biography')],
});
ed.event({
  uuid: 'merodach-baladan-2', title: 'Marduk-apla-iddina II\'s second reign', start: '703 BCE', end: '702 BCE', tracks: ['chaldeans', 'babylonia', 'as-neo', 'qedarites'],
  descr: 'He reigns nine months before Sennacherib defeats him near Kish; he flees to Elam and dies in exile. The Qedarites back his revolt (his supporter Bašqanu is the brother of their queen Yaṯiʿe).',
  sources: [S('wp-merodach-baladan', 'Biography'), S('wp-qedarites', 'Neo-Assyrian period')],
  links: [{ to: 'merodach-baladan', kind: 'succeeds' }],
});
ed.addRow('nabopolassar', 'chaldeans');

// --- Amorites, Lullubi, Hurrians -------------------------------------------------------------------------

ed.event({
  uuid: 'naram-sin-amorites', title: 'Naram-Sin defeats Sumerians and Amorites at Jebel Bishri', start: 'c. 2240 BCE', tracks: ['amorites', 'akkad'],
  descr: 'A royal inscription records Naram-Sin of Akkad defeating a coalition of Sumerian cities and Amorites near Jebel Bishri.',
  sources: [S('wp-amorites', 'History, Third millennium BC')],
  links: [{ to: 'naram-sin', kind: 'part-of' }],
});
ed.event({
  uuid: 'naram-sin-lullubi', title: 'Victory Stele of Naram-Sin over the Lullubi', start: 'c. 2250 BCE', tracks: ['akkad'],
  descr: 'The stele shows Naram-Sin\'s victory over the Lullubi mountain tribe and their king Satuni; his inscription names Sidur and Sutuni, princes of the Lulubi, who "made war against me".',
  sources: [S('wp-lullubi', 'Akkadian Empire and Gutian dynasty (stele caption)')],
  links: [{ to: 'naram-sin', kind: 'part-of' }],
});
for (const u of ['sumu-abum', 'shamshi-adad', 'hammurabi-reign']) ed.addRow(u, 'amorites');

ed.event({
  uuid: 'urkesh-tupkish', title: 'Tupkish, king of Urkesh and Nagar', start: 'c. 2250 BCE', tracks: ['hurrians'],
  descr: 'The first known Hurrian kingdom centres on Urkesh (Tell Mozan). Tupkish, a king with a Hurrian name, rules during the ascendancy of Akkad; seals of Tar\'am-Agade, a daughter of Naram-Sin, were found at the site.',
  sources: [S('wp-hurrians', 'Early Bronze Age'), S('wp-urkesh', 'Akkadian period and Rulers')],
  links: [{ to: 'naram-sin', kind: 'related' }],
});
ed.event({
  uuid: 'hurrians-alalakh', title: 'Hurrians spread into northern Syria', start: 'c. 1725 BCE', tracks: ['hurrians'],
  descr: 'By 1725 BC Hurrians are found in parts of northern Syria such as Alalakh; Hurrians entering northern Syria at the end of the 17th century BC form Mitanni, which rises to power before 1550 BC.',
  sources: [S('wp-hurrians', 'Middle Bronze Age and Late Bronze Age')],
  startDates: [C(1725, 'wp-hurrians', "Middle Bronze Age ('By 1725 BC')")],
  links: [{ to: 'mitanni-kirta', kind: 'causes' }],
});
ed.event({
  uuid: 'urkesh-abandoned', title: 'Urkesh abandoned', start: 'c. 1350 BCE', tracks: ['hurrians', 'mitanni'],
  descr: 'After Suppiluliuma I defeats Tushratta, the city is largely abandoned.',
  sources: [S('wp-urkesh', 'infobox and Mitanni period')],
  startDates: [C(1350, 'wp-urkesh', "Mitanni period ('largely abandoned around 1350 BC')")],
  links: [{ to: 'tushratta', kind: 'related' }],
});
ed.event({
  uuid: 'shupria-conquered', title: 'Assyria conquers Shupria', start: '673 BCE', end: '672 BCE', tracks: ['hurrians', 'as-neo'],
  descr: 'Shupria stays an independent kingdom after the destruction of Mitanni until Assyria conquers it. By the Early Iron Age the Hurrians had been assimilated with other peoples.',
  sources: [S('wp-hurrians', 'Shubria/Shupria and lead')],
});

// --- Kaska and Mushki ------------------------------------------------------------------------------------

ed.event({
  uuid: 'kaska-first', title: 'The Kaska first appear in Hittite prayers', start: 'c. 1450 BCE', tracks: ['kaska', 'hit-middle'],
  descr: 'They appear in prayers from the reign of Hantili II; Tudhaliya II\'s third campaign is against the Kaskas, and Arnuwanda I prays for the return of Nerik and tries to buy off some Kaska with tribute.',
  sources: [S('wp-kaskians', 'History')],
});
ed.event({
  uuid: 'kaska-burn-hattusa', title: 'Kaska burn Hattusa; the court moves to Samuha', start: 'c. 1375 BCE', end: 'c. 1350 BCE', tracks: ['kaska', 'hit-new'],
  descr: 'Sometime between Arnuwanda I and Suppiluliuma I, the Kaska join Hayasa-Azzi and Isuwa to burn Hattusa to the ground. Tudhaliya III and Suppiluliuma I hold court at Samuha; Suppiluliuma defeats Piyapili\'s united tribes and Hattusa returns to the Hittites. The Kaska could field as many as 9,000 warriors and 800 chariots.',
  sources: [S('wp-kaskians', 'History')],
  startDates: [R(1375, 1350, 'wp-kaskians', "History (Tudhaliya III and Suppiluliuma I at Samuha, 'c. 1375–1350 BC')")],
  links: [{ to: 'suppiluliuma-i', kind: 'related' }],
});
ed.event({
  uuid: 'kaska-sack-hattusa', title: 'Kaska sack Hattusa again', start: 'c. 1285 BCE', tracks: ['kaska', 'hit-new'],
  descr: 'In the early 13th century, while Muwatalli II is king, the Kaskas sack Hattusa; Hattusili III later recaptures Nerik.',
  sources: [S('wp-kaskians', 'History')],
  startDates: [R(1300, 1270, 'wp-kaskians', "History ('in the early 13th century')")],
  links: [{ to: 'muwatalli-ii', kind: 'related' }],
});
ed.event({
  uuid: 'mushki-alzi', title: 'Mushki and Kaska attack Alzi; Ashur-Dan I drives them back', start: 'c. 1160 BCE', tracks: ['kaska', 'as-middle'],
  descr: 'The Eastern Mushki, who moved into Hatti around the time the Hittite Empire collapsed, join the Urumu and the Kaska (Apishlu) in an attempt on Alzi and Puruhuzzi; Ashur-Dan I pushes them back and subjugates them.',
  sources: [S('wp-mushki', 'Eastern Mushki'), S('wp-kaskians', 'History')],
  startDates: [C(1160, 'wp-mushki', "Eastern Mushki ('in about 1160 BC')")],
});
ed.event({
  uuid: 'mushki-tp1', title: 'Tiglath-Pileser I turns back the Mushki', start: 'c. 1114 BCE', tracks: ['as-middle', 'kaska'],
  descr: 'The Mushki push into Kadmuhi on the upper Tigris and are turned away by Tiglath-Pileser I, apparently settling in Alzi. He also records the Kaska ("Apishlu") late in the 12th century, after which they disappear from the records.',
  sources: [S('wp-mushki', 'Eastern Mushki'), S('wp-tp1', 'Reign'), S('wp-kaskians', 'History')],
  startDates: [C(1115, 'wp-mushki', "Eastern Mushki ('In 1115 BC')"), C(1112, 'wp-tp1', "Reign ('first campaign was against the Phrygians (Mushku) in 1112 BC')")],
  links: [{ to: 'tiglath-pileser-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'mita-sargon', title: 'Mita of the Mushki becomes Sargon II\'s ally', start: '709 BCE', tracks: ['phrygia', 'as-neo'],
  descr: 'After joining an anti-Assyrian alliance with Tabal and Carchemish, the Mushki under Mita re-emerge as allies of Assyria; Sargon names Mita his friend. Assyrian sources identify the Western Mushki with the Phrygians, and some scholars think Mita became King Midas.',
  sources: [S('wp-mushki', 'lead and Western Mushki')],
  links: [{ to: 'midas', kind: 'related' }],
});

// --- Qedarites -------------------------------------------------------------------------------------------

ed.event({
  uuid: 'zabibe-tribute', title: 'Queen Zabibe pays tribute to Tiglath-Pileser III', start: '738 BCE', tracks: ['qedarites', 'as-neo'],
  descr: 'With Rezin of Damascus, Menahem of Israel and Hiram II of Tyre, she acknowledges Assyrian hegemony: the first explicit mention of the Qedarites by name.',
  sources: [S('wp-qedarites', 'infobox and Neo-Assyrian period')],
  links: [{ to: 'tiglath-pileser-iii', kind: 'part-of' }],
});
ed.event({
  uuid: 'samsi-revolt', title: 'Queen Šamši rebels; Assyria wins at Mount Saqurri', start: '733 BCE', end: '732 BCE', tracks: ['qedarites', 'as-neo'],
  descr: 'Šamši pledges allegiance after the 734 campaign and rebels in 733. Tiglath-Pileser III defeats the Qedarites near Mount Saqurri; she flees to the Wadi Sirhan but keeps her throne and later pays 125 white camels.',
  sources: [S('wp-qedarites', 'Neo-Assyrian period')],
  links: [{ to: 'tiglath-pileser-iii', kind: 'part-of' }],
});
ed.event({
  uuid: 'sennacherib-qedarites', title: 'Sennacherib campaigns against the Qedarites', start: '691 BCE', tracks: ['qedarites', 'as-neo'],
  descr: 'Queen Teʾelḫunu and her daughter Tabūʿa are captured at Dūmat, and Ḫazaʾil surrenders and pays tribute.',
  sources: [S('wp-qedarites', 'Neo-Assyrian period')],
});
ed.event({
  uuid: 'qedarites-babylon-revolt', title: 'Qedarites join Šamaš-šuma-ukin\'s revolt', start: '652 BCE', end: '648 BCE', tracks: ['qedarites', 'as-neo', 'babylonia'],
  descr: 'King Abyaṯiʿ supports the revolt against Ashurbanipal, and the Qedarites are trapped in Babylon. After it is suppressed they raid Assyria\'s western borderlands with the Nabataeans.',
  sources: [S('wp-qedarites', 'Neo-Assyrian period')],
  links: [{ to: 'ashurbanipal', kind: 'related' }],
});

// --- Rong and Di (China) ---------------------------------------------------------------------------------

ed.event({
  uuid: 'king-mu-quanrong', title: 'King Mu of Zhou defeats the Quanrong', start: 'c. 964 BCE', tracks: ['rong-di', 'zhou-western'],
  descr: 'The following year he attacks the Western Rong and the Xurong.',
  sources: [S('wp-xirong', 'Timeline')],
});
ed.event({
  uuid: 'rong-raids-zhou', title: 'Western Rong and Xianyun raid deep into Zhou', start: '877 BCE', end: '841 BCE', tracks: ['rong-di', 'zhou-western'],
  descr: 'Under King Li. His successor King Xuan (827–782 BCE) sends Qin against the Western Rong, who submit and cede territory, and Jin against the Northern Rong.',
  sources: [S('wp-xirong', 'Timeline')],
});
ed.event({
  uuid: 'quanrong-haojing', title: 'The Quanrong sack Haojing and kill King You', start: '771 BCE', tracks: ['rong-di', 'zhou-western'],
  descr: 'The Marquess of Shen invites the Quanrong to join an attack on King You; the joint force occupies the capital Haojing, kills him and captures Bao Si. (The Xinian bamboo slips say King You attacked Shen first.) This ends the Western Zhou.',
  sources: [S('wp-quanrong', 'History'), S('wp-king-you', 'lead, History and In literature'), S('wp-xirong', 'Timeline')],
  links: [{ to: 'zhou-east', kind: 'causes' }],
});
ed.event({
  uuid: 'di-sack-wey', title: 'The Red Di take the capital of Wey', start: '660 BCE', tracks: ['rong-di', 'zhou-eastern'],
  descr: 'They kill its ruler but are driven out by Qi. Jin fights many wars with the Di from 660 to 507 BC. The page marks these entries as needing citations.',
  sources: [S('wp-beidi', 'History')],
});
ed.event({
  uuid: 'rong-absorbed', title: 'The Rong fade from the record', start: 'c. 650 BCE', tracks: ['rong-di', 'zhou-eastern'],
  descr: 'After 650 BCE the Rong are rarely mentioned; they seem to have been mostly absorbed by the states of Qi and Jin.',
  sources: [S('wp-xirong', 'Timeline')],
  startDates: [C(650, 'wp-xirong', "Timeline ('After 650 BCE')")],
});
ed.event({
  uuid: 'zhongshan', title: 'Zhongshan, a non-Zhou state in the north', start: '414 BCE', end: '296 BCE', tracks: ['rong-di', 'zhou-eastern'],
  descr: 'Some sources (Records of the Grand Historian) say Beidi founded and ruled it; others list it only as not Zhou or Han. Wei conquers it in 407, it regains independence in 381, and Zhao annexes it after ten years of war.',
  sources: [S('wp-zhongshan', 'infobox, Origins and History'), S('wp-beidi', 'Name and History')],
  startDates: [C(414, 'wp-zhongshan', "History ('in 414 BC ... traditionally considered the founding')"), C(381, 'wp-zhongshan', "infobox ('Established 414/381')")],
  endDates: [C(296, 'wp-zhongshan', 'infobox and History'), C(295, 'wp-beidi', 'History')],
});
ed.event({
  uuid: 'qin-last-rong', title: 'Qin defeats the last hostile Rong tribe', start: '314 BCE', tracks: ['rong-di', 'zhou-eastern'],
  descr: 'By 400 BC most of the Di and Rong had been eliminated as independent polities.',
  sources: [S('wp-xirong', 'Timeline'), S('wp-beidi', 'History')],
});

// --- Egypt's neighbours: Medjay and Shasu ----------------------------------------------------------------

ed.event({
  uuid: 'medjay-first', title: 'The Medjay first recorded', start: 'c. 2310 BCE', tracks: ['eg-old', 'nubia'],
  descr: 'The Autobiography of Weni, from the reign of Pepi I, is the first written mention of the Medjay. Until the end of the Second Intermediate Period the word denotes a Nubian people.',
  sources: [S('wp-medjay', 'Origins')],
  startDates: [R(2332, 2287, 'wp-medjay', "Origins ('Pepi I Meryre (reigned 2332–2287 BCE)')")],
});
ed.event({
  uuid: 'medjay-police', title: 'Medjay: from desert people to Egyptian police', start: 'c. 1800 BCE', end: 'c. 1550 BCE', tracks: ['eg-sip', 'nubia'],
  descr: 'The page dates the pan-graves to the late Middle Kingdom and Second Intermediate Period. Medjay serve in Kamose\'s campaign against the Hyksos; by the 18th Dynasty they are an elite paramilitary police force, and after the 20th Dynasty the term no longer appears in Egyptian records.',
  sources: [S('wp-medjay', 'Origins, Pan-graves, Police force and Demise')],
  startDates: [R(1800, 1550, 'wp-medjay', "Pan-graves ('(1800-1550 BC)')")],
  links: [{ to: 'ahmose-expels-hyksos', kind: 'related' }],
});
ed.event({
  uuid: 'shasu-yhw', title: '"Land of the Shasu yhw" in Egyptian texts', start: 'c. 1350 BCE', tracks: ['eg-new', 'can-lba'],
  descr: 'Column bases of Amenhotep III\'s temple at Soleb list the land of the Shasu yhwꜣ; a 13th-century copy at Amara, under Seti I or Ramesses II, names six Shasu groups. Astour notes this predates the Mesha Stele\'s use of the divine name by over 500 years. Shasu raids could cut Egypt\'s northern routes, prompting punitive campaigns by Ramesses II and Merneptah.',
  sources: [S('wp-shasu', 'History, Late Bronze Age and Shasu of Yhw')],
  startDates: [R(1400, 1301, 'wp-shasu', "Shasu of Yhw ('the period of Amenhotep III (14th century BCE)')")],
  links: [{ to: 'merneptah-stele', kind: 'related' }],
});

ed.save();
