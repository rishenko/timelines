# The Classical World: sources and judgment calls

The second ancient timeline, c. 500 BCE – 650 CE (id `classical`). Same rules as Ancient Civilizations
(`docs/ancient-sources.md`): every date is quoted verbatim from a Wikipedia page read by a fetch agent; values seen only in
a page summary are not used; pages carrying an AI-generated-text warning, or a banner citing the LLM translation
guideline, are not used; descriptions use only what the pages say. "Years ago" and BP convert by subtracting 1950.

## Skeleton (18 November 2026)

`scripts/classical/skeleton.ts` writes the timeline's settings (`meta.range` 500 BCE – 650 CE keeps the ruler to that
period; `meta.continues` links back to the ancient timeline at 500 BCE and sets the ancient timeline's forward link at
330 BCE), seven groups and 26 regions, and copies the 47 ancient events that start in 500–330 BCE onto matching regions,
with their sources, claims, importance and internal links.

## First pass: the Mediterranean and the Near East (18 November 2026)

`scripts/classical/mediterranean-near-east.ts`: 47 events, 41 sources, 18 rows. Three web-fetch agents read 43 pages.

- **Not used:** *Battle of Edessa* (its banner cites the LLM translation guideline); the date of Shapur I's victory comes
  from *Palmyrene Empire* ("at the Battle of Edessa in 260") and the *Sasanian Empire* infobox. Valerian's capture is
  not mentioned, since it was read only in summary.
- **The Hellenistic world:** Alexander's death (323), the Wars of the Diadochi (322–272), Ipsus (301), Seleucus at Babylon
  (312), Ptolemy I as pharaoh (305; some scholars 304), the Library of Alexandria (probably under Ptolemy II, 285–246;
  the Letter of Aristeas's Ptolemy I as a claim), the Greco-Bactrian Kingdom (c. 256; 250 and the high/low chronologies
  255/246 as claims), Archimedes (212), the Rosetta Stone (27 March 196 BC), Pydna (168), Pergamon's bequest (133).
- **Rome:** the three Punic Wars (264–241, 218–201, the destruction of Carthage 146), Caesar's assassination (44), Actium
  (31) and Cleopatra's death (30), Augustus (27 BC), the greatest extent (117), the Crisis of the Third Century (235–284;
  285 as a claim), the Tetrarchy (293–324), the Edict of Milan (313), Constantinople (330), Adrianople (378), Theodosius
  I's death (395), the sack of Rome (410), the fall of the West (476), Justinian (527–565), Hagia Sophia (532–537), the
  Plague of Justinian (541–549).
