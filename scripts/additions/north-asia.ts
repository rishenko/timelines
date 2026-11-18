// Siberia, Mongolia and Tibet, c. 3300–330 BCE: the most important events only (first pass, 2026-11-18).
// Two new regions: Siberia and Mongolia (in Steppe & South Asia) and Tibet (in East & Southeast Asia);
// groups.ts places them. Every date was quoted verbatim from the cited Wikipedia page by a fetch agent.
// Not found (404): Qugong, Zongri culture. See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after americas.ts and before groups.ts.
//   node scripts/additions/north-asia.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-okunev', 'Okunev culture', 'Okunev_culture'],
  ['wp-karasuk', 'Karasuk culture', 'Karasuk_culture'],
  ['wp-tagar', 'Tagar culture', 'Tagar_culture'],
  ['wp-deer-stones', 'Deer stones culture', 'Deer_stones_culture'],
  ['wp-slab-grave', 'Slab-grave culture', 'Slab-grave_culture'],
  ['wp-glazkov', 'Glazkov culture', 'Glazkov_culture'],
  ['wp-ymyyakhtakh', 'Ymyyakhtakh culture', 'Ymyyakhtakh_culture'],
  ['wp-karuo', 'Karuo culture', 'Karuo_culture'],
  ['wp-tibet-history', 'History of Tibet', 'History_of_Tibet'],
] as const)
  ed.wikipedia(key, title, slug);

ed.tracks(
  [
    { id: 'siberia', name: 'Siberia and Mongolia', color: '#6a7a6a' },
    {
      id: 'okunev', name: 'Okunev culture', color: '#7a6a5a', parent: 'siberia',
      span: { start: 'c. 2700 BCE', end: 'c. 1800 BCE' },
    },
    { id: 'glazkov', name: 'Glazkov culture', color: '#5a6a5a', parent: 'siberia', span: { start: 'c. 2200 BCE', end: 'c. 1200 BCE' } },
    { id: 'ymyyakhtakh', name: 'Ymyyakhtakh culture', color: '#6a6a7a', parent: 'siberia', span: { start: 'c. 2200 BCE', end: 'c. 1300 BCE' } },
    {
      id: 'karasuk', name: 'Karasuk culture', color: '#8a7a4a', parent: 'siberia',
      span: { start: 'c. 1500 BCE', end: 'c. 800 BCE', endDates: [C(800, 'wp-karasuk', 'lead and infobox'), C(700, 'wp-karasuk', "Overview ('persisted down to c. 700 BC')")] },
    },
    {
      id: 'deer-stones', name: 'Deer stones culture (Mongolia)', color: '#7a5a4a', parent: 'siberia',
      span: { start: 'c. 1400 BCE', end: 'c. 700 BCE', startDates: [C(1400, 'wp-deer-stones', 'infobox and lead'), C(1200, 'wp-deer-stones', 'Construction')] },
    },
    {
      id: 'slab-grave', name: 'Slab-grave culture', color: '#5a5a6a', parent: 'siberia',
      span: { start: 'c. 1300 BCE', end: 'c. 300 BCE', startDates: [C(1300, 'wp-slab-grave', 'lead and infobox (Transbaikal)'), C(700, 'wp-slab-grave', 'infobox (Mongolia)'), C(1100, 'wp-slab-grave', 'navbox')] },
    },
    {
      id: 'tagar', name: 'Tagar culture (South Siberia)', color: '#8a6a3a', parent: 'siberia',
      span: { start: 'c. 800 BCE', end: 'c. 168 BCE', endDates: [C(168, 'wp-tagar', 'infobox'), C('1 CE', 'wp-tagar', "lead ('between the 8th and 1st centuries BC')")] },
    },
  ],
  { after: 'pazyryk' },
);
ed.tracks(
  [
    { id: 'tibet', name: 'Tibet', color: '#8a5a6a' },
    { id: 'karuo', name: 'Karuo culture', color: '#9a6a5a', parent: 'tibet', span: { start: 'c. 3300 BCE', end: 'c. 2000 BCE' } },
    { id: 'zhangzhung', name: 'Zhangzhung and Yarlung (Tibetan tradition)', color: '#7a5a7a', parent: 'tibet', span: { start: 'c. 500 BCE', end: '625 CE' } },
  ],
  { before: 'china' },
);

