# Ancient Civilizations: sources, chronologies and judgment calls

Source file: `data-src/ancient-near-east.json` (compiled with `npm run data:ancient`).
Research: English Wikipedia, read 17 November 2026, by AI fetch agents that reported dates as written
on each page. **Nothing here has been checked against the books yet.**

## How dates are recorded

- `start`/`end` hold the best estimate under the region's default chronology.
- `startDates`/`endDates` hold every value a source gives, with its ± margin and chronology. The
  drawn range is the union of those values (plus the derived High/Low shifts below). Where a page gives
  a range ("1627–1600 BC"), it is stored as its midpoint ± half the width (1614 ± 14) so the range is
  preserved exactly.
- Books and papers are cited only where a Wikipedia article cites them for that date. They are tagged
  *Cited via Wikipedia (not checked)*.

## Chronology per region

| Region | Default | Alternatives | Basis |
|---|---|---|---|
| Mesopotamia, Anatolia, Mitanni, Assyria | Middle (Babylon falls 1595) | High (−56 yrs), Low (+64 yrs) | Wikipedia, *Chronology of the ancient Near East*, table "Variant Middle Bronze Age chronologies". It calls the Middle "the most commonly seen solution … but there is far from a consensus". |
| Egypt | Shaw, *Oxford History* (2000) | Hornung, Krauss & Warburton (2006); radiocarbon | Wikipedia, *Egyptian chronology*, table of dynasty dates by author. |
| Aegean | High (radiocarbon; Manning 2012) | Low (conventional) | Wikipedia, *Minoan chronology* table (note: "based on Manning (2012)"); *Helladic chronology* periodisation table for the low values. |
| Ebla, Elam | Middle (as Mesopotamia) | High, Low | Their early dates come from synchronisms with Mesopotamian kings, so they follow the Mesopotamian menu. A judgment call: the pages name no chronology. |
| China | Xia–Shang–Zhou Chronology Project (Xia c. 2070, Shang c. 1600, Muye 1046) | Traditional (Liu Xin: Xia 2205, Shang 1766, Muye 1122) | Wikipedia, *Xia dynasty* (Chronology) and *Battle of Muye* (Dating). Other proposals (Bamboo Annals, Pankenier, Li gui, radiocarbon, the 1130–1018 spread of 44 proposals) are recorded as claims without a menu entry. |
| Canaan, Levant Iron Age, Indus, Iran outside Elam, the Americas | none | none | Archaeological or radiocarbon periodisation, or Iron Age dates after the 1400 BCE cut-off. |

**Added 17 November 2026 (second pass):** Assyria's four periods, the Levant, Urartu, Iran and Central
Asia, Dilmun, the Indus Valley, China and the Americas (78 events, 62 sources). Each value below was
reported as verbatim page text by the fetch agents; values that came only from page summaries were left
out (see "Second-pass gaps").

## Judgment calls (please check)

1. **High/Low shifts stop at 1400 BCE.** The −56/+64 offsets are defined for the Middle Bronze Age.
   Wikipedia says the Assyrian King List is roughly correct from Ashur-uballit I (1365–1330 BCE) and
   that the Amarna letters anchor the mid-14th century. I picked 1400 BCE as the cut-off; dates after it
   are not shifted. Where a page gives its own short-chronology date (Ur III, Isin–Larsa, Old Babylonian,
   Mursili I, Kassites, Early Dynastic), that date is used instead of the shift.
2. **Ultra-low (sack 1499) and Middle-low (1587) chronologies** aren't selectable. Middle-low appears
   as a claim on the sack of Babylon only. The ultra-low chronology is mentioned, not plotted.
3. **Early Dynastic short chronology (2800–2230)** differs from the Middle by 100–120 years, not 64;
   it's recorded as the explicit Low claim.
