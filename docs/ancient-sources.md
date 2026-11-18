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

## Ninth pass: the remaining gaps (18 November 2026)

Important events only, in six re-runnable scripts (run before `groups.ts`): `caucasus.ts`, `arabia.ts`,
`eastern-europe.ts`, `americas.ts`, `north-asia.ts`, `fill-gaps.ts`. 70 events, 58 sources, 55 rows. Seven web-fetch
agents read about 65 pages.

- **Not used (AI-text warnings):** *Trialeti–Vanadzor culture*, *Lusatian culture* (Biskupin's own page is used
  instead), and *Ma'in* (Minaeans): its banner cites the LLM translation guideline, so it is treated as flagged.
- **Not found (404):** Umm an-Nar culture (dates from *Magan* and *Hafit period*), Dedan (from *Lihyan*), Casimiroid
  (from *Ortoiroid people*), Sechín Bajo, Oasisamerica cultures / Tucson Basin / Las Capas (no US Southwest data),
  Southern Neolithic and Ash mound (no South Indian Neolithic), Megalithic culture of South India (*Iron Age in India*
  and *Adichanallur* instead), Kintampo complex, Qugong, Zongri culture.
- **Caucasus** (new region, Near East group): Maykop (3700–3000), Kura–Araxes (3400–2000; lead 4000 and an end as early
  as 2700–2600 as claims) with its spread into eastern Anatolia (c. 3000) and Shengavit, Colchis (the Colchian culture from
  2700; tribes consolidate in the 13th century BC; Sarduri II 744; Cimmerians and Scythians 720; Greek colonies in the 6th
  century), Lchashen–Metsamor (1500–700), Koban (1200–350), Diauehi (Tiglath-Pileser I 1112; Argishti I 783).
- **Arabia** (new region, Near East group): the Oman Peninsula (Hafit 3200–2600, Umm al-Nar 2600–2000, Akkad's campaigns,
  Ur-Nammu's ships of Magan, Wadi Suq 2000–1300), Saba (the Marib Dam, 8th century, with the tentative 1750–1700 as a claim;
  its height 8th–6th centuries; Karib'il Watar), Qataban, North Arabia (Tayma under Ramesses III, Assyria and Nabonidus;
  Lihyan).
- **Eastern Europe** (rows in Europe): Funnelbeaker (Flintbek and Bronocice wheels), Globular Amphora, Cucuteni–Trypillia
  (the Talianki and Maidanetske mega-sites, 3850–3600, before the window opens), Usatove, Yamnaya mounds over the mega-sites,
  Corded Ware replacing Funnelbeaker by 2650, Biskupin (747, dendrochronology), Alexander and the Getae (335).
- **Americas** (now a group of five regions; the six existing rows moved in): the Arctic (Paleo-Eskimo migration c. 4000,
  Saqqaq, Independence I, Dorset), North America (Old Copper, Indian Knoll, Adena), Mesoamerica (Mokaya's first pottery,
  San José Mogote, Tlatilco, the earliest Zapotec writing, Monte Albán), South America (Kotosh, Cupisnique, Paracas,
  Chinchorro), the Caribbean (Casimiroid, Ortoiroid, Saladoid).
- **Siberia and Mongolia** (new region, Steppe & South Asia group): Okunev, Glazkov, Ymyyakhtakh, Karasuk (with Shang
  chariots and bronzes), deer stones, Slab-grave, Tagar. **Tibet** (new region, East Asia group): Karuo; Zhangzhung and
  Nyatri Tsenpo's traditional 414 BC.
- **Smaller gaps:** the Gandhara grave culture, the Early Iron Age in South India (c. 1000; the disputed Sivagalai and
  Mayiladumparai dates are mentioned, not claimed), Sri Lankan cinnamon in Egypt (c. 1500), Anuradhapura (before 900), the
  end of the African humid period (c. 3550, from "5,500 years before present is often used"; 6,000–5,000 years ago as a
  claim), the pan-tropical drought of about 4,000 years ago, East African herding (5000 BP and the highlands c. 3,300 ybp),
  Palau (c. 1000 BCE; the 3rd–2nd millennia as a claim).
