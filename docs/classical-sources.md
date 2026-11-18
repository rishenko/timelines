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
