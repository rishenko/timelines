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
- **Coverage, 1848:** 13 of the 16 expected events that have their own article were found. Misses: Frankfurt National Assembly (legislature infobox), Roman Republic (1849–1850) (country infobox), Chartism (a movement, no event title).
- **Easter Rising:** its campaignbox (Irish independence) covers 1912–1923, so 73 of 82 articles are the wider war. The window sorts the 596 rows outside 1915–1921 last.

## page_props SQL

- QIDs come only from `enwiki-<dump>-page_props.sql.gz` (486 MB), in its `wikibase_item` rows: 10,370,892 QIDs (`extract/page_props.py`).
- Each row is on its own line after the `INSERT INTO … VALUES` line. The first loader looked only at `INSERT` lines and read 0 rows; match rows on every line.

## Wikidata JSON

(Planned; nothing read yet.)
- `wikidata-20261116-all.json.bz2` is 95.7 GiB in a **single** bz2 stream, so pbzip2 doesn't help. It's read with `indexed_bzip2` (parallel) in the extractor's venv.
- Expected, per Wikimedia's documentation (not yet checked against this file): one entity per line, framed by `[` and `]` lines, each line ending in a comma.

## Other sources' quirks already met

- **NATO members table** (enwiki-20261101): no accession cell for Italy, the United States, Lithuania, Slovakia or Slovenia. They're cited from prose instead (`modern-states/connections/claims_data.py`, `NATO_FALLBACK`).
- **Connections claims:** every quote is checked verbatim against the cached page (plain text, or wikitext with markup stripped) (`claims_data.py`). A date template's cited day is kept in the locator value (`build_claims.py`).