ed.event({
  uuid: 'okunev-stelae', title: 'Okunev stelae and the first bronze of north-eastern Central Asia', start: 'c. 2600 BCE', end: 'c. 1800 BCE', tracks: ['okunev'],
  descr: 'The Okunev raise monumental stelae at gravesites and, with the neighbouring Samus culture, produce the first bronze in north-eastern Central Asia. Images of two-wheeled carts appear at the end of the 3rd millennium BC. They raise livestock, and closely interact with the successors of the Andronovo circle.',
  sources: [S('wp-okunev', 'Dating, Monumental steles, Metallurgy, Wheeled transport, Livestock and Related cultures')],
  startDates: [C(2600, 'wp-okunev', "Dating ('within 2600 –1800 BCE')"), C(2700, 'wp-okunev', 'infobox')],
});
ed.event({
  uuid: 'glazkov', title: 'Glazkov hunters and fishers', start: 'c. 2200 BCE', end: 'c. 1200 BCE', tracks: ['glazkov'],
  descr: 'An economy of hunting, fishing and gathering, with copper knives and bronze fishing hooks; contemporary with the Andronovo culture to the west.',
  sources: [S('wp-glazkov', 'infobox, lead, Culture and Areal')],
});
ed.event({
  uuid: 'ymyyakhtakh', title: 'Ymyyakhtakh culture', start: 'c. 2200 BCE', end: 'c. 1300 BCE', tracks: ['ymyyakhtakh'],
  descr: 'Bronze ware is frequent in its burial grounds; after 1,700 BC it is believed to spread east.',
  sources: [S('wp-ymyyakhtakh', 'infobox, lead, Description and Associated sites')],
});
ed.event({
  uuid: 'karasuk-shang', title: 'Karasuk bronzes and chariots reach Shang China', start: 'c. 1200 BCE', tracks: ['karasuk', 'shang'],
  descr: 'Karasuk farmers practise metallurgy on a large scale. Many Shang (13th–11th centuries BCE) and Zhou bronze blades derive from Karasuk designs, and Wu (2013) traces Shang chariots and their equipment to the Karasuk culture.',
  sources: [S('wp-karasuk', 'Overview, Chariots and Metallurgy')],
  links: [{ to: 'wu-ding', kind: 'related' }],
});
ed.event({
  uuid: 'deer-stones', title: 'Deer stones raised in Mongolia', start: 'c. 1200 BCE', end: 'c. 700 BCE', tracks: ['deer-stones'],
  descr: 'Large standing stelae renowned for lively images of deer, part of a pastoral tradition of stone burial mounds; deer-stone art is earlier than the first Scythian sites such as Arzhan by 300 to 500 years. The oldest dated stones, in Khovsgol, are of about 1300 BC.',
  sources: [S('wp-deer-stones', 'infobox, lead, Construction and Types')],
  startDates: [C(1200, 'wp-deer-stones', "Construction ('ca. 1200-700 BCE')"), C(1400, 'wp-deer-stones', 'infobox and lead'), C(1300, 'wp-deer-stones', 'Types (oldest deer stones)')],
  links: [{ to: 'arzhan-1', kind: 'related' }],
});
ed.event({
  uuid: 'slab-grave', title: 'Slab-grave culture replaces the deer-stone culture', start: 'c. 700 BCE', tracks: ['slab-grave', 'deer-stones'],
  descr: 'In central and eastern Mongolia. The two cultures had been adjacent and essentially contemporaneous; slab-grave art shares many features with Karasuk and Tagar.',
  sources: [S('wp-deer-stones', 'Demise'), S('wp-slab-grave', 'lead and Burials')],
});
ed.event({
  uuid: 'tagar-kurgans', title: 'Tagar culture: royal kurgans and bronze-smelting', start: 'c. 800 BCE', tracks: ['tagar'],
  descr: 'One of the largest centres of bronze-smelting in ancient Eurasia. Huge royal kurgans are fenced by stone plaques with stelae at the corners; their animal art is very like that of the Scythians of southern European Russia. Usually considered descendants of the Andronovo culture.',
  sources: [S('wp-tagar', 'lead, History and Characteristics')],
});
ed.event({
  uuid: 'karuo', title: 'Karuo: the first farmers on the Tibetan Plateau', start: 'c. 3000 BCE', tracks: ['karuo'],
  descr: 'The oldest permanent settlement in Tibet and the earliest evidence for agriculture on the plateau, growing foxtail millet; its pottery resembles that of Majiayao sites. The residents abandon Karuo suddenly around 1750 BC.',
  sources: [S('wp-karuo', 'lead and Type site')],
});
ed.event({
  uuid: 'nyatri-tsenpo', title: 'Nyatri Tsenpo, first Yarlung king (traditional date)', start: '414 BCE', tracks: ['zhangzhung'],
  descr: 'Some Tibetan texts give 126 BC, others 414 BC. Tibetan texts name the kingdom of Zhangzhung (c. 500 BC–625 AD) as the precursor of later Tibetan kingdoms.',
  sources: [S('wp-tibet-history', 'lead, Zhangzhung and Nyatri Tsenpo')],
});

ed.save();
