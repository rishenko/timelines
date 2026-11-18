// South, Southeast and East Asia beyond China, c. 3500–330 BCE: the most important events only (first
// pass, 2026-11-17). Vedic India and Magadha join the Indus region (renamed "South Asia"); mainland
// Southeast Asia and Korea and Japan are new regions on either side of China. Every date was quoted
// verbatim from the cited Wikipedia page by a fetch agent; no page carried an AI-text warning (see
// docs/ancient-sources.md, seventh pass). Re-runnable: it replaces what it added before.
// Run after europe.ts, mediterranean.ts, steppe.ts and africa.ts.
//   node scripts/additions/asia.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');

for (const [key, title, slug] of [
  ['wp-vedic', 'Vedic period', 'Vedic_period'],
  ['wp-rigveda', 'Rigveda', 'Rigveda'],
  ['wp-mahajanapadas', 'Mahajanapadas', 'Mahajanapadas'],
  ['wp-magadha', 'Magadha', 'Magadha'],
  ['wp-bimbisara', 'Bimbisara', 'Bimbisara'],
  ['wp-buddha', 'The Buddha', 'The_Buddha'],
  ['wp-mahavira', 'Mahavira', 'Mahavira'],
  ['wp-achaemenid-indus', 'Achaemenid conquest of the Indus Valley', 'Achaemenid_conquest_of_the_Indus_Valley'],
  ['wp-jomon', 'Jōmon period', 'J%C5%8Dmon_period'],
  ['wp-yayoi', 'Yayoi period', 'Yayoi_period'],
  ['wp-sannai', 'Sannai-Maruyama Site', 'Sannai-Maruyama_Site'],
  ['wp-mumun', 'Mumun pottery period', 'Mumun_pottery_period'],
  ['wp-gojoseon', 'Old Chosŏn (Gojoseon)', 'Old_Chos%C5%8Fn'],
  ['wp-ban-chiang', 'Ban Chiang', 'Ban_Chiang'],
  ['wp-phung-nguyen', 'Phùng Nguyên culture', 'Ph%C3%B9ng_Nguy%C3%AAn_culture'],
  ['wp-dong-son', 'Đông Sơn culture', '%C4%90%C3%B4ng_S%C6%A1n_culture'],
  ['wp-dong-son-drum', 'Dong Son drum', 'Dong_Son_drum'],
  ['wp-sa-huynh', 'Sa Huỳnh culture', 'Sa_Hu%E1%BB%B3nh_culture'],
  ['wp-hong-bang', 'Hồng Bàng dynasty (Văn Lang)', 'H%E1%BB%93ng_B%C3%A0ng_dynasty'],
  ['wp-plain-of-jars', 'Plain of Jars', 'Plain_of_Jars'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows: South Asia ----------
ed.data.tracks.find((t: { id: string }) => t.id === 'indus').name = 'South Asia';
ed.tracks(
  [
    {
      id: 'vedic', name: 'Vedic period', color: '#c08040', parent: 'indus',
      span: {
        start: 'c. 1500 BCE', end: 'c. 500 BCE',
        endDates: [C(500, 'wp-vedic', 'infobox (Late Vedic) and lead'), C(600, 'wp-vedic', "section heading ('Later Vedic period (c. 1000 – c. 600 BCE)')")],
      },
    },
    { id: 'magadha', name: 'Magadha', color: '#a0603a', parent: 'indus', span: { start: 'c. 1200 BCE', end: '625 CE' } },
  ],
  { after: 'harappan' },
);

// ---------- rows: mainland Southeast Asia (before China) ----------
ed.tracks(
  [
    { id: 'se-asia', name: 'Mainland Southeast Asia', color: '#4a8a6a' },
    { id: 'ban-chiang', name: 'Ban Chiang (Thailand)', color: '#6a8a4a', parent: 'se-asia' },
    { id: 'phung-nguyen', name: 'Phùng Nguyên culture (Red River)', color: '#5a7a5a', parent: 'se-asia', span: { start: 'c. 2000 BCE', end: 'c. 1500 BCE' } },
    {
      id: 'dong-son', name: 'Đông Sơn culture', color: '#3a7a6a', parent: 'se-asia',
      span: { start: 'c. 1000 BCE', end: 'c. 100 CE', endDates: [C('100 CE', 'wp-dong-son', "navbox ('1,000 BC–100 AD')"), C(1, 'wp-dong-son', "lead (Vietnamese historians: 'about 1000 BC to 1 BC')")] },
    },
    { id: 'sa-huynh', name: 'Sa Huỳnh culture (central Vietnam)', color: '#4a6a8a', parent: 'se-asia', span: { start: 'c. 1000 BCE', end: 'c. 200 CE' } },
    { id: 'van-lang', name: 'Văn Lang and the Hùng kings (traditional)', color: '#7a6a4a', parent: 'se-asia', span: { start: '2879 BCE', end: '258 BCE' } },
    { id: 'plain-of-jars', name: 'Plain of Jars (Laos)', color: '#8a7a6a', parent: 'se-asia' },
  ],
  { before: 'china' },
);

// ---------- rows: Korea and Japan (after China) ----------
ed.tracks(
  [
    { id: 'korea-japan', name: 'Korea and Japan', color: '#8a4a6a' },
    { id: 'gojoseon', name: 'Old Chosŏn (Gojoseon)', color: '#7a4a7a', parent: 'korea-japan' },
    { id: 'mumun', name: 'Mumun pottery period (Korea)', color: '#9a5a6a', parent: 'korea-japan', span: { start: 'c. 1500 BCE', end: 'c. 300 BCE' } },
    {
      // The Jōmon period starts c. 14,000 BCE; the row starts with the Middle Jōmon, inside this timeline's range.
      id: 'jomon', name: 'Jōmon (Middle to Final)', color: '#8a6a5a', parent: 'korea-japan',
      span: {
        start: '3520 BCE', end: 'c. 300 BCE',
        endDates: [C(300, 'wp-jomon', "lead and Chronology ('refined … to 300 BC')"), C(500, 'wp-jomon', "Chronology ('Final (1,250–500 BC)')")],
      },
    },
    {
      id: 'yayoi', name: 'Yayoi period (Japan)', color: '#a06a4a', parent: 'korea-japan',
      span: {
        start: 'c. 300 BCE', end: 'c. 300 CE',
        startDates: [
          C(300, 'wp-yayoi', "Features ('generally accepted to date from circa 300 BC')"),
          R(1000, 800, 'wp-yayoi', "Features (radiocarbon, 'highly controversial': 'between ca. 1000 BC and 800 BC')"),
          R(500, 300, 'wp-jomon', "Chronology (radiocarbon: 'between 500 and 300 BC')"),
        ],
      },
    },
  ],
  { after: 'china' },
);

// ---------- events: South Asia ----------
ed.event({
  uuid: 'rigveda', title: 'The Rigveda composed', start: 'c. 1500 BCE', end: 'c. 1000 BCE', tracks: ['vedic'],
  descr: 'Usually dated to roughly 1500–1000 BCE; the dates are not confirmed and remain contentious. Codified around 1200–1000 BCE in the early Kuru kingdom (Witzel).',
  sources: [S('wp-rigveda', 'infobox, lead and Dating'), S('wp-vedic', 'Origins')],
  startDates: [C(1500, 'wp-rigveda', 'infobox and lead'), C(1400, 'wp-vedic', "Origins ('composed c. 1400–1000 BCE')"), C(1900, 'wp-rigveda', "lead ('a wider approximation of c. 1900–1200 BCE')")],
  endDates: [C(1000, 'wp-rigveda', 'infobox and lead'), C(1200, 'wp-rigveda', 'lead (wider approximation)')],
  links: [{ to: 'indo-aryan-migrations', kind: 'related' }],
});
ed.event({
  uuid: 'vedic-ganges', title: 'Vedic culture spreads to the Ganges plain', start: 'c. 1200 BCE', end: 'c. 1000 BCE', tracks: ['vedic'],
  descr: 'After 1000 BCE iron axes and ploughs come into wide use.',
  sources: [S('wp-vedic', 'lead and Later Vedic period')],
});
ed.event({
  uuid: 'mahajanapadas', title: 'The sixteen Mahajanapadas', start: 'c. 600 BCE', end: 'c. 345 BCE', tracks: ['magadha', 'vedic'],
  descr: 'Political units consolidate into large kingdoms during the second urbanisation; Magadha wins the struggle for supremacy that follows.',
  sources: [S('wp-mahajanapadas', 'infobox, lead and Overview'), S('wp-vedic', 'Mahajanapadas')],
});
ed.event({
  uuid: 'achaemenid-indus', title: 'Persia conquers the Indus valley', start: 'c. 535 BCE', end: 'c. 518 BCE', tracks: ['persia', 'vedic'],
  descr: 'Cyrus the Great begins the campaign around 535 BCE; Darius I pushes into the Indus valley around 518, up to the Jhelum. Gandhara and Hindush become Persian provinces; Kamboja and Gandhara form the twentieth and richest satrapy.',
  sources: [S('wp-achaemenid-indus', 'infobox and lead'), S('wp-mahajanapadas', 'Gandhara')],
  links: [{ to: 'darius-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'bimbisara', title: 'Reign of Bimbisara of Magadha', start: 'c. 544 BCE', end: 'c. 492 BCE', tracks: ['magadha'],
  descr: 'The Haryanka king annexes Anga; his son Ajatashatru succeeds him (by Buddhist accounts, by killing him). Under the short chronology he reigns c. 457–405 BCE.',
  sources: [S('wp-bimbisara', 'infobox, lead and Death'), S('wp-mahajanapadas', 'Anga'), S('wp-magadha', 'Haryanka dynasty')],
  startDates: [C(544, 'wp-bimbisara', 'infobox (long chronology)'), C(457, 'wp-bimbisara', 'infobox (short chronology)')],
  endDates: [C(492, 'wp-bimbisara', 'infobox (long chronology)'), C(405, 'wp-bimbisara', 'infobox (short chronology)')],
});
ed.event({
  uuid: 'mahavira', title: 'Life of Mahavira', start: 'c. 599 BCE', end: 'c. 527 BCE', tracks: ['magadha'],
  descr: 'Traditional dates; historians place him in the 6th or 5th century BCE, a contemporary of the Buddha under Bimbisara and Ajatashatru.',
  sources: [S('wp-mahavira', 'infobox, lead and Dating')],
  startDates: [C(599, 'wp-mahavira', 'infobox (traditional)'), C(549, 'wp-mahavira', "Dating ('some historians')")],
  endDates: [C(527, 'wp-mahavira', 'infobox (Śvetāmbara)'), C(510, 'wp-mahavira', 'infobox (Digambara)'), C(477, 'wp-mahavira', "Dating ('some historians')")],
});
ed.event({
  uuid: 'buddha', title: 'Life of the Buddha', start: 'c. 480 BCE', end: 'c. 400 BCE', tracks: ['magadha'],
  descr: 'He lives under Bimbisara and dies under Ajatashatru. Most scholars who give a date place his death within 20 years of 400 BCE; earlier scholarship used 563–483 BCE.',
  sources: [S('wp-buddha', 'infobox, Dating and Historical person')],
  startDates: [C(480, 'wp-buddha', 'infobox'), C(563, 'wp-buddha', "infobox and Dating ('the earlier dates of 563–483 BCE')"), C(566, 'wp-buddha', 'Dating (long chronology, Asoka at 268 BCE)'), C(448, 'wp-buddha', 'Dating (short chronology)')],
  endDates: [C(400, 'wp-buddha', "infobox and Dating ('within 20 years either side of 400 BCE')"), C(483, 'wp-buddha', 'infobox'), C(486, 'wp-buddha', 'Dating (long chronology)'), C(368, 'wp-buddha', 'Dating (short chronology)')],
});
ed.event({
  uuid: 'nanda', title: 'The Nanda dynasty takes Magadha', start: 'c. 345 BCE', end: 'c. 322 BCE', tracks: ['magadha'],
  descr: 'The Nandas usurp the Shishunaga throne; Chandragupta Maurya overthrows them.',
  sources: [S('wp-mahajanapadas', 'Magadha'), S('wp-magadha', 'infobox and Nanda dynasty')],
});

// ---------- events: mainland Southeast Asia ----------
ed.event({
  uuid: 'ban-chiang-bronze', title: 'Bronze working at Ban Chiang', start: 'c. 2000 BCE', tracks: ['ban-chiang'],
  descr: 'Crucibles and bronze fragments; the chronology is still in considerable dispute (Higham puts settlement about 1500 BCE and the Bronze Age about 1000). Rice phytoliths from the lowest grave give 2100 BCE.',
  sources: [S('wp-ban-chiang', 'Dating the artifacts')],
  startDates: [C(2000, 'wp-ban-chiang', 'Dating the artifacts'), R(2000, 1700, 'wp-ban-chiang', 'Dating the artifacts (radiocarbon)'), C(1000, 'wp-ban-chiang', 'Dating the artifacts (Higham)')],
});
ed.event({
  uuid: 'red-river-rice', title: 'Rice farming reaches the Red River', start: 'c. 2000 BCE', end: 'c. 1500 BCE', tracks: ['phung-nguyen'],
  descr: 'Introduced in the Phùng Nguyên period, according to the page by northern Dai people (a cited study says from southern China).',
  sources: [S('wp-phung-nguyen', 'lead')],
});
ed.event({
  uuid: 'dong-son-drums', title: 'Đông Sơn bronze drums', start: 'c. 600 BCE', tracks: ['dong-son'],
  descr: 'Produced from about 600 BCE or earlier until the third century CE, and found from eastern Indonesia to Vietnam and southern China. Vietnamese historians attribute the culture to the states of Văn Lang and Âu Lạc.',
  sources: [S('wp-dong-son-drum', 'lead'), S('wp-dong-son', 'lead')],
});
ed.event({
  uuid: 'sa-huynh-trade', title: 'Sa Huỳnh–Kalanay trade network', start: 'c. 500 BCE', tracks: ['sa-huynh'],
  descr: 'A trade sphere reaching Taiwan, southern Thailand, Borneo and the Philippines. The Sa Huỳnh, who buried their cremated dead in lidded jars, were most likely predecessors of the Austronesian-speaking Cham.',
  sources: [S('wp-sa-huynh', 'lead, Description and Trade network')],
});
ed.event({
  uuid: 'hung-kings', title: 'Traditional founding of the Hùng kings', start: '2879 BCE', tracks: ['van-lang'],
  descr: 'In legend Lộc Tục comes to power in 2879 BCE; Văn Lang ends when Thục Phán overthrows the last Hùng king, about 258 BCE. The dating of events is still a subject of research.',
  sources: [S('wp-hong-bang', 'lead, Xích Quỷ Kingdom, Chronology and Âu Lạc Kingdom')],
});
ed.event({
  uuid: 'plain-of-jars', title: 'Stone jars placed on the Plain of Jars', start: 'c. 950 BCE', tracks: ['plain-of-jars'],
  descr: 'Luminescence dating puts the jars in place as early as 1240–660 BCE; Madeleine Colani concluded in 1930 that they were associated with burial practices.',
  sources: [S('wp-plain-of-jars', 'lead')],
  startDates: [R(1240, 660, 'wp-plain-of-jars', "lead ('as early as 1240 to 660 BC')")],
});

// ---------- events: Korea and Japan ----------
ed.event({
  uuid: 'sannai-maruyama', title: 'Sannai-Maruyama, a large Jōmon settlement', start: 'c. 3900 BCE', end: 'c. 2300 BCE', tracks: ['jomon'],
  descr: 'Hunter-gatherers use the site from around 3900 BCE and settle permanently around 2900; a six-pillar building stands by about 2600. The settlement ends around 2300 BCE.',
  sources: [S('wp-sannai', 'lead and Jōmon era')],
  endDates: [C(2300, 'wp-sannai', 'Demise'), C(2200, 'wp-sannai', "Jōmon era ('3900 – 2200 BCE')")],
});
ed.event({
  uuid: 'tangun', title: 'Traditional founding of Old Chosŏn by Tan’gun', start: '2333 BCE', tracks: ['gojoseon'],
  descr: 'The mythological founding date from the Samguk yusa. Chinese records treat Old Chosŏn as a country only from 195 BCE; it falls to the Han in 108 BCE.',
  sources: [S('wp-gojoseon', 'infobox and lead')],
});
ed.event({
  uuid: 'mumun-rice', title: 'Rice farming and dolmens in Korea', start: 'c. 1500 BCE', end: 'c. 850 BCE', tracks: ['mumun'],
  descr: 'In the Early Mumun, rice agriculture appears beside the earlier millet farming, and megalithic burials begin.',
  sources: [S('wp-mumun', 'infobox and Early Mumun'), S('wp-gojoseon', 'Dolmens')],
});
ed.event({
  uuid: 'songguk-ri', title: 'Middle Mumun: paddy rice (Songguk-ri culture)', start: 'c. 850 BCE', end: 'c. 550 BCE', tracks: ['mumun'],
  descr: 'Wet-field rice farming in southern Korea; the culture reaches Jeju Island and western Japan.',
  sources: [S('wp-mumun', 'Middle Mumun')],
});
ed.event({
  uuid: 'kyushu-rice', title: 'Korean rice farmers settle in Kyushu', start: 'c. 900 BCE', tracks: ['jomon', 'mumun'],
  descr: 'Korean-type settlements appear in western Kyushu, bringing wet rice farming and bronze and iron metallurgy; Yayoi-style pottery appears in northern Kyushu by 800 BCE. Jōmon and Yayoi ways of life coexist for around a thousand years.',
  sources: [S('wp-jomon', 'Late and Final Jōmon and Chronology')],
});
ed.event({
  uuid: 'jimmu', title: 'Traditional founding of Japan by Emperor Jimmu', start: '660 BCE', tracks: ['jomon'],
  descr: 'The founding date given by the Nihon Shoki, a foundation narrative rather than history.',
  sources: [S('wp-jomon', 'Foundation narratives'), S('wp-yayoi', 'Nihon Shoki')],
});

const meta = ed.data.meta;
for (const id of ['se-asia', 'korea-japan']) if (!meta.collapsed.includes(id)) meta.collapsed.push(id);
meta.subtitle = 'Europe, the Mediterranean, Africa, the Near East, Iran, the Steppe, South and East Asia, and the Americas, c. 3500–330 BCE';
meta.description = meta.description.replace('the Indus Valley, China,', 'South Asia, mainland Southeast Asia, China, Korea and Japan,');

ed.save();
