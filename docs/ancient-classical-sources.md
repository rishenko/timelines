# Ancient and Classical World: how it was made, and changes since

Source file: `data-src/ancient-classical.json` (compiled with `npm run data:build`). The timeline runs from c. 9000 BCE
to 650 CE (id `ancient-classical`). The research behind its dates is described in `docs/ancient-sources.md` and
`docs/classical-sources.md`, written for the two timelines it was made from. The same rules apply to every change:
each date is quoted verbatim from a Wikipedia page read by a fetch agent, values seen only in a page summary are not
used, pages with an AI-generated-text warning are not used, and descriptions use only what the pages say.

## The merge (20 November 2026)

Ancient Civilizations (562 events, c. 9000–330 BCE) and The Classical World (371 events, c. 500 BCE – 650 CE) overlapped
in 500–330 BCE, where 50 events and 50 rows appeared in both. A build step (now `archive/scripts/lib/combine.ts`, rules
in `archive/data-src/combined.json`) merged them:

- **Shared events and rows** appear once. Ancient's version won (title, description, rows, importance, links), since
  it usually put an event on a more specific row (Marathon on Archaic and Classical Greece and Achaemenid Persia rather
  than on the Greece and Iran groups). Three events use Classical's rows: Buni, Kalanay and the first Yarlung king.
- **A shared row's lifespan** starts as Ancient gives it and ends as Classical gives it, with each side's date claims.
  Where the two disagreed on the end (Dʿmt, Đông Sơn, the Garamantes, Zhangzhung), Classical's end and claims are used.
- **Phases** were merged by name: Rome has the Kingdom from Ancient and the Republic and Empire from Classical.
- **Renamed rows:** Ancient's Rome became `rome-republic-empire`, inside Classical's Rome group. Classical's groups
  took Ancient's ids: Greece → Aegean, "Iran and Mesopotamia" → Iran, South Asia → Indus, and La Tène Celts → La Tène.
  Ancient's `persia` stays the Achaemenid row.
- **Sources** the two files defined differently (16 keys, such as `wp-kush`) were split: Classical's copy got the
  suffix `-classical`.
- **Row order** follows Ancient, with Classical's rows after their Classical neighbour; the Near East group was
  reordered for the proximity test.

**Validation.** An independent check compared the result with both originals: every event (883) and row (369) of both
appears exactly once. Events and rows found in only one file are unchanged, and each source entry is intact. Every
citation, parent and link resolves, and no event duplicates another under a different id.

After the merge, the combined file became the source: `scripts/archive/2026-11-20-combined-to-source.ts` wrote it in
readable form (it compiles to the same data), and `scripts/archive/2026-11-20-combined-plans.ts` wrote its importance
and row-link plans.

## Macedon as one row (20 November 2026)

`scripts/ancient-classical/macedon-phases.ts`. Ancient's Macedon (c. 650–168 BCE) and Classical's Antigonid Macedon
(306–168 BCE) were two rows for one kingdom, linked to the same article. Antigonid Macedon is gone (its event, Pydna,
moved to Macedon), and Macedon has three phases. The dates come from *Antigonid dynasty* (read 20 November; no AI or
translation notice in the part read):

| Phase | Dates | Quote |
|---|---|---|
| Argead dynasty | c. 650 – 310 BCE | History: "In 310/309 BC, Cassander commanded Glaucias to secretly assassinate the 14-year-old Alexander IV" … "the Macedonian Argead dynasty became extinct" |
| Antipatrid dynasty | 305–294 BCE | History: "Cassander (r. 305 – 297 BC), son of Antipater"; Demetrius, "in 294 BC", establishes himself as king of Macedon |
| Antigonid dynasty | 294–168 BCE | Lead: "Antigonids ruled much of Hellenistic Greece from 294 until their defeat at the Battle of Pydna in 168 BC" |

Judgment calls: the Argead phase starts where the row does (the kingdom's c. 7th-century start). The page's 306 BC
("Established", when Antigonus I took the title of king) is not used, since he did not rule Macedon. 310–305 BCE has no
phase, because the page names no dynasty for it. The page itself disagrees on two reign dates (Demetrius I to 288 or
287, Antigonus II from 277 or 276); neither is used.

## Polynesian Plain Ware (20 November 2026)

`scripts/ancient-classical/plain-ware.ts`. The merge kept Ancient's version of `plain-ware`, on the Lapita row, which
ends c. 500 BCE. Its text repeated two Classical events beside it: "The long pause in Polynesian settlement" and
"Samoa's unrecorded centuries". Classical's version, written in the same pass as those two, is now used word for word,
on its rows (Tonga and Samoa, Fiji). From Ancient's version it keeps the start claim from *History of Tonga* (heading
"2650–1550 BP (700 BC – 400 AD)") and the "c." on 700 BCE.

## The Aegean dating systems on the Bronze Age rows (20 November 2026)

`scripts/ancient-classical/aegean-chronology.ts`. The Aegean group carried the High (radiocarbon) Aegean chronology, so
35 later events under it (Archaic and Classical Greece, Macedon, Pergamon) said "Dated by the High (radiocarbon) Aegean
chronology". Only Minoan events and the Mycenaean phases have claims under the High or Low Aegean chronology, so it now
sits on the Cycladic, Minoan and Mycenaean rows instead. No date moved: the app's own date code places every event
the same under each of the ten dating choices. 

The app now also names an event's dating system only where a choice in the Dating menu can move it, so 151 events
under the Middle Chronology show it on 67, Shaw's Egyptian chronology on 3 of 81 (Khufu, Ahmose I, Shoshenq I), the
High Aegean on 1 of 14 (Thera), and the Xia–Shang–Zhou Chronology Project on 1 of 101 (the Battle of Muye). Every
option in the Dating menu still moves at least one event, lifespan or phase:

| Group | Option | Events, lifespans and phases it moves |
|---|---|---|
| Mesopotamia & Anatolia | High, Low | 102 each (dates before 1400 BCE) |
| Egypt | Hornung, Krauss & Warburton | 9 |
| Egypt | Radiocarbon | 6 |
| Aegean | Low | 3 (Thera, the two Mycenaean phases) |
| China | Traditional (Liu Xin) | 5 (Muye; Xia, Shang and Zhou lifespans; Western Zhou) |

## Khufu's reign under each dating system (20 November 2026)

`scripts/ancient-classical/khufu-reign.ts`. Khufu's event had a start date under each Egyptian dating system (from the
*Great Pyramid of Giza* table "Modern estimates of dating the Great Pyramid and Khufu's first regnal year": Shaw 2589,
Hornung 2509, Ramsey et al. 2613–2577 BC) but no end dates, so under Hornung its start passed its end and the reign
shrank to one year. *Khufu* (read 20 November; no AI or translation notice) gives the whole reign in its infobox note
"Proposed dates": "2589–2566 BC (23 years)" citing Shaw's *Oxford History of Ancient Egypt*, and "2509–2483 BC (26
years)" citing Hornung, Krauss & Warburton. Both ends are now claims. The radiocarbon study gives only a start ("Khufu
began his reign between 2629 and 2558 BC"), so under Radiocarbon only the start moves.
