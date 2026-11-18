// The Classical World, first region pass (2026-11-18): the Mediterranean and the Near East — the Hellenistic
// kingdoms, Rome (Republic, Empire and the Eastern Roman Empire to Justinian and Heraclius), Carthage, Parthia and
// the Sasanians, Judea, the Nabataeans, Palmyra, Himyar, Armenia, and the rise of Islam to the fall of the
// Sasanians. Every date was quoted verbatim from the cited Wikipedia page by a fetch agent. Not used: *Battle of
// Edessa*, whose banner cites the LLM translation guideline (its date comes from *Palmyrene Empire*). See
// docs/classical-sources.md, first pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts.
//   node scripts/classical/mediterranean-near-east.ts && npm run data:classical
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-death-alexander', 'Death of Alexander the Great', 'Death_of_Alexander_the_Great'],
  ['wp-diadochi', 'Wars of the Diadochi', 'Wars_of_the_Diadochi'],
  ['wp-ipsus', 'Battle of Ipsus', 'Battle_of_Ipsus'],
  ['wp-ptolemaic', 'Ptolemaic Kingdom', 'Ptolemaic_Kingdom'],
  ['wp-seleucid', 'Seleucid Empire', 'Seleucid_Empire'],
  ['wp-antigonid', 'Antigonid dynasty', 'Antigonid_dynasty'],
  ['wp-library-alexandria', 'Library of Alexandria', 'Library_of_Alexandria'],
  ['wp-pergamon', 'Kingdom of Pergamon', 'Kingdom_of_Pergamon'],
  ['wp-greco-bactria', 'Greco-Bactrian Kingdom', 'Greco-Bactrian_Kingdom'],
  ['wp-rosetta', 'Rosetta Stone', 'Rosetta_Stone'],
  ['wp-actium', 'Battle of Actium', 'Battle_of_Actium'],
  ['wp-archimedes', 'Archimedes', 'Archimedes'],
  ['wp-punic-wars', 'Punic Wars', 'Punic_Wars'],
  ['wp-roman-republic', 'Roman Republic', 'Roman_Republic'],
  ['wp-caesar-assassination', 'Assassination of Julius Caesar', 'Assassination_of_Julius_Caesar'],
  ['wp-augustus', 'Augustus', 'Augustus'],
  ['wp-roman-empire', 'Roman Empire', 'Roman_Empire'],
  ['wp-crisis-third-century', 'Crisis of the Third Century', 'Crisis_of_the_Third_Century'],
  ['wp-tetrarchy', 'Tetrarchy', 'Tetrarchy'],
  ['wp-edict-milan', 'Edict of Milan', 'Edict_of_Milan'],
  ['wp-constantinople', 'Constantinople', 'Constantinople'],
  ['wp-sack-rome-410', 'Sack of Rome (410)', 'Sack_of_Rome_(410)'],
  ['wp-fall-west', 'Fall of the Western Roman Empire', 'Fall_of_the_Western_Roman_Empire'],
  ['wp-justinian', 'Justinian I', 'Justinian_I'],
  ['wp-hagia-sophia', 'Hagia Sophia', 'Hagia_Sophia'],
  ['wp-plague-justinian', 'Plague of Justinian', 'Plague_of_Justinian'],
  ['wp-parthia', 'Parthian Empire', 'Parthian_Empire'],
  ['wp-carrhae', 'Battle of Carrhae', 'Battle_of_Carrhae'],
  ['wp-sasanian', 'Sasanian Empire', 'Sasanian_Empire'],
  ['wp-maccabean', 'Maccabean Revolt', 'Maccabean_Revolt'],
  ['wp-herod', 'Herod the Great', 'Herod_the_Great'],
  ['wp-crucifixion', 'Crucifixion of Jesus', 'Crucifixion_of_Jesus'],
  ['wp-siege-jerusalem-70', 'Siege of Jerusalem (70 CE)', 'Siege_of_Jerusalem_(70_CE)'],
  ['wp-bar-kokhba', 'Bar Kokhba revolt', 'Bar_Kokhba_revolt'],
  ['wp-palmyrene', 'Palmyrene Empire', 'Palmyrene_Empire'],
  ['wp-nabataean', 'Nabataean Kingdom', 'Nabataean_Kingdom'],
  ['wp-himyar', 'Himyar', 'Himyar'],
  ['wp-hijrah', 'Hijrah', 'Hijrah'],
  ['wp-conquest-persia', 'Muslim conquest of Persia', 'Muslim_conquest_of_Persia'],
  ['wp-yarmuk', 'Battle of the Yarmuk', 'Battle_of_the_Yarmuk'],
  ['wp-byz-sasanian-602', 'Byzantine–Sasanian War of 602–628', 'Byzantine%E2%80%93Sasanian_War_of_602%E2%80%93628'],
  ['wp-armenia-christian', 'Christianization of Armenia', 'Christianization_of_Armenia'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
ed.tracks(
  [
    { id: 'antigonid', name: 'Antigonid Macedon', color: '#4a6aa8', parent: 'greece', span: { start: '306 BCE', end: '168 BCE' } },
    { id: 'pergamon', name: 'Kingdom of Pergamon', color: '#5a7ab0', parent: 'greece', span: { start: 'c. 282 BCE', end: '129 BCE' } },
  ],
  { after: 'greece' },
);
ed.tracks(
  [
    { id: 'roman-republic', name: 'Roman Republic', color: '#a83a3a', parent: 'rome', span: { start: 'c. 509 BCE', end: '27 BCE' } },
    { id: 'roman-empire', name: 'Roman Empire (and the Western Empire)', color: '#9a2a2a', parent: 'rome', span: { start: '27 BCE', end: '476 CE' } },
    { id: 'eastern-roman', name: 'Eastern Roman (Byzantine) Empire', color: '#8a3a6a', parent: 'rome', span: { start: '395 CE', end: '1453 CE' } },
  ],
  { after: 'rome' },
);
ed.track({ id: 'carthage', name: 'Carthage', color: '#a07a3a', parent: 'north-africa' }, { after: 'north-africa' });
ed.tracks(
  [
    { id: 'ptolemaic', name: 'Ptolemaic Egypt', color: '#b08a4a', parent: 'egypt', span: { start: '305 BCE', end: '30 BCE', startDates: [C(305, 'wp-ptolemaic', 'lead and infobox'), C(304, 'wp-ptolemaic', 'Notes, note 1 (some scholars)')] } },
    { id: 'roman-egypt', name: 'Roman and Byzantine Egypt', color: '#9a7a4a', parent: 'egypt', span: { start: '30 BCE', end: '641 CE' } },
  ],
  { after: 'egypt' },
);
ed.tracks(
  [
    { id: 'seleucid', name: 'Seleucid Empire', color: '#6a5aa0', parent: 'persia', span: { start: '312 BCE', end: '63 BCE' } },
    { id: 'greco-bactria', name: 'Greco-Bactrian Kingdom', color: '#7a6a90', parent: 'persia', span: { start: 'c. 256 BCE', end: 'c. 120 BCE', startDates: [C(256, 'wp-greco-bactria', 'lead and infobox'), C(250, 'wp-greco-bactria', 'Independence'), R(255, 246, 'wp-greco-bactria', 'Independence (high and low chronologies)')] } },
    { id: 'parthia', name: 'Parthian Empire', color: '#8a4a3a', parent: 'persia', span: { start: '247 BCE', end: '224 CE' } },
    { id: 'sasanian', name: 'Sasanian Empire', color: '#a84a2a', parent: 'persia', span: { start: '224 CE', end: '651 CE' } },
  ],
  { after: 'persia' },
);
ed.tracks(
  [
    { id: 'judea', name: 'Judea (Hasmoneans, Herod, Roman rule)', color: '#7a6a4a', parent: 'levant' },
    { id: 'palmyra', name: 'Palmyra', color: '#9a6a4a', parent: 'levant', span: { start: '270 CE', end: '273 CE', startDates: [C('270 CE', 'wp-palmyrene', 'infobox (as empire)'), C('260 CE', 'wp-palmyrene', 'infobox (as kingdom)')] } },
  ],
  { after: 'levant' },
);
ed.tracks(
  [
    { id: 'nabataea', name: 'Nabataean Kingdom (Petra)', color: '#b07a5a', parent: 'arabia', span: { start: 'c. 250 BCE', end: '106 CE', startDates: [R(300, 201, 'wp-nabataean', "infobox ('3rd century BC')"), R(400, 301, 'wp-nabataean', "Emergence ('from the 4th century BC')")] } },
    { id: 'himyar', name: 'Himyar', color: '#a0805a', parent: 'arabia', span: { start: 'c. 110 BCE', end: 'c. 575 CE', endDates: [C('575 CE', 'wp-himyar', 'infobox'), C('578 CE', 'wp-himyar', 'infobox')] } },
    { id: 'early-islam', name: 'Early Islam', color: '#3a7a5a', parent: 'arabia' },
  ],
  { after: 'arabia' },
);
ed.track({ id: 'armenia', name: 'Armenia', color: '#7a5a8a', parent: 'caucasus' }, { after: 'caucasus' });

// ---------- the Hellenistic world ----------
ed.event({
  uuid: 'alexander-dies', title: 'Death of Alexander the Great', start: '323 BCE', tracks: ['greece', 'persia'],
  descr: 'He dies at the age of 32, between the evenings of 10 and 11 June 323 BCE; fighting between his generals starts almost immediately.',
  sources: [S('wp-death-alexander', 'lead'), S('wp-diadochi', 'lead')],
});
ed.event({
  uuid: 'diadochi', title: 'Wars of the Diadochi', start: '322 BCE', end: '272 BCE', tracks: ['greece', 'persia', 'egypt'],
  descr: 'Conflicts between Alexander’s generals over his empire. Ptolemy receives Egypt; after Corupedium (281 BC) Seleucus I is the last of the original successors, and Macedon is settled for the Antigonids only in 272 BC with the death of Pyrrhus.',
  sources: [S('wp-diadochi', 'infobox, lead and Background')],
  links: [{ to: 'alexander-dies', kind: 'causes' }],
});
ed.event({
  uuid: 'ipsus', title: 'Battle of Ipsus', start: '301 BCE', tracks: ['greece', 'seleucid'],
  descr: 'A coalition of Seleucus, Cassander and Lysimachus defeats Antigonus I, who is killed.',
  sources: [S('wp-ipsus', 'infobox and lead'), S('wp-antigonid', 'History')],
  links: [{ to: 'diadochi', kind: 'part-of' }],
});
ed.event({
  uuid: 'seleucus-babylon', title: 'Seleucus takes Babylon: the Seleucid Empire', start: '312 BCE', tracks: ['seleucid'],
  descr: 'After the battle of Gaza (312 BC), Seleucus captures the citadel of Babylon in August 311 BC. His empire is annexed by Rome under Pompey in 63 BC.',
  sources: [S('wp-seleucid', 'lead, infobox, Rise of Seleucus and Babylonian War')],
  links: [{ to: 'diadochi', kind: 'part-of' }],
});
ed.event({
  uuid: 'ptolemy-pharaoh', title: 'Ptolemy I becomes pharaoh: the Ptolemaic Kingdom', start: '305 BCE', tracks: ['ptolemaic'],
  descr: 'Ptolemy, who had ruled Egypt as satrap since 323 BC, takes the title of basileus and pharaoh. The kingdom lasts until the death of Cleopatra VII in 30 BC.',
  sources: [S('wp-ptolemaic', 'lead, infobox and Establishment')],
  startDates: [C(305, 'wp-ptolemaic', 'Establishment'), C(304, 'wp-ptolemaic', 'Notes, note 1 (some scholars)')],
  links: [{ to: 'diadochi', kind: 'part-of' }],
});
ed.event({
  uuid: 'library-alexandria', title: 'The Library of Alexandria', start: 'c. 285 BCE', tracks: ['ptolemaic'],
  descr: 'Probably built under Ptolemy II Philadelphus (285–246 BC), though Ptolemy I may have planned it. Its decline begins with a purge of intellectuals in 145 BC; part is burned by Julius Caesar in 48 BC.',
  sources: [S('wp-library-alexandria', 'infobox, lead and Founding')],
  startDates: [R(285, 246, 'wp-library-alexandria', 'infobox (reign of Ptolemy II)'), R(323, 283, 'wp-library-alexandria', 'Founding (Letter of Aristeas: Ptolemy I)')],
});
ed.event({
  uuid: 'greco-bactria', title: 'The Greco-Bactrian Kingdom breaks away', start: 'c. 256 BCE', tracks: ['greco-bactria'],
  descr: 'Founded by the Seleucid satrap Diodotus I; it falls around 120 BC as the Parthians and nomads such as the Saka and Yuezhi press in. The Yuezhi later found the Kushan Empire.',
  sources: [S('wp-greco-bactria', 'lead, infobox and Independence')],
  startDates: [C(256, 'wp-greco-bactria', 'lead'), C(250, 'wp-greco-bactria', 'Independence'), R(255, 246, 'wp-greco-bactria', 'Independence (high and low chronologies)')],
});
ed.event({
  uuid: 'archimedes', title: 'Archimedes killed at the siege of Syracuse', start: 'c. 212 BCE', tracks: ['west-med'],
  descr: 'One of the greatest mathematicians of all time (c. 287 – c. 212 BC), he designed war machines to defend Syracuse and was killed by a Roman soldier.',
  sources: [S('wp-archimedes', 'infobox, lead and Biography')],
});
ed.event({
  uuid: 'rosetta-stone', title: 'The Rosetta Stone decree', start: '196 BCE', tracks: ['ptolemaic'],
  descr: 'A decree issued at Memphis on behalf of Ptolemy V Epiphanes on 27 March 196 BC.',
  sources: [S('wp-rosetta', 'infobox, lead and Memphis')],
});
ed.event({
  uuid: 'pydna', title: 'Battle of Pydna: Rome ends the Antigonid kingdom', start: '168 BCE', tracks: ['antigonid', 'roman-republic'],
  descr: 'Defeat in the Third Macedonian War ends the dynasty that had ruled much of Hellenistic Greece since 294 BC.',
  sources: [S('wp-antigonid', 'lead and Legacy')],
});
ed.event({
  uuid: 'pergamon-bequest', title: 'Attalus III leaves Pergamon to Rome', start: '133 BCE', tracks: ['pergamon', 'roman-republic'],
  descr: 'The childless king bequeaths his realm to the Roman Republic; after a revolt it becomes the Roman province of Asia (129 BC).',
  sources: [S('wp-pergamon', 'infobox and Final years')],
});

// ---------- Rome ----------
ed.event({
  uuid: 'first-punic-war', title: 'First Punic War', start: '264 BCE', end: '241 BCE', tracks: ['roman-republic', 'carthage'],
  descr: 'It breaks out on Sicily and lasts twenty-three years, until Carthage is defeated.',
  sources: [S('wp-punic-wars', 'lead and infobox')],
});
ed.event({
  uuid: 'second-punic-war', title: 'Second Punic War: Hannibal', start: '218 BCE', end: '201 BCE', tracks: ['roman-republic', 'carthage'],
  descr: 'Hannibal is defeated at Zama in 202 BC and a treaty follows in 201 BC.',
  sources: [S('wp-punic-wars', 'lead')],
  links: [{ to: 'first-punic-war', kind: 'related' }],
});
ed.event({
  uuid: 'carthage-destroyed', title: 'Rome destroys Carthage', start: '146 BCE', tracks: ['carthage', 'roman-republic'],
  descr: 'Rome declares war in 149 BC and storms Carthage in 146 BC; its territory becomes the Roman province of Africa.',
  sources: [S('wp-punic-wars', 'lead')],
  links: [{ to: 'second-punic-war', kind: 'related' }],
});
ed.event({
  uuid: 'carrhae', title: 'Battle of Carrhae: Parthia defeats Crassus', start: '53 BCE', tracks: ['parthia', 'roman-republic'],
  descr: 'Fought between the Roman Republic and the Parthian Empire; Cicero called the war "nulla causa", since Parthia had a treaty with Rome.',
  sources: [S('wp-carrhae', 'infobox, lead and Background')],
});
ed.event({
  uuid: 'caesar-assassinated', title: 'Julius Caesar assassinated', start: '44 BCE', tracks: ['roman-republic'],
  descr: 'Killed on the Ides of March (15 March), three days before he was to leave on a campaign against the Parthians; the Liberators’ civil war follows (43–42 BC).',
  sources: [S('wp-caesar-assassination', 'infobox, lead and Planning')],
});
ed.event({
  uuid: 'actium', title: 'Battle of Actium', start: '31 BCE', tracks: ['roman-republic', 'ptolemaic'],
  descr: 'On 2 September 31 BC Octavian’s fleet under Agrippa defeats Antony and Cleopatra. Cleopatra takes her life on 12 August 30 BC, ending the Ptolemaic Kingdom and the Hellenistic period, and Egypt becomes a Roman province.',
  sources: [S('wp-actium', 'infobox, lead and Aftermath'), S('wp-ptolemaic', 'Final years')],
});
ed.event({
  uuid: 'augustus', title: 'Octavian becomes Augustus: the Roman Empire', start: '27 BCE', tracks: ['roman-empire', 'roman-republic'],
  descr: 'The Senate grants Octavian the title Augustus on 16 January 27 BC, often seen as the end of the Republic. He rules as the first emperor until his death in AD 14 and makes peace with Parthia and Kush.',
  sources: [S('wp-augustus', 'infobox, lead and Name'), S('wp-roman-republic', 'lead and infobox')],
  links: [{ to: 'actium', kind: 'related' }, { to: 'caesar-assassinated', kind: 'related' }],
});
ed.event({
  uuid: 'trajan-extent', title: 'The Roman Empire at its greatest extent', start: '117 CE', tracks: ['roman-empire'],
  descr: 'At the time of Trajan’s death (r. 98–117 AD) the empire covers some 5,000,000 km².',
  sources: [S('wp-roman-empire', 'infobox and lead')],
});
ed.event({
  uuid: 'crisis-third-century', title: 'Crisis of the Third Century', start: '235 CE', end: '284 CE', tracks: ['roman-empire'],
  descr: 'It begins with the assassination of Severus Alexander by his own troops; by 268 the empire has split into three competing states, and Aurelian (270–275) turns the tide.',
  sources: [S('wp-crisis-third-century', 'lead and infobox')],
  endDates: [C('284 CE', 'wp-crisis-third-century', 'lead (accession of Diocletian)'), C('285 CE', 'wp-crisis-third-century', 'lead and infobox')],
});
ed.event({
  uuid: 'tetrarchy', title: 'The Tetrarchy', start: '293 CE', end: '324 CE', tracks: ['roman-empire'],
  descr: 'Diocletian divides imperial rule between two augusti and two caesares; Constantine’s victory at the Milvian Bridge (312) begins its end.',
  sources: [S('wp-tetrarchy', 'lead')],
});
ed.event({
  uuid: 'edict-milan', title: 'Edict of Milan', start: '313 CE', tracks: ['roman-empire'],
  descr: 'The 13 February 313 agreement to treat Christians benevolently; Christianity becomes the state religion with the Edict of Thessalonica in 380.',
  sources: [S('wp-edict-milan', 'lead')],
});
ed.event({
  uuid: 'constantinople', title: 'Constantinople becomes the capital', start: '330 CE', tracks: ['roman-empire', 'eastern-roman'],
  descr: 'Founded in 324 on the site of Byzantium and dedicated on 11 May 330 as the new eastern capital of the Roman Empire.',
  sources: [S('wp-constantinople', 'lead, infobox and timeline'), S('wp-roman-empire', 'lead')],
});
ed.event({
  uuid: 'adrianople', title: 'Battle of Adrianople', start: '378 CE', tracks: ['roman-empire'],
  descr: 'In 376 the Huns had driven many Goths into the empire; at Adrianople they defeat the Romans.',
  sources: [S('wp-sack-rome-410', 'Background'), S('wp-fall-west', 'lead')],
});
ed.event({
  uuid: 'theodosius-dies', title: 'Death of Theodosius I: East and West divide', start: '395 CE', tracks: ['roman-empire', 'eastern-roman'],
  descr: 'He dies after making Christianity the state religion, ending the unified empire (27 BC – AD 395).',
  sources: [S('wp-roman-empire', 'infobox and Transition to late antiquity'), S('wp-fall-west', 'lead')],
});
ed.event({
  uuid: 'sack-rome-410', title: 'The Visigoths sack Rome', start: '410 CE', tracks: ['roman-empire'],
  descr: 'On 24 August 410 Alaric’s Visigoths enter Rome and pillage it for three days. The Vandals sack it again in 455.',
  sources: [S('wp-sack-rome-410', 'infobox, lead, Third siege and sack, and Aftermath')],
  links: [{ to: 'adrianople', kind: 'related' }],
});
ed.event({
  uuid: 'fall-west', title: 'Fall of the Western Roman Empire', start: '476 CE', tracks: ['roman-empire'],
  descr: 'Odoacer deposes Romulus Augustulus, the last Western emperor, and sends the imperial insignia to the Eastern emperor Zeno.',
  sources: [S('wp-fall-west', 'lead'), S('wp-roman-empire', 'lead and Fall in the West')],
  links: [{ to: 'sack-rome-410', kind: 'related' }],
});
ed.event({
  uuid: 'justinian', title: 'Reign of Justinian I', start: '527 CE', end: '565 CE', tracks: ['eastern-roman'],
  descr: 'He rewrites Roman law as the Corpus Juris Civilis (final code 534) and retakes North Africa from the Vandals (533–534) and Italy from the Ostrogoths; the empire reaches its zenith in 555.',
  sources: [S('wp-justinian', 'infobox, Life, Legislative activities, Conquest of North Africa, War in Italy and Results')],
});
ed.event({
  uuid: 'hagia-sophia', title: 'Hagia Sophia built', start: '532 CE', end: '537 CE', tracks: ['eastern-roman'],
  descr: 'Justinian’s basilica rises after the second church burns in the Nika riots of January 532; it is inaugurated on 27 December 537.',
  sources: [S('wp-hagia-sophia', 'lead, infobox and Church of Justinian I'), S('wp-justinian', 'Nika riots')],
  links: [{ to: 'justinian', kind: 'part-of' }],
});
ed.event({
  uuid: 'plague-justinian', title: 'The Plague of Justinian', start: '541 CE', end: '549 CE', tracks: ['eastern-roman', 'sasanian'],
  descr: 'It reaches Roman Egypt in 541 and every corner of the empire by 543; Justinian catches it and recovers. It strikes the Sasanian Empire too and recurs until the mid-8th century.',
  sources: [S('wp-plague-justinian', 'infobox, lead and History')],
});

// ---------- Parthia, the Sasanians, Judea, Arabia, Armenia ----------
ed.event({
  uuid: 'parthia-founded', title: 'The Parthian Empire', start: '247 BCE', tracks: ['parthia'],
  descr: 'Centred in ancient Iran; Mithridates I (r. c. 171–132 BC) greatly expands it by seizing Media and Mesopotamia from the Seleucids.',
  sources: [S('wp-parthia', 'lead and infobox')],
});
ed.event({
  uuid: 'maccabees', title: 'The Maccabean Revolt', start: '167 BCE', end: '160 BCE', tracks: ['judea', 'seleucid'],
  descr: 'A revolt against the Seleucid king Antiochus IV’s repression of Judaism. The Maccabees take Jerusalem in 164 BCE; Judas Maccabeus dies in 160, and in 141 Simon Thassi expels the Greeks. An alliance with Rome helps secure independence.',
  sources: [S('wp-maccabean', 'infobox and lead')],
});
ed.event({
  uuid: 'herod', title: 'Herod the Great rules Judea', start: '37 BCE', end: '4 BCE', tracks: ['judea'],
  descr: 'A Roman client king; after his death the Romans divide his kingdom among his heirs. Some scholars (Steinmann) date his reign 36–1 BCE.',
  sources: [S('wp-herod', 'infobox and lead')],
  startDates: [C(37, 'wp-herod', 'infobox (Schürer)'), C(36, 'wp-herod', 'infobox (Steinmann)')],
  endDates: [C(4, 'wp-herod', 'infobox (Schürer)'), C(1, 'wp-herod', 'infobox (Steinmann)')],
});
ed.event({
  uuid: 'crucifixion', title: 'Crucifixion of Jesus', start: 'c. 30 CE', tracks: ['judea'],
  descr: 'In Jerusalem, in the Roman province of Judaea; dated AD 30 or 33.',
  sources: [S('wp-crucifixion', 'infobox')],
  startDates: [C('30 CE', 'wp-crucifixion', 'infobox'), C('33 CE', 'wp-crucifixion', 'infobox')],
});
ed.event({
  uuid: 'jerusalem-70', title: 'Rome destroys Jerusalem and the Second Temple', start: '70 CE', tracks: ['judea', 'roman-empire'],
  descr: 'The decisive event of the First Jewish Revolt (66–73 CE): the siege runs from 13 April to 8 September 70.',
  sources: [S('wp-siege-jerusalem-70', 'infobox and lead')],
});
ed.event({
  uuid: 'bar-kokhba', title: 'The Bar Kokhba revolt', start: '132 CE', end: '136 CE', tracks: ['judea', 'roman-empire'],
  descr: 'Sparked by Hadrian’s plan to rebuild Jerusalem as Aelia Capitolina; the rebels hold an independent state for over three years until Betar falls in 135. The province is renamed Syria Palaestina.',
  sources: [S('wp-bar-kokhba', 'infobox and lead')],
  links: [{ to: 'jerusalem-70', kind: 'related' }],
});
ed.event({
  uuid: 'nabataea-annexed', title: 'Rome annexes the Nabataean Kingdom', start: '106 CE', tracks: ['nabataea', 'roman-empire'],
  descr: 'Independent since the mid-3rd century BC, it becomes the province of Arabia Petraea.',
  sources: [S('wp-nabataean', 'lead and infobox')],
});
ed.event({
  uuid: 'sasanians-rise', title: 'The Sasanian Empire', start: '224 CE', tracks: ['sasanian', 'parthia'],
  descr: 'Ardashir I defeats the Parthians at the Battle of Hormozdgan on 28 April 224; the last pre-Islamic Iranian empire rules from Ctesiphon until 651.',
  sources: [S('wp-sasanian', 'infobox'), S('wp-parthia', 'infobox')],
});
ed.event({
  uuid: 'edessa-260', title: 'Shapur I defeats Rome at Edessa', start: '260 CE', tracks: ['sasanian', 'roman-empire'],
  descr: 'A disastrous Roman defeat; the same year Odaenathus of Palmyra defeats Shapur near the Euphrates.',
  sources: [S('wp-palmyrene', 'Background'), S('wp-sasanian', 'infobox')],
});
ed.event({
  uuid: 'palmyra', title: 'Zenobia’s Palmyrene Empire', start: '270 CE', end: '273 CE', tracks: ['palmyra', 'roman-empire'],
  descr: 'In 270 Zenobia rapidly conquers most of the Roman east, including Egypt; in 271 she claims the imperial title. Aurelian besieges Palmyra in 272 and razes it after a revolt in 273.',
  sources: [S('wp-palmyrene', 'infobox, lead and history')],
});
ed.event({
  uuid: 'armenia-christian', title: 'Armenia adopts Christianity', start: '301 CE', tracks: ['armenia'],
  descr: 'The traditional date; scholars propose dates from 284 to no later than 325, and many favour 314.',
  sources: [S('wp-armenia-christian', 'lead and Date and causes')],
  startDates: [C('301 CE', 'wp-armenia-christian', 'lead (traditional)'), C('314 CE', 'wp-armenia-christian', 'Date and causes (many modern scholars)')],
});
ed.event({
  uuid: 'aksum-himyar', title: 'Aksum conquers Himyar', start: 'c. 530 CE', tracks: ['himyar'],
  descr: 'After the conquest Christianity becomes Himyar’s main religion; Sasanian intervention brings Yemen under Persian influence in 575 or 578.',
  sources: [S('wp-himyar', 'infobox, lead and religion')],
});
ed.event({
  uuid: 'byz-sasanian-war', title: 'The last Roman–Persian war', start: '602 CE', end: '628 CE', tracks: ['sasanian', 'eastern-roman'],
  descr: 'The Sasanians conquer much of the Levant, parts of Anatolia and, for the first time, Egypt; they take Jerusalem after a three-week siege in 614. Heraclius strikes back from 622, the Persians fail before Constantinople in 626, and Persia, torn by civil war, seeks peace.',
  sources: [S('wp-byz-sasanian-602', 'infobox, lead and Persian ascendancy')],
});
ed.event({
  uuid: 'hijrah', title: 'The Hijrah: start of the Islamic calendar', start: '622 CE', tracks: ['early-islam'],
  descr: 'Its date equates to 16 July 622; the year is the epoch of the Islamic calendar.',
  sources: [S('wp-hijrah', 'lead and Note 3')],
});
ed.event({
  uuid: 'yarmuk', title: 'Battle of the Yarmuk', start: '636 CE', tracks: ['early-islam', 'eastern-roman'],
  descr: 'On 15–20 August 636 the Rashidun Caliphate defeats the Byzantine army; Byzantine Syria is annexed.',
  sources: [S('wp-yarmuk', 'infobox')],
  links: [{ to: 'byz-sasanian-war', kind: 'related' }],
});
ed.event({
  uuid: 'qadisiyyah', title: 'Battle of al-Qadisiyyah', start: '636 CE', tracks: ['early-islam', 'sasanian'],
  descr: 'The second Rashidun invasion of Sasanian territory wins a decisive victory (16–19 November 636).',
  sources: [S('wp-conquest-persia', 'lead and history'), S('wp-sasanian', 'infobox')],
});
ed.event({
  uuid: 'sasanian-fall', title: 'Fall of the Sasanian Empire', start: '651 CE', tracks: ['sasanian', 'early-islam'],
  descr: 'By 651 most cities of the Iranian lands are in Muslim hands; the Rashidun Caliphate annexes the empire.',
  sources: [S('wp-conquest-persia', 'infobox and lead'), S('wp-sasanian', 'infobox')],
  links: [{ to: 'qadisiyyah', kind: 'related' }],
});

ed.save();