- **Judgment calls (please check):**
  - Region order in the Near East is now Egypt, Levant, Anatolia, Mesopotamia, Caucasus, Iran, Arabia, Dilmun (score 114,
    passes). The search's best (104) ran north to south with the Caucasus first; the chosen order keeps the old west-to-east
    Fertile Crescent with Arabia next to Dilmun.
  - The Old Copper row starts at c. 4000 BCE (Oconto, Wisconsin DNR, Pleger) with the infobox's 6500 as a claim; the
    Chinchorro row starts at 7000 BCE, which widens the ruler.
  - Pages that disagree internally keep both values as claims (Kura–Araxes start, Dorset end, Cupisnique span).
  - Row labels name places only when the page does (e.g. "Mokaya (Mazatán)", not Chiapas).
- **Key events (19)** and **minor (3)**: see `docs/ancient-key-events.md`.
- **Left out:** San peoples (no in-window date beyond "the first millennium BCE"), Yap (no date), the Okunev figurine's
  3511–3127 cal BC (one caption), Karib'il's link to Sennacherib as a dated event (the page's two Karib'ils are unclear),
  the Dacians' Persian and Greek relations (summary only), and the Trypillian details read only in summary.

## Tenth pass: back to 9000 BCE (18 November 2026)

At the author's request the ancient timeline now starts with the first farmers. Two re-runnable scripts (run before
`groups.ts`): `neolithic-near-east.ts` and `neolithic-world.ts`. 65 events, 62 sources, 44 rows. Six web-fetch agents
read about 70 pages; none carried an AI-text warning. Not found (404): Shangshan culture, Khartoum Neolithic.

- **Near East:** the Levant (PPNA: Jericho c. 9000 and its tower c. 8000; PPNB: animal domestication 9000–8000, plastered
  skulls, 'Ain Ghazal c. 7000, the 8.2-kiloyear event c. 6200; the Ghassulian 4400–3800), Anatolia (Göbekli Tepe
  9500–8000, Çayönü and its copper workshop c. 6900–6800, Çatalhöyük 7500–5600), Mesopotamia (Hassuna, Halaf, Samarra,
  Ubaid with Tell el-'Oueili and Eridu c. 5400), Iran and Central Asia (Chogha Golan, Ganj Dareh's goats c. 8200, Jeitun,
  Chogha Mish, Tepe Sialk, Shahr-e Sukhteh c. 3550), the Caucasus (Shulaveri–Shomu, the earliest winemaking c. 6000).
- **Egypt:** Nabta Playa (c. 7500; the stone circle c. 4800), Faiyum A, Merimde, the Badarian, Naqada I.
- **Africa:** the Capsian (9000–5400), Gobero and the Dufuna canoe (Green Sahara peoples).
- **Europe:** Star Carr (9335/9275–8525/8440), the Maglemosian, Lepenski Vir, farming reaching Greece (c. 7000), Starčevo,
  Cardial Ware, Linear Pottery, Vinča, Varna (4569–4340), Carnac (4500–3300).
- **South Asia:** Mehrgarh (Jarrige's pre-7000 and Mutin and Zazzo's 5250–4650 both as claims), Bhirrana (disputed),
  Lahuradewa.
- **East Asia and Oceania:** Pengtoushan rice (8200–7800), Jiahu, Peiligang, Xinglongwa, Hemudu, Yangshao (Banpo phase),
  Hongshan, Dawenkou, Early Jeulmun, Early Jōmon (8500–3520; peaches from China 4700–4400), Kuk Swamp (drainage c. 9,000
  years ago; bananas 6,900–6,400 years ago).
- **Americas:** Plano bison hunters, Koster's dogs (9,900 years ago), Windover, squash at Guilá Naquitz (by 8,000 BP;
  the questioned 10,000 BP as a claim), maize (about 9,000 years ago), Cueva de las Manos (7300 BC), potatoes (7,000–10,000
  years ago), Paloma, Huaca Prieta.
- **App changes:** a 1000-year zoom step; the ancient timeline opens at 500 years per tick; historical timelines open on
  the median event date instead of the middle of their range (otherwise the opening view sat in the near-empty early
  Holocene). The subtitle and description now say c. 9000–330 BCE.
- **Judgment calls (please check):**
  - Rows that began before 9000 BCE keep their stated starts (PPNA 10,000, Chogha Golan c. 10,050 from 12,000 BP, Star
    Carr 9335), so the ruler reaches a little further back than 9000.
  - Where a page gives only "years ago" or BP, the event uses year − 1950 (e.g. maize 7050 BCE, Kuk drainage 7050 BCE,
    potatoes 6550 ± 1500).
  - Mehrgarh, Bhirrana and Lahuradewa have strongly disputed dates; each event carries the competing values as claims,
    so their drawn ranges are wide on purpose.
  - The Starčevo event keeps the infobox span (6200–4500); its page's body says 5500–4500.
