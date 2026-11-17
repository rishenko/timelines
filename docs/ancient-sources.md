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
