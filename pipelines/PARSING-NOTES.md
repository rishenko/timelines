# Parsing notes: Wikipedia and Wikidata dumps

What we have learned about parsing the dumps, so the next timeline doesn't relearn it. **Read this before touching a
dump**, and add to it whenever something costs you time.

Each entry gives:
- the problem, with a real example;
- what the code does about it, naming the function;
- known misses and false positives, with rates where a pilot measured them.

Unless noted, numbers come from enwiki-20261101 and the extractor's WW1 pilot (2026-11-22).

## The dump itself (multistream XML)

**Size and shape.**
- `enwiki-20261101-pages-articles-multistream.xml.bz2` is 27.0 GB.
- It holds 25,991,252 pages in all namespaces, in 259,950 bz2 streams of 100 pages each.
- 7,259,919 of those pages are articles (namespace 0, not redirects).
- `index.sqlite` maps title → stream offset.

**Reading.**
- *By title:* `common/wp_dump.page()` seeks to the stream and decompresses just that one. A stream is about 100 KB, so reading a page takes milliseconds.
- *All of it:* `extract/build_index.py` gives each worker a slice of the offsets.
  - Measured: 8 workers on this Mac, 20 min of streaming plus 3.3 min of indexing.
  - One core with a light parse reads about 24 MB/s of XML.
  - Never unpack the dump to disk.

