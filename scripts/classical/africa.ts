// The Classical World, fifth region pass (2026-11-18): Africa — Numidia and Masinissa, the Jugurthine War, Mauretania
// and Juba II, the Garamantes, the Vandal kingdom, Kush and Meroë and their war with Rome, the Nubian kingdoms
// (Nobatia, Makuria, Alodia) and their conversion, the Baqt, Dʿmt and Aksum (the Periplus, coinage, Ezana and
// Frumentius, Kaleb, the migration to Abyssinia), Nok, Djenné-Djenno, the Bantu expansion, and the Arab conquest of
// Egypt. Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; values seen only in a page
// summary are not used. No page carried an AI-text or LLM-translation banner. See docs/classical-sources.md, fifth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts and mediterranean-near-east.ts.
//   node scripts/classical/africa.ts && npm run data:classical
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-numidia', 'Numidia', 'Numidia'],
  ['wp-masinissa', 'Masinissa', 'Masinissa'],
  ['wp-jugurthine', 'Jugurthine War', 'Jugurthine_War'],
  ['wp-mauretania', 'Mauretania', 'Mauretania'],
  ['wp-garamantes', 'Garamantes', 'Garamantes'],
  ['wp-vandal-kingdom', 'Vandal Kingdom', 'Vandal_Kingdom'],
  ['wp-kush', 'Kingdom of Kush', 'Kingdom_of_Kush'],
  ['wp-meroe', 'Meroë', 'Mero%C3%AB'],
  ['wp-napata', 'Napata', 'Napata'],
  ['wp-meroitic-script', 'Meroitic script', 'Meroitic_script'],
  ['wp-nobatia', 'Nobatia', 'Nobatia'],
  ['wp-makuria', 'Makuria', 'Makuria'],
  ['wp-alodia', 'Alodia', 'Alodia'],
  ['wp-baqt', 'Baqt', 'Baqt'],
  ['wp-aksum', 'Kingdom of Aksum', 'Kingdom_of_Aksum'],
  ['wp-ezana', 'Ezana of Axum', 'Ezana_of_Axum'],
  ['wp-kaleb', 'Kaleb of Axum', 'Kaleb_of_Axum'],
  ['wp-dmt', 'Dʿmt', 'D%CA%BFmt'],
  ['wp-periplus', 'Periplus of the Erythraean Sea', 'Periplus_of_the_Erythraean_Sea'],
  ['wp-frumentius', 'Frumentius', 'Frumentius'],
  ['wp-obelisk-axum', 'Obelisk of Axum', 'Obelisk_of_Axum'],
  ['wp-abyssinia-migration', 'Migration to Abyssinia', 'Migration_to_Abyssinia'],
  ['wp-aksum-currency', 'Aksumite currency', 'Aksumite_currency'],
  ['wp-nok', 'Nok culture', 'Nok_culture'],
  ['wp-djenne-djenno', 'Djenné-Djenno', 'Djenn%C3%A9-Djenno'],
  ['wp-bantu', 'Bantu expansion', 'Bantu_expansion'],
  ['wp-arab-egypt', 'Arab conquest of Egypt', 'Arab_conquest_of_Egypt'],
  ['wp-heliopolis-640', 'Battle of Heliopolis', 'Battle_of_Heliopolis'],
  ['wp-babylon-fortress', 'Siege of Babylon Fortress', 'Siege_of_Babylon_Fortress'],
  ['wp-alexandria-641', 'Siege of Alexandria (641)', 'Siege_of_Alexandria_(641)'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
// North Africa, west to east, after Carthage.
ed.tracks(
  [
    {
      id: 'mauretania', name: 'Mauretania', color: '#9a7040', parent: 'north-africa',
      span: { start: 'c. 225 BCE', end: '44 CE', startDates: [C(225, 'wp-mauretania', "History ('around 225 BC', Bagas)")] },
    },
    {
      id: 'numidia', name: 'Numidia', color: '#b0884a', parent: 'north-africa',
      span: {
        start: '202 BCE', end: '46 BCE',
        endDates: [C(46, 'wp-jugurthine', 'lead (Roman province)'), C(25, 'wp-numidia', 'infobox (annexed by the Roman Empire)')],
      },
    },
    { id: 'vandals', name: 'Vandal Kingdom', color: '#6a5a8a', parent: 'north-africa', span: { start: '435 CE', end: '534 CE' } },
    {
      id: 'garamantes', name: 'Garamantes', color: '#c09060', parent: 'north-africa',
      span: {
        start: 'c. 550 BCE', end: 'c. 675 CE',
        startDates: [R(600, 501, 'wp-garamantes', "Prehistory ('From the 6th century BCE')")],
        endDates: [C('675 CE', 'wp-garamantes', "lead ('late 7th century AD')", { margin: 25 })],
      },
    },
  ],
  { after: 'carthage' },
);
// Nubia, north to south.
ed.tracks(
  [
    {
      id: 'kush', name: 'Kingdom of Kush (Napata, Meroë)', color: '#8a5a2a', parent: 'nubia',
      span: {
        start: 'c. 780 BCE', end: 'c. 350 CE',
        endDates: [C('350 CE', 'wp-kush', 'infobox (disestablished)'), C('350 CE', 'wp-meroe', 'Fourth Meroitic Period'), C('330 CE', 'wp-kush', 'infobox (Axumite capture of Meroë)')],
      },
    },
    {
      id: 'nobatia', name: 'Nobatia', color: '#a06a3a', parent: 'nubia',
      span: {
        start: 'c. 400 CE', end: 'c. 631 CE',
        endDates: [C('631 CE', 'wp-makuria', "Early period ('presumably during the 620s, but before 642')", { margin: 11 })],
      },
    },
    {
      id: 'makuria', name: 'Makuria', color: '#7a4a3a', parent: 'nubia',
      span: {
        start: 'c. 450 CE', end: 'c. 1475 CE',
        startDates: [C('450 CE', 'wp-makuria', "infobox ('5th century')", { margin: 50 })],
        endDates: [C('1475 CE', 'wp-makuria', "infobox ('late 15th century')", { margin: 25 })],
      },
    },
    {
      id: 'alodia', name: 'Alodia', color: '#9a5a4a', parent: 'nubia',
      span: {
        start: 'c. 550 CE', end: 'c. 1500 CE',
        startDates: [C('550 CE', 'wp-alodia', "infobox ('6th century')", { margin: 50 }), C('550 CE', 'wp-alodia', "Origins ('completed by the mid-6th century')")],
      },
    },
  ],
  { after: 'nubia' },
);
// The Horn.
ed.tracks(
  [
    {
      id: 'dmt', name: 'Dʿmt', color: '#7a6a3a', parent: 'horn',
      span: {
        start: 'c. 750 BCE', end: 'c. 350 BCE',
        startDates: [R(800, 701, 'wp-dmt', "infobox ('8th c. BC')")],
        endDates: [R(400, 301, 'wp-dmt', "infobox ('4th c. BC')"), C(400, 'wp-dmt', "History ('approximately 800/700–400 BC')")],
      },
    },
    {
      id: 'aksum', name: 'Kingdom of Aksum', color: '#5a7a4a', parent: 'horn',
      span: {
        start: 'c. 50 CE', end: '960 CE',
        startDates: [C('50 CE', 'wp-aksum', "infobox and lead ('1st century')", { margin: 50 }), C(150, 'wp-dmt', "lead ('possibly around 150 BC')")],
      },
    },
  ],
  { after: 'horn' },
);
// Africa south of the Sahara, west to east.
ed.tracks(
  [
    { id: 'djenne-djenno', name: 'Djenné-Djenno', color: '#a07850', parent: 'sub-saharan', span: { start: '250 BCE', end: '1400 CE' } },
    { id: 'nok', name: 'Nok culture', color: '#8a6040', parent: 'sub-saharan', span: { start: 'c. 1500 BCE', end: 'c. 1 BCE' } },
  ],
  { after: 'sub-saharan' },
);

// ---------- North Africa ----------
ed.event({
  uuid: 'masinissa-numidia', title: 'Masinissa’s kingdom of Numidia', start: '202 BCE', end: '148 BCE', tracks: ['numidia', 'carthage'],
  descr: 'During the Second Punic War Masinissa, king of the Massylii, defeats Syphax of the Masaesyli; with Scipio he beats Syphax and Hasdrubal at Cirta in 203 BC. After Zama (202 BC) he rules Numidia until his death in 148 BC, aged about 90, and by 158 BC has conquered Lepcis Magna and the Tripolitanian coast.',
  sources: [S('wp-numidia', 'infobox, lead and Establishment'), S('wp-masinissa', 'infobox and lead')],
  endDates: [C(148, 'wp-masinissa', 'infobox'), C(149, 'wp-jugurthine', 'Jugurtha and Numidia')],
  links: [{ to: 'second-punic-war', kind: 'related' }],
});
ed.event({
  uuid: 'numidia-carthage-war', title: 'Masinissa’s war with Carthage', start: '152 BCE', end: '150 BCE', tracks: ['numidia', 'carthage'],
  descr: 'Masinissa seizes more Carthaginian territory in 152 BC; in 151 BC he invades Carthaginian lands with 52,000 men. Carthage, by preparing to fight back, effectively breaks the peace treaty of 201 BC, and its general Hasdrubal is decisively defeated by Masinissa’s son Gulussa in 150 BC. In 146 BC Carthage is obliterated.',
  sources: [S('wp-numidia', 'War with Carthage')],
  links: [{ to: 'carthage-destroyed', kind: 'causes' }],
});
ed.event({
  uuid: 'jugurthine-war', title: 'Jugurthine War', start: '111 BCE', end: '105 BCE', tracks: ['numidia', 'roman-republic', 'mauretania'],
  descr: 'In 113 BC Jugurtha again declares war on his cousin; Rome declares war on him in 111 BC, and Metellus arrives in Africa in 109 BC. Mauretania fights on Jugurtha’s side from 107 BC and on Rome’s in 105 BC.',
  sources: [S('wp-jugurthine', 'infobox, lead and Jugurtha and Numidia')],
  endDates: [C(105, 'wp-jugurthine', 'infobox and lead'), C(106, 'wp-jugurthine', 'Algeria navbox (111–106 BC)')],
});
ed.event({
  uuid: 'numidia-province', title: 'Numidia becomes a Roman province', start: '46 BCE', tracks: ['numidia', 'roman-republic'],
  descr: 'Juba I’s reign (60–46 BC) ends. The Numidia infobox dates the annexation by the Roman Empire to 25 BC.',
  sources: [S('wp-jugurthine', 'lead'), S('wp-numidia', 'infobox')],
  startDates: [C(46, 'wp-jugurthine', 'lead'), C(25, 'wp-numidia', 'infobox')],
});
ed.event({
  uuid: 'juba-ii', title: 'Juba II: Mauretania a Roman client kingdom', start: '25 BCE', end: '23 CE', tracks: ['mauretania', 'roman-empire'],
  descr: 'After Bocchus II bequeaths his kingdom to Octavian (33 BC), Augustus makes Mauretania a client kingdom in 25 BC under Juba II, who marries Cleopatra Selene II the same year. In AD 21 Juba makes his son Ptolemy co-ruler.',
  sources: [S('wp-mauretania', 'lead, infobox, History and monarch table')],
  endDates: [C('23 CE', 'wp-mauretania', 'monarch table'), C('24 CE', 'wp-mauretania', "History ('AD 23–24')")],
});
ed.event({
  uuid: 'mauretania-annexed', title: 'Rome annexes Mauretania', start: '40 CE', end: '44 CE', tracks: ['mauretania', 'roman-empire'],
  descr: 'Caligula orders the execution of King Ptolemy in 40 AD; after Aedemon’s death in 42 AD, Sabalus surrenders in 44 AD and the region is annexed to Rome.',
  sources: [S('wp-mauretania', 'lead, infobox and History')],
  links: [{ to: 'juba-ii', kind: 'related' }],
});
ed.event({
  uuid: 'balbus-garamantes', title: 'Balbus campaigns against the Garamantes', start: '19 BCE', tracks: ['garamantes', 'roman-empire'],
  descr: 'The Romans capture fifteen Garamantian settlements. The earliest known written record of the Garamantes dates to the 5th century BC; Herodotus includes them among the Libyan tribes.',
  sources: [S('wp-garamantes', 'History')],
});
ed.event({
  uuid: 'severus-garama', title: 'Septimius Severus captures Garama', start: '202 CE', tracks: ['garamantes', 'roman-empire'],
  descr: 'The Garamantian capital falls to Rome. The Garamantes first emerge as a major regional power in the mid-2nd century AD and flourish until the late 7th century.',
  sources: [S('wp-garamantes', 'lead and History')],
});
ed.event({
  uuid: 'vandals-cross', title: 'The Vandals cross into Africa', start: '429 CE', end: '435 CE', tracks: ['vandals', 'roman-empire'],
  descr: 'An estimated 80,000 Vandals under Gaiseric cross from Hispania in 429. They besiege Hippo Regius in 430, where St. Augustine dies on 28 August 430, three months into the siege; peace is made with Rome in 435.',
  sources: [S('wp-vandal-kingdom', 'lead and Establishment')],
});
ed.event({
  uuid: 'vandals-carthage', title: 'The Vandals take Carthage', start: '439 CE', tracks: ['vandals', 'roman-empire'],
  descr: 'Gaiseric breaks the treaty and captures Carthage, which becomes his capital. The Vandals raid Sicily in 440, and peace is secured in 442.',
  sources: [S('wp-vandal-kingdom', 'infobox, lead and Establishment')],
  links: [{ to: 'vandals-cross', kind: 'related' }],
});
ed.event({
  uuid: 'vandal-sack-rome', title: 'The Vandals sack Rome', start: '455 CE', tracks: ['vandals', 'roman-empire'],
  descr: 'The Vandal kingdom is primarily remembered for this sack of Rome in 455. In the 460s the Romans launch two expeditions by sea against it; both fail.',
  sources: [S('wp-vandal-kingdom', 'lead')],
  links: [{ to: 'sack-rome-410', kind: 'related' }],
});
ed.event({
  uuid: 'vandals-fall', title: 'Belisarius conquers the Vandal kingdom', start: '534 CE', tracks: ['vandals', 'eastern-roman'],
  descr: 'The kingdom ends after 99 years; Gelimer (530–534) is its last ruler.',
  sources: [S('wp-vandal-kingdom', 'infobox and lead')],
  links: [{ to: 'justinian', kind: 'part-of' }],
});

// ---------- Kush and Nubia ----------
ed.event({
  uuid: 'meroitic-period', title: 'Royal burials move to Meroë: the Meroitic period', start: 'c. 270 BCE', tracks: ['kush'],
  descr: 'Under Arakamani the royal burial ground moves from Napata to Meroë, and Napata loses its symbolic role. The pyramids of Meroë are built from c. 300 BC to about 350 AD.',
  sources: [S('wp-kush', 'section headings'), S('wp-meroe', 'First Meroitic Period'), S('wp-napata', 'lead')],
  startDates: [C(270, 'wp-kush', 'section heading (Meroitic period, c. 270 BC)'), C(270, 'wp-napata', 'lead'), C(280, 'wp-meroe', 'First Meroitic Period (Arakamani, c. 280 BC)')],
});
ed.event({
  uuid: 'meroitic-script', title: 'The Meroitic script', start: 'c. 275 BCE', tracks: ['kush'],
  descr: 'Developed at the beginning of the Meroitic period to write the Meroitic language; the cursive form predates the earliest surviving hieroglyphic inscription by a century or more. It was deciphered by Francis Llewellyn Griffith (1909, or 1911 in the body of the page).',
  sources: [S('wp-meroitic-script', 'infobox, lead and footnote 2')],
  startDates: [R(300, 251, 'wp-meroitic-script', "footnote 2 (Rilly: 'first half of the 3rd Cent. BC')"), R(300, 201, 'wp-meroitic-script', "lead ('3rd century BC')")],
});
ed.event({
  uuid: 'kush-rome-war', title: 'Kush at war with Rome; peace with Amanirenas', start: '23 BCE', end: '22 BCE', tracks: ['kush', 'roman-egypt'],
  descr: 'After a Nubian attack on southern Egypt, the Roman governor Petronius invades Nubia and sacks Napata (22 BC; 23 BC on the Napata page). A peace treaty is signed in 22 BC between Rome and Meroë under Augustus and Amanirenas.',
  sources: [S('wp-meroe', 'Conflict with Rome'), S('wp-napata', 'lead and Late Napatan')],
  links: [{ to: 'augustus', kind: 'related' }],
});
ed.event({
  uuid: 'nero-meroe', title: 'Nero’s expedition reaches Meroë', start: '61 CE', tracks: ['kush', 'roman-empire'],
  descr: 'In the autumn of 61 AD a Praetorian party sent by Nero reaches Meroë and goes up the White Nile to the Sudd. The kingdom begins to fade as a power by the 1st or 2nd century AD.',
  sources: [S('wp-meroe', 'Conflict with Rome')],
});
ed.event({
  uuid: 'meroe-falls', title: 'Aksum takes Meroë: the end of Kush', start: '330 CE', end: '350 CE', tracks: ['kush', 'aksum'],
  descr: 'Meroë is already in decline around 300. Aksumites capture Meroë and loot its gold, and Ezana takes the title “King of Ethiopia”; the Aksumite presence is short-lived, and Kush dissolves into Nobatia, Makuria and Alodia.',
  sources: [S('wp-kush', 'infobox and lead'), S('wp-meroe', 'Fourth Meroitic Period')],
  startDates: [C('330 CE', 'wp-kush', 'infobox (Axumite capture of Meroë)'), C('330 CE', 'wp-meroe', "Fourth Meroitic Period (Ezana 'around 330')")],
  endDates: [C('350 CE', 'wp-meroe', "Fourth Meroitic Period ('In 350 AD Meroë was destroyed by Axum')"), C('350 CE', 'wp-kush', 'infobox (disestablished)')],
  links: [{ to: 'ezana', kind: 'related' }],
});
ed.event({
  uuid: 'silko', title: 'Silko of Nobatia drives out the Blemmyes', start: 'c. 450 CE', tracks: ['nobatia'],
  descr: 'The first known king of Nobatia claims to have driven the Blemmyes into the Eastern Desert; the capital is set at Pachoras (Faras). The last known Meroitic inscription, of the Blemmye king Kharamadoye at Kalabsha, dates to AD 410/450.',
  sources: [S('wp-nobatia', 'infobox, lead and History'), S('wp-meroitic-script', 'lead')],
});
ed.event({
  uuid: 'dongola', title: 'Dongola founded', start: 'c. 500 CE', tracks: ['makuria'],
  descr: 'The Makurian capital; a new Makurian state has emerged by the 5th century, after the collapse of Kush.',
  sources: [S('wp-makuria', 'lead and Early period')],
  startDates: [C('500 CE', 'wp-makuria', "lead ('around 500')"), C('475 CE', 'wp-makuria', "Early period ('late 5th century')", { margin: 25 })],
});
ed.event({
  uuid: 'philae-closed', title: 'The temple at Philae is closed', start: '535 CE', end: '538 CE', tracks: ['nobatia', 'eastern-roman'],
  descr: 'In the 530s the Byzantines under Justinian pursue a policy of expansion into Nubia.',
  sources: [S('wp-nobatia', 'Religion > Paganism'), S('wp-makuria', 'Early period')],
});
ed.event({
  uuid: 'nubia-christian', title: 'The Nubian kingdoms convert to Christianity', start: '543 CE', end: '580 CE', tracks: ['nobatia', 'makuria', 'alodia'],
  descr: 'Nobatia converts in 543; Makuria has “received the faith of Christ” by around 568 and sends a delegation to Constantinople in 573. Alodia, first mentioned in 569, is the last: its request is granted in 580 and Longinus is sent.',
  sources: [S('wp-nobatia', 'lead'), S('wp-makuria', 'Early period'), S('wp-alodia', 'lead, Origins and Christianization')],
});
ed.event({
  uuid: 'makuria-nobatia', title: 'Makuria annexes Nobatia', start: 'c. 631 CE', tracks: ['makuria', 'nobatia'],
  descr: 'Presumably during the 620s, but before 642; a new bishopric is founded in Faras around 630. The Nobatia page says only that the merger most likely came before 652, and certainly by 707.',
  sources: [S('wp-makuria', 'lead and Early period'), S('wp-nobatia', 'History')],
  startDates: [C('631 CE', 'wp-makuria', "Early period ('during the 620s, but before 642')", { margin: 11 })],
});
ed.event({
  uuid: 'baqt', title: 'Arab invasions of Makuria and the Baqt', start: '641 CE', end: '652 CE', tracks: ['makuria', 'early-islam'],
  descr: 'A first expedition comes in 641 or 642; a second, under Abd Allah ibn Sa’d ibn Abi al-Sarh, besieges Dongola in 651/652 and is repulsed. The resulting treaty with King Qalidurut, the Baqt, sends 360 slaves a year to Egypt and remains in force for more than six centuries. Alodia is explicitly not affected by it.',
  sources: [S('wp-makuria', 'lead and Early period'), S('wp-baqt', 'History and Provisions'), S('wp-alodia', 'Christianization')],
  startDates: [C('641 CE', 'wp-makuria', "Early period ('641 or 642')", { margin: 1 })],
  links: [{ to: 'arab-conquest-egypt', kind: 'related' }],
});

// ---------- Aksum and the Horn ----------
ed.event({
  uuid: 'periplus', title: 'The Periplus of the Erythraean Sea', start: 'c. 55 CE', tracks: ['aksum', 'roman-egypt'],
  descr: 'A Greek merchants’ guide to the Red Sea and Indian Ocean; a mid-first-century date is now most commonly accepted. It describes the city of the Auxumites, its ivory trade, and its ruler Zoscales.',
  sources: [S('wp-periplus', 'lead, Date and authorship, and Aksum section')],
  startDates: [C('55 CE', 'wp-periplus', 'Date and authorship (Hill, Casson: AD 40–70)', { margin: 15 }), C('60 CE', 'wp-periplus', "lead (Schoff and Agius: 'around AD 60')")],
});
ed.event({
  uuid: 'aksum-coins', title: 'Aksum begins minting coins', start: 'c. 270 CE', tracks: ['aksum'],
  descr: 'Under King Endybis. Coins are known from eighteen Aksumite kings, from c. 295 until c. 620.',
  sources: [S('wp-aksum-currency', 'lead, Pre-Christian period and Kings'), S('wp-aksum', 'lead')],
  startDates: [
    C('270 CE', 'wp-aksum-currency', "lead and Pre-Christian period ('around 270')"),
    C('290 CE', 'wp-aksum', 'lead (Endybis, 270–310)', { margin: 20 }),
    C('231 CE', 'wp-aksum-currency', 'Endybis caption (227–235 AD)', { margin: 4 }),
  ],
});
ed.event({
  uuid: 'ezana', title: 'Reign of Ezana', start: 'c. 325 CE', end: 'c. 360 CE', tracks: ['aksum'],
  descr: 'The first Aksumite king to embrace Christianity; his coins replace the pagan disc and crescent with a cross. A surviving letter from Constantius II is addressed to him and his brother Saizana.',
  sources: [S('wp-ezana', 'infobox, lead and Reign'), S('wp-frumentius', 'Biography'), S('wp-obelisk-axum', 'History')],
  startDates: [C('325 CE', 'wp-ezana', "infobox ('320s')", { margin: 5 }), C('321 CE', 'wp-obelisk-axum', "History ('c. 321 – c. 360')")],
});
ed.event({
  uuid: 'aksum-christian', title: 'Aksum becomes Christian', start: 'c. 328 CE', tracks: ['aksum'],
  descr: 'Ezana converts; Frumentius, who came to Aksum as a child around 316, is consecrated its bishop. The coin weights suggest a conversion before Constantine’s reform of 324, or a few years after.',
  sources: [S('wp-aksum', 'infobox and lead'), S('wp-frumentius', 'Biography'), S('wp-aksum-currency', 'Ezana')],
  startDates: [
    C('325 CE', 'wp-aksum', "infobox ('325 or 328')"),
    C('328 CE', 'wp-aksum', "infobox ('325 or 328')"),
    C('328 CE', 'wp-frumentius', "Biography (consecration 'traditionally in the year 328')"),
    C('343 CE', 'wp-frumentius', "Biography ('or according to others, between 340 and 346')", { margin: 3 }),
  ],
  links: [{ to: 'ezana', kind: 'part-of' }],
});
ed.event({
  uuid: 'axum-stelae', title: 'The stelae of Axum', start: 'c. 350 CE', tracks: ['aksum'],
  descr: 'The Obelisk of Axum is probably carved and erected during the 4th century AD; the last stele raised in Axum is probably King Ezana’s Stele.',
  sources: [S('wp-obelisk-axum', 'infobox and History')],
  startDates: [C('350 CE', 'wp-obelisk-axum', "History ('during the 4th century AD')", { margin: 50 })],
});
ed.event({
  uuid: 'kaleb', title: 'Reign of Kaleb; Aksum invades Yemen', start: '514 CE', end: '534 CE', tracks: ['aksum', 'himyar'],
  descr: 'Kaleb invades Yemen around 520 (518–525 in the Aksum infobox), and Aksumite control of West Yemen lasts until c. 525, when Abraha deposes Sumyafa Ashwa. The envoy Nonnosus meets him in 530.',
  sources: [S('wp-kaleb', 'short description, infobox and Life'), S('wp-aksum', 'infobox')],
  endDates: [C('534 CE', 'wp-kaleb', 'infobox'), C('542 CE', 'wp-kaleb', 'short description (514 to 542)')],
  links: [{ to: 'aksum-himyar', kind: 'related' }],
});
ed.event({
  uuid: 'aksum-persia', title: 'Aksumite–Persian wars', start: '570 CE', end: '578 CE', tracks: ['aksum', 'himyar', 'sasanian'],
  descr: 'The Aksum infobox lists the Year of the Elephant in 570 and the Aksumite–Persian wars from 570 to 578.',
  sources: [S('wp-aksum', 'infobox')],
  links: [{ to: 'aksum-himyar', kind: 'related' }],
});
ed.event({
  uuid: 'abyssinia-migration', title: 'Muslims take refuge in Aksum', start: 'c. 614 CE', tracks: ['aksum', 'early-islam'],
  descr: 'The first Hijrah: a small group of early Muslims, then a second of 83 men and 18 women, find refuge with an Aksumite king whom modern historians have alternatively identified with Armah. Many return to Mecca in 622; a second wave goes to Medina in 628.',
  sources: [S('wp-abyssinia-migration', 'infobox, lead, The migration(s) and End of the Muslim exile')],
  startDates: [C('613 CE', 'wp-abyssinia-migration', "lead ('9 BH (613 CE)')"), C('615 CE', 'wp-abyssinia-migration', "lead ('7 BH (615 CE)')")],
  links: [{ to: 'hijrah', kind: 'related' }],
});
ed.addRow('aksum-himyar', 'aksum');

// ---------- Africa south of the Sahara ----------
// The c. 500 BCE Bantu event (bantu-500) is an overlap event already in the skeleton; the Garamantes' first record
// (herodotus-garamantes) moves from the region row onto the new row.
ed.data.events.find((e: { uuid: string }) => e.uuid === 'herodotus-garamantes').tracks = ['garamantes'];
ed.event({
  uuid: 'djenne-settled', title: 'Djenné-Djenno settled', start: '250 BCE', tracks: ['djenne-djenno'],
  descr: 'People first settle the site permanently around 250 BCE (Phase I runs to 50 CE); glass beads there date to as early as the third century BC. A similar settlement at Dia exists from around 900 BCE.',
  sources: [S('wp-djenne-djenno', 'lead and History')],
});
ed.event({
  uuid: 'bantu-iron-east', title: 'Eastern Bantu iron-working', start: 'c. 100 BCE', end: '300 CE', tracks: ['sub-saharan'],
  descr: 'By the first century BC the Eastern Stream has developed iron forging; by roughly 100 BC to 300 AD Bantu speakers are present at coastal sites such as Misasa in Tanzania and Kwale in Kenya.',
  sources: [S('wp-bantu', 'History > Eastern Stream')],
});
ed.event({
  uuid: 'bantu-south-africa', title: 'The Bantu expansion reaches South Africa', start: 'c. 300 CE', end: '500 CE', tracks: ['sub-saharan'],
  descr: 'Bantu speakers reach KwaZulu-Natal by 300 AD and Limpopo Province by 500 AD.',
  sources: [S('wp-bantu', 'lead and History > Eastern Stream')],
});
ed.event({
  uuid: 'djenne-growth', title: 'Djenné-Djenno grows', start: '400 CE', tracks: ['djenne-djenno'],
  descr: 'The town may cover as much as 100,000 square meters by 400 CE; Phase III runs from about 400 to 900 AD.',
  sources: [S('wp-djenne-djenno', 'History')],
});

// ---------- Egypt ----------
ed.event({
  uuid: 'arab-conquest-egypt', title: 'The Arab conquest of Egypt', start: '639 CE', end: '642 CE', tracks: ['roman-egypt', 'early-islam'],
  descr: 'Amr ibn al-As invades in December 639 with some 4,000 men. The Rashidun army wins at Heliopolis on 6 July 640, takes the Babylon Fortress after a siege from September 640 to 6 April 641, and besieges Alexandria from March 641; by September 642 the caliphate has annexed Egypt, Cyrenaica and Tripolitania.',
  sources: [S('wp-arab-egypt', 'infobox'), S('wp-heliopolis-640', 'infobox and body'), S('wp-babylon-fortress', 'infobox'), S('wp-alexandria-641', 'infobox and body')],
  links: [{ to: 'yarmuk', kind: 'related' }],
});

ed.save();
