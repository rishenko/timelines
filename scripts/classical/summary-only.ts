// The Classical World, follow-up pass (2026-11-18): values the region passes had read only in a page summary. This
// time five fetch agents read the short dedicated articles (Toramana, Battle of the Utus, Dos Pilas, …) instead of the
// long overview pages that had been cut off. Every date below was quoted verbatim from the cited page; what was still
// summary-only (Nok phases, the Moche super El Niño, Champa's kings and the Sui sack of 605, the Northern Qi wall, the
// 642 surrender of Alexandria, the 382 Gothic treaty) or missing (Mahinda's mission year, the Sipán burial date, the
// Avar capture of Sirmium; *Battle of Songzhou* 404'd) is listed in docs/classical-sources.md, follow-up pass. No page
// carried an AI-text or LLM-translation banner.
// Re-runnable: it replaces what it added before. Run after the region passes, before collapsed.ts.
//   node scripts/classical/summary-only.ts && npm run data:classical
import { open, C, RCE, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-gautamiputra', 'Gautamiputra Satakarni', 'Gautamiputra_Satakarni'],
  ['wp-toramana', 'Toramana', 'Toramana'],
  ['wp-mihirakula', 'Mihirakula', 'Mihirakula'],
  ['wp-yashodharman', 'Yashodharman', 'Yashodharman'],
  ['wp-bhanugupta', 'Bhanugupta', 'Bhanugupta'],
  ['wp-vima-kadphises', 'Vima Kadphises', 'Vima_Kadphises'],
  ['wp-vasudeva-i', 'Vasudeva I', 'Vasudeva_I'],
  ['wp-shelun', 'Yujiulü Shelun', 'Yujiul%C3%BC_Shelun'],
  ['wp-peroz', 'Peroz I', 'Peroz_I'],
  ['wp-utus', 'Battle of the Utus', 'Battle_of_the_Utus'],
  ['wp-thapsus', 'Battle of Thapsus', 'Battle_of_Thapsus'],
  ['wp-sasanian-egypt', 'Sasanian conquest of Egypt', 'Sasanian_conquest_of_Egypt'],
  ['wp-arminius', 'Arminius', 'Arminius'],
  ['wp-germanicus', 'Germanicus', 'Germanicus'],
  ['wp-vercingetorix', 'Vercingetorix', 'Vercingetorix'],
  ['wp-aquae-sextiae', 'Battle of Aquae Sextiae', 'Battle_of_Aquae_Sextiae'],
  ['wp-vercellae', 'Battle of Vercellae', 'Battle_of_Vercellae'],
  ['wp-abritus', 'Battle of Abritus', 'Battle_of_Abritus'],
  ['wp-gothic-war-376', 'Gothic War (376–382)', 'Gothic_War_(376%E2%80%93382)'],
  ['wp-rule-of-dukes', 'Rule of the Dukes', 'Rule_of_the_Dukes'],
  ['wp-hengist-horsa', 'Hengist and Horsa', 'Hengist_and_Horsa'],
  ['wp-badon', 'Battle of Badon', 'Battle_of_Badon'],
  ['wp-dos-pilas', 'Dos Pilas', 'Dos_Pilas'],
  ['wp-yuknoom-cheen', 'Yuknoom Chʼeen II', 'Yuknoom_Ch%CA%BCeen_II'],
  ['wp-bhadravarman', 'Bhadravarman I', 'Bhadravarman_I'],
  ['wp-bhrikuti', 'Bhrikuti', 'Bhrikuti'],
  ['wp-valerian', 'Valerian (emperor)', 'Valerian_(emperor)'],
  ['wp-wu-mingche', 'Wu Mingche', 'Wu_Mingche'],
  ['wp-xuan-chen', 'Emperor Xuan of Chen', 'Emperor_Xuan_of_Chen'],
  ['wp-suiko', 'Empress Suiko', 'Empress_Suiko'],
  ['wp-himiko', 'Himiko', 'Himiko'],
  ['wp-yamatai', 'Yamatai', 'Yamatai'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- South Asia ----------
ed.event({
  uuid: 'gautamiputra-nahapana', title: 'Gautamiputra Satakarni defeats Nahapana', start: 'c. 78 CE', tracks: ['satavahana', 'indo-scythian'],
  descr: 'Most historians now agree that Gautamiputra and Nahapana were contemporaries and that Gautamiputra defeated Nahapana; the Nashik inscription says he defeated the Shakas (Western Kshatrapas). Scholars date the victory differently: Bhandare to the start of the Saka era (78 CE), Fynes to some time after 71 CE, Dhavalikar to c. 124 CE, which he counts as Gautamiputra’s 18th regnal year. His reign itself is dated anywhere from 60–85 to 106–130 CE.',
  sources: [S('wp-gautamiputra', 'lead, infobox and Gautamiputra and Nahapana')],
  startDates: [
    C('78 CE', 'wp-gautamiputra', "Gautamiputra and Nahapana (Bhandare: 'start of Saka era, 78 CE')"),
    C('124 CE', 'wp-gautamiputra', "Gautamiputra and Nahapana (Dhavalikar: 'c. 124 CE')"),
  ],
});
ed.event({
  uuid: 'toramana', title: 'Reign of Toramana', start: '493 CE', end: '515 CE', tracks: ['alchon'],
  descr: 'King of the Alchon Huns from 493 until his death in 515. His Kura inscription dates to 495–500 and the Sanjeli copper plate to 502–503; Kausambi was probably sacked by his Alkhons in 497–500. The Eran boar inscription is dated to the first year of his reign, placed between 510 and 513. Prakashadharma of Malwa defeats him around 515.',
  sources: [S('wp-toramana', 'lead, infobox, Defeats, Sack of Kausambi and Punjab inscription')],
});
ed.event({
  uuid: 'bhanugupta-eran', title: 'Bhanugupta’s Eran inscription', start: '510 CE', tracks: ['gupta'],
  descr: 'An inscription at Eran records that Bhanugupta took part in a battle in 510 CE (Fleet’s 1888 reading); a 1981 translation reads it as a battle against the “Maittras”. The Toramana page says Toramana may have been defeated by Bhanugupta in 510, per this inscription; the new reading removes that link.',
  sources: [S('wp-bhanugupta', 'Initial translation (J.F Fleet 1888) and New translation (1981)'), S('wp-toramana', 'Defeats')],
});
ed.event({
  uuid: 'mihirakula', title: 'Mihirakula rules the Alchon Huns', start: '515 CE', end: '542 CE', tracks: ['alchon'],
  descr: 'He rules from 515; the Chinese monk Song Yun meets him around 520. His campaign is reversed at Sondani, and Xuanzang says the Gupta king Narasimhagupta Baladitya defeated and captured him.',
  sources: [S('wp-mihirakula', 'lead, infobox and Xuanzang')],
  endDates: [C('542 CE', 'wp-mihirakula', 'lead and infobox'), C('540 CE', 'wp-mihirakula', "Alchon Huns succession table ('c.515–540')")],
  links: [{ to: 'toramana', kind: 'related' }],
});
ed.event({
  uuid: 'sondani', title: 'Yashodharman defeats Mihirakula at Sondani', start: '528 CE', tracks: ['alchon', 'south-asia'],
  descr: 'Yashodharman, and possibly the Gupta emperor Narasimhagupta, defeat a Huna army under Mihirakula and drive the Huns out of India. Yashodharman’s Mandsaur stone inscription is dated 532 AD.',
  sources: [S('wp-yashodharman', 'Reign and infobox'), S('wp-mihirakula', 'lead and Mandsaur Pillar inscriptions of Yashodharman')],
  startDates: [
    C('528 CE', 'wp-yashodharman', 'Reign'),
    C('528 CE', 'wp-mihirakula', 'Mandsaur Pillar inscriptions of Yashodharman'),
    RCE(525, 532, 'wp-mihirakula', "lead ('between 525 and 532 CE, likely by 530 CE')"),
  ],
  links: [{ to: 'mihirakula', kind: 'related' }],
});
ed.event({
  uuid: 'vima-kadphises', title: 'Reign of Vima Kadphises', start: '113 CE', end: '127 CE', tracks: ['kushan'],
  descr: 'Kushan emperor from approximately 113 to 127 CE. The same page also gives 90–100 CE (navbox) and AD 100–127 (a quoted source).',
  sources: [S('wp-vima-kadphises', 'lead and infobox')],
});
ed.event({
  uuid: 'vasudeva-i', title: 'Vasudeva I, the last great Kushan', start: '191 CE', end: '232 CE', tracks: ['kushan'],
  descr: 'The last of the “Great Kushans”; his reign extended from at least 191 to 232 CE. He sent tribute to China in 229.',
  sources: [S('wp-vasudeva-i', 'short description, infobox, lead, Contacts with China and Sassanid invasion in the northwest')],
  startDates: [C('191 CE', 'wp-vasudeva-i', 'infobox and lead'), C('190 CE', 'wp-vasudeva-i', "Kushan table ('c. 190 – 230')")],
  endDates: [C('232 CE', 'wp-vasudeva-i', 'infobox and lead'), C('230 CE', 'wp-vasudeva-i', "Kushan table ('c. 190 – 230')")],
});

// ---------- Steppe and Persia ----------
ed.event({
  uuid: 'shelun-khagan', title: 'Shelun takes the title khagan', start: '402 CE', tracks: ['rouran'],
  descr: 'Yujiulü Shelun, crowned 11 March 402, rules the Rouran until 410. He is the first major leader of the steppes to take the title khagan.',
  sources: [S('wp-shelun', 'lead, infobox, Reign and Personality and achievements')],
});
ed.event({
  uuid: 'peroz-hephthalites', title: 'Peroz I’s wars with the Hephthalites', start: '474 CE', end: '484 CE', tracks: ['sasanian', 'hephthalites'],
  descr: 'Peroz attacks the Hephthalites in 474 and is ambushed and captured near the border of Gurgan; ransomed, he is defeated and captured again in a second campaign in the late 470s or early 480s, and sends his son Kavad to the Hephthalite court as a hostage in 482. In 484, charging at Akhshunwar’s forces, he and his army fall into a trench and are killed.',
  sources: [S('wp-peroz', 'lead, infobox, First and second war with the Hephthalites, Third war with the Hephthalites and death')],
});
ed.event({
  uuid: 'utus-447', title: 'Battle of the Utus', start: '447 CE', tracks: ['huns', 'eastern-roman'],
  descr: 'A Hunnic victory over the Eastern Roman field armies; Arnegisclus is killed and Marcianople falls. Peace comes with a treaty in the fall of 447 or in 448: 6,000 lbs of gold up front and 2,100 lbs a year.',
  sources: [S('wp-utus', 'lead, infobox, Battle and Aftermath')],
  links: [{ to: 'attila', kind: 'related' }],
});
ed.event({
  uuid: 'attila-italy', title: 'Attila invades Italy', start: '452 CE', tracks: ['huns', 'roman-empire'],
  descr: 'Attila returns in 452 to renew his claim to Honoria, razes Aquileia and halts at the River Po. Pope Leo I and two envoys meet him at the Mincio near Mantua and obtain his promise to withdraw; Italy had suffered famine in 451, and an East Roman force had crossed the Danube. He dies in the early months of 453.',
  sources: [S('wp-attila', 'lead and Invasion of Italy and death')],
  links: [{ to: 'attila', kind: 'related' }],
});

// ---------- Africa and Egypt ----------
ed.event({
  uuid: 'thapsus', title: 'Battle of Thapsus', start: '46 BCE', tracks: ['numidia', 'roman-republic'],
  descr: 'Caesar defeats the Optimates under Metellus Scipio, with Juba I of Numidia, on 6 April 46 BC (the pre-reform Roman calendar; 7 February by the Julian). Cato commits suicide on news of the defeat, and Juba has a slave kill him after a duel with Petreius. Caesar returns to Rome on 25 July.',
  sources: [S('wp-thapsus', 'lead, infobox, note 2 and Aftermath')],
  links: [{ to: 'numidia-province', kind: 'related' }],
});
ed.event({
  uuid: 'sasanian-egypt', title: 'Persia conquers Egypt', start: '618 CE', end: '629 CE', tracks: ['roman-egypt', 'sasanian'],
  descr: 'The Persian invasion begins in 617 or 618; Alexandria is betrayed to the Persians in June 619 (Khuzistan Chronicle), and by 621 the province is securely in Persian hands. Egypt stays Persian for 10 years: in the summer of 629 the Persian troops begin to leave.',
  sources: [S('wp-sasanian-egypt', 'lead, infobox, Fall of Egypt and Aftermath')],
  startDates: [C('618 CE', 'wp-sasanian-egypt', 'lead and infobox'), C('617 CE', 'wp-sasanian-egypt', "Fall of Egypt ('either in 617 or 618')")],
  links: [{ to: 'byz-sasanian-war', kind: 'related' }],
});

// ---------- Europe ----------
ed.event({
  uuid: 'aquae-sextiae', title: 'Marius defeats the Teutons at Aquae Sextiae', start: '102 BCE', tracks: ['europe', 'roman-republic'],
  descr: 'At Aquae Sextiae (Aix-en-Provence) the Romans under Gaius Marius defeat the Teutons and Ambrones.',
  sources: [S('wp-aquae-sextiae', 'lead and infobox')],
  links: [{ to: 'cimbrian-war', kind: 'related' }],
});
ed.event({
  uuid: 'vercellae', title: 'Battle of Vercellae', start: '101 BCE', tracks: ['europe', 'roman-republic'],
  descr: 'On 30 July 101 BC, near Vercellae in Cisalpine Gaul, Marius and Catulus defeat a Celtic-Germanic confederation under the Cimbric king Boiorix, ending the Cimbrian War.',
  sources: [S('wp-vercellae', 'lead, infobox and Battle')],
  links: [{ to: 'cimbrian-war', kind: 'related' }],
});
ed.event({
  uuid: 'vercingetorix-executed', title: 'Vercingetorix executed', start: '46 BCE', tracks: ['celts'],
  descr: 'Forced to surrender at Alesia in September 52 BC, Vercingetorix is imprisoned in Rome for six years and executed after Caesar’s triumph in 46 BC.',
  sources: [S('wp-vercingetorix', 'lead and infobox')],
  links: [{ to: 'alesia', kind: 'related' }],
});
ed.event({
  uuid: 'germanicus-germania', title: 'Germanicus campaigns in Germania', start: '14 CE', end: '16 CE', tracks: ['europe', 'roman-empire'],
  descr: 'Between 14 and 16 Germanicus leads punitive operations against the Germanic tribes, defeating Arminius twice (according to Tacitus), first at Idistaviso. Roman troops recover one of the three lost legionary eagles in 15 and a second in 16. Germanicus dies in Antioch on 10 October 19; Arminius, seeking to become a king, is murdered by opponents in his own tribe in 21.',
  sources: [S('wp-germanicus', 'lead and infobox'), S('wp-arminius', 'lead, infobox and Roman retribution and death')],
  links: [{ to: 'teutoburg', kind: 'related' }],
});
ed.event({
  uuid: 'abritus', title: 'Battle of Abritus: the Goths kill Decius', start: '251 CE', tracks: ['europe', 'roman-empire'],
  descr: 'In the summer of 251 (June, July or August), near Abritus (modern Razgrad) in Moesia Inferior, Goths under Cniva defeat the Roman army; the emperors Decius and his son Herennius Etruscus are both killed.',
  sources: [S('wp-abritus', 'lead, infobox and Battle')],
});
ed.event({
  uuid: 'goths-danube', title: 'The Goths reach the Danube', start: '376 CE', tracks: ['visigoths', 'roman-empire'],
  descr: 'In the summer of 376 a massive number of Goths arrive on the Danube; the Thervings are probably allowed to cross at or near Durostorum. The Gothic War that follows lasts until 382.',
  sources: [S('wp-gothic-war-376', 'infobox and Background')],
  links: [{ to: 'adrianople', kind: 'related' }],
});
ed.event({
  uuid: 'hengist-horsa', title: 'Hengist and Horsa (traditional date)', start: '449 CE', tracks: ['anglo-saxons'],
  descr: 'The Anglo-Saxon Chronicle records that in 449 Vortigern invited Hengist and Horsa to Britain to help fight the Picts; the History of the Britons gives 447. Bede records that they were said to have been the first chieftains of the Angles, Saxons and Jutes in England.',
  sources: [S('wp-hengist-horsa', 'Anglo-Saxon Chronicle, History of the Britons and Ecclesiastical History')],
  startDates: [C('449 CE', 'wp-hengist-horsa', 'Anglo-Saxon Chronicle'), C('447 CE', 'wp-hengist-horsa', 'History of the Britons')],
});
ed.event({
  uuid: 'badon', title: 'Battle of Badon', start: 'c. 502 CE', tracks: ['anglo-saxons'],
  descr: 'A Brittonic victory whose date is unknown. Scholars have proposed 493, 501 and 516; McCarthy and Ó Cróinín revise it to February 482 and Breeze (2020) to 493. Bede’s chronology implies 493–500. Gildas’s account was written c. 543–547.',
  sources: [S('wp-badon', 'infobox, Gildas, Bede and Scholarship > Date')],
  startDates: [
    RCE(500, 504, 'wp-badon', "infobox ('Unknown, c. 500–504 AD')"),
    C('493 CE', 'wp-badon', 'Scholarship > Date (proposed)'),
    C('501 CE', 'wp-badon', 'Scholarship > Date (proposed)'),
    C('516 CE', 'wp-badon', 'Scholarship > Date (proposed)'),
    C('482 CE', 'wp-badon', 'Scholarship > Date (McCarthy and Ó Cróinín)'),
  ],
});
ed.event({
  uuid: 'rule-of-dukes', title: 'The Rule of the Dukes', start: '574 CE', end: '584 CE', tracks: ['lombards'],
  descr: 'An interregnum in the Lombard kingdom (574/5–584/5): after King Cleph dies, the dukes rule without a king for ten years (Paul the Deacon) or twelve (the Origo Gentis Langobardorum). After invading Frankish Provence in 584/5 they elect Cleph’s son Authari king.',
  sources: [S('wp-rule-of-dukes', 'lead, Political context, Description by Paul the Deacon and Origo Gentis Langobardorum')],
  startDates: [RCE(574, 575, 'wp-rule-of-dukes', "lead ('574/5–584/5')")],
  endDates: [RCE(584, 585, 'wp-rule-of-dukes', "lead ('574/5–584/5')")],
  links: [{ to: 'lombards-italy', kind: 'related' }],
});

// ---------- Americas ----------
ed.event({
  uuid: 'dos-pilas-founded', title: 'Tikal founds Dos Pilas', start: '629 CE', tracks: ['tikal'],
  descr: 'The Tikal king Kʼinich Muwaan Jol II installs his four-year-old son Bʼalaj Chan Kʼawiil as ruler of Dos Pilas, an offshoot of the Tikal dynasty.',
  sources: [S('wp-dos-pilas', 'lead, infobox and 629: Aligned to Tikal')],
});
ed.event({
  uuid: 'yuknoom-cheen', title: 'Yuknoom Chʼeen II rules Calakmul', start: '636 CE', end: '686 CE', tracks: ['calakmul'],
  descr: 'He accedes on 1 May 636; his successor takes the throne in 686.',
  sources: [S('wp-yuknoom-cheen', 'infobox and Reign')],
});
ed.event({
  uuid: 'dos-pilas-calakmul', title: 'Dos Pilas becomes a vassal of Calakmul', start: '648 CE', tracks: ['tikal', 'calakmul'],
  descr: 'Calakmul attacks and defeats Dos Pilas, which becomes its vassal state; Yuknoom Chʼeen II reinstates Bʼalaj Chan Kʼawiil on its throne as his vassal. (The Yuknoom Chʼeen II page dates his expulsion to 650.)',
  sources: [S('wp-dos-pilas', 'lead, 648: Aligned to Calakmul and Known rulers'), S('wp-yuknoom-cheen', 'Reign')],
  links: [{ to: 'dos-pilas-founded', kind: 'related' }, { to: 'yuknoom-cheen', kind: 'related' }],
});

// ---------- Southeast Asia and Tibet ----------
ed.event({
  uuid: 'bhadravarman-i', title: 'Bhadravarman I of Champa', start: '380 CE', end: '413 CE', tracks: ['champa'],
  descr: 'King of Champa from 380 to 413 and author of several Sanskrit inscriptions; he builds temples and palaces at Mỹ Sơn and Trà Kiệu. He campaigns north in 399 and fights the Chinese governor from 405 to 413.',
  sources: [S('wp-bhadravarman', 'lead and infobox')],
});
ed.event({
  uuid: 'bhrikuti', title: 'Bhrikuti marries Songtsen Gampo', start: 'c. 621 CE', tracks: ['yarlung'],
  descr: 'A Nepalese princess and the Tibetan king’s first queen, though her historicity is not certain and the date of the marriage is unknown: presumably about the time Narendradeva fled to Tibet (c. 621), or before 624, while one author gives 632.',
  sources: [S('wp-bhrikuti', 'lead, infobox and Life')],
  startDates: [C('621 CE', 'wp-bhrikuti', "Life ('c. 621 CE')"), C('623 CE', 'wp-bhrikuti', "Life ('before 624 CE')"), C('632 CE', 'wp-bhrikuti', "Life (Acharya Kirti Tulku Lobsang Tenzin: 'in 632')")],
});

// ---------- China and Japan ----------
ed.event({
  uuid: 'chen-north-573', title: 'Wu Mingche’s northern campaign', start: '573 CE', tracks: ['chen', 'northern-qi'],
  descr: 'In spring 573 Emperor Xuan of Chen attacks Northern Qi; by fall Wu Mingche besieges Shouyang, which he captures, and the land between the Yangtze and the Huai is entirely in Chen hands.',
  sources: [S('wp-wu-mingche', 'During Emperor Xuan’s reign'), S('wp-xuan-chen', 'Early reign')],
});
ed.event({
  uuid: 'wu-mingche-captured', title: 'Northern Zhou captures Wu Mingche', start: '578 CE', tracks: ['chen', 'northern-zhou'],
  descr: 'After Northern Zhou destroys Northern Qi in 577, the Zhou general Wang Gui captures Wu Mingche and some 30,000 foot soldiers on 20 March 578.',
  sources: [S('wp-wu-mingche', 'During Emperor Xuan’s reign'), S('wp-xuan-chen', 'Late reign')],
  links: [{ to: 'chen-north-573', kind: 'related' }],
});
ed.event({
  uuid: 'himiko', title: 'Himiko rules Yamatai', start: 'c. 185 CE', end: '248 CE', tracks: ['yayoi'],
  descr: 'The queen of Yamatai sends her first recorded embassy to the Wei court in 238 (Book of Wei; the Nihon Shoki’s quotation gives 239), another in 243, and envoys to Daifang in 247. She dies in 247 or 248.',
  sources: [S('wp-himiko', 'lead, infobox, Relations with Wei and conflict with Kuna, Japanese sources, Death and succession'), S('wp-yamatai', 'lead, infobox, Location and Chinese texts')],
  startDates: [C('190 CE', 'wp-himiko', "lead and infobox ('around 190')"), C('180 CE', 'wp-yamatai', "infobox and Location ('c. 180')")],
  endDates: [C('248 CE', 'wp-himiko', "lead ('247 or 248')", { margin: 1 }), C('248 CE', 'wp-yamatai', "lead ('died c. 248 CE')")],
});
ed.event({
  uuid: 'suiko', title: 'Empress Suiko; Prince Shōtoku regent', start: '593 CE', end: '628 CE', tracks: ['asuka'],
  descr: 'Suiko ascends the throne after an assassination in 592 (15 January 593 by the Gregorian calendar, 8 December 592 by the lunar) and reigns until her death in 628. Prince Shōtoku is regent from 593 to 621.',
  sources: [S('wp-suiko', 'lead, infobox and Biography')],
  links: [{ to: 'seventeen-article', kind: 'related' }],
});

// ---------- updates to earlier events and rows ----------
const edessa = ed.data.events.find((e: { uuid: string }) => e.uuid === 'edessa-260');
edessa.descr =
  'A tremendous defeat for the Romans: in 260, probably in June, the emperor Valerian is defeated at Edessa and held prisoner by Shapur I; the date of his death in captivity is debated. The same year Odaenathus of Palmyra defeats Shapur near the Euphrates.';
edessa.sources = [S('wp-palmyrene', 'Background'), S('wp-sasanian', 'infobox'), S('wp-valerian', 'lead, infobox, Rule and fall, Death in captivity')];

const aksum = ed.data.tracks.find((t: { id: string }) => t.id === 'aksum');
const sidebar = C(150, 'wp-aksum', "Eritrea history sidebar ('c. 150 BC–AD 960')");
aksum.span.startDates = aksum.span.startDates.filter((c: { source: { sourceLocation: string } }) => !c.source.sourceLocation.startsWith('Eritrea')).concat([sidebar]);

ed.save();
