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
22. **Row order runs west to east so civilizations that interacted sit together:** Aegean, Sea Peoples,
    Egypt, Levant (between Egypt and the Hittites, as on the map), Anatolia (Hittites, then Urartu next to
    Assyria), Mesopotamia (Mitanni, Assyria, Babylonia, Akkad, Sumer: Sumer sits next to Elam), Iran &
    Central Asia (Elam, Medes, Persia, Mannaea, Jiroft, Oxus), Dilmun, Indus, then China and the Americas,
    which had no contact with the rest. "Other powers" is gone: **Mitanni** is under Mesopotamia (its
    heartland was in upper Mesopotamia, and this keeps it next to Assyria without separating Anatolia
    from Mesopotamia), and the **Sea Peoples** and **Dilmun** are regions of their own. Achaemenid Persia is
    under Iran & Central Asia.
    - A test (`src/data/proximity.ts`, "ancient regions that interacted sit near each other") counts
      the events and links each pair of regions shares. Pairs sharing 5 or more must be within 3 regions;
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