4. **Egypt's best estimates follow Shaw's dynasty table**, not Wikipedia's *Ancient Egypt* infobox
   (which says Early Dynastic began c. 3150, "conventional chronology"). The 3150 value is kept as a claim.
   The Late Predynastic (Dynasty 0, c. 3300–3150, from a navbox) therefore ends before Shaw's 3000 start, leaving a gap.
5. **Hittite reigns from the 14th century on use Bryce's dates** (consistent with Ramesses II acceding in
   1279), with Kuhrt's and Freu's as claims. Earlier reigns use the Kuhrt/Bryce middle-chronology column.
6. **Aegean low claims** exist only for the Thera eruption and the Mycenaean palatial/postpalatial
   boundaries. I treated the *Helladic chronology* periodisation table as the "low" set; the page doesn't use that label.
7. **Pylos destruction**: pages give c. 1250 (Palace of Nestor), c. 1200 (Linear B, Blegen) and c. 1180
   (Cline 2014). Best estimate set to 1200, all three kept.
8. **Neo-Hittite states** "arose in the 12th century": stored as best 1180 (after Hattusa's end) with
   claims at the century's start and end (1200, 1101).
9. **Kadesh "high chronology"** is recorded as 1294 BCE from the page's "about 20 years earlier".
10. **Ramesses II accession**: low 1279, middle 1290, high 1304 (Kuhrt 1995, via *List of Hittite kings*).
11. **Shalmaneser I's annexation of Ḫanigalbat** has no year on the page; the bar spans his reign.
12. **Amarna letters** use the New Kingdom infobox's Amarna-capital dates (c. 1352–1336); the letters
    page only says "no more than 30 years in the middle of the 14th century".

## Facts taken from page summaries rather than verbatim text

The fetch tool returned the first ~40,000 characters of each page verbatim and summarized the rest.
These values came from summaries and most need checking first:

- Khufu's reign under Shaw (2589), Hornung (2509) and radiocarbon (2613–2577): *Great Pyramid of Giza* table.
- Ahmose I's reign under Shaw & Nicholson (1550–1525) and Hornung 2012 (1539–1515), and the radiocarbon
  accession 1570–1544: *Ahmose I*, note 1.
- Hyksos dynasty ranges (Ryholt, Stiebing, Schneider): *Hyksos*, footnote 1.
- Pylos c. 1200 (Blegen) and c. 1180 (Cline 2014).
- The 1198–1196 BCE drought (Manning et al. 2023), from *Hattusa*.
- Sennacherib's sack of Babylon (689 BCE): only the date in the *Fall of Babylon* hatnote is verbatim.

## Gaps

- *Early Dynastic Period (Mesopotamia)*: the period's dates and the Royal Tombs of Ur are covered,
  but no Lagash–Umma or Eannatum events (their dates were summary-only).
- No Hittite Middle Kingdom events; the page gives only "mid-to-late 15th century".
- The *Telipinu (king)* article doesn't exist; the proclamation's date comes from *Telepinu Proclamation*.
- Egypt's Merneptah, Psamtik I and the Assyrian conquest were taken from mentions in other articles,
  not their own pages.

## Second-pass judgment calls (please check)

13. **Assyria moved** from "Other powers" into Mesopotamia, with Early (c. 2600–2025), Old (c. 2025–1364),
    Middle (c. 1363–912) and Neo-Assyrian (911–609) rows from the *Assyria* period table. Assur's
    independence uses c. 2025 (three infoboxes); the *Early Assyrian period* body's c. 2090 (Ushpia) is a claim.
14. **"12th century" or "6th century"** with no year is stored as a best estimate inside the century with
    claims at its first and last years: Aram-Damascus (1150; 1200/1101), El Mirador (550; 600/501).
15. **BP converted to BCE** by subtracting 1950: Jiroft's infobox "5000 BP to 4200 BP" → 3050–2250 BCE.
    Jiroft's bar uses the narrower "heyday 2500–2200 BC".
16. **Canaan's periods** (Early Bronze 3500–2000, Middle 2000–1550, Late 1550–1200) come from the *Canaan*
    overview, which flags them "citation needed" and says several periodisation systems exist.
17. **Pan Geng's move to Yin** is stored at 1400 BCE from *Anyang*'s "beginning of the 14th century BC".
    Other sources commonly place it later; the Shang page wasn't read verbatim on this point.
18. **Proto-Sinaitic** is drawn at the early date (c. 1850) with the late date (c. 1550) as a claim. The page
    presents both without preferring one.
19. **Xia** is shown as "(traditional; disputed)". *Xia dynasty* says many Western scholars consider it
    legendary or unsubstantiated; Chinese archaeologists mostly identify it with Erlitou.
20. **Olmec start**: best 1200 (infobox and lead) with claims 1400 (Overview) and 1600–1500 (El Manatí).
21. **Dholavira**: best 2650–1900 (infobox, Bisht's stages), with recent C14 (Stage I c. 3500–3200) and
    reoccupation until c. 1450 as claims.
22. **Row order runs west to east so civilizations that interacted sit together** (order revised in the third pass, below): Aegean, Sea Peoples,
    Egypt, Levant (between Egypt and the Hittites, as on the map), Anatolia (Hittites, then Urartu next to
    Assyria), Mesopotamia (Mitanni, Assyria, Babylonia, Akkad, Sumer: Sumer sits next to Elam), Iran &
    Central Asia (Elam, Medes, Persia, Mannaea, Jiroft, Oxus), Dilmun, Indus, then China and the Americas,
    which had no contact with the rest. "Other powers" is gone: **Mitanni** is under Mesopotamia (its
    heartland was in upper Mesopotamia, and this keeps it next to Assyria without separating Anatolia
    from Mesopotamia), and the **Sea Peoples** and **Dilmun** are regions of their own. Achaemenid Persia is
    under Iran & Central Asia.
    - A test (`src/data/proximity.ts`, "ancient regions that interacted sit near each other") counts
      the events and links each pair of regions shares (since the fifth pass, each event at most once per pair). Pairs sharing 5 or more must be within 3 regions;
      2 or more, within 5. On the previous order it flags the Sea Peoples and the Indus.
    - Scoring each pair as shared × distance, this order costs 123 (the old order: 155). The best order
      found by checking every arrangement (China and the Americas held last) costs 115. It differs only by
      putting the Sea Peoples above the Aegean and the Indus before Dilmun. I kept the geographic order.

## Second-pass gaps

- **Summary-only values left out** (need a verbatim read before use): most Middle/Late Bronze Canaan
  dates; Phoenicia's Iron Age and Persian-period details (Assyrian vassalage, Tyre siege 585–573);
  Shutruk-Nahhunte's raid on Babylon; Elam's dynasties (Awan, Shimashki, Sukkalmah); Median kings;
  Urartian reigns beyond the infobox; Sennacherib's 701 campaign against Judah; Shang king-table dates;
  Fu Hao; the Maya chronology table, Cuello, Nakbe; the Olmec writing finds (Cascajal Block).
- **Not found:** Confucius (no dates in the Zhou text read); a dated Library of Ashurbanipal; Hazor
  (the URL fetched was a disambiguation page; fetch *Tel Hazor*); *Battle of Susa (647 BC)* returned 404.
- **Thin rows:** Mannaea, Jiroft, the Oxus civilization and Sanxingdui have one event or none.
- The Maya row extends to 250 CE (end of the Preclassic), past the timeline's nominal 330 BCE end;
  Zhou runs to 256 BCE and the Warring States to 221 BCE.

## Third pass: Europe (17 November 2026)

First pass, important events only; deep research later. Applied by `scripts/additions/europe.ts`
(re-runnable: it replaces what it added). 22 events, 25 sources, 16 rows.

- **New Europe region:** megalith builders (Malta, Newgrange, Stonehenge), Ötzi, Corded Ware, Bell
  Beaker, Únětice (Nebra sky disc), Nordic Bronze Age, Urnfield, Hallstatt, La Tène, Etruscans, and Rome
  (Kingdom and Republic). **Archaic and Classical Greece** sits under the Aegean, after the Mycenaeans.
- **Founding of Rome:** best 753 (Varro), with the clustered ancient dates from the page's table as
  claims (814 Timaeus, 752, 751, 750, 748, 729). Naevius and Ennius (c. 1100, c. 884) are left out as
  outliers far from the rest. The Roman Kingdom row is labelled "traditional".
- **Gallic sack of Rome:** best 387 (modern consensus per *Battle of the Allia*), traditional 390 as a claim.
- **Classical Greece** starts at 480 (infobox), with 510 (the lead's "most common dates") as a claim.
- **Malta:** the temple phases come from the page's recalibrated radiocarbon table (3600–2500). The
  page's "from 5200 to 2500 BC" construction span is not used.
- **Region order changed** to keep Greece within reach of Persia (Marathon, Salamis): Europe, Sea
  Peoples, Aegean, Anatolia, Levant, Egypt, Mesopotamia, Iran, Dilmun, Indus, China, Americas. The Aegean
  now sits next to Anatolia, which faces it across the Aegean Sea. Score 145; the best possible is 128,
  but that order puts the Aegean between Mesopotamia and Iran.
- **Summary-only, left out:** Bell Beaker's regional end dates, Corded Ware's Swiss dendro dates,
  the Tollense battle, the Trundholm sun chariot, the Hochdorf grave, Etruscan periods and peak, the
  oldest Greek inscriptions, and Alexander's reign dates.

## Fourth pass: the rest of the Mediterranean (17 November 2026)

Important events only; applied by `scripts/additions/mediterranean.ts` (re-runnable). 31 events,
29 sources, 23 rows.

- **Aegean:** Cycladic culture (first row) and Macedon (Philip II and Chaeronea now also on Macedon's row).
- **Anatolia:** Phrygia (Midas; Cimmerian destruction c. 675, with Eusebius 695 and Julius Africanus 676
  as claims), Lydia (coins, Croesus, Cyrus's conquest 546; 547 per *Achaemenid Empire* as a claim), Lycia.
- **Levant:** Cyprus (Alashiya) as a row. As its own region it pushed Anatolia and Mesopotamia apart.
- **Europe:** Terramare, Villanovan, Samnites (the Samnite Wars), the Odrysian kingdom (Thrace).
- **New region, Western Mediterranean:** Carthage (independence, Alalia, the Sicilian Wars, Himera),
  Magna Graecia and Sicily (Cumae, Syracuse 733 per Thucydides with 758 as a claim, Sybaris, the Athenian
  expedition), Nuragic Sardinia, Talaiotic Balearics, and the Iberian Peninsula (Los Millares, El Argar,
  Tartessos, Iberians).
- **New region, North Africa:** the Libyans (the 1208 BCE invasion of Egypt) and Cyrene.
- **"7th century", "9th century" and similar** become a best estimate with claims at the century's
  first and last years (Macedon, Lydian coins, Tartessos, Magna Graecia). "Around the 1450s" is stored as 1455 ± 5.
- **Talaiotic start:** the page says periodisations disagree; claims from three schemes (1200, 1050, 900)
  with best 1000 ("end of the second millennium BC").
- **Region order now:** Europe, Western Mediterranean, North Africa, Sea Peoples, Aegean, Anatolia,
  Levant, Egypt, Mesopotamia, Iran, Dilmun, Indus, China, Americas. Score 202; it passes the proximity
  test. The best possible (177) puts the Aegean between Mesopotamia and Iran.
- **Summary-only, left out:** the first Rome–Carthage treaty (509 or 508), Carthage's lead date for
  independence (7th century), the Carthaginian conquest of Sardinia, Persian rule over Phrygia, Amyntas I,
  the Hellenistic history of Cyrene, the Tartessian script, Dionysius I (no reign dates on the page).

## Fifth pass: the Eurasian Steppe (17 November 2026)

Important events only; applied by `scripts/additions/steppe.ts` (re-runnable). 21 events (plus two
Cimmerian events already on Anatolia's rows), 19 sources, 12 rows. The region starts collapsed.

- **Rows:** Botai, Yamnaya, Afanasievo (Altai), Sintashta, Andronovo, Srubnaya (Timber-grave), Cimmerians,
  Scythians, Saka, Massagetae, Pazyryk (Altai).
- **Events:** Botai horse herding; the Afanasievo migration; the Yamnaya expansion, its push into the
  Danube valley and its turn into Corded Ware (c. 2700, from the page's map caption); the modern
  domestic horse (DOM2, c. 2200, with Taylor's 2000 and Warmuth's 3000 as claims); Arkaim; the oldest
  chariots (1950–1880 stored as 1915 ± 35, with "around 2000 BC" as a claim); the Indo-Aryan migrations
  (2000–1600, on the Andronovo, BMAC and Harappan rows); Srubnaya replacing Lola; Dugdammî's death (640);
  the defeat of the Cimmerians by Madyes and Alyattes (c. 635); the Scythian alliance with Assyria (c. 672);
  Madyes's rule over Media; the Medes expelling the Scythians (c. 600); Darius I's Scythian campaign (513);
  Philip II defeating Ateas (339); the Arzhan 1 and 2 kurgans; Tomyris killing Cyrus (530; Ctesias's
  Derbices version in the text); the Pazyryk burials.
- **Judgment calls:** Madyes's rule over Media starts at 653, which is 625 plus the page's "twenty-eight
  years"; the infobox's reign start (658/9) is a claim. "Yamnaya transforms into Corded Ware" follows the
  map caption; the description notes that how directly one descends from the other is debated.
  Centuries ("9th/8th century", "5th century AD") follow the fourth pass's rule.
- **Key events (5):** the Yamnaya expansion, the modern horse, the first chariots, the Indo-Aryan
  migrations, the death of Cyrus. **Minor (4):** Arzhan 2, Srubnaya replaces Lola, Dugdammî's death,
  the Assyrian alliance.
- **Region order:** the Steppe sits after Iran. Philip II's defeat of Ateas sits on both the Steppe
  and Macedon and also links to Philip's reign, so it used to count twice toward Aegean–Steppe (2 shared,
  6 apart: over the limit). At the author's choice (2026-11-17), the proximity rule now counts each event
  at most once per pair of regions. Score 220 under the new rule; it passes.
- **Summary-only, left out:** the first Cimmerian mention (Urartu, 714), Esarhaddon killing Teušpâ (679),
  the Cimmerian first attack on Lydia, the Cyaxares banquet date from *Scythians* (it is verbatim on
  *Madyes*, which is used), the Scythian raid to the Hellespont (496), the Saka in the Tarim Basin, Darius's
  Saka campaign (520–518), Andronovo's Alakul phase and Altai mining, the Poltavka migration (2800–2600),
  and the Kurgan hypothesis waves. The *Darius I's European Scythian campaign* URL is a 404; the campaign
  comes from *Scythian campaign of Darius I*.

## Sixth pass: Africa (17 November 2026)

Important events only; applied by `scripts/additions/africa.ts` (re-runnable). 24 events, 16 sources,
12 rows; four existing events (the Punt expedition, the Kushite dynasty, the Assyrian invasions and the
sack of Thebes) also placed on the new rows.

- **Nubia, a group inside Egypt** (the region is now "Egypt and Nubia", the Nile valley): A-Group, C-Group
  (Lower Nubia), Kerma, and the Kingdom of Kush (Napata, then Meroë). Events: the A-Group at its height
  (c. 3100), the Early C-Group appearing (c. 2300, from *Kerma culture*), an early pharaoh's victory over the A-Group (c. 3000, Gebel Sheikh Suleiman), Senusret III's
  forts at Buhen (c. 1860), Classic Kerma (1750–1500), the Kushite capture of Buhen (c. 1675), Kerma's
  invasion of Egypt (1575–1550), Thutmose I's conquest (c. 1504), Kush independent (c. 1070), Alara
  (800–760), Piye's conquest (c. 727), Taharqa (690–664), Psamtik II's sack of Napata (592; Napata's lead
  says 593) and the move of the capital to Meroë (c. 591).
- **New region, Sub-Saharan Africa:** Punt (Sahure's expedition in the 25th century, Hannu c. 2000,
  Hatshepsut's), Dʿmt (its earliest known king, c. 700–650), Tichitt (millet domestication 1900–1700,
  Classic Tichitt 1600–1000), Nok (terracottas 900–300; iron 750–550, with "9th or 8th century" as a
  claim), and the Bantu expansion (the East–West split 2500–1200; Lake Victoria and Angola by 500).
- **North Africa:** the Garamantes (from at least 1000 BCE; Herodotus, 5th century).
- **Judgment calls:** the A-Group's start uses "4th millennium" as 3500 ± 500; its end has 2900 (lead) and
  3100 (B-Group section) as claims. Kush starts at the infobox's c. 780, with independence (1070) and
  emergence (1000) as claims; the independence is also an event. Dʿmt's start is the infobox's 8th
  century, with the short description's 980 as a claim. The *C-Group culture* page carries a warning that
  it may contain text from a large language model, so at the author's request it is not used at all: the
  C-Group row has no dates of its own and holds one event sourced from *Kerma culture*. The Kush
  and Taharqa pages disagree on where Taharqa died (Napata vs. Thebes); the description says so.
- **Key events (6):** Thutmose I destroys Kerma, Kush independent, Piye conquers Egypt, the capital moves to
  Meroë, Nok terracottas, Nok iron. **Minor (2):** Alara, Hannu's voyage.
- **Region order** (the author's choice, 2026-11-17): Nubia shares 12 events with Egypt, and as a region
  of its own it pushed Mesopotamia too far from Anatolia and the Levant. Nubia became a group inside Egypt,
  Sub-Saharan Africa sits next to North Africa, and Egypt moved below Anatolia: Europe, Western
  Mediterranean, Sub-Saharan Africa, North Africa, Sea Peoples, Aegean, Anatolia, Egypt and Nubia, Levant,
  Mesopotamia, Iran, Eurasian Steppe, Dilmun, Indus, China, Americas. Score 230; it passes.
- **Left out:** Napata's 591 "Achaemenid raid" (it conflicts with every other date for the sack), the
  Garamantes' foggaras (200 BCE–200 CE, after the end date), Dʿmt's Yeha temple (undated), the iron slag
  at Gobédra (9th century, before Dʿmt), and the end of the Punt trade (no year on the page).

## Seventh pass: South, Southeast and East Asia (17 November 2026)

Important events only; applied by `scripts/additions/asia.ts` (re-runnable). 20 events, 20 sources,
14 rows. No page read carried a warning about AI-generated text (*Plain of Jars* has a "needs more
citations" notice; *Old Chosŏn* has a disputed-neutrality notice in one section).

- **South Asia** (the Indus region, renamed): Vedic period and Magadha rows. Events: the Rigveda (c. 1500–1000,
  with 1400 and the wider 1900–1200 as claims), the spread to the Ganges plain (1200–1000), the
  Mahajanapadas (c. 600–345), the Persian conquest of the Indus valley (c. 535–518), Bimbisara (long
  chronology 544–492 as best, short 457–405 as claims), Mahavira (traditional 599–527, with historians'
  549 and 477 as claims), the Buddha (480–400 as best, from the infobox and "within 20 years either side
  of 400 BCE"; 563–483, the long chronology and the short chronology as claims), the Nandas (c. 345).
- **New region, mainland Southeast Asia** (before China): Ban Chiang (bronze c. 2000; disputed, with
  Higham's 1000 as a claim), Phùng Nguyên (rice reaches the Red River, 2000–1500), Đông Sơn (bronze drums
  from about 600 BCE), Sa Huỳnh (the trade network from 500 BCE), Văn Lang (the legendary 2879 founding,
  labelled traditional), the Plain of Jars (1240–660 stored as 950 ± 290).
- **New region, Korea and Japan** (after China): Old Chosŏn (the mythological 2333 founding), Mumun (rice
  and dolmens 1500–850; Middle Mumun paddy rice 850–550), Jōmon (Sannai-Maruyama 3900–2300; Korean
  rice farmers in Kyushu c. 900; Jimmu's traditional 660), Yayoi (c. 300 BCE, with the controversial
  radiocarbon 1000–800 and the Jōmon page's 500–300 as claims).
- **Judgment calls:** the Jōmon row starts at the Middle Jōmon (3520 BCE), inside the timeline's range;
  the period itself begins c. 14,000 BCE. The Buddha's best dates follow the current majority view, not
  the older 563–483. Traditional foundings (Hùng kings, Tan'gun, Jimmu) are kept as events with
  "traditional" in the title, like Rome's.
- **Key events (7):** the Rigveda, the Mahajanapadas, the Persian conquest of the Indus, the Buddha, Đông Sơn
  drums, Sannai-Maruyama, rice farmers in Kyushu.
- **Region order:** unchanged apart from the two new regions. Score 235; it passes.
- **Left out:** the Kuru kingdom's dates (summary-only), the Liaoning bronze daggers (14th century; no row
  to hold them without reaching outside Korea), Old Chosŏn's war with Yan (c. 300, after the end date),
  Rigveda's Mitanni comparison (context not read verbatim), and Mahavira's and the Achaemenid page's later
  sections (summary-only).

## Grouping (17 November 2026)

At the author's request, the regions now sit in five groups, applied by `scripts/additions/groups.ts`
(run it last): Africa (North Africa, Sub-Saharan Africa), Europe & Mediterranean (Europe, Western
Mediterranean, Sea Peoples, Aegean), Ancient Near East (Egypt and Nubia, Levant,
Anatolia, Mesopotamia, Iran & Central Asia, Dilmun), Steppe & South Asia, and East & Southeast Asia
(mainland Southeast Asia, China, Korea and Japan). The Americas stay one top-level row.

- Egypt belongs to the Ancient Near East (the usual scholarly grouping), next to the Levant; inside the
  group the order follows the Fertile Crescent (Egypt, Levant, Anatolia, Mesopotamia, Iran, Dilmun).
- Africa comes first at the author's choice; it is also the best-scoring top-level order (44).
- Each group has its own hue (ochre, blue, brick red, olive, violet; the Americas keep green). Group rows
  are tinted with it and every row inside carries a faint wash of it, so areas stay visually separate.
- The proximity rule now applies per level: groups at the top, then the regions inside each group. All
  pass (top level 44; Ancient Near East 82). Periods and dynasties are chronological, so deeper levels
  are not checked.
- The timeline opens with groups expanded and every region collapsed, so each region row leads with its
  key events.
- The app no longer limits nesting depth (it was three levels); this grouping uses four.

## Eighth pass: Island Southeast Asia and Oceania (18 November 2026)

Important events only; applied by `scripts/additions/pacific.ts` (re-runnable; run it before `groups.ts`). 18
events, 16 sources, 8 rows, in a new top-level group, **Island Southeast Asia & Oceania** (teal), between East &
Southeast Asia and the Americas. Three web-fetch agents read 22 pages.

- **Not used:** *Puyuma people*, where *Beinan culture* redirects, carries an AI-generated-text warning. Beinan's jade
  dates come from *Prehistory of Taiwan* instead. *Beinan site* and *Maritime Jade Road* do not exist (404).
- **Other notices:** *Polynesians* asks for expansion by translation from Russian. Its notice mentions an LLM
  translation guideline but does not flag the existing text as AI-written, so its Origins facts are used.
  *Prehistory of Australia* has a disputed-neutrality notice; only its lead and "Changes c. 4000 years ago" were read
  verbatim. *Lapita culture*'s "Lapita in Polynesia" section may contain original synthesis, so its two dates (Tonga
  900 BCE, Samoa plainware ending around 1 CE) are claims only.
- **Taiwan and Island Southeast Asia:**
  - Taiwan: first farmers and the Dapenkeng culture, c. 3500–2500. Claims: the lead's 4000–3000, "around 5,000 years
    ago", and the radiocarbon "as late as 4000 BCE".
  - The Maritime Jade Road, 2000 BCE–1000 CE: jade mined in Taiwan and processed mainly in the Philippines. Claim:
    Taiwanese nephrite in the northern Philippines, 1850–1350.
  - Philippines: Out of Taiwan, 3000–1500; the Batanes, 2200; metal tools around 500 (claim: iron in the 9th–10th
    centuries BC); Kalanay Cave pottery from 400 BCE, linked to the Sa Huỳnh trade network.
  - Indonesia: Austronesian speakers arrive c. 4,000 years ago; Buni, 400 BCE–100 CE (claim: "probably survived until
    500 AD").
- **Oceania:**
  - The Mariana Islands, 1500–1400, before the first Lapita artifacts.
  - Lapita: Bismarck Archipelago 1600–1200; Solomons, Vanuatu and New Caledonia after 1200; Teouma c. 1000; Fiji
    1100–1000; Tongatapu "around 3000 years ago" (claims: 900 BC and Pea's 3180 ± 100 BP); Samoa 1500–900; the
    Polynesian Plain Ware period, 700 BCE–400 CE.
  - Australia and the Torres Strait: the dingo; first settlement of the Torres Strait c. 4,000 years ago.
- **Judgment calls (please check):**
  - "Years ago" and "YBP" are treated like BP (subtract 1950), as in call 15.
  - The dingo's best date is the arrival both pages give (about 4,000 years ago, 2050 BCE). The oldest remains (3,450
    YBP, and 3,348–3,081 by direct dating) are claims, so the drawn range runs to them.
  - Samoa's best date is the midpoint of the page's 1500–900 BCE window. Tonga's is the lead's "around 3000 years ago".
  - Fiji, Tonga and Samoa are three events, not one, so each island's claims stay separate.
  - The Lapita row ends at 500 BCE (the lead's "1600 to 500 BCE").
- **Key events (5):** first farmers in Taiwan, Out of Taiwan, Lapita in the Bismarck Archipelago, Tongatapu, the dingo.
  Minor: Kalanay Cave.
- **Region order:** the top level scores 45 and passes. The new group shares one event with East & Southeast Asia (the
  Kalanay–Sa Huỳnh link). Inside the group, Taiwan and Island Southeast Asia sits above Oceania (score 2).
- **Left out:**
  - Kuk Swamp: its bananas and sugar cane (6,900–6,400 years ago) end before 3500 BCE.
  - The Lapita page's "1,110 years ago" for New Caledonia, which doesn't fit its other dates.
  - The *Austronesian peoples* lead's "started at around 500 BCE", which contradicts the page's own 3000–1500 BCE.
  - Palau and Yap "by 1000 BCE": there is no row for them yet (a Micronesia row would hold them).
  - Redd et al.'s migration from India c. 4,000 years ago (a single paper).
  - Everything read only in summary: wet-field rice in Indonesia "as early as the 8th century BCE", the Torres Strait's
    "by 2,500 years ago", and the Australian Holocene tool dates.