- **The Near East:** Parthia (247 BC – 224 AD), Carrhae (53 BC), the Maccabean Revolt (167–160 BCE), Herod (37–4 BCE per
  Schürer; Steinmann's 36–1 as claims), the crucifixion (AD 30 or 33, both as claims), the destruction of Jerusalem
  (70), Bar Kokhba (132–136), the Nabataean annexation (106), the Sasanians (224–651), Edessa (260), Zenobia's
  Palmyrene Empire (270–273; 260 as a kingdom), Armenia's conversion (traditional 301; 314 as a claim), Aksum's conquest
  of Himyar (c. 530), the war of 602–628, the Hijrah (622), Yarmuk and al-Qadisiyyah (636), the fall of the Sasanians
  (651).
- **Rows:** Antigonid Macedon and Pergamon (Greece region); Roman Republic, Roman Empire and the Eastern Roman Empire
  (Rome region; the Eastern Empire's span runs to 1453, cut off by `meta.range`); Carthage; Ptolemaic and Roman Egypt
  (to the Muslim conquest, 641); the Seleucids, Greco-Bactria, Parthia and the Sasanians (Iran and Mesopotamia);
  Judea and Palmyra; the Nabataeans, Himyar and Early Islam (Arabia); Armenia.
- **Judgment calls:** Greco-Bactria sits under Iran and Mesopotamia (it broke away from the Seleucids); the Nabataean
  start is c. 250 BCE ("mid-3rd century BC"), with the 3rd- and 4th-century readings as claims; Himyar ends in 575 or
  578 (both as claims).
- **Key events:** see `docs/classical-key-events.md` (`data-src/classical-importance.json`); the overlap events keep their
  ancient levels.

## Second pass: South Asia (18 November 2026)

`scripts/classical/south-asia.ts`: 25 events, 23 sources, 12 rows. Three web-fetch agents read 25 pages; none carried an
AI-text or LLM-translation banner (*Anuradhapura kingdom* is marked "factual accuracy is disputed"). Most pages were
read verbatim only for their first ~40,000 characters; dates seen only in the summary of the rest are not used.

- **The Maurya Empire:** founded c. 321 BCE (c. 320 in the navbox; the conquest of Magadha c. 322–319, or c. 311–305 in
  an alternative chronology, as claims), the Seleucid–Mauryan war (305–303), Ashoka (c. 268–232; 269 and the
  "273/268" of the dynasty table as claims), the Kalinga War (c. 261; 260 and 265 as claims), and Pushyamitra Shunga's
  coup (185; 187 and 184 as claims). The Shunga end is 73 BCE (75 as a claim).
- **The north-west:** Demetrius I and the Indo-Greek Kingdom (c. 200 BCE – c. 10 CE), Menander I (165/155–130 BC, both
  starts as claims), Maues (c. 85–60 BCE), the Indo-Scythians (c. 150 BCE – 400 CE), Kujula Kadphises and the Kushans
  (c. 30 – c. 375 CE), the battle with Ban Chao near Khotan (90), Kanishka (c. 127–150; 151 and the earlier scholars'
  78 CE as claims), the Alchon Huns (370–670).
- **The Guptas:** established c. 240, Chandragupta I crowned 26 February 320, Samudragupta (c. 335–375; c. 319–320 and
  c. 350 as claims), Chandragupta II (c. 375 or 380 – c. 415), the last Western Satrap defeated (395), Nalanda (c. 427),
  the Gupta–Hunnic Wars (c. 460–500), Aryabhata (476–550), the end c. 579 (575 and 550 as claims).
- **After the Guptas and the south:** Harsha (606–647) and Wang Xuance (648); the Satavahanas (late 2nd century BCE –
  c. 224 CE; "as early as the 3rd century BCE" as a claim) and the Naneghat inscription (70–60 BCE); the Pallavas
  (275–897) and their rise under Mahendravarman I and Narasimhavarman I (600–668); the Sangam period in Tamilakam
  (c. 300 BCE – 300 CE; Zvelebil's 100 BCE – 250 CE as claims); the Anuradhapura kingdom (437 BCE – 1017 CE; 377 as
  capital as a claim), Buddhism in Sri Lanka (267 BCE), Kashyapa I at Sigiriya (473–491); the Ajanta Caves' second
  phase (460–480 per later scholarship; 400–650 in older accounts).
- **Judgment calls:** the Satavahana start "late 2nd century BCE" is stored as 133–100 BCE; the Ajanta event sits on
  the South Asia region row (no Vakataka row yet); Harsha's dynasty table reads "606–647 BCE", an obvious slip on the
  page, so the CE dates of the lead and infobox are used. An invasion led by Harsha repelled on the Narmada (618–619)
  is in Harsha's description without naming the victor, who appears only in the page summary.
- **Not used (summary only):** the Kushan reign list, Satavahana kings after Satakarni I, Gautamiputra Satakarni's
  dates, Mahinda's mission (247 BCE), the Alchon battles of 510–528, Toramana and Mihirakula, Xuanzang's visit to
  Nalanda, the Bhanugupta and Eran inscriptions.

## Third pass: China, Korea and Japan (18 November 2026)

`scripts/classical/east-asia.ts`: 33 events, 27 sources, 16 rows. Three web-fetch agents read 29 pages.

- **Not used:** *Xin dynasty* (its banner cites the LLM translation guideline; the Xin years 9–23 come from the *Han
  dynasty* infobox, so Wang Mang is not named) and *Northern and Southern dynasties* (a notice says it may have been
  generated by a computer; the Southern dynasties have no row yet).
- **China:** the Qin unification (221 BC; the Qin end 206, 207 in the navbox, as a claim), Qin Shi Huang's death and the
  Terracotta Army (210–209), the Han (202 BC – 220 AD, with the Xin interruption 9–23), Emperor Wu (141–87), Zhang Qian
  (139), the Shiji (probably around 94 BC, before 91 as a claim), Cai Lun's paper (105), the Yellow Turbans (184–205),
  Red Cliffs (winter 208–209), the Three Kingdoms (220–280; other starts named in the description), the War of the
  Eight Princes (291–306), the Jin move south (311–317), the Eastern Jin victory over the Former Qin (383), the Sixteen
  Kingdoms (304–439), the Northern Wei (386–535) and its unification of the north (439), the Sui (581–618) and its
  reunification (589), the Grand Canal (609), the Tang (18 June 618) and the Xuanwu Gate Incident (2 July 626).
- **Korea:** Wiman (194 BCE), the Han conquest of Gojoseon (109–108) and the commanderies (Lelang 108 BCE – 313 CE),
  Goguryeo (c. 37 BCE – 668), Baekje (18 BCE – 660), Silla (57 BCE – 935), Buddhism in Goguryeo (372), Baekje (384) and
  Silla (527–528), Gwanggaeto (391–413), the loss of the Seoul region (475), the wars with Sui (598–614) and Tang
  (645–668).
- **Japan:** Yayoi (c. 300 BC – AD 300; the "highly controversial" 1000–800 BC as a claim), Kofun (c. 300–538; 258 as a
  claim), the Yamato kingship (c. 250), Buddhism from Baekje (538, per the Nihon Shoki), Asuka (538–710), the
  Seventeen-article constitution (604, per the Nihon Shoki), the Isshi incident and Taika Reform (645; 646 as a claim).
- **Judgment calls:** Gojoseon's row has no span (its founding date, 2333 BCE, is called mythological); Buddhism in
  Japan uses the Kofun page's 538 (the Asuka page's 552 and 592 were read only in summary). Himiko and Yamatai were
  read only in summary and are not included.

## Fourth pass: the Steppe (18 November 2026)

`scripts/classical/steppe.ts`: 22 events, 18 sources, 11 rows. Three web-fetch agents (on Sonnet) read 19 pages; none
carried an AI-text or LLM-translation banner. *Alans* was read verbatim only in its first line, so it is not cited.

- **The eastern steppe:** the Xiongnu (3rd century BC – 2nd century AD; the lead's "late 1st century AD" as a claim),
  Modu Chanyu (209–174 BCE), Baideng (200 BC) and the heqin of 198 BC, the Yuezhi defeat (c. 176 BCE; the Wusun page's
  162 as a claim) and settlement in Bactria (132–130 BCE; 133–132 as a claim), the Han–Xiongnu wars (133 BC – 89 AD),
  the split (48 AD), the defeat of the Northern Xiongnu (89–91), the Xianbei (from c. 208 BC) and Tanshihuai
  (c. 156–181).
- **Turks and Rouran:** the Rouran (330–555; 550 as a claim), Bumin's victory (552), embassies with Byzantium (568–569),
  the split (581–603), the Eastern (581–645; 603 and 630 as claims) and Western (581–657; 603 as a claim) khaganates,
  the Tang conquest of the Eastern Turks (630).
- **Central Asia:** the Kidarites (320–467) and their kingdom in Bactria (360–370), the Hephthalites (440s–560; 450 as a
  claim) and their destruction by the Turks and Sasanians (557–560).
- **The west:** the Sarmatians (5th century BCE – 4th century CE) and the Alans in the Caucasus (50–60 CE), the Huns
  (370s–469) on the Volga (by 370), Attila (434–453; 435 and the Huns infobox's 437 as claims), the Catalaunian Plains
  (20 June 451), Nedao (c. 454), the Avar Khaganate (567–822) and the Avar–Byzantine wars (568–626).
- **Judgment calls:** the Yuezhi and Wusun have no rows (their events sit on the Steppe region row); the Sarmatians
  and Alans share a row; the Hephthalites' destruction uses the First Turkic page's 557 and the Hephthalite lead's 560
  (the Western Turkic page's Qarshi, 565, is not used). Not used (summary only): Attila's 447 and 452 campaigns in
  detail, the Rouran founding by Shelun c. 402, Peroz I and the Hephthalites, the Avar khagan list.

## Fifth pass: Africa (18 November 2026)

`scripts/classical/africa.ts`: 36 events, 30 sources (two reused from the skeleton), 12 rows. Three web-fetch agents
(on Sonnet) read 30 pages; none carried an AI-text or LLM-translation banner. *Migration to Abyssinia* invites
editors to translate from the Arabic article but does not say its text is machine-translated. *Meroitic–Roman War*
returned a 404, so the war is cited from *Meroë* and *Napata*. Most long pages were read verbatim only in their first
~40,000 characters; the rest came back as summaries and is not used.

- **North Africa:** Mauretania (from c. 225 BCE; client kingdom under Juba II 25 BC – AD 23, 24 as a claim; annexed
  40–44 AD), Numidia (202–46 BCE; the Numidia infobox's 25 BC as a claim), Masinissa (202–148 BCE; 149 as a claim),
  his war with Carthage (152–150 BCE), the Jugurthine War (111–105 BC; 106 as a claim), the Garamantes (6th century
  BCE – late 7th century CE), Balbus (19 BC), Septimius Severus at Garama (202 AD), the Vandals' crossing (429–435),
  Carthage (439), the sack of Rome (455) and Belisarius (534).
- **Kush and Nubia:** Kush (c. 780 BC – c. 350 AD; the 330 capture of Meroë as a claim), the Meroitic period (c. 270
  BC; Meroë's c. 280 as a claim), the Meroitic script (3rd century BC; Rilly's first half of it), the war with Rome
  and the treaty with Amanirenas (23–22 BC), Nero's expedition (61 AD), the fall of Meroë (330–350), Nobatia (c. 400
  – c. 631) and Silko (c. 450, with the last Meroitic inscription, AD 410/450), Dongola (c. 500; "late 5th century" as
  a claim), Philae (535–538), the conversions (543–580), Makuria's annexation of Nobatia ("during the 620s, but before
  642"), Makuria (5th century – late 15th) and Alodia (6th century – c. 1500), the Arab invasions and the Baqt
  (641/642–652).
- **Aksum and the Horn:** Dʿmt (8th – 4th century BC), Aksum (1st century – 960; the Dʿmt page's c. 150 BC as a
  claim), the Periplus (AD 40–70; Schoff and Agius's c. 60 as a claim), the first coins (c. 270; the Aksum lead's
  Endybis 270–310 and the 227–235 captions as claims), Ezana (320s – c. 360; c. 321 as a claim), the conversion (325
  or 328; Frumentius's consecration 328, or 340–346), the stelae (4th century), Kaleb (514–534; 542 as a claim) and
  Yemen (around 520), the Aksumite–Persian wars (570–578), the migration to Abyssinia (613 or 615).
- **South of the Sahara:** Djenné-Djenno (250 BCE – 1400 CE; growth by 400 CE), Nok (c. 1500 BC – c. 1 BC; row
  only), Eastern Bantu iron-working (1st century BC – 300 AD) and the expansion's arrival in South Africa (300–500
  AD).
- **Egypt:** the Arab conquest (December 639 – September 642; Heliopolis 6 July 640, the Babylon Fortress September
  640 – 6 April 641, Alexandria from March 641).
- **Judgment calls:** Nobatia ends where Makuria's page dates the annexation, not at the Nobatia page's "by 707";
  Napata's 593 BC sack and the 591 BC capital move are before the period and left out; Kaleb's Yemen campaign is a
  separate event from the existing *Aksum conquers Himyar* (c. 530, from the Himyar page), which now also sits on the
  Aksum row; the skeleton's *Bantu speakers reach Lake Victoria and Angola* covers c. 500 BCE, so no second event;
  *Herodotus describes the Garamantes* moved from the region row to the Garamantes row. Not used (summary only): the
  Battle of Thapsus, the Persian occupation of Egypt (618–629), Babylon's treaty dates, Alexandria's surrender (642),
  the Nok pottery phases, Aksum's c. 150 BCE – 150 CE origins.

## Sixth pass: Europe north of the Alps (18 November 2026)

`scripts/classical/europe.ts`: 38 events, 30 sources, 11 rows (10 under Europe, plus the Galatians under Anatolia).
Three web-fetch agents (on Sonnet) read 30 pages; none carried an AI-text or LLM-translation banner. *Battle of
Alesia* and *Trajan's Dacian Wars* carry the standard invitation to translate from another Wikipedia, which is not a
notice about their own text. Most pages were read verbatim only in their first ~40,000 characters.

- **Celts and Gaul:** La Tène (c. 450 BC – c. 1 BC), Brennus in Greece (281–279 BC; Delphi sacked per *La Tène*,
  turned back per *Galatians*), the Galatians (c. 278 BC – 25 BC; 278–277 as a claim) and Manlius Vulso (189 BC),
  Transalpine Gaul (121 BC), the Cimbrian War (113–101 BC), the Gallic Wars (58–50 BC) and Alesia (September 52 BC).
- **Hispania:** the Numantine War (154–133 BC; the infobox's 143 as a claim), the Suebi (409–585) in Gallaecia (409),
  the Visigoths (418–721; 720 as a claim) in Aquitaine (418), their annexation of the Suebi (585), Catholicism (589)
  and the end of Byzantine Spania (624).
- **Britain:** Claudius (43 AD), Boudica (AD 60 or 61), Mons Graupius (mid-84; the Boudica campaignbox's 83 as a
  claim), Hadrian's Wall (122), the end of Roman rule (c. 410; 411 as a claim), the Chronica Gallica's 441, the
  Anglo-Saxon period (from c. 449, per the Roman Britain table) and the Gregorian mission (597).
- **Rome and the Germanic peoples:** Teutoburg (8–11 September 9 AD), the Dacian Wars (101–106), the Marcomannic Wars
  (166–180), the Salian Franks in Toxandria (358), Alaric (395–410), the Rhine crossing (31 December 406; 405 as a
  claim), the Burgundians (411–534; destroyed c. 436, resettled 443).
- **Italy:** Theodoric's conquest (488–493) and reign (493–526), the Gothic War (535–554; the Ostrogothic infobox's 553
  as a claim), the Lombards (from spring 568).
- **Franks and Slavs:** Clovis (481–511), his baptism (between 498 and 506), Vouillé (spring 507), Burgundy (532–534),
  Clotaire II (613); Jordanes (551) and the Slavic expansion (sixth–seventh centuries).
- **Judgment calls:** the Visigoths' row starts with the kingdom (418), so Alaric sits on the Europe region row; the
  Teutoburg, Dacian and Marcomannic wars and the Rhine crossing also sit there, as there is no Germanic or Dacian row;
  the Galatians row is under Anatolia, next to Pergamon's region; the Odoacer–Theodoric treaty is "February 493" (the
  pages give 2 and 25 February). Not used (summary only): Germanicus and Arminius's death, the Marcomannic details
  after 166, Vercingetorix's execution, Aquae Sextiae and Vercellae, Abritus, the Gothic Danube crossing year,
  Reccared's council, the Lombard kings after Alboin, Hengist and Horsa, Badon.

## Seventh pass: the Americas (18 November 2026)

`scripts/classical/americas.ts`: 28 events, 29 sources (four reused from the skeleton), 21 rows. Three web-fetch
agents (on Sonnet) read 29 pages; none carried an AI-text or LLM-translation banner. *El Mirador* and *Wari culture*
carry the standard invitation to translate from the Spanish article, which is not a notice about their own text. Most
long pages were read verbatim only in their first ~40,000 characters.

- **Highlands and Gulf:** the Olmec heartland abandoned (400–350 BC), Cholula's Great Pyramid (300 BCE), the earliest
  Long Counts (Chiapa de Corzo, 6 December 36 BCE; Tres Zapotes, 1 September 32 BCE), La Mojarra (156 CE), the
  Epi-Olmec (c. 300 BCE – c. 250 CE), Monte Albán (c. 500 BCE – c. AD 900–1000; the Zapotec infobox's 700 as a claim)
  and its capital phase (c. 100 BCE – AD 200), Teotihuacan (c. 100 BCE – 750 CE; burned c. 550 as a claim), the
  Pyramid of the Sun (100 CE and 200 AD as claims), the Feathered Serpent temple (c. 300), the city's height
  (350–650), Cuicuilco and Xitle (245–315 CE; the page's 400 CE and AD 150–200 as claims).
- **The Maya:** El Mirador (6th century BC – c. 150 AD; 250 AD as a claim) and its height (300 BC – the Common Era),
  the Preclassic collapse (c. 150), Tikal (4th century BC – c. 900) and Stela 29 (292), Calakmul (400–250 BC – 10th
  century), Siyaj K'ak' (January 378; 378–379), Copán (426 – early 10th century; the infobox's 9th century as a
  claim), Palenque (c. 226 BC – c. 799) and its founder (431), Calakmul's defeat of Tikal (562), the sacks of Palenque
  (599, 611) and Pakal (615–683).
- **The Andes:** Chavín (900–250 BCE) and its New Temple (c. 500–200 BCE), Paracas (800–100 BCE) and the mummy
  bundles (300–200 BCE), the Nazca Lines (500 BC – 500 AD; the Nazca phase 200 BC – 500 AD), Nazca (100 BCE – 800 CE;
  the Nazca Lines page's 200 BC and the Decline section's 750 as claims) and its decline (500–750), Moche (100–800),
  the Huaca del Sol (by 450), Pampa Grande (600–700), Recuay (200 BCE – 600 CE), Lima (c. 100 – c. 650), Tiwanaku
  (c. AD 110, 50–170 – c. 1050; 1000 as a claim) and its rise (375–700), Wari (5th–10th century) and its expansion
  (c. 600; 650 on the Nazca and Lima pages as claims).
- **North America:** Adena (c. 500 BC – c. 100 AD), Hopewell (100 BCE – 500 CE; row only), Hohokam (300–1500 CE) and
  its farming villages (c. 300–600), Dorset (500 BCE – 1500 CE; "perhaps as early as 1000" as a claim).
- **Judgment calls:** the skeleton's Dorset, Adena and Monte Albán events moved onto the new rows; the Siyaj K'ak'
  conquest uses "January 378" (no page read verbatim gave the day); Copán's founding is 426 (427 was summary only);
  El Mirador's row ends with the Preclassic abandonment, not the Late Classic reoccupation; Cuicuilco's 1st-century-BC
  eruption claim is not used, as the same section calls it a series of eruptions. Not used (summary only): the
  Calakmul and Tikal kings after 562 (Dos Pilas, Yuknoom Che'en II), Tikal's Teotihuacan embassies, the Sipán tombs,
  the 6th-century super El Niño, Hopewell's local variants.

## Eighth pass: Southeast Asia and Tibet (18 November 2026)

`scripts/classical/se-asia-tibet.ts`: 21 events, 24 sources (one reused), 12 rows. Three web-fetch agents (on Sonnet)
read 28 pages; none carried an AI-text or LLM-translation banner. Most were read verbatim only in their first ~40,000
characters; *Funan* and *Chenla* came back as infoboxes plus summaries, so their rulers (Fan Shiman, Bhavavarman I,
Isanavarman I's reign) and the Kang Tai and Zhu Ying mission are not used.

- **Vietnam:** Đông Sơn (c. 1000 BC – first century AD; "1 BC" as a claim), Âu Lạc (257–179 BCE; the infobox's
  208 BCE as a claim), Nanyue (204–111 BC) and its conquest of Âu Lạc (179 BC; 180 BC on the Trưng sisters page as a
  claim), the Han conquest (112–111 BC), the Trưng sisters (March 40 – 43 AD), Lady Triệu (248), Vạn Xuân (544; revolt
  543, or 541 in the infobox) and its end under the Sui (602).
- **Champa, Funan, Chenla, the Pyu:** Lâm Ấp (192), Funan (50–627; the navbox's 68 as a claim) and the Roman finds at
  Óc Eo (diplomacy in 166), Chenla (550–802) and its takeover of Funan (550–627, labelled differently on the two
  pages), Isanapura (c. 618), the Pyu (c. 2nd century BCE – c. 1050), Beikthano (c. 180 BCE), the Burmese calendar
  (22 March 638; the Sri Ksetra infobox's 640 as a claim).
- **Tibet:** Zhangzhung (c. 500 BC – 645; the infobox's 625 as a claim), the Yarlung kings (127 BCE in traditional
  historiography; the skeleton's History of Tibet 414 BCE as a claim) to 842/848, Namri Songtsen (c. 600–618; 629 as a
  claim), Songtsen Gampo (618 or 629 – 650; the Yarlung page's 614 as a claim), the Tuyuhun (284–670; 663 as a claim)
  and Tang's campaigns against them (634–636), Princess Wencheng (641), the Jokhang (c. 640; 652 as a claim) and the
  conquest of Zhangzhung (645; 625 and 634 as claims).
- **Judgment calls:** northern Vietnam under Chinese rule is a row without a span (it holds the Han conquest, the
  Trưng sisters, Lady Triệu and Lâm Ấp's origin); the skeleton's Nyatri Tsenpo event moved onto the Yarlung row;
  Dvaravati and Langkasuka are left out (their in-period dates come only from navboxes or begin after 650). Not used
  (summary only): Champa's kings and the Sui sack of 605, Bhrikuti's marriage date (the page gives both "before 624"
  and 632), Songtsen Gampo's Songzhou fight as 635–636.

## Ninth pass: China's Northern and Southern dynasties (18 November 2026)

`scripts/classical/china-north-south.ts`: 24 events, 23 sources, 8 rows (four southern dynasties after the Jin, four
northern ones after the Northern Wei). *Northern and Southern dynasties* carries a machine-translation notice, so each
dynasty's own page is used. Three web-fetch agents (on Sonnet) read 24 pages; none carried an AI-text or
LLM-translation banner. *Western Liang (Southern dynasties)* and *Six Garrisons rebellion* returned 404s; the Western
Liang is cited from *Liang dynasty*, and the Six Garrisons from *Yuwen Tai*.

- **The south:** Liu Song (10 July 420 – 31 May 479; Liu Yu's rise from 404), the Reign of Yuanjia (425–453), Zu
  Chongzhi's calendar and π (464–465), Southern Qi (3 June 479 – 24 April 502), Emperor Wu of Liang (30 April 502 –
  12 June 549), the Hou Jing Disturbance (548–552; Jiankang falls 24 April 549), Jiangling (7 January 555; the Chen
  page's 554 as a claim), Chen (16 November 557 – 10 February 589).
- **The north:** Xiaowen's reforms (485–496; Luoyang 493–494), Yungang's imperial phase (471–494), Longmen (493; the
  Guyangdong carving of 478 as a claim), the Six Garrisons (524), the split (8 November 534 – 18 February 535),
  Shayuan (537), Eastern Wei (534–550), Western Wei (535–557; 534 as a claim), Northern Qi (9 June 550 – 577), Northern
  Zhou (15 February 557 – 4 March 581) and its conquest of Qi (577), Yang Jian's seizure of power (580–581).
- **Culture:** Wang Xizhi's Orchid Pavilion (22 April 353), the first Mogao caves (366; the Shazhou Tujing's 353 as a
  claim), Faxian (399–412), Kumārajīva in Chang'an (401–413), Tao Yuanming's retirement (405), Xuanzang (629–645; 627
  as a claim).
- **Judgment calls:** the southern rows sit after the Jin row and the northern ones after the Northern Wei, rather
  than in strict date order; the existing *Sui reunites China* now also sits on the Chen row; Shayuan's outcome is not
  stated (no page read verbatim gave it). Not used (summary only): the later Chen reigns and Wu Mingche's campaigns,
  the Northern Qi Great Wall work, Hou Jing's November 551 proclamation, Kumārajīva's titles.

## Tenth pass: Island Southeast Asia and Oceania (18 November 2026)

`scripts/classical/island-sea-oceania.ts`: 17 events, 21 new sources, 14 rows (seven under Island Southeast Asia, six
under Oceania, and the Sa Huỳnh culture under Southeast Asia). Three web-fetch agents (on Sonnet) read 26 pages. None
carried an AI-text or LLM-translation banner; *Polynesians* asks for help translating from the Russian article, which
is treated as in the ancient Pacific pass (acceptable). *Kutai Martadipura*, *Mulawarman inscription* and *Maritime
Jade Road* returned 404s, so Kutai is cited from *Kutai* and the jade road from *Lingling-o*. *Pan Pan* is a
disambiguation page. Australia was added afterwards at the author's request (two more agents, 16 pages; see below).

- **Island Southeast Asia:** the Bujang Valley (Sungai Batu monument 110 AD; "5th to 14th century" as a claim), the
  Buni culture (c. 400 BC – 100 AD; "probably survived until 500 AD" as a claim; the skeleton's Buni event moved onto
  the row), Tarumanagara (ca. 358 – 669) with Faxian on Java (December 412 – May 413) and Purnawarman's inscriptions
  (5th century, incl. Ciaruteun), Kutai (399; the sidebar's 350 as a claim) and its yūpa inscriptions (last half of the
  4th century), Kalingga (6th–7th century), the Sa Huỳnh–Kalanay sphere (500 BC – AD 1500; Kalanay's 400 BC as a
  claim; the skeleton's Kalanay event moved onto the row), the earliest lingling-o (c. 500 BC), metal in Taiwan
  (around the beginning of the Common Era; local wrought iron by c. AD 400). Sa Huỳnh culture (c. 1000 BC – c. 200).
- **Oceania:** the long pause (Fiji, Samoa and Tonga by c. 900 BC; resumed c. 700 AD), the Melanesian influx into
  Fiji (about the beginning of the Common Era), Polynesian Plain Ware (700 BC – 400 AD; the Lapita page's "about 2,000
  years ago" for Tonga as a claim), Samoa's unrecorded centuries (750 BC – 1000 AD), Tonga's Formative Dark Age
  (400–1200), early and superseded East Polynesian dates (Marquesas before 100 AD, Rapa Nui 300–400 CE, Hawaii c. 300,
  set against the recent 940–1290 dates), people on Pohnpei (AD 80–200; earliest settlement probably AD 1).
- **Judgment calls:** the East Polynesian dates are one event that says outright they are superseded, so readers see
  the debate rather than a settlement date; Kalingga's row has no events in the period (Huining 664 and Queen Shima 674
  fall after it). Not used: Tarumanagara's embassies to China (the Sui and Tang annal lines are tagged "unreliable
  source"), its later kings and Srivijaya's c. 686 conquest (summary only), Srivijaya itself (c. 671, after the period),
  Tabon's jar burials (given only as "years ago"), the Lapita summary's "about 1 CE" for Samoa (summary only and in
  conflict with the page's "2,800 years ago").
- **Australia and the Torres Strait** (added the same day): no page read gives a dated event inside the period, only
  round "years ago" figures. Each is a claim counted back from 1950 with a ±100-year margin: the Torres Strait maritime
  culture ("By 2,500 years ago", *Prehistory of Australia*), dingoes in the Torres Strait (2,100 YBP; Nullarbor 2,200
  YBP, *Dingo*), spear barbs peaking and giving way to fish hooks, bone points, axes and adzes ("about 2,000 years ago",
  *Fire-stick farming*), and most of Ubirr's paintings ("about 2000 years ago", *Ubirr*). *Prehistory of Australia*
  carries a disputed-neutrality banner, used anyway (no AI notice). No in-period dates on *Budj Bim heritage areas*,
  *Brewarrina Aboriginal Fish Traps*, *Mount William stone axe quarry*, *Wurdi Youang*, *Burrup Peninsula* (Murujuga),
  *Gwion Gwion rock paintings*, *Sydney rock engravings*, *Aboriginal Australians*, *Torres Strait Islanders*, *Torres
  Strait Islands* or *Makassan contact with Australia*. Not used: Palawa shell necklaces ("at least 2,600 years",
  before the period, and a minimum), shell fish hooks at about 1,200 years ago (after it; mentioned in a description).

## Follow-up: values first read only in summary (18 November 2026)

`scripts/classical/summary-only.ts` (run after the region passes, before `collapsed.ts`): 31 events, 32 sources, plus
Valerian's capture in the Edessa event and the *Kingdom of Aksum* sidebar's "c. 150 BC" as a claim on Aksum's start.
The region passes had read long overview pages that the fetch tool cut off after about 40,000 characters; this pass
had five Sonnet fetch agents read the short dedicated articles instead (Toramana, Battle of the Utus, Dos Pilas, …).
No page carried an AI-text or LLM-translation banner; several carry citation banners (*Emperor Xuan of Chen*,
*Hou Jing*, *Battle of Thapsus*, *Yuknoom Chʼeen II*, *Bayan I*, *Vima Kadphises*; *Battle of Vercellae* relies on
primary sources).

- **Now in:** Gautamiputra Satakarni's defeat of Nahapana (claims 78 and 124 CE; the page gives three scholars'
  dates), Toramana (493–515), Bhanugupta's Eran inscription (510), Mihirakula (515–542; a table says 540), Sondani
  (528; the *Mihirakula* lead's 525–532 as a claim), Vima Kadphises (113–127; the page also has 90–100 and 100–127),
  Vasudeva I (191–232); Shelun takes the title khagan (402), Peroz I's Hephthalite wars (474–484), the Utus (447),
  Attila in Italy (452); Thapsus (6 April 46 BC, pre-Julian), the Persian conquest of Egypt (618–621, troops leave in
  629); Aquae Sextiae (102 BC), Vercellae (30 July 101 BC), Vercingetorix's execution (46 BC), Germanicus in Germania
  (14–16, with Arminius's murder in 21), Abritus (251), the Goths on the Danube (summer 376), Hengist and Horsa (449,
  the *Anglo-Saxon Chronicle*; 447, the *History of the Britons*), Badon (infobox c. 500–504; 482, 493, 501 and 516 as
  claims), the Rule of the Dukes (574/5–584/5); Dos Pilas founded by Tikal (629) and defecting to Calakmul (648; the
  *Yuknoom Chʼeen II* page says 650), Yuknoom Chʼeen II (636–686); Bhadravarman I of Champa (380–413), Bhrikuti's
  marriage (c. 621, before 624, or 632; her historicity is uncertain); Wu Mingche's 573 campaign and his capture on
  20 March 578; Himiko (c. 180/190 – 247/248; embassy 238, or 239 in the *Nihon Shoki*), Suiko and Shōtoku (593).
- **Judgment calls:** descriptions were audited against the agents' verbatim quotes the same day and 15 phrases the quotes did not support were removed (e.g. "Yashodharman of Malwa", "Toramana's successor", Cato's suicide "at Utica", Emperor Sushun by name); "before 624" is stored as 623; Himiko's start is c. 185 between the two pages' 180 and 190.
  Already covered, so not added: the siege of Alexandria (in *The Arab conquest of Egypt*) and Hou Jing's
  proclamation (in *The Hou Jing Disturbance*). Bayan I's attack on Thrace (582) is in a section with no sources, so
  it is not used.
- **Still summary only:** the Nok pottery phases, Aksum's "between 150 BCE and 150 CE", the 642 surrender of
  Alexandria and the Babylon treaty, the 382 Gothic treaty, Vercingetorix's August/September execution, Idistaviso
  as AD 16, the Moche super El Niño (563–594), Champa's kings and the Sui sack of 605, the Northern Qi Great Wall
  (552–563) and Hou Jing’s November 551 proclamation.
- **Not found:** Mahinda's mission year (*Mahinda (Buddhist monk)* gives none), the Sipán burial date (*Lord of
  Sipán* dates only the platform, before 300 AD), the year the Avars took Sirmium (*Bayan I*). *Battle of Songzhou*
  404'd. Not tried: Kumārajīva's titles and Hopewell's local variants (not dated events), Srivijaya (after the
  period), Tabon and Samoa ("years ago" figures).

## Overlap sync (2026-11-18)

The skeleton copies every ancient event that starts in 500 BCE or later. The first replay of all the Classical
scripts (`npm run data -- run-all classical`) showed the stored data had fallen behind the ancient timeline in two
ways, and brought it up to date:

- **Two events** the ancient peoples pass added after the skeleton was first run: *Zhongshan, a non-Zhou state in
  the north* (414–296 BCE) and *Qin defeats the last hostile Rong tribe* (314 BCE), with their sources (*Zhongshan
  (state)*, *Beidi*, *Xirong*). Both sit on the China row. *Beidi* carries a needs-citations banner, which the ancient
  data already notes; it is not an AI-text banner.
- **Four descriptions** reworded by the ancient description audit (checked against the pages there): Salamis,
  Thermopylae, the Pazyryk burials and the Mausoleum. The Classical audit had covered only the summary-only events,
  so these still had the earlier wording.

From now on, overlap events are fixed in the ancient data and copied again by a replay; `apply-text-fixes.ts` warns
when an event has no defining script.

## Periods as phases (18 November 2026)

`scripts/classical/phases.ts` (after `summary-only.ts`, before `collapsed.ts`; rules in `scripts/lib/phases.ts`), following
the Ancient timeline. Rows for successive periods of one state, or successive dynasties of one half of China, became
phases on one row; separate powers stay rows (Qin, the Three Kingdoms, the Sixteen Kingdoms, Sui, Tang; Seleucid,
Parthian, Sasanian; Maurya, Shunga, Gupta; the Eastern Roman Empire, which outlives the period).

- **Converted, dates unchanged:** **Southern dynasties** (Liu Song, Southern Qi, Liang, Chen); **Northern dynasties**
  (Northern Wei, Eastern and Western Wei, Northern Qi, Northern Zhou; the rivals' names stack); **Rome (Republic, then
  Empire)**; **Ptolemaic and Roman Egypt** (Ptolemaic; Roman and Byzantine).
- **New phases inside a row** (pages read 2026-11-18; no banners on either):
  - Han (`wp-han`): Western Han 202 BCE – 9 CE (History heading "Western Han (202 BC – 9 AD)"); Xin 9–23 CE (infobox
    "9–23 AD: Xin"); Eastern Han 25–220 CE (History heading "Eastern Han (25–220 AD)"). Xin is cited from the Han page
    because the *Xin dynasty* page carries a translation banner pointing to an LLM-translation guideline. The 23–25
    gap (the Gengshi Emperor) was read only in summary, so it stays blank.
  - Jin (`wp-jin`): Western Jin 266–316, Eastern Jin 317–420 (lead and History headings). The lead also says Emperor
    Min was executed in 318, "ending the Western Jin era"; the stated 316 was kept.
- **Not split:** no page read states when Roman Egypt became "Byzantine" (the *Roman Egypt* page, which *Byzantine
  Egypt* redirects to, gives the 381 Diocese and Diocletian's reforms, not a Byzantine start), so Egypt has no
  Byzantine phase. The page's own end dates also disagree (641 navbox, 642 lead, 646 infobox); the row keeps 641.

## Description audit (18 November 2026)

Every event title and description outside the 500–330 BCE overlap was checked against the Wikipedia pages it cites
(321 of 371 events; the 50 overlap events, copied from Ancient by `skeleton.ts`, were audited there). `npm run
audit:batches -- data-src/classical.json <dir> --pages 10 --only <ids>` grouped them into 29 batches of up to 10 pages;
one agent (on Sonnet) per batch read the pages and flagged added or changed claims, quoting the page. Claims that an
agent couldn't find because the fetch was truncated (45) went to three follow-up agents, which searched the full
pages (two of them via the raw wikitext); most turned out to be on the page and were kept. 61 events were reworded (68 fixes, kept in
`scripts/archive/2026-11-18-classical-description-audit.json` and applied by `scripts/apply-text-fixes.ts` to this
file and the `scripts/classical/` script that defines each event). Only titles and descriptions changed; no dates moved.

- **Typical fixes:** labels the page doesn't use ("The great stelae of Axum", "the first Cham polity", "the main
  British source", "a disastrous Roman defeat", "the new eastern capital", "his most famous work"); hedges dropped
  ("reportedly conquers", "probably first named", "said to hold the earliest Long Count", "tentatively codified",
  "perhaps in the first half of the first millennium", "about forty missionaries", "may cover", "whose founder was
  probably from Tikal"); details from general knowledge ("in Arnhem Land", "allied with the Xiongnu", "Returning from
  India", "rules from Ctesiphon", "at Jiankang", "Trajan ends Domitian's treaty"); and contradictions with the page
  (in 151 BC Masinissa invaded Carthaginian lands with 52,000 men, not the reverse; the Visigoths, not the
  Byzantines, held the foothold at Ceuta by 625; the Northern Wei ruled from Pingcheng from 398, not 386; the Tuyuhun
  page credits the Yellow River crossing to the people of Murong Shegui, not to Tuyuhun as founder; Hou Jing was
  killed by his own men while fleeing, and nothing says his enemies retook Jiankang; the *The Vandals sack Rome* entry
  described only the 460s expeditions).
- **Judgment calls (please check):**
  1. **Resolved (author's ruling, 18 November 2026):** translation notices are fine, so *Polynesians* stays cited;
     `long-pause` now says in its description that the page asks for text translated from the Russian article
     (`scripts/archive/2026-11-18-polynesians-notice-classical.json`). Pages that flag AI-generated *content* are still
     not used. Earlier note: *Polynesians* (`wp-polynesians`) carries a translation notice that links to the LLM-assisted translation
     guideline (reported by the batch agent; not confirmed by hand). Under this file's rule the page shouldn't be used.
     It is cited only by `long-pause` (Origins): the c. 900 BCE start, "around 900 BC" reaching Fiji, Samoa and Tonga,
     the pause of "some 1,500 years", the loss of pottery and the resumption "around 700 AD" to the Cook Islands, French
     Polynesia and the Marquesas. **Nothing was removed yet**; if the notice is confirmed, the event's date and
     description need another source or the event goes.
  2. Pages that disagree with themselves or each other were left as written: Silla's Buddhism "527–528" (infobox 527,
     body 528); "the fall of Pyongyang" (Goguryeo infobox only); Hou Jing's "1 January 552" (infobox; the body says
     November 551); the Baqt expedition "repulsed" (Makuria lead; its body says neither side won); Herod's "heirs" now
     follow the lead (three sons and his sister); *Han conquers Nanyue* follows *First Era of Northern Domination* for
     the Queen Dowager's killing, while *Nanyue* has Lü Jia kill Zhao Xing.
  3. The claudius-britain "Four legions" stays (the *Roman Britain* lead says four; its History section says the number
     is unclear). Theodoric's Ravenna sentence now gives only the February 493 treaty, since the cited pages disagree on
     whether Ravenna yielded by treaty or surrendered on 5 March.
  4. Optional softenings the agents raised but I left alone: Frumentius "is consecrated" (only the date is traditional),
     Archimedes "designed war machines" (the lead says so flatly; the body hedges his oversight of them), Rhine crossing
     into Spain (Hydatius's date, not attributed), Reccared's Catholic Christianity (infobox: official after 589), *Rome
     ends the Antigonid kingdom* (page: "the end of the dynasty"), Aksum coins of "eighteen" kings (the page also says
     20).
- **Truncation:** the agents read most long pages only to ~100,000 characters. Every claim flagged as not found was
  re-checked by a follow-up agent; none is left unchecked. No overlap event was re-read.
