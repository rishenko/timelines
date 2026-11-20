// Third pass on the early Holocene and Neolithic (2026-11-18): Neolithic Iberia (now read verbatim), Kuahuqiao,
// Ecuador's Las Vegas culture, Budj Bim, the US Southwest (Oshara, Cochise, Basketmaker), the Saharan rock-art
// periods, Sanganakallu, the Kintampo complex and the Wilton culture. Every date was quoted verbatim from the
// cited Wikipedia page by a fetch agent; "years ago" and BP are converted by subtracting 1950 (judgment call
// 15). No page carried an AI-text warning. Las Vegas culture comes from *Pre-Columbian Ecuador* (its own page
// does not exist). See docs/ancient-sources.md, twelfth pass.
// Re-runnable: it replaces what it added before. Run after neolithic-2.ts and before groups.ts.
//   node scripts/additions/neolithic-3.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-prehistoric-iberia', 'Prehistoric Iberia', 'Prehistoric_Iberia'],
  ['wp-almendres', 'Almendres Cromlech', 'Almendres_Cromlech'],
  ['wp-menga', 'Dolmen of Menga', 'Dolmen_of_Menga'],
  ['wp-kuahuqiao', 'Kuahuqiao site', 'Kuahuqiao_site'],
  ['wp-precolumbian-ecuador', 'Pre-Columbian Ecuador', 'Pre-Columbian_Ecuador'],
  ['wp-budj-bim', 'Budj Bim', 'Budj_Bim'],
  ['wp-oshara', 'Oshara tradition', 'Oshara_tradition'],
  ['wp-cochise', 'Cochise tradition', 'Cochise_tradition'],
  ['wp-basketmaker', 'Basketmaker culture', 'Basketmaker_culture'],
  ['wp-saharan-rock-art', 'Saharan rock art', 'Saharan_rock_art'],
  ['wp-sanganakallu', 'Sanganakallu', 'Sanganakallu'],
  ['wp-kintampo', 'Kintampo Complex', 'Kintampo_Complex'],
  ['wp-wilton', 'Wilton culture', 'Wilton_culture'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
ed.track({ id: 'iberia-neolithic', name: 'Neolithic Iberia', color: '#8a6a4a', parent: 'iberia' }, { before: 'los-millares' });
ed.track({ id: 'southwest', name: 'US Southwest (Oshara, Cochise, Basketmaker)', color: '#a0703a', parent: 'north-america' }, { after: 'archaic-na' });
ed.tracks(
  [
    { id: 'wilton', name: 'Wilton culture', color: '#8a7a5a', parent: 'sub-saharan', span: { start: 'c. 6050 BCE', end: 'c. 2050 BCE' } },
    { id: 'kintampo', name: 'Kintampo complex (Ghana)', color: '#7a8a4a', parent: 'sub-saharan', span: { start: 'c. 2500 BCE', end: 'c. 1400 BCE' } },
  ],
  { after: 'tichitt' },
);

// ---------- Iberia ----------
ed.event({
  uuid: 'almendres', title: 'Almendres Cromlech', start: 'c. 6000 BCE', end: 'c. 4000 BCE', tracks: ['iberia-neolithic', 'megaliths'],
  descr: 'Its construction dates back to the 6th millennium BC, in three phases: Almendres I (6000 BC, Early Neolithic), II (5000 BC) and III (4000 BC).',
  sources: [S('wp-almendres', 'History'), S('wp-prehistoric-iberia', 'Neolithic')],
});
ed.event({
  uuid: 'iberia-farmers', title: 'The first farmers reach Iberia', start: 'c. 5700 BCE', tracks: ['iberia-neolithic'],
  descr: 'In the 6th millennium BC the first agriculturalists arrive in Andalusia, and Cardium pottery culture reaches eastern Iberia.',
  sources: [S('wp-prehistoric-iberia', 'Overview and Neolithic')],
  startDates: [C(5700, 'wp-prehistoric-iberia', "Neolithic ('In c. 5700 BC, Cardium pottery ...')"), R(6000, 5000, 'wp-prehistoric-iberia', "Neolithic ('In the 6th millennium BC')")],
  links: [{ to: 'cardial', kind: 'related' }],
});
ed.event({
  uuid: 'portugal-dolmens', title: 'The first dolmens, in southern Portugal', start: 'c. 4800 BCE', tracks: ['iberia-neolithic', 'megaliths'],
  descr: 'Possibly the oldest dolmen tombs of their kind anywhere.',
  sources: [S('wp-prehistoric-iberia', 'Neolithic')],
});
ed.event({
  uuid: 'menga', title: 'The Dolmen of Menga (Antequera)', start: 'c. 3700 BCE', tracks: ['iberia-neolithic', 'megaliths'],
  descr: 'The Antequera Dolmens date from after c. 3700 BC.',
  sources: [S('wp-menga', 'infobox and lead'), S('wp-prehistoric-iberia', 'Neolithic')],
  startDates: [C(3700, 'wp-menga', 'infobox'), R(3750, 3650, 'wp-menga', 'lead')],
});

// ---------- Asia and Oceania ----------
ed.event({
  uuid: 'kuahuqiao', title: 'Kuahuqiao: an early dugout canoe and paddy rice', start: 'c. 6000 BCE', end: 'c. 5600 BCE', tracks: ['hemudu'],
  descr: 'A very early dugout canoe, the earliest technology of its kind in China, and paddy rice cultivated 7700 years ago; villagers had domesticated rice, dogs and pigs. Rising seas may have suddenly deluged the area around 7,550 years ago.',
  sources: [S('wp-kuahuqiao', 'infobox, lead and Discoveries')],
  links: [{ to: 'hemudu', kind: 'related' }],
});
ed.event({
  uuid: 'budj-bim', title: 'Budj Bim eel traps', start: 'c. 4650 BCE', tracks: ['australia'],
  descr: 'Carbon-dated to 6,600 years old.',
  sources: [S('wp-budj-bim', 'Historic and cultural significance')],
});
ed.event({
  uuid: 'sanganakallu', title: 'Sanganakallu Neolithic settlement', start: 'c. 3000 BCE', tracks: ['south-india'],
  descr: 'A Neolithic site.',
  sources: [S('wp-sanganakallu', 'infobox and lead')],
});

// ---------- Africa ----------
ed.event({
  uuid: 'round-head-art', title: 'Round Head rock art period in the Sahara', start: 'c. 7550 BCE', end: 'c. 5050 BCE', tracks: ['sahara'],
  descr: 'One of the periods of Saharan rock art (9500–7000 BP), after the Large Wild Fauna and Kel Essuf periods.',
  sources: [S('wp-saharan-rock-art', 'Rock art time periods')],
});
ed.event({
  uuid: 'pastoral-art', title: 'Pastoral period of Saharan rock art', start: 'c. 5250 BCE', end: 'c. 1050 BCE', tracks: ['sahara'],
  descr: 'Dated 7200–3000 BP. In Egypt, the Cave of Beasts was painted by people who lived between c. 6500 and 4400 BCE.',
  sources: [S('wp-saharan-rock-art', 'Rock art time periods and Archaeological sites')],
});
ed.event({
  uuid: 'horse-art', title: 'Horse period of Saharan rock art', start: 'c. 1250 BCE', tracks: ['sahara'],
  descr: 'Dated 3200–1000 BP; the Camel Period follows (3000–2000 BP).',
  sources: [S('wp-saharan-rock-art', 'Rock art time periods')],
});
ed.event({
  uuid: 'wilton', title: 'Wilton culture: small stone tools', start: 'c. 6050 BCE', end: 'c. 2050 BCE', tracks: ['wilton'],
  descr: 'A shift from large to small stone technology, 8,000 to 4,000 years ago; at Nelson Bay Cave people depended on small game from 9,000 to 5,000 years ago. Janette Deacon identifies a mature phase around 4,800 years ago.',
  sources: [S('wp-wilton', 'lead, History, Stone technology and Diet')],
});
ed.event({
  uuid: 'kintampo', title: 'Kintampo complex', start: 'c. 2500 BCE', end: 'c. 1400 BCE', tracks: ['kintampo'],
  descr: 'Established by Saharan agropastoralists; pearl millet spreads into the West African savanna after 2500 cal BC (Champion et al. 2022), and oil palm use starts at least 4000 years ago. Watson dates its appearance to 3,600–3,200 bp.',
  sources: [S('wp-kintampo', 'lead, Origin and Archaeology')],
  startDates: [C(2500, 'wp-kintampo', 'lead'), R(1650, 1250, 'wp-kintampo', 'Origin (Watson 2005)')],
});

// ---------- Americas ----------
ed.event({
  uuid: 'las-vegas', title: 'Las Vegas culture of coastal Ecuador', start: 'c. 8000 BCE', end: 'c. 4600 BCE', tracks: ['andes-archaic'],
  descr: 'One of the oldest cultures in the Americas, on the Santa Elena Peninsula; at approximately 6000 BC it is among the first to begin farming (bottle gourd and early maize). Its best-known remains are the Lovers of Sumpa.',
  sources: [S('wp-precolumbian-ecuador', 'lead and Preceramic period > Las Vegas culture')],
  startDates: [C(8000, 'wp-precolumbian-ecuador', 'lead'), C(9000, 'wp-precolumbian-ecuador', 'Las Vegas culture')],
  endDates: [C(4600, 'wp-precolumbian-ecuador', 'lead'), C(6000, 'wp-precolumbian-ecuador', 'Las Vegas culture')],
});
ed.event({
  uuid: 'oshara', title: 'Oshara tradition: the Jay phase', start: 'c. 5500 BCE', tracks: ['southwest'],
  descr: 'A Southwestern Archaic tradition. The Jay phase (7,450 to 6,750 years before present) is followed by the Bajada and San Jose phases.',
  sources: [S('wp-oshara', 'infobox, lead and Phases')],
  startDates: [C(5500, 'wp-oshara', 'Phases (Jay phase)'), C(6050, 'wp-oshara', 'Phases, note 1 (Gibbon and Ames)')],
});
ed.event({
  uuid: 'oshara-maize', title: 'Maize cultivation begins in the Oshara tradition', start: 'c. 1800 BCE', end: 'c. 800 BCE', tracks: ['southwest'],
  descr: 'The Armijo phase (3,750 to 2,750 years BP).',
  sources: [S('wp-oshara', 'Phases')],
  links: [{ to: 'maize-domesticated', kind: 'related' }],
});
ed.event({
  uuid: 'basketmaker', title: 'The Basketmaker culture begins', start: 'c. 1500 BCE', tracks: ['southwest'],
  descr: 'It continues until about 750 CE.',
  sources: [S('wp-basketmaker', 'lead')],
});
ed.event({
  uuid: 'san-pedro-cochise', title: 'San Pedro phase of the Cochise tradition', start: 'c. 1500 BCE', end: 'c. 200 BCE', tracks: ['southwest'],
  descr: 'The southern of the four Southwestern Archaic traditions; provisional radiocarbon dates.',
  sources: [S('wp-cochise', 'lead and San Pedro phase')],
});

ed.save();
