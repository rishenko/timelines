// The Classical World, sixth region pass (2026-11-18): Europe north of the Alps — the La Tène Celts and the Galatians,
// the Cimbrian, Numantine and Gallic wars, Roman Britain, Teutoburg, the Marcomannic and Dacian wars, the Rhine
// crossing, the Suebi, Visigoths, Burgundians, Ostrogoths, Franks, Lombards, Anglo-Saxons and early Slavs. Every date
// was quoted verbatim from the cited Wikipedia page by a fetch agent; values seen only in a page summary are not used.
// No page carried an AI-text or LLM-translation banner. See docs/classical-sources.md, sixth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts and mediterranean-near-east.ts.
//   node scripts/classical/europe.ts && npm run data:classical
import { open, C, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-la-tene', 'La Tène culture', 'La_T%C3%A8ne_culture'],
  ['wp-gallic-wars', 'Gallic Wars', 'Gallic_Wars'],
  ['wp-alesia', 'Battle of Alesia', 'Battle_of_Alesia'],
  ['wp-cimbrian-war', 'Cimbrian War', 'Cimbrian_War'],
  ['wp-roman-britain', 'Roman Britain', 'Roman_Britain'],
  ['wp-boudican-revolt', 'Boudican revolt', 'Boudican_revolt'],
  ['wp-hadrians-wall', 'Hadrian’s Wall', 'Hadrian%27s_Wall'],
  ['wp-dacian-wars', 'Trajan’s Dacian Wars', 'Trajan%27s_Dacian_Wars'],
  ['wp-numantine-war', 'Numantine War', 'Numantine_War'],
  ['wp-galatians', 'Galatians (people)', 'Galatians_(people)'],
  ['wp-teutoburg', 'Battle of the Teutoburg Forest', 'Battle_of_the_Teutoburg_Forest'],
  ['wp-marcomannic-wars', 'Marcomannic Wars', 'Marcomannic_Wars'],
  ['wp-goths', 'Goths', 'Goths'],
  ['wp-visigothic-kingdom', 'Visigothic Kingdom', 'Visigothic_Kingdom'],
  ['wp-ostrogothic-kingdom', 'Ostrogothic Kingdom', 'Ostrogothic_Kingdom'],
  ['wp-theodoric', 'Theodoric the Great', 'Theodoric_the_Great'],
  ['wp-gothic-war', 'Gothic War (535–554)', 'Gothic_War_(535%E2%80%93554)'],
  ['wp-alaric', 'Alaric I', 'Alaric_I'],
  ['wp-odoacer', 'Odoacer', 'Odoacer'],
  ['wp-burgundians', 'Kingdom of the Burgundians', 'Kingdom_of_the_Burgundians'],
  ['wp-franks', 'Franks', 'Franks'],
  ['wp-merovingians', 'Merovingian dynasty', 'Merovingian_dynasty'],
  ['wp-clovis', 'Clovis I', 'Clovis_I'],
  ['wp-vouille', 'Battle of Vouillé', 'Battle_of_Vouill%C3%A9'],
  ['wp-lombards', 'Kingdom of the Lombards', 'Kingdom_of_the_Lombards'],
  ['wp-anglo-saxon-settlement', 'Anglo-Saxon settlement of Britain', 'Anglo-Saxon_settlement_of_Britain'],
  ['wp-suebi', 'Kingdom of the Suebi', 'Kingdom_of_the_Suebi'],
  ['wp-early-slavs', 'Early Slavs', 'Early_Slavs'],
  ['wp-gregorian-mission', 'Gregorian mission', 'Gregorian_mission'],
  ['wp-rhine-crossing', 'Crossing of the Rhine', 'Crossing_of_the_Rhine'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (west to east) ----------
ed.tracks(
  [
    { id: 'roman-britain', name: 'Roman Britain', color: '#8a3a3a', parent: 'europe', span: { start: '43 CE', end: 'c. 410 CE' } },
    {
      id: 'anglo-saxons', name: 'Anglo-Saxon England', color: '#6a7a3a', parent: 'europe',
      span: { start: 'c. 449 CE', end: '1066 CE', startDates: [C('449 CE', 'wp-roman-britain', 'English history table (Anglo-Saxon, c. 449–1066)')] },
    },
    { id: 'suebi', name: 'Kingdom of the Suebi', color: '#4a6a8a', parent: 'europe', span: { start: '409 CE', end: '585 CE' } },
    {
      id: 'visigoths', name: 'Visigothic Kingdom (Toulouse, then Toledo)', color: '#7a5a8a', parent: 'europe',
      span: { start: '418 CE', end: '721 CE', endDates: [C('721 CE', 'wp-visigothic-kingdom', 'infobox'), C('720 CE', 'wp-visigothic-kingdom', 'short description')] },
    },
    { id: 'celts', name: 'La Tène Celts (Gaul)', color: '#3a7a5a', parent: 'europe', span: { start: 'c. 450 BCE', end: 'c. 1 BCE' } },
    { id: 'franks', name: 'Franks (Merovingians)', color: '#3a5a9a', parent: 'europe', span: { start: 'c. 481 CE', end: '751 CE' } },
    { id: 'burgundians', name: 'Kingdom of the Burgundians', color: '#9a4a5a', parent: 'europe', span: { start: '411 CE', end: '534 CE' } },
    { id: 'ostrogoths', name: 'Ostrogothic Kingdom (Italy)', color: '#8a6aaa', parent: 'europe', span: { start: '493 CE', end: '553 CE' } },
    { id: 'lombards', name: 'Kingdom of the Lombards', color: '#5a8a6a', parent: 'europe', span: { start: '568 CE', end: '774 CE' } },
    {
      id: 'slavs', name: 'Early Slavs', color: '#6a5a3a', parent: 'europe',
      span: {
        start: 'c. 550 CE', end: 'c. 950 CE',
        startDates: [C('550 CE', 'wp-early-slavs', "lead (name first written in the 6th century)", { margin: 50 })],
        endDates: [C('950 CE', 'wp-early-slavs', "lead ('from the 5th to the 10th centuries AD')", { margin: 50 })],
      },
    },
  ],
  { after: 'europe' },
);
ed.track(
  {
    id: 'galatia', name: 'Galatians', color: '#4a8a6a', parent: 'anatolia',
    span: { start: 'c. 278 BCE', end: '25 BCE', startDates: [C(278, 'wp-galatians', 'lead and note 2'), C(278, 'wp-galatians', "History ('278–277 BC')", { margin: 1 })] },
  },
  { after: 'anatolia' },
);

// ---------- Celts and the Roman conquest of Gaul ----------
ed.event({
  uuid: 'brennus-greece', title: 'Celts invade Greece', start: '281 BCE', end: '279 BCE', tracks: ['celts', 'greece'],
  descr: 'Brennus invades Greece in 281 BC. The La Tène page says Delphi was attacked and sacked in 279 BC; the Galatians page says he was turned back before he could plunder it. Celtic expansion is at its maximum by 275 BC.',
  sources: [S('wp-galatians', 'History'), S('wp-la-tene', 'History and Periodization map')],
});
ed.event({
  uuid: 'galatians-anatolia', title: 'The Galatians settle in Anatolia', start: 'c. 278 BCE', tracks: ['galatia'],
  descr: 'Celtic settlers come through Thrace under Leogarios and Leonnorios and appear in Asia Minor in 278–277 BC, hired by Nicomedes I of Bithynia. Attalus I of Pergamon defeats them heavily in 240 or 230 BC. Galatia becomes a Roman client state in 64 BC and a province in 25 BC.',
  sources: [S('wp-galatians', 'lead, History and note 2')],
  links: [{ to: 'brennus-greece', kind: 'related' }],
});
ed.event({
  uuid: 'galatian-war', title: 'Manlius Vulso’s Galatian War', start: '189 BCE', tracks: ['galatia', 'roman-republic'],
  descr: 'Rome sends Gnaeus Manlius Vulso on an expedition against the Galatians.',
  sources: [S('wp-galatians', 'History and campaign template')],
});
ed.event({
  uuid: 'numantine-war', title: 'Numantine War', start: '154 BCE', end: '133 BCE', tracks: ['west-med', 'roman-republic'],
  descr: 'A revolt of the Celtiberians of Numantia in Hispania; the first phase ends in 151, and war flares up again in 143. In 134 BC Scipio Aemilianus is sent to end it, and Numantia falls in 133, opening an era of peace in Hispania until the Sertorian War.',
  sources: [S('wp-numantine-war', 'infobox, lead, body and note 1')],
  startDates: [C(154, 'wp-numantine-war', 'lead and note 1'), C(143, 'wp-numantine-war', 'infobox (143–133 BC)')],
});
ed.event({
  uuid: 'transalpine-gaul', title: 'Rome conquers southern Gaul', start: '121 BCE', tracks: ['celts', 'roman-republic'],
  descr: 'Rome conquers a group of southern Gauls and establishes the province of Transalpine Gaul.',
  sources: [S('wp-gallic-wars', 'Background > Military'), S('wp-la-tene', 'History')],
});
ed.event({
  uuid: 'cimbrian-war', title: 'Cimbrian War', start: '113 BCE', end: '101 BCE', tracks: ['europe', 'roman-republic'],
  descr: 'Having left the North Sea around 120–115 BC, the Cimbri reach Noricum on the Danube in 113 BC. They invade Gallia Narbonensis in 109 and meet the consul Mallius Maximus and proconsul Caepio at Arausio in 105; Marius is consul five years in a row from 104 BC.',
  sources: [S('wp-cimbrian-war', 'infobox, lead, Migrations, Initial defeats, Arausio and Marius')],
});
ed.event({
  uuid: 'gallic-wars', title: 'Caesar’s Gallic Wars', start: '58 BCE', end: '50 BCE', tracks: ['celts', 'roman-republic'],
  descr: 'Beginning with the migration of the Helvetii in 58 BC, Caesar resolves to conquer all of Gaul (57), defeats the Veneti at sea (56) and crosses to Britain (55–54). Vercingetorix leads a major revolt in 52. The coming civil war withdraws Caesar’s troops in 50; Gaul becomes a Roman province in 27 BC, but resistance lasts until as late as 70 AD.',
  sources: [S('wp-gallic-wars', 'infobox and lead'), S('wp-roman-britain', 'lead')],
  links: [{ to: 'caesar-assassinated', kind: 'related' }],
});
ed.event({
  uuid: 'alesia', title: 'Siege of Alesia', start: '52 BCE', tracks: ['celts', 'roman-republic'],
  descr: 'In September 52 BC Caesar besieges Vercingetorix, building some 25 miles of fortifications in a month; Vercingetorix surrenders.',
  sources: [S('wp-alesia', 'infobox, lead and Siege'), S('wp-gallic-wars', 'lead')],
  links: [{ to: 'gallic-wars', kind: 'part-of' }],
});

// ---------- Roman Britain ----------
ed.event({
  uuid: 'claudius-britain', title: 'Claudius invades Britain', start: '43 CE', tracks: ['roman-britain', 'roman-empire'],
  descr: 'Four legions under Aulus Plautius invade; by 47 AD the Romans hold the lands southeast of the Fosse Way. Caligula had massed 200,000 men at the Channel in 40 AD.',
  sources: [S('wp-roman-britain', 'infobox, lead and History')],
});
ed.event({
  uuid: 'boudica', title: 'Boudica’s revolt', start: 'c. 60 CE', tracks: ['roman-britain'],
  descr: 'While the governor Suetonius Paulinus campaigns against Mona, Boudica, queen of the Iceni, leads a revolt; Verulamium burns around 60 AD.',
  sources: [S('wp-boudican-revolt', 'infobox, lead, Initial actions and Verulamium')],
  startDates: [C('60 CE', 'wp-boudican-revolt', "Initial actions ('In AD 60 or 61')"), C('61 CE', 'wp-boudican-revolt', "Initial actions ('In AD 60 or 61')")],
});
ed.event({
  uuid: 'mons-graupius', title: 'Mons Graupius', start: '84 CE', tracks: ['roman-britain'],
  descr: 'In mid-84 AD Agricola, governor from 77 AD, faces the Caledonians under Calgacus, concluding the forty-year conquest of Britain.',
  sources: [S('wp-roman-britain', 'lead'), S('wp-boudican-revolt', 'campaignbox')],
  startDates: [C('84 CE', 'wp-roman-britain', 'lead'), C('83 CE', 'wp-boudican-revolt', 'campaignbox (AD 83)')],
});
ed.event({
  uuid: 'hadrians-wall', title: 'Hadrian’s Wall', start: '122 CE', tracks: ['roman-britain', 'roman-empire'],
  descr: 'Begun in AD 122, in the reign of Hadrian; most of it takes six years to build, by some 15,000 soldiers of three legions. The turf Antonine Wall follows in AD 142.',
  sources: [S('wp-hadrians-wall', 'infobox, lead and Construction')],
});
ed.event({
  uuid: 'end-roman-britain', title: 'The end of Roman rule in Britain', start: 'c. 410 CE', tracks: ['roman-britain', 'roman-empire'],
  descr: 'The final Roman withdrawal comes around 410 AD; the Anglo-Saxon settlement page gives the traditional end as 411, and the Chronica Gallica of 452 says Britain was ravaged by Saxon invaders in 409 or 410.',
  sources: [S('wp-roman-britain', 'infobox and lead'), S('wp-anglo-saxon-settlement', 'Background and Continental sources')],
  startDates: [C('410 CE', 'wp-roman-britain', 'infobox and lead'), C('411 CE', 'wp-anglo-saxon-settlement', 'Background')],
});
ed.event({
  uuid: 'saxons-441', title: 'Britain “handed over” to the Saxons', start: '441 CE', tracks: ['anglo-saxons'],
  descr: 'The Chronica Gallica of 452 reports for the year 441 that the British provinces have been handed over across a wide area. Gildas, who probably wrote in the early 6th century, is one of the few written accounts of the period.',
  sources: [S('wp-anglo-saxon-settlement', 'lead and Continental sources')],
});
ed.event({
  uuid: 'gregorian-mission', title: 'Augustine’s mission lands in Kent', start: '597 CE', tracks: ['anglo-saxons'],
  descr: 'Sent by Pope Gregory the Great in 596, about forty missionaries arrive in 597; King Æthelberht converts before 601, and by 627 Paulinus has converted King Edwin.',
  sources: [S('wp-gregorian-mission', 'lead and Arrival')],
});

// ---------- Rome and the Germanic peoples ----------
ed.event({
  uuid: 'teutoburg', title: 'Battle of the Teutoburg Forest', start: '9 CE', tracks: ['europe', 'roman-empire'],
  descr: 'Between 8 and 11 September 9 AD, possibly near Kalkriese; the infobox counts 16,000–20,000 killed. The next major Roman incursion into Germania comes under Marcus Aurelius (r. 161–180).',
  sources: [S('wp-teutoburg', 'infobox and lead')],
});
ed.event({
  uuid: 'marcomannic-wars', title: 'Marcomannic Wars', start: '166 CE', end: '180 CE', tracks: ['europe', 'roman-empire'],
  descr: 'After incursions into Raetia and Germania Superior (162–165), thousands of Langobardi and Lacringi cross into Pannonia in late 166, beginning wars that last until 180 under Marcus Aurelius.',
  sources: [S('wp-marcomannic-wars', 'infobox, lead and Initial invasions')],
});
ed.event({
  uuid: 'dacian-wars', title: 'Trajan’s Dacian Wars', start: '101 CE', end: '106 CE', tracks: ['europe', 'roman-empire'],
  descr: 'Discontent with Domitian’s treaty of 89 AD with Decebalus persists, and Trajan reasserts Roman authority. The first war (101–102) ends when Decebalus makes peace; in the second (105–106) the Dacian capital falls and Decebalus kills himself. Southern Dacia is annexed, and Trajan announces 123 days of celebrations.',
  sources: [S('wp-dacian-wars', 'infobox, lead, First War, Second War and Aftermath')],
  links: [{ to: 'trajan-extent', kind: 'related' }],
});
ed.event({
  uuid: 'salian-toxandria', title: 'The Salian Franks settle in Toxandria', start: '358 CE', tracks: ['europe', 'roman-empire'],
  descr: 'The first known Frankish tribe to settle with official Roman permission. The Franks are probably first named during the crisis of the 3rd century; Constantine executes Frankish prisoners at Trier in 306.',
  sources: [S('wp-clovis', 'Background'), S('wp-franks', 'lead and Etymology')],
});
ed.event({
  uuid: 'alaric', title: 'Alaric I, king of the Visigoths', start: '395 CE', end: '410 CE', tracks: ['europe', 'roman-empire'],
  descr: 'The treaty of 382, after Adrianople, is the first foedus on imperial Roman soil. Alaric, king from 395, sacks Athens in 396 and invades Italy in 401 or 402; he dies at Consentia in 411.',
  sources: [S('wp-alaric', 'infobox, Early life, Eastern phase and Italy')],
  links: [{ to: 'sack-rome-410', kind: 'related' }, { to: 'adrianople', kind: 'related' }],
});
ed.event({
  uuid: 'rhine-crossing', title: 'Vandals, Alans and Suebi cross the Rhine', start: '406 CE', tracks: ['europe', 'roman-empire'],
  descr: 'Traditionally on 31 December 406, near Mainz; Kulikowski argues for 31 December 405. The invaders cross into Spain in September or October 409.',
  sources: [S('wp-rhine-crossing', 'infobox, lead, Alternative dating and Aftermath'), S('wp-suebi', 'Origins')],
  startDates: [C('406 CE', 'wp-rhine-crossing', 'infobox and lead'), C('405 CE', 'wp-rhine-crossing', 'infobox and Alternative dating'), C('405 CE', 'wp-suebi', 'Origins')],
  links: [{ to: 'vandals-cross', kind: 'related' }],
});
ed.event({
  uuid: 'suebi-gallaecia', title: 'The Suebi settle in Gallaecia', start: '409 CE', tracks: ['suebi'],
  descr: 'Under Hermeric the Suebi cross into Iberia on 28 September or 12 October 409; in 411 the groups divide Hispania by lot. Rechiar (from 448) is the first Germanic king to profess Nicene Christianity.',
  sources: [S('wp-suebi', 'infobox, lead, Settlement and Rechiar')],
  links: [{ to: 'rhine-crossing', kind: 'related' }],
});
ed.event({
  uuid: 'visigoths-aquitaine', title: 'The Visigoths settle in Aquitaine', start: '418 CE', tracks: ['visigoths', 'roman-empire'],
  descr: 'Honorius rewards his Visigothic federates under King Wallia with land in the Garonne valley; with their capital at Toulouse they remain de facto independent, becoming a sovereign state in 475.',
  sources: [S('wp-visigothic-kingdom', 'infobox and Federate kingdom')],
  links: [{ to: 'alaric', kind: 'related' }],
});
ed.event({
  uuid: 'burgundians-destroyed', title: 'Aetius and the Huns defeat the Burgundians', start: 'c. 436 CE', end: '443 CE', tracks: ['burgundians', 'roman-empire'],
  descr: 'King Gundahar, settled on the west bank of the Rhine since 411, is killed in about 436; in 443 the remaining Burgundians are resettled in Sapaudia.',
  sources: [S('wp-burgundians', 'infobox, lead and body')],
});
ed.event({
  uuid: 'suebi-annexed', title: 'The Visigoths annex the Suebi', start: '585 CE', tracks: ['suebi', 'visigoths'],
  descr: 'King Leovigild conquers the Suebic kingdom, after campaigns starting in the 570s.',
  sources: [S('wp-suebi', 'infobox and lead'), S('wp-visigothic-kingdom', 'infobox and lead')],
});
ed.event({
  uuid: 'visigoths-catholic', title: 'The Visigoths renounce Arianism', start: '589 CE', tracks: ['visigoths'],
  descr: 'Under Reccared (586–601) Catholic Christianity becomes the official religion of the kingdom. The Visigothic Code is completed in 654.',
  sources: [S('wp-visigothic-kingdom', 'infobox and lead')],
});
ed.event({
  uuid: 'spania-expelled', title: 'The Byzantines are expelled from Spain', start: '624 CE', tracks: ['visigoths', 'eastern-roman'],
  descr: 'Swinthila ends Byzantine Spania (552–624); by 625 the Visigoths have expelled the Byzantines from Hispania and established a foothold at Ceuta in Africa.',
  sources: [S('wp-visigothic-kingdom', 'infobox, sidebar and lead')],
});

// ---------- Italy ----------
ed.event({
  uuid: 'theodoric-italy', title: 'Theodoric conquers Italy', start: '488 CE', end: '493 CE', tracks: ['ostrogoths', 'europe'],
  descr: 'Ordered by Zeno to overthrow Odoacer, Theodoric sets out in the autumn of 488 and wins at the Isonzo (28 August 489), Verona and the Adda (11 August 490). A treaty in February 493 makes Theodoric and Odoacer joint rulers of Italy, and on 15 March Theodoric kills Odoacer at a banquet.',
  sources: [S('wp-theodoric', 'body'), S('wp-ostrogothic-kingdom', 'body'), S('wp-odoacer', 'infobox and lead')],
  links: [{ to: 'fall-west', kind: 'related' }],
});
ed.event({
  uuid: 'theodoric', title: 'Reign of Theodoric the Great in Italy', start: '493 CE', end: '526 CE', tracks: ['ostrogoths'],
  descr: 'King of the Ostrogoths since 471, he rules Italy from Ravenna from 15 March 493 until his death on 30 August 526, and the Visigoths as regent from 511. He visits Rome in 500; Boethius is executed in 524.',
  sources: [S('wp-theodoric', 'infobox, lead and body'), S('wp-gothic-war', 'Background')],
  links: [{ to: 'theodoric-italy', kind: 'related' }],
});
ed.event({
  uuid: 'gothic-war', title: 'Justinian’s Gothic War', start: '535 CE', end: '554 CE', tracks: ['ostrogoths', 'eastern-roman'],
  descr: 'The first phase ends with the fall of Ravenna in 540; the second runs from 540/541. In 554 Justinian issues a pragmatic sanction, though some northern cities hold out until 562. The Ostrogothic kingdom ends with Mons Lactarius in 553.',
  sources: [S('wp-gothic-war', 'infobox and lead'), S('wp-ostrogothic-kingdom', 'infobox')],
  endDates: [C('554 CE', 'wp-gothic-war', 'infobox and lead'), C('553 CE', 'wp-ostrogothic-kingdom', 'infobox (Mons Lactarius)')],
  links: [{ to: 'justinian', kind: 'part-of' }],
});
ed.event({
  uuid: 'lombards-italy', title: 'The Lombards invade Italy', start: '568 CE', tracks: ['lombards', 'eastern-roman'],
  descr: 'In the spring of 568 King Alboin leads the Lombards from Pannonia into Italy. In 572, after Pavia capitulates and becomes the royal capital, Alboin is assassinated.',
  sources: [S('wp-lombards', 'infobox and Founding'), S('wp-gothic-war', 'lead')],
  links: [{ to: 'avar-khaganate', kind: 'related' }],
});

// ---------- the Franks ----------
ed.event({
  uuid: 'clovis', title: 'Clovis I unites the Franks', start: '481 CE', end: '511 CE', tracks: ['franks'],
  descr: 'Clovis succeeds his father Childeric at 15. He defeats Syagrius at Soissons (486) and the Alemanni at Tolbiac (496), and by 509 has united all the Franks and northern Gallo-Romans. Tradition dates his death to 27 November 511; Salic law is first tentatively codified that year.',
  sources: [S('wp-clovis', 'infobox, lead, Background and Middle reign'), S('wp-merovingians', 'lead, History and Government')],
});
ed.event({
  uuid: 'clovis-baptism', title: 'Clovis is baptised', start: 'c. 502 CE', tracks: ['franks'],
  descr: 'He converts to Nicene Christianity rather than Arianism.',
  sources: [S('wp-clovis', 'lead'), S('wp-merovingians', 'lead')],
  startDates: [C('502 CE', 'wp-clovis', "lead ('between 498 and 506')", { margin: 4 })],
  links: [{ to: 'clovis', kind: 'part-of' }],
});
ed.event({
  uuid: 'vouille', title: 'Battle of Vouillé', start: '507 CE', tracks: ['franks', 'visigoths'],
  descr: 'Around spring 507, near Poitiers, Clovis defeats Alaric II, who dies in the battle (allegedly killed by Clovis); the Franks conquer Gallia Aquitania, and the Visigothic capital moves from Toulouse to Barcelona (507–542), then Toledo.',
  sources: [S('wp-vouille', 'infobox and lead'), S('wp-visigothic-kingdom', 'infobox')],
  links: [{ to: 'clovis', kind: 'part-of' }],
});
ed.event({
  uuid: 'franks-burgundy', title: 'The Franks conquer Burgundy', start: '532 CE', end: '534 CE', tracks: ['franks', 'burgundians'],
  descr: 'The Frankish campaign ends near Autun in 534, and Burgundy becomes part of Francia; the Franks extend their rule into Raetia in 537.',
  sources: [S('wp-burgundians', 'infobox, lead and body'), S('wp-merovingians', 'lead')],
});
ed.event({
  uuid: 'clotaire-reunites', title: 'Clotaire II reunites the Frankish realm', start: '613 CE', tracks: ['franks'],
  descr: 'The realm, divided since Clovis’s death in 511, is reunited under one ruler. Dagobert I, the last powerful Merovingian king, dies in 639.',
  sources: [S('wp-merovingians', 'lead, Reunification and Weakening')],
});

// ---------- the Slavs ----------
ed.event({
  uuid: 'jordanes-slavs', title: 'Jordanes’s Getica', start: '551 CE', tracks: ['slavs'],
  descr: 'The first written use of the name “Slavs” dates to the 6th century; Jordanes describes them in his Getica (c. 551).',
  sources: [S('wp-early-slavs', 'lead and Origins'), S('wp-goths', 'Prehistory')],
});
ed.event({
  uuid: 'slavs-expand', title: 'The Slavs expand west and south', start: 'c. 600 CE', tracks: ['slavs'],
  descr: 'Between the sixth and seventh centuries the Slavs expand, reaching the Elbe, the Alps and the Balkans; Carantania is established in the 7th century.',
  sources: [S('wp-early-slavs', 'lead')],
  startDates: [C('600 CE', 'wp-early-slavs', "lead ('Between the sixth and seventh centuries')", { margin: 50 })],
});

ed.save();