**What the XML has.**
- Each page gives its title, ns, id, revision id (`<revision><id>`, usable as a source's v5 `revision`), redirect and text.
- It has **no page props**, so no Wikidata QID ([page_props](#page_props-sql)).
- Text is XML-escaped: unescape `&lt; &gt; &quot; &#039; &amp;` once (`build_index.unesc`, `wp_dump._raw`).

**Redirects.**
- Redirects are pages with `<redirect title=…>`.
- `wp_dump.page()` follows one hop.
- Inbound-link counts fold links to a redirect into its target (`build_index`, the `inlink` table).
- In the Connections claims, redirect targets are indexed too (`modern-states/connections/build_claims.py`, `PAGES`).

**AI-generated-text flag.**
- Pages carrying `{{AI-generated…}}`, `{{LLM-generated…}}` or `{{AI-written…}}` are refused as sources (`wp_dump.ai_flagged`, also in `build_index.AI_FLAG`).
- There are 11,104 such pages in the dump, and 4 turned up in the WW1 set: Battle of Orlau-Frankenau, Battle of Bughaila, Baghdad and White flag.
- They are listed in the `page` table with `ai_flag=1` and nothing else is stored.
- **Some flags cover one section only** (`{{AI-generated|section|…}}`): Austro-Prussian War, Magyarization, White flag. Kevin's rule skips the whole page anyway. In the 1848 pilot, 3 of the 4 flagged pages hit were section flags, and all were real.

## Infoboxes

**Finding them.**
- `{{Infobox <type>` with the type lowercased (`build_index.INFOBOX`).
- 4,712,855 articles have one; 861,042 have date-like fields (1,062,901 field rows).
- Parse only the infobox's own text with mwparserfromhell, matching braces first (`build_index.braces_end`, `infobox_fields`); parsing whole pages is slower and gains nothing.

**Which fields date the subject.**
- Event infoboxes (military conflict, civil conflict, revolution, treaty, election…) use `date`, `start_date`/`end_date`, `signed`, `effective`.
- State infoboxes use `life_span`, `year_start`/`year_end`, `date_start`/`date_end`, `event_start`/`event_end`, `eventN`/`date_eventN`, `established_*` (`common/wp_states.DATED`).
- A state's, person's or organisation's date fields date the subject, not an event. `topics.NOT_EVENT_BOX` keeps country, settlement, person, military unit, ship… out of the "event-like" test.
  - Without it, the WW1 link route pulled in Holy Roman Empire and British Army.
  - The category route also pulled in people, awards and holidays (Harry Lee (cricketer), Commemorative Medal for the Italo-Austrian War, Veterans Day), so biography, sportsperson, award, medal and holiday infoboxes are excluded too.

**One field, several dates.**
- `date = End of 1917 (1st battle), June 1918 (2nd battle) and October 1918 (3rd battle)` (Battle of Monte Grappa) gives three spans, all kept as candidates.
- `date = 28 July 1914 – 11 November 1918/13 November 1918` (European theatre of World War I): the second end is kept as an alternative (`dates.spans` → `alts`).

**Footnotes hold the alternative date.**
- `{{efn}}` and `<ref>` inside a field often give "Some historians mark the beginning as 800".
- `common/wp_states.py` keeps them as notes on the field. `dates.clean` drops them, so the extractor doesn't see these alternatives yet.

**Piped links in predecessor/successor fields:** `Target{{!}}label` means the target is the part before `{{!}}` (`wp_states`, `PRED` handling).

**An article's end used as another phase's start** (Egypt's 1971 renaming, taken from the UAR's end) must not pick up that article's other *start* years as extra claims (`common/wp_claims.claims`).

**Values cut short.** The side tables store at most 2,000 characters of a field. A long `{{efn}}` footnote then loses its closing braces, and its years leak into the dates: American Civil War's `date` gave 313 and 2001, which let it into the 1848 topic. `dates.clean` drops an unclosed template or `<ref>` through to the end of the value.

**Infobox versus body.**
- Infobox and body often disagree. In the WW1 pilot, 368 of about 1,300 clusters had an infobox start that matched none of the lead's dates (`report.md` lists them). Many of those are the lead naming other dates, not real conflicts.
- Medieval's rule (Kevin, 2026-11-22): use the body's year, citing the sentence that names it, and keep the infobox year as a noted claim (`medieval/gen_medieval.py`, "Infobox vs body").

## Date strings (`extract/dates.py`)

All of these have unit tests in `extract/test_dates.py`.

**Ranges.** The left side borrows what it lacks from the right (`dates._resolve`):

| Form | Example | Note |
|---|---|---|
| Day range | `24–29 April 1916` (Easter Rising) | The design prototype read this as 29 April only. |
| Day–month range | `24 April – 1 May 1916` | |
| Month range | `June–July 1848` | |
| Two-digit end year | `1914–18` | |
| BC range | `44–42 BC` | |
| US day range | `February 11–16, 1862` | |
| Same-month day | `March 24 to 29` | A bare number up to 31 on the right is a day, not a year. |

**Dash spellings:** `–` `—` `−` `-`, `{{snd}}`, `{{ndash}}`, `&nbsp;–`, plus the words "to", "until" and "through". All are read as range dashes (`dates.clean`, `TOKEN`).

**Date templates.**
- `{{Start date|1914|7|28}}`, `{{End date}}`, `{{Start and end dates|y|m|d|y|m|d}}` and `{{dts}}` become text (`dates._templates`).
- Malformed arguments exist (`{{start date|1914|13|40}}`): keep only the year.
- `{{Age in years…}}`, `{{efn}}` and refs are dropped.
- The generators' version is in `common/wp_states.py` (`YMD_TEMPLATES`, `WRAPPERS`, `LISTS`).

**Link labels:** `[[Skirmish at Joncherey|2 August 1914]]` reads its label.

**Counts that look like years.** This was the biggest source of false dates.
- **Rate:** in the first WW1 run, 2,847 of 13,907 candidates (20%) had a "year" before 1000. After the fixes below, 66 of 11,069 (0.6%).
- **Thousands, decimals, percentages, compounds and clock times** are masked first (`dates.QUANTITY`): "1,423 casualties", "38.7%", "a 150-person posse", "06:00".
- **A bare number is a year only after a year word** ("in", "since", "by", "until", "during"…; `YEAR_BEFORE`), or before punctuation, a dash or an era.
  - Weak words ("of", "the", "and") allow only four-digit years (`YEAR_BEFORE_4`): "of 1848" yes, "of the 369 seats" no.
- **A year under 1000 followed by a word is a count** ("3 April 500 men", "16 July 16 Squadron"), unless a year word came before it ("In 476 the…") (`dates._atom`, `count`).
- **After a month, a number up to 31 is a day.** "before January 23 were treated" has no year.
- **Known misses:** ancient dates in prose without "BC" or a year word, and some leftover counts (about 0.6%).

**Old Style.**
- Signals: `O.S.`, `Old Style`, `Julian` and `{{OldStyleDate|…}}` flag the whole span (`old_style`). Dates are kept as written, never converted.
- A bracketed twin `8 March [O.S. 23 February] 1917` is dropped and only flags the span.
- 108 WW1 candidates were flagged.
- **False flags:** a field such as `23 – 29 December 1916 (O.S.) ; 5 – 11 January 1917 (N.S.)` (Christmas Battles) flags its New Style span too.
- **Not caught:** Julian/Gregorian slashes like `January 2/15, 1919` (Romanian front) are read as a date plus an alternative, unflagged.
- Wikidata's calendar model (`Q1985786`, Julian) will cross-check.

**Years in section headings.**
- Timeline pages give `| January 2` under `==1915==` (Timeline of World War I).
- Some use month subheadings (`=== January 1919 ===` under `==1919==`), and a dated bullet whose events sit on the deeper bullets below it (`*21 January:` then `**Soloheadbeg ambush: …`; Timeline of the Irish War of Independence).
  - `extractors.heading_year` reads a year or month-and-year heading and carries it into the subsections until a heading that isn't a date.
  - The nested bullets take the pending date.
  - On that page, rows went from 0 to 941.
- Appending the heading's year needs two forms: "12 August" + " 1922", but US order "August 24 – 26" + ", 1914". Both are tried and the more precise result is kept (`tables_and_lists.dated`).
- A row's date with no year takes its heading's year, only when the heading is exactly a year and the cell names a month (`extractors.tables_and_lists`). The year is appended as `, 1915`, so day ranges still parse.
- "Post-1920" is not a year heading: it once dated the caliphate's 1924 abolition to 1920.

## Text: lead, sections, sentences

**Sentences.**
- Text is split after `.!?` followed by a capital (`extractors.SENT`), but not after abbreviations, initials or regnal citations (`extractors.sentences`, `ABBREV`).
  - Examples: "On May 15, 1918, the U.S." (Bisbee Deportation), "Gen. Allenby", "J. R. Smith", "10 & 11 Geo. 5" (Government of Ireland Act 1920).
  - The cost: "…in the U.S. They were…" stays one sentence, which is still a verbatim quote. Section text is cleaned first: templates, tables, and file and category links are removed (`extractors._strip_templates`).
- Medieval reads whole articles by section (`medieval/med_sections.py`). A list joined into one "sentence" with " / " is quoted by the item that holds the phrase (`gen_medieval`).

**Quotes must be found again.**
- Every candidate's quote is checked to occur verbatim in the cleaned page (`extractors.check_quote`).
- Table rows are quoted by their event cell, not the joined row: joined cells never occur in the page, and that cost 9,328 false drops in the first run.

**Galleries.** `<gallery>` blocks put file names and captions into sentences ("The British Naval Campaign in the Baltic, 1918-1919 Q19369.jpg", British campaign in the Baltic). They're removed before splitting (`extractors._strip_templates`).

**Prose volume.** Prose gives most candidates (6,940 of 11,069 for WW1). It is capped at 40 per article (`--prose`) and needs a day or month date: bare years in body sentences are too noisy.

## Tables and lists

- **Rows:** split on `\n|-`, then cells on `||`, `!!` or a newline `|`.
- **Cell attributes** (`align="right"|5,202`) are stripped (`extractors.ATTRS`).
- **Statistics tables:** rows without a text cell (casualty and strength tables) are skipped (`WORDS`).
- **Event cell:** the longest text cell. Theatre columns ("Eastern") are shorter.
- **Bullet lines:** `* 28 June 1914: …` and `* 1848 – …` are read as dated rows. The subject is the line's first link that isn't a date.
- **Bibliographies read as dated rows:** "Coogan, Tim Pat (2001). 1916: The Easter Rising" made Tim Pat Coogan and the National Library of Ireland top Easter Rising clusters. Back-matter sections (References, Further reading, Bibliography…) are skipped for tables and lists too (`extractors.BACK_MATTER`).
- **Timeline pages arrive by any route:** Timeline of the Irish War of Independence came by campaignbox, not by the list route. Any page titled like a timeline or event list gets its tables read (`extract.py`, `LIST_TITLE`).
- **Known gaps:** `rowspan` dates (a date cell shared by several rows) and nested tables aren't read.

## Categories

- **From wikitext:** `[[Category:…]]` from articles (ns 0) and category pages (ns 14, which gives the tree) (`build_index`, `CAT`). That's 47.8M rows.
- **Template-added categories (Kevin's decision 1):** reading wikitext misses categories that templates add. Measured on 20 random WW1-pilot articles against the live API's visible (non-hidden) categories: 176 from the API, 177 ours, **0 missed**. The one extra is drift between the dump and the live page. Hidden maintenance categories weren't counted.
- **Category tree route:** eponymous category, depth 3, stop words for people, ships, units, works and memorials (`topics.CAT_STOP`). For WW1 that's 340 categories walked and 1,008 event-like articles. 4,832 articles were left out as not event-like.

## Campaignboxes and navboxes

- **Counts:** 29,301 campaignbox uses in articles (`campaignbox_use`); 5.9M links on navbox and campaignbox template pages (`nav_member`, from ns-10 pages using `{{Navbox`, `{{Campaignbox` or `{{Military navigation`).
- **Name variants.** One box can have several spellings: `Campaignbox Atlantic 1914 - 1918` and `Campaignbox Atlantic 1914–1918`; `Kamerun Campaign` and `Kamerun campaign`. Titles are normalised (first letter capitalised, underscores to spaces), but dashes and case inside aren't.
- **Depth-2 drift.** A battle's article also carries boxes for older wars (Russo-Ottoman Wars, Scramble for Africa, French-Habsburg Conflicts).
  - A member's other boxes count only when they overlap the set by at least 30% (`topics.BOX_OVERLAP`), name a seed or its initials ("Serbia WWI"), name only years within the seeds' dates ("Baltic Sea 1914–1918"), or are named after the article carrying them ("Sinai and Palestine" on "Sinai and Palestine campaign").
  - **WW1 known misses:** Kamerun Campaign, Romanian Campaign, South Arabian Campaign.
  - **Excluded correctly:** Russo-Ottoman Wars, Second Saud-Rashidi War, Portuguese colonial campaigns, Early Malaysian Rebellion.
- **Not every topic has one.** Revolutions of 1848 has no campaignbox, so its articles come from categories and links.

## Timeline and list pages

- Match case-insensitively: "Timeline of the revolutions of 1848" doesn't capitalise the seed's "Revolutions".
- Match the seed as a whole name: `LIKE '%World War I%'` also matches "World War II" and pulled in 20 WW2 weapon and division lists (`topics`, `whole`).
- Keep only timelines and lists of events (battles, operations, campaigns, treaties…): `topics.LIST_TITLE`.

## Topic membership (`extract/topics.py`)

- **Seeds mention other events** (comparisons, legacy). The 1848 article links American Civil War, French Revolution, Arab Spring and Revolutions of 1989.
  - The category and link routes keep only articles whose infobox dates (or, without them, the years in their title) touch the topic window: the seeds' own dates, a year before and five after (`overlaps`, `WINDOW_AFTER`).
  - 1848: 20 left out, e.g. French Revolution, Kraków Uprising, Second Schleswig War.
- **Events without an infobox** (March Revolution, Vienna Uprising, Hecker uprising) count as events when their title names one ("uprising", "revolution", "battle", "treaty"…; `EVENT_TITLE`).
  - The seed's own name is removed first, so "World War I cryptography" doesn't pass on "war".
  - Titles about many events or about things are kept out: lists, histories, effects, orders of battle, camps, stamps (`NOT_EVENT_TITLE`).
  - **False positives:** in WW1, 189 of 1,324 articles had no infobox, and about 1 in 5 of those aren't single events (World war, Imperial War Cabinet, Aviation in World War I; the seed's other name "First World War" isn't stripped).
- **Clusters for timeline rows:** a row groups under the article it links only when that article is an event. Otherwise it stands alone, named by its own text, because many rows link a person or organisation first ("Sinn Féin", "Irish Volunteers" in Timeline of the Irish War of Independence).
  - The cost: those rows are classified from their text alone, and the shared classifier has no rules for ambushes, killings, raids or arrests. 599 of the Easter Rising's 1,101 clusters got no category.
- **Coverage, 1848:** 13 of the 16 expected events that have their own article were found. Misses: Frankfurt National Assembly (legislature infobox), Roman Republic (1849–1850) (country infobox), Chartism (a movement, no event title).
- **Easter Rising:** its campaignbox (Irish independence) covers 1912–1923, so 73 of 82 articles are the wider war. The window sorts the 596 rows outside 1915–1921 last.

## page_props SQL

- QIDs come only from `enwiki-<dump>-page_props.sql.gz` (486 MB), in its `wikibase_item` rows: 10,370,892 QIDs (`extract/page_props.py`).
- Each row is on its own line after the `INSERT INTO … VALUES` line. The first loader looked only at `INSERT` lines and read 0 rows; match rows on every line.

## Wikidata JSON

- **One stream, read in parallel.** `wikidata-20261116-all.json.bz2` is 95.7 GiB of a **single** bz2 stream, so pbzip2 doesn't help. `indexed_bzip2` decompresses it at about 600 MiB/s on 3 threads (`extract/wikidata.py`).
- **It is much bigger unpacked than the ratio suggests.** I first guessed about 10:1 (970 GiB). The first full pass was paused at **1,696 GiB of JSON (118.6 million lines) and hadn't ended**, so the ratio is at least 18:1. Budget about 2 TiB and 2+ hours at 266 MiB/s; the item count (about 120 million entities) is a better progress guide than bytes.
- **Full pass, schema 2, 2026-11-22: complete.** 1,723 GiB of JSON (18:1 over the 95.7 GiB bz2), **122,308,975 lines**, 119.7 min at 246 MiB/s (2 threads + 2 workers, nice 15). It kept 2,635,917 items; the table file is 889 MiB with 5 indexes.
  - Claims: P571 736,552, P577 630,959, P585 432,227, P580 146,326, P582 118,692, P576 86,263, P575 42,914.
  - Links: P31 3,001,300, P39 792,267, P1344 632,090, P361 455,598, P607 130,117, P1313 62,736, P61 50,639, P6 47,126, P35 2,285, P1906 595.
  - Qualifiers: P580 567,654, P582 467,403, P585 14,673.
  - Checks: Q361 (WW1) 1914-07-28 to 1918-11-11; Germany has 11 heads of government and 15 heads of state, all with start dates (`wd_status.py`).
  - P35 is thin (2,285): most polities' heads are reachable only through the office route (P1906 → P39).
- **First pass, paused 2026-11-22 at 1,696 GiB** (108.8 min, 266 MiB/s, 2 threads + 2 workers): 1,456,469 items kept; claims P571 733,194, P585 422,967, P580 143,832, P582 116,785, P576 85,841; links P31 1,787,181, P361 450,351. The table file is 230 MiB. Indexes are built only at the end.
- **Framing (checked):** a `[` line, then one entity per line with a trailing comma, then `]`.
  - Lines are big: the first items are country-sized (Q31 is over 300 KB).
  - The first 1 GiB held only 25,496 entities.
- **Speed is in the parsing.** On one core, `json.loads` held the pass to about 110 MiB/s.
  - A cheap byte filter first: the line contains `"enwiki"` and one of the wanted property ids.
  - Then 2 parsing workers: about 175–250 MiB/s with about 3 cores busy (Kevin's cap is 4).
- **`export_index` hangs.** `indexed_bzip2`'s `export_index` hung (0% CPU, a 0-byte index file) after a short run on this dump. That cost an hour of "slow" tests that were really hung.
  - Resuming no longer uses the index: the pass saves its JSON offset and skips back by decompressing (`wikidata.py`, a `PAUSE` file or SIGTERM to stop).
  - Close the `indexed_bzip2` file before exiting, or its threads abort Python ("Detected Python finalization from running rapidgzip thread").
- **Kept (schema 2, from 2026-11-22):** items with an English article and any of these, plus their P31 instance-of (P31 alone doesn't keep an item):
  - dates: start (P580), end (P582), point in time (P585), inception (P571), dissolved (P576); for the science pass, time of discovery or invention (P575) and publication date (P577);
  - links: part of (P361); for the row passes, head of government (P6), head of state (P35), office held by head of state/government (P1906/P1313), position held (P39), participant in (P1344), conflict (P607); for the science pass, discoverer or inventor (P61).
  - Schema 1 (the paused first pass) had only the five dates and P361/P31. `wikidata.py` refuses to resume a schema-1 file; `--restart` rebuilds it.
- **Who held an office when lives in qualifiers.** A polity's P35/P6 lists every head with P580/P582 *qualifiers* on each statement, and a person's P39 does the same for each office. Germany's P6 lists all eleven chancellors from Adenauer (1949-09-20 to 1963-10-11) on. `wikidata.py` keeps P580, P582 and P585 qualifiers on every link statement except P31, in `wd_qual`, joined to `wd_link` by the statement id (`sid`, set only when there are qualifiers). In the first 1 GiB, 4,094 of 5,340 P39 statements had time qualifiers.
- **Two routes to a polity's rulers.** P35/P6 on the polity itself (complete for modern states), or P1906/P1313 → the office (France → President of France) → every person whose P39 names that office. The second route reaches historical monarchs, who are seldom listed on the state's own item. Not yet measured on Ancient or Medieval rows.
- **Unknown and none values are skipped.** `somevalue` and `novalue` snaks (main or qualifier) carry no date or item and aren't stored (`wikidata._value`).
- **`wd_join.dates` reads only the start and end props.** Before schema 2, every non-start prop counted as an end; P575/P577 would have shown up as false end dates.
- **The new props in the first 1 GiB** (1 thread, 1 worker, 129 MiB/s): 10,869 items kept (schema 1's props alone keep 5,633); links P39 5,340, P1344 4,311, P361 3,287, P6 1,740, P1313 1,392, P607 1,250, P61 833, P35 137, P1906 46; dates P577 1,374, P575 646. The first GiB is country-heavy, so these rates won't hold for the whole dump; expect the full table file to grow by several times from the first pass's 230 MiB.
- **Time values:**
  - Format: `"+1914-07-28T00:00:00Z"` with a `precision` (9 year, 10 month, 11 day) and a `calendarmodel` (Q1985727 Gregorian, Q1985786 Julian).
  - Month and day are `00` below their precision (`+1848-00-00`).
  - `wd_join.wd_time` reads `-0044` as 44 BC, Wikidata's documented convention, not yet checked against a known BC item.
- **Comparing with Wikipedia** (`wd_join.compare`):
  - Only infobox dates (the article's own) are compared. A lead or table row may date something else: in a first try that compared every row, 74% "differed".
  - A P585 point in time on a ranged event is often its end or a day inside (Battle of Lahti), so a P585 inside the range counts as agreement.

- **Pilot reruns with the complete schema-2 tables (2026-11-22).** Infobox rows only (the articles' own dates); a P585 inside the range counts as agreement.

  | Pilot | Infobox rows | Have a Wikidata date | Agree | Differ | Julian | Part-of route found | New articles (before → after) |
  |---|---|---|---|---|---|---|---|
  | WW1 | 1,115 | 986 (88%) | 805 | 181 (18%) | 1 | 729 | 84 (1,324 → 1,408; rows 11,726 → 12,163) |
  | 1848 | 120 | 102 (85%) | 84 | 18 (18%) | 0 | 46 | 0 |
  | Easter Rising | 47 | 41 (87%) | 38 | 3 (7%) | 0 | 2 | 0 |

  - "Part-of route found" counts every article that route reaches; most were already found by links or categories, so only WW1 gained new ones.
  - Every article had a Wikidata item (QIDs from page_props); 6–13% of items carry no date of the five kinds.
  - **Many differences are one day apart:** a night action (Action of 14/15 February 1918: Wikipedia 02-14, Wikidata P585 02-15), a putsch dated the day after (1918 Liechtenstein putsch), or an end two days off (African theatre). Others are real: 1914–1915 Muslim revolts in Albania start 1914-05 in Wikidata against 1914-11 in the infobox. Read them as review flags; the cited source stays the Wikipedia quote.
  - Julian values are rare in these topics (1 in WW1, likely Russian), so a calendar conversion isn't worth building yet.

- **Julian-model times are mixed (rulers pilot, 2026-11-22).** Wikidata's convention is that a Julian-model value is the Julian date, but the dump holds both kinds under that label:
  - Henry II of France: start `+1547-03-31` (Julian), the date as Wikipedia writes it;
  - Francis II of France: start `+1559-07-20`, the Gregorian twin of 10 July Julian;
  - Catherine the Great: start `+1762-06-28` (Julian, Old Style) where Wikipedia gives 9 July (New Style).

  `rulers.Sources.terms` keeps the value plus its Julian and Gregorian conversions, and `rulers.agrees` accepts any of the three. Never convert the Wikipedia date: it stays as written.

## Ruler infoboxes (`extract/rulers.py`)

The rulers pass's code is on branch `extract-rulers` (frozen until the context-lines bakeoff picks a design); the lessons below stay here because they apply to any parser of ruler infoboxes.

- **Fields:** monarchs use `reign`, `reign1`, `reign2`… with `succession`, `succession1`… naming the office; office holders use `term_start`/`term_end` (+ `office`). The extractor's lookup tables don't keep these (they aren't date fields), so `rulers.py` reads the ruler's page from the dump.
- **Patterns fixed in `dates.py`** (tests in `test_dates.py`):
  - `{{awrap|10 July 1559}}`, `{{avoid wrap| 19 March 1808}}` (Henry II, Charles IV of Spain);
  - `{{start and end date|1886|05|17|1931|04|14|df=y}}`, singular (Alfonso XIII);
  - a `<br/>` right after the dash, `26 November 1504 – <br/> 12 April 1555` (Joanna of Castile), used to split the range;
  - `17 (6) May 1727`, the New Style day with its Old Style day in parentheses (Peter II of Russia);
  - `{{Gregorian to Julian|23 July 1645}}` (Alexis of Russia).
- **Two reigns, one person:** Philip V of Spain (`reign1` 1700–1724, `reign2` 1724–1746). Napoleon's two are in one field, split by `<br>`. `rulers.picks` places every span that matches a Wikidata term or names the same office.
- **Wrong span for the office:** Alain Poher's infobox has a 24-year Senate term beside his two acting presidencies. Pick the span closest to the Wikidata term, not the one overlapping it most, and drop spans whose office names a non-head office (`rulers.NOT_HEAD`: Senate, government, prime minister, staff…).
- **Polities without office links:** Bourbon Restoration and July Monarchy have no P1906/P35, but their infoboxes list `leader1`, `leader2`…; Tsardom of Russia has neither, so one hop goes from rulers already found to offices named for the row ("Tsar of all Russia").

## Other sources' quirks already met

- **NATO members table** (enwiki-20261101): no accession cell for Italy, the United States, Lithuania, Slovakia or Slovenia. They're cited from prose instead (`modern-states/connections/claims_data.py`, `NATO_FALLBACK`).
- **Connections claims:** every quote is checked verbatim against the cached page (plain text, or wikitext with markup stripped) (`claims_data.py`). A date template's cited day is kept in the locator value (`build_claims.py`).
