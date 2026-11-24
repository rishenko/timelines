# Glossary

The words the app and the docs use for what a reader sees. App text (labels, tooltips, the Legend, the tour, messages)
and the docs follow this list. A pull request that adds a reader-facing word adds it here, and one that renames a word
renames it everywhere. Field names in the file format can differ (`tracks` for rows); [data-format.md](data-format.md)
gives them.

| Word | Meaning | Not |
|---|---|---|
| **row** | A thing with its own band on the chart: a state, a people, a person or a theme. In the file: `tracks`. | track, lane, swimlane (only to say what a row is like) |
| **sub-row** | A row inside another row. **Expand** shows a row's sub-rows; **collapse** gathers them into the parent row. | sub-track |
| **lifespan** | When a row existed, cited, with uncertain edges and gaps. | era, period |
| **phase** | A named government, dynasty or period within one row, drawn in a strip along its top. Phases can overlap. | era |
| **membership** | A row's dated place in another row (`memberOf`), such as a member state in a union. | (not for regions) |
| **region** | Where a row is placed for filtering and comparison (the file's `memberships` in the regions facet). | membership, category (that's for events) |
| **still going** | A row or event that continues to the timeline's present (`ongoing`). | open-ended |
| **present** | The timeline's own "now", where things still going end. | today |
| **event** | Something that happened, on one row or several: a **bar** from start to end, or a **diamond** for a single date. | item, milestone |
| **key event** | An event that matters most (`importance: 1`): bold, placed first in crowded rows, the only ones at the widest zoom. | milestone, highlight |
| **folded events (+N)** | Events that didn't fit in a crowded row, shown as "+N"; one holding a key event names it. | badge, cluster, group, pill |
| **line** | One of the stacked lines of events within a row ("Show all lines"). | row (inside a row) |
| **category** | What kind of event it was: a **kind** or one of its **sub-kinds**. An event has up to two, the main one first (the file's `memberships` in the events facet). Filters → Categories filters by them. | type, tag, region |
| **kind** | One of the eleven top-level categories (rulers, statehood, territory, cities and places, disasters, wars and battles, revolts, diplomacy, religion, law and culture, archaeology, science and technology), each drawn as a **shape** before an event's title. | type, class |
| **sub-kind** | A narrower category within a kind (a siege within wars and battles). Disasters have two levels of them: a cause (natural, human-caused), then a type (a flood, a transport accident). | subcategory, subtype |
| **shape** | The small mark before an event's title that shows its main category's kind; the Legend lists them. | glyph, icon (in app text) |
| **shared event** | One event on several rows, joined by a thread while selected. | |
| **connection** | A historical link between events: leads to, part of, succeeds, conquers, related. | dependency |
| **uncertain date** | The range of dates the sources allow, from disagreeing date claims and their margins. | |
| **date claim** | What one source says a date is. | |
| **c.** (circa) | An approximate date. | |
| **dating system** | One of several absolute datings of a region that scholars disagree on, chosen in the **Dating** menu. In the file: `chronologies`. | calendar, chronology (in app text) |
| **calendar** | The era names a timeline counts years in (BCE/CE or its own), and whether it has a year 0. | |
| **age** | A named period across the whole timeline, such as the Islamic Golden Age, drawn in the **Ages** strip under the ruler; or across one region, such as the Nile Valley's Old Kingdom, drawn as a line of that region's strip. In the file: context spans of kind `age`, in `meta.context` (the timeline's) or a row's `context` (schema v8; `meta.eras` before). | era, period |
| **era line** | The line on the chart where one era name gives way to the next (BCE to CE, or the timeline's own). | |
| **ruler** | The strip of years along the top of the chart. | time axis (only to say what it is) |
| **zoom step** | How much time each tick of the ruler covers (years, or a quarter, month, week or day). | scale, increment (in app text) |
| **shortened gap** | A long stretch with no events, squeezed on the chart and labelled with the time skipped. | compressed gap, collapsed stretch |
| **neighbouring timeline** | The timeline before or after this one, linked from the ends of the ruler. | parallel timeline |
| **comparison set** | Rows picked from anywhere and shown together, kept in the link. | |
| **shared list** | A list of timelines opened from a link. | collection |
| **table view** | Events and rows as a sortable table, with CSV download. | list view, spreadsheet |
| **Legend** | The key to every symbol, colour and line the open timeline uses. | key |

