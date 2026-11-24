"""
Headline-date rulings for the generated timelines (2026-11-24; Kevin: "accept both" on the Fable date adjudication, Workbench
"2026-11-24 Timelines date adjudication (Fable)"). The claim lists live here so a row that sits on two timelines (Songhai) gets the same
dates on both; the generators call them. Every quotation was checked against the 2026-11-01 Wikipedia dump (raw wikitext, no AI notice) or
the page itself on 2026-11-24. The rulings:
  Songhai Empire   start c. 1464 (Sonni Ali's accession, the empire's start), with c. 1430 (the end of Mali's hold on Gao) as a claim
  Kingdom of Gao   end c. 1300 (loss of independence), with the infobox's late 1200s and the textbook 1325 as claims
  Polish Golden Age (event, periods.json)  end 1572 (the Jagiellonian era closes with Sigismund II Augustus), 1650 kept as a claim
"""
import wp_claims as G

OPENSTAX = 'openstax-world-history-2'


def songhai_start():
    return [
        {'year': 1464, 'margin': 0, 'source': G.ref('Songhai Empire', 'short description: "Empire in West Africa from c. 1464 to 1591"'),
         'note': 'The article also dates the Sonni dynasty "(c. 1464–1493)" and files the empire under "States and territories established in 1464": Sonni Ali\'s accession, whose conquests made the kingdom an empire.'},
        {'year': 1430, 'source': G.ref('Songhai Empire', 'infobox year_start: c. 1430s'),
         'note': 'The infobox says "c. 1430s", with "Independence from Mali Empire": the end of Mali\'s hold on Gao, before the empire.'},
    ]


def gao_end():
    G.SOURCES.setdefault(OPENSTAX, {
        'name': 'OpenStax, World History, Volume 2, section 3.2, The Songhai Empire (Rice University)',
        'url': 'https://openstax.org/books/world-history-volume-2/pages/3-2-the-songhai-empire', 'accessed': '2026-11-24', 'tags': ['scholarly']})
    return [
        {'year': 1300, 'source': G.ref('Songhai Empire', 'History: "Around 1300, Gao had become prosperous enough to attract the Mali Empire\'s attention. Mali conquered the city"'),
         'note': 'Loss of Gao\'s independence to Mali.'},
        {'year': 1285, 'margin': 15, 'source': G.ref('Gao Empire', 'infobox year_end: Late 1200s'),
         'note': 'The infobox says "Late 1200s"; the body, "Towards the end of the 13th century Gao lost its independence and became part of the expanding Mali Empire."'},
        {'year': 1325, 'source': {'sourceKey': OPENSTAX, 'sourceLocation': '"the kingdom of Mali, which annexed Gao around 1325"'},
         'note': 'The textbook date, tied to Mansa Musa\'s reign.'},
    ]