- **Key events (27)** and **minor (2)**: see `docs/ancient-key-events.md`.
- **Left out:** the Natufians (ended c. 9500), Faiyum B and Tasian (summary-heavy), the Tassili rock-art periods (summary
  only), Sesklo's population and "invasion theory", the Archaic-period timeline entries (a list without sources in the
  page), Koster's mounds, Kennewick Man, Mount Mazama, and items read only in summary (e.g. the Talheim Death Pit, Goseck
  circle, Jericho's 1981–83 tower dates).

## Eleventh pass: more of the early Holocene (18 November 2026)

Gaps left by the tenth pass, in `scripts/additions/neolithic-2.ts` (run before `groups.ts`). 29 events, 29 sources, 13
rows. Three web-fetch agents read about 35 pages; none carried an AI-text warning. Not found (404): Khartoum Mesolithic,
Kuahuqiao culture, Shangshan site, Ñanchóc; *Las Vegas culture* redirects to the city in Nevada. *Prehistoric Iberia*
(where *Neolithic Iberia* redirects) was read only in summary, so Neolithic Iberia is not added yet.

- **Near East:** Karahan Tepe (9750–9400; the lead's 10,000–9500 as a claim), Nevalı Çori (8400–8100), Aşıklı Höyük
  (8200–7400), Abu Hureyra's second occupation (8600–5800), Byblos (8800–7000), the Yarmukian (6400–6000), Jarmo
  (7090–4950), Tell Brak (from 6500; city walls and 130 ha in 4200–3600).
- **Africa:** Ounjougou, the earliest pottery in Africa (before 9400 BCE); Early Khartoum (8800–5000 BP).
- **Europe:** the Pesse canoe (8040–7510), Doggerland's flooding (Britain cut off by around 6500 BCE), the Storegga tsunami
  (6225–6170), Ertebølle, Hamangia, Dimini (with the invasion theory and Lyritzis's dates both described), Goseck,
  Lengyel, Michelsberg, Barnenez (4850–4000), Knap of Howar (3800–2800).
- **East and Southeast Asia:** the Bacsonian (8000–4000) on a Hoabinhian row (10,000–2000; Gorman's Spirit Cave plant
  claims are described with Higham and Thosarat's rejection), Cishan, Houli, Daxi, Majiabang.
- **Americas:** Caverna da Pedra Pintada (11,200–10,000 years ago; earliest known cave paintings in the Americas), the
  Spirit Cave mummy (c. 7420 BC).
- **Judgment calls:** Karahan Tepe sits on the Göbekli Tepe row (same region, related sites). Early Khartoum sits on the
  Nubia row. Knap of Howar sits on the megalith builders' row, though it is a house. Kuahuqiao's date appears only in the
  *List of Neolithic cultures of China*, marked tentative, so it is left out.
- **Key events (5):** Karahan Tepe, Tell Brak as a city, Ounjougou pottery, Doggerland, Pedra Pintada. Minor: the
  Yarmukian.

## Twelfth pass: Iberia, the Southwest and the Sahara (18 November 2026)

`scripts/additions/neolithic-3.ts` (run before `groups.ts`): 17 events, 13 sources, 4 rows. Two web-fetch agents read
about 20 pages; none carried an AI-text warning. *Prehistoric Iberia* was this time read verbatim through its Neolithic
section.

- **Iberia** (a new Neolithic row in the Iberian Peninsula): the Almendres Cromlech (6000–4000, in three phases), the
  first farmers (c. 5700, Cardium pottery; "the 6th millennium BC" as a claim), the first dolmens in southern Portugal
  (c. 4800), the Dolmen of Menga (c. 3700; the lead's 3750–3650 as a claim).
- **Asia and Oceania:** Kuahuqiao (c. 6000–5600: dugout canoe, paddy rice 7700 years ago, flooded about 7,550 years ago;
  on the Hemudu row), Budj Bim's eel traps (6,600 years old), Sanganakallu (c. 3000 BC).
- **Africa:** the Saharan rock-art periods (Round Head 9500–7000 BP, Pastoral 7200–3000 BP, Horse 3200–1000 BP), the
  Wilton culture (8,000–4,000 years ago), the Kintampo complex (2500–1400 BCE; Watson's 3,600–3,200 bp as a claim).
- **Americas:** the Las Vegas culture of Ecuador (8000–4600 BC from *Pre-Columbian Ecuador*'s lead; its own subsection's
  9000–6000 BC as claims), and the US Southwest: the Oshara Jay phase (7,450 BP; Gibbon and Ames's 6050 B.C. as a claim),
  maize in the Armijo phase (3,750–2,750 BP), the Basketmaker culture (from about 1500 BCE), the Cochise San Pedro phase
  (1500–200 BC).
- **Left out:** the Natufians (they end c. 9500 BC), the Murujuga rock art (40,000–50,000 years old), the Cochise lead's
  "c. 5000" (no era given), the Wilton rock shelter's unitless dates, and Utnur and Budihal (their pages have no dates).
- **Key events (3):** the first farmers in Iberia, Las Vegas, Budj Bim. Minor: Sanganakallu, the Horse period.

## Thirteenth pass: ideas, literature and landmarks (18 November 2026)

`scripts/additions/ideas.ts` (run before `groups.ts`): 31 events, 31 sources, all on existing rows. Three web-fetch
agents read 34 pages. Not used: *Tao Te Ching* and *Warring States period*, whose banners cite the LLM translation
guideline (Laozi's dates come from his own page; the Warring States start was already in), and the Upanishads, whose
chronology section was read only in summary.

- **Mesopotamia, the Levant and Iran:** Eannatum's Stele of the Vultures (c. 2450; the stele's own page gives 2475 and
  2460, as claims), Urukagina (2378–2368), Gudea (2144–2124; the lead's 2150/2130–2120/2110 as claims), the Old Babylonian
  Epic of Gilgamesh (c. 1800), Tushratta (1358–1335), Hazor's destruction by fire (13th century) and its capture by
  Assyria (732), Ashurbanipal's library (668–627), the return from exile (539), the Cyrus Cylinder (539), Persepolis
  (515; the stairway's 519 as a claim), Zoroaster (date unknown: c. 1000 ± 500 as the scholars' range, the traditional
  624–599 birth as a claim).
- **Greece:** the Iliad and the Odyssey (late 8th or early 7th century), Hesiod (750–650), Thales's eclipse (585, per
  Herodotus), Pythagoras at Croton (c. 530), Thermopylae (480), Pericles (461–429), the Parthenon (447–438; the
  infobox's 432 as a claim), Socrates (399), Plato's Academy (c. 387), Aristotle's Lyceum (335; the lead's 334 as a
  claim), the Mausoleum (353–351), Herodotus (c. 484–425).
- **China and India:** Confucius (c. 551–479), Laozi (traditional 6th century, with the 4th-century dating as a claim),
  Sun Tzu (traditional 544–496), Mozi (c. 470–391), the Hundred Schools (c. 500–221), Shang Yang's reforms (356–338),
  Pāṇini (6th–5th or 4th century BCE, both as claims).
- **Judgment calls:** Zoroaster sits on the Iran region row (no period row fits a date this uncertain); Pāṇini on the
  South Asia region row; Gudea on the Sumer row (between the Akkadian and Ur III periods). Traditional dates are
  labelled as such in the titles (Laozi, Sun Tzu).
- **Key events (11):** the Stele of the Vultures, Gilgamesh, Ashurbanipal's library, Persepolis, Homer, Thermopylae,
  the Parthenon, Socrates, the Academy, Confucius, the Hundred Schools.

## Fourteenth pass: peoples who pressed the great powers (18 November 2026)

`scripts/additions/peoples.ts` (run after `ideas.ts`, before `groups.ts`): 37 events, 21 sources, 8 new rows. Three
web-fetch agents read 24 pages; none carried an AI-text banner. The rule for inclusion (the author's list): a people named
in a major power's records with at least one datable event that changed that power's history. Rows sit beside the power
they pressed, as the proximity rule requires.

- **Rows:** the old *Aram-Damascus* row (id `aram`, kept for links) is now **Arameans** (c. 1100–732), with
  Aram-Damascus (unchanged span; Hazael and the fall of Damascus moved onto it) and **Bit-Adini** (c. 1000–856) as
  sub-rows. **Amorites** (c. 2500–1595) and **Chaldeans** (c. 940/860–539) sit beside Babylonia, **Hurrians**
  (c. 2250–672) beside Mitanni, **Kaska** (c. 1450–late 12th century) beside the Hittites, **Qedarites (Arabs)**
  (853 – 1st century BCE) beside North Arabia, and **Rong and Di peoples** (no span; events only) beside Zhou.
- **Arameans and Chaldeans:** Tiglath-Pileser I's "Ahlamu of the land Armaya" (c. 1100), Suteans and Arameans enter
  Babylonia (c. 1100), Assyria's withdrawal after Ashur-bel-kala (1056) and the Aramean states (late 11th century),
  Ashur-dan II (934–912), Qarqar (853), Bit-Adini annexed (856–5), Aramaic as lingua franca (mid-8th century), the first
  Chaldeans (852), Marduk-apla-usur (780), Marduk-apla-iddina II (722–710, 703–702). Nabopolassar is also on the
  Chaldean row (the page's "Chaldean dynasty", 626–539).
- **Amorites, Lullubi, Hurrians:** Naram-Sin at Jebel Bishri (c. 2240) and his Lullubi stele (c. 2250, caption);
  Sumu-abum, Shamshi-Adad I and Hammurabi also on the Amorite row; Tupkish of Urkesh (c. 2250), Hurrians at Alalakh
  (1725), Urkesh abandoned (c. 1350), Shupria conquered (673–672).
- **Kaska and Mushki:** first mention under Hantili II (c. 1450), the burning of Hattusa and the court at Samuha
  (1375–1350), the second sack under Muwatalli II (early 13th century), the Mushki–Kaska attack on Alzi (c. 1160),
  Tiglath-Pileser I and the Mushki (1115 on *Mushki*, 1112 on *Tiglath-Pileser I*, both kept), Mita as Sargon II's
  ally (709).
- **Qedarites:** Zabibe's tribute (738), Šamši's revolt (733–732), Sennacherib's campaign (691), the
  Šamaš-šuma-ukin revolt (652–648).
- **Rong and Di:** King Mu and the Quanrong (c. 964), raids under King Li (877–841), the sack of Haojing (771; linked
  as the cause of the move east), the Red Di take Wey (660), the Rong fade after 650, Zhongshan (414–296), Qin defeats
  the last Rong (314).
- **Egypt:** the Medjay first recorded under Pepi I (2332–2287), the pan-graves and Medjay police (1800–1550), the
  Shasu of yhw at Soleb (14th century).
- **Judgment calls (please check):**
  1. The Hurrian row ends at Shupria's fall (673–672), its last dated Hurrian kingdom; the page says only that Hurrians
     were assimilated "by the Early Iron Age".
  2. The Kaska row ends late in the 12th century (stored as 1130–1101), when Tiglath-Pileser I last records them.
  3. The burning of Hattusa has no date of its own; it is drawn over Tudhaliya III's and Suppiluliuma I's years at
     Samuha (c. 1375–1350).
  4. The Medjay police event uses the pan-grave dates (1800–1550) because the page gives no year for Kamose's campaign
     or the 18th-Dynasty police force.
  5. *Beidi* has a "needs more citations" banner and most History lines are tagged; only the Wey sack (660) and
     Zhongshan's end (295, as a claim) come from it, and the event says so. *Lullubi*'s Ur III and later sections are
     unsourced and were not used.
  6. Mesopotamian and Anatolian rows inherit the region's Middle chronology; the Rong and Di row inherits China's menu.
- **Gaps (summary only or not on the pages):** Tiglath-Pileser I's Euphrates crossings (no count on his page); the
  Ur III wall against the Amorites (undated, and *Muriq-Tidnim* returned 404); Aramean conquests from 911 and
  Babylon's rule over Aramean lands (Arameans page tail, summary only); Ashurbanipal's 645 Arab campaign; the Semna
  Despatches' Medjay; Duke Mu of Qin (on none of the pages).
- **Key events (3):** the Aramean states, the Quanrong sack of Haojing, Marduk-apla-iddina II. Minor (11): the Medjay's
  first mention, Urkesh abandoned, the Kaska's first mention, the Rong fade, the Mushki at Alzi, Sennacherib's Qedarite
  campaign, Marduk-apla-usur, King Mu and the Quanrong, the Di take Wey, Suteans and Arameans in Babylonia, Bit-Adini
  annexed.
