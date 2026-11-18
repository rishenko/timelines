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
