"""
Event categories (design: Workbench "2026-11-22 Timelines event categories proposal"). One shared vocabulary for every
timeline, and a classifier that gives each event up to two categories, main first, each with the evidence it rests on.

PILOT STAGE: run on a sample of events to show Kevin the output before any generator uses it.

    pipelines/.venv/bin/python -I pipelines/common/event_categories.py --pilot 20 public/timelines/<id>.json ...

Evidence, strongest first:
  1. the event's own Wikipedia article (a cited source whose article is about the event, else an article with the
     event's title): its infobox type and its categories;
  2. the event's title;
  3. the infobox field the event was read from (event_start, event_end of a state's infobox);
  4. the event's description.
An event with no evidence is left for review. A category is given at the top level when nothing names a sub-kind.
"""
import json
import os
import re
import sys
from urllib.parse import unquote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---- the vocabulary: top-level ids (stable), each with a short list of sub-kinds ----
VOCAB = {
    'rule': ('Rulers', {'succession': 'Succession', 'reign': 'Reign or term', 'interregnum': 'Interregnum', 'coup': 'Coup or deposition', 'title': 'New title'}),
    'statehood': ('Statehood', {'founded': 'State founded', 'independence': 'Independence', 'union': 'Union', 'dissolved': 'State ends', 'reform': 'New name, form or constitution'}),
    'territory': ('Territory', {'conquest': 'Conquest', 'annexation': 'Annexation', 'cession': 'Cession', 'colony': 'Colony'}),
    'place': ('Cities and places', {'city-founded': 'City founded', 'sack': 'Sack or fall', 'capital-moved': 'Capital moved'}),
    # Disasters (Kevin, 2026-11-23): kind → cause → type, three levels (the only kind with three). Names follow the IRDR
    # peril classification as EM-DAT uses it; DISASTER_TYPES below, and pipelines/common/disaster_classes.json for the
    # IRDR family, EM-DAT key and Wikidata class of each value, with every place we merge or rename.
    'disaster': ('Disasters', {'natural': 'Natural', 'human-caused': 'Human-caused'}),
    'conflict': ('Wars and battles', {'war': 'War', 'battle': 'Battle', 'siege': 'Siege', 'invasion': 'Invasion or campaign', 'atrocity': 'Massacre or genocide', 'attack': 'Attack, ambush or raid'}),
    'unrest': ('Revolts', {'revolt': 'Revolt', 'revolution': 'Revolution', 'civil-war': 'Civil war', 'repression': 'Arrests and repression'}),
    'diplomacy': ('Diplomacy', {'treaty': 'Treaty', 'alliance': 'Alliance or bloc', 'vassalage': 'Vassalage'}),
    'society': ('Religion, law and culture', {'religion': 'Religion', 'law': 'Laws', 'culture': 'Culture and learning', 'economy': 'Economy', 'golden-age': 'Golden age or high point'}),
    'science': ('Science and technology', {'discovery': 'Discovery', 'invention': 'Invention', 'work': 'Landmark work'}),
    'archaeology': ('Archaeology', {'horizon': 'Culture or period', 'site': 'Site', 'find': 'Find or earliest record'}),
}
# Disaster types, under their cause: {id: (name, cause)}. A famine is human-caused only when policy or war caused it
# (policy_famine); any other famine is "Drought or crop failure", as EM-DAT reclassified most famines as drought (2023).
DISASTER_TYPES = {
    'eruption': ('Volcanic activity', 'natural'),
    'earthquake': ('Earthquake or tsunami', 'natural'),
    'flood': ('Flood', 'natural'),
    'storm': ('Storm', 'natural'),
    'drought': ('Drought or crop failure', 'natural'),
    'epidemic': ('Epidemic', 'natural'),
    'mass-movement': ('Mass movement', 'natural'),
    'extreme-temperature': ('Extreme temperature', 'natural'),
    'wildfire': ('Wildfire', 'natural'),
    'impact': ('Impact or space weather', 'natural'),
    'infestation': ('Infestation', 'natural'),
    'famine': ('Famine', 'human-caused'),
    'industrial': ('Industrial accident', 'human-caused'),
    'transport': ('Transport accident', 'human-caused'),
    'collapse': ('Structural collapse', 'human-caused'),
    'urban-fire': ('Urban fire', 'human-caused'),
    'spill': ('Spill or pollution', 'human-caused'),
    'crowd-crush': ('Crowd crush', 'human-caused'),
    'accident': ('Accident or explosion', 'human-caused'),
    'nuclear-test': ('Nuclear test', 'human-caused'),
}
PARENT = {sub: top for top, (_, subs) in VOCAB.items() for sub in subs} | {t: cause for t, (_, cause) in DISASTER_TYPES.items()}


def ancestors(v):
    """A value's broader values, nearest first (a type's cause, then its kind)."""
    out = []
    while v in PARENT and PARENT[v] not in out:
        v = PARENT[v]
        out.append(v)
    return out


def facet():
    """The `category` facet as it goes in meta.facets: sub-kinds are values whose `broader` is their top level."""
    values = {}
    for top, (name, subs) in VOCAB.items():
        values[top] = {'name': name}
        for sub, sname in subs.items():
            values[sub] = {'name': sname, 'broader': [top]}
    for t, (tname, cause) in DISASTER_TYPES.items():
        values[t] = {'name': tname, 'broader': [cause]}
    return {'name': 'Category', 'applies': 'events', 'values': values}


# ---- title and description rules: (pattern, value), most specific first; value is a sub-kind or a top level ----
R = lambda p: re.compile(p, re.I)
TEXT_RULES = [
    # science (Kevin, 2026-11-22): a fact found, a device made, a landmark treatise. Resources found are economy, and a
    # modern find of an ancient thing is archaeology (the guards in classify)
    (R(r'\b(discover(s|ed|y|ies)?|theorem|laws? of (motion|planetary|gravit\w*|thermo\w*)|heliocentri\w*|proves|calculates?|measures? the|vaccin\w*|penicillin|calculus|predicts (an? )?(solar |lunar )?eclipse|value of π|\bπ\b)\b'), 'discovery'),
    (R(r'\b(invent\w*|invention|patent\w*|printing press|movable type|telescope|microscope|steam engine|gunpowder|papermaking|compass|telegraph|first (flight|railway|steam\w*))\b'), 'invention'),
    (R(r'\b(treatise|principia|almagest|euclid\W?s elements|encyclop\w*|canon of medicine|de revolutionibus|aryabhatiya)\b'), 'work'),
    (R(r'\b(massacres?|genocide|holocaust|pogroms?|ethnic cleansing|atrocit\w*)\b'), 'atrocity'),
    (R(r'\bsiege\b|\bbesieg'), 'siege'),
    (R(r'\bsack(s|ed)?\b|\bsacking\b|\b(destroy|destroys|destroyed|burns?|burned|burnt|razes?|razed)\b'), 'sack'),
    (R(r'\bbattle\b'), 'battle'),
    # small-scale violence within a war or insurgency (Kevin, 2026-11-22: Easter Rising pilot)
    (R(r'\b(ambush\w*|raids?|raided|attack(s|ed)?|skirmish\w*|snipers?|sniping|bomb(s|ed|ing)?|grenades?|shot dead|shooting|fired on|opened fire|gunfight|booby[- ]trap\w*|surround\w*|killed|killing|shot|shoots|(fatally|mortally) wounded|firing|sweeps? of)\b'), 'attack'),
    # arrests, internment, curfews, prisoners executed, kidnappings, reprisals (Kevin, 2026-11-22)
    (R(r'\b(arrest\w*|abduct\w*|interned|internment|kidnap\w*|reprisals?|curfew|martial law|deport\w*|purges?|crackdown|hanged|prisoners?\b.*\bexecuted|execution of|(is|are|was|were) executed|shoots dead a prisoner|prisoners? (is |are |was |were )?shot)\b'), 'repression'),
    (R(r'\bcivil war\b'), 'civil-war'),
    (R(r'\brevolution\b'), 'revolution'),
    (R(r'\b(revolts?|rebellion|uprising|insurrection|mutin\w*|rising|riots?)\b|storming'), 'revolt'),
    (R(r'\bcoups?\b|\b(deposed?|deposes|overthrow\w*|ousts?|ousted|assassinat\w*|usurp\w*|murder\w*|kills (the )?(last|king|queen|emperor|ruler|sultan|caliph|pharaoh|shah|khan)\b|(?-i:^([A-Z]\S*\s){0,2}[A-Z]\S*) (executed|beheaded|killed|assassinated)\b|(takes?|took|seiz\w*|comes? to|came to|in) power|seiz\w* the throne|stole the throne)\b'), 'coup'),
    (R(r'\b(death of|dies|died|accession|accedes|succeeds|succession|enthroned|crowned|coronation|inherit\w*|regency|regent|rules|reigns?|inaugurat\w*|becomes (the )?(\w+ )?ruler|elections?|elected (\w+ ){0,2}(president|prime minister|king|chancellor|taoiseach|premier|pope|emperor|doge)|dynasty|interregnum|rule begins|beys rise)\b'), 'succession'),
    (R(r'\b(assumes|takes|adopts) the titles?\b|\braised to\b|\bproclaimed (king|emperor|empire|kingdom|caliph)\b|\belevated\b|\bbecomes (a |an )?(\w+ ){0,2}(kingdom|king|khagan|khan|emperor|caliph|sultan|elector|pharaoh|augustus|shah|tsar|negus|basileus)\b'), 'title'),
    (R(r'\bwars?\b'), 'war'),
    (R(r'\b(landings?|invasions?|invades?|campaigns?|expeditions?|crusades?|offensives?|interventions?)\b'), 'invasion'),
    (R(r'\b(defeat(s|ed)?)\b'), 'conflict'),
    (R(r'\b(ceasefire|cease-fire|truce|armistice)\b'), 'diplomacy'),
    (R(r'\bescape\w* from\b|\bjailbreak\b|\bhunger strike\w*'), 'unrest'),
    (R(r'\b(fights?|fought)\b'), 'battle'),
    (R(r'\b((?<!anti-)(?<!pro-)treaty|peace of|accords?|agreements?|compact|concordat|convention)\b'), 'treaty'),
    (R(r'\b(embass\w*|envoys?|sends (\w+ ){1,3}to|sent to|alliance|pact|joins?|free association|marries|married|marriage|admitted|league|federat\w*)\b'), 'alliance'),
    (R(r'\b(tributary|tribute|hegemony|under (\w+ ){1,2}(rule|control|suzerainty)|controls|vassal\w*|protectorate|suzerainty|homage|client|submits|submission)\b'), 'vassalage'),
    (R(r'\b(throws? off|threw off|breaks? (away|from)|secedes?|secession|leaves|self-rule|autonomy)\b'), 'independence'),
    (R(r'\brecogni[sz]\w*'), 'diplomacy'),
    (R(r'\bindependen\w*\b'), 'independence'),
    (R(r'\b(unif\w*|reunit\w*|united(?! (states|kingdom|provinces|arab|nations|netherlands))|unites?|reunif\w*|union|merges?|merged|amalgamation)\b'), 'union'),
    (R(r'\b(dissolved|dissolution|abolished|collapse[sd]?|ends|end of|extinct)\b'), 'dissolved'),
    (R(r'\b(found(s|ed|ing|ation) of [A-Z][a-z]+$|founds? the city|city (is )?founded)\b'), 'city-founded'),
    (R(r'\bcapital\b.*\b(moved?|moves|transferred|relocated)\b|\bmoves? the capital\b|\bmoves? (\w+ ){0,2}capital\b|\bmakes (\w+ ){1,2}(the|its) capital\b|\bmoved? (the )?seat\b|\bdesignated (as )?(the )?capital\b'), 'capital-moved'),
    # disasters: natural types, then human-caused ones; "an explosion in population" is neither; a bare "disaster" is the
    # kind alone (its article's categories may say more)
    # a limnic eruption (Lake Nyos 1986: gas from a lake) is Volcanic activity, as EM-DAT files it (Kevin, 2026-11-23)
    (R(r'\b(eruptions?|erupts?|erupted|volcan\w*|limnic)\b'), 'eruption'),
    (R(r'\b(earthquakes?|tsunamis?)\b'), 'earthquake'),
    (R(r'\b(floods?|flooding|deluge)\b'), 'flood'),
    (R(r'\b(cyclones?|hurricanes?|typhoons?|tornado(es)?|blizzards?|great storm)\b'), 'storm'),
    (R(r'\bdroughts?\b'), 'drought'),
    (R(r'\bfamines?\b'), 'famine'),
    (R(r'\b(plagues?|epidemics?|pandemics?|pestilence|black death|smallpox|cholera)\b'), 'epidemic'),
    # a named slide ("the Storegga Slide", capitalised) is a mass movement; a lowercase "slide" can be anything
    (R(r'\b(landslides?|avalanches?|mudslides?|mudflows?|rockfalls?|lahars?|(?-i:[A-Z]\w+ Slides?))\b'), 'mass-movement'),
    (R(r'\b(heat ?waves?|cold waves?|volcanic winter|year without a summer|extreme (heat|cold))\b'), 'extreme-temperature'),
    (R(r'\b(wildfires?|bushfires?|forest fires?)\b'), 'wildfire'),
    (R(r'\b(impact event|meteor(ite)?s?|asteroid|bolide|airburst|geomagnetic storm|solar storm|tunguska event|carrington event)\b'), 'impact'),
    (R(r'\b(locusts?|infestations?)\b'), 'infestation'),
    (R(r'\b(shipwrecks?|sinking of|air disaster|plane crash|airliner crash|derailment|train crash|rail disaster|ferry disaster|space shuttle \w+ disaster)\b'), 'transport'),
    (R(r'\b(dam (failure|collapse|burst)|building collapse|bridge collapse|(amphitheatre|stadium|tower) collapse|spoil tip)\b'), 'collapse'),
    (R(r'\b(great fire|fire of)\b'), 'urban-fire'),
    (R(r'\b(oil spill|chemical spill|great smog|toxic (leak|spill)|mass poisoning)\b'), 'spill'),
    (R(r'\b(crowd crush|stampede|human crush)\b'), 'crowd-crush'),
    (R(r'\bnuclear (weapons? )?tests?\b'), 'nuclear-test'),
    (R(r'\b(nuclear (disaster|accident)|chemical (disaster|leak)|industrial (disaster|accident)|oil spill|mine disaster)\b'), 'industrial'),
    (R(r'\bexplosion(?! (in|of) (the )?(population|growth|trade|art|culture))\b'), 'accident'),
    # transport accidents (shipwrecks, crashes) have no type yet: Kevin is weighing new types (2026-11-23)
    (R(r'\bdisaster\b'), 'disaster'),
    (R(r'\b(drives? out|drove out|expels?|overruns?|overran|seiz\w*(?! (the throne|power))|fall of|falls?|captures?|captured|takes?(?! effect| office| power| place)|took(?! effect| office| power| place)|retakes|recaptures?|surrender\w*|expelled|occupation|occupies|takeover)\b'), 'conquest'),
    (R(r'\bpartition\w*|\bsplits?\b|\bdivided\b'), 'territory'),
    (R(r'\b(conquests?|conquers?|conquered|reconquest|subjugat\w*|lost to)\b'), 'conquest'),
    (R(r'\b(becomes an? (\w+ ){0,2}province|annex\w*|incorporat\w*|reintegrat\w*|reincorporat\w*|bec[oa]me?s? (\w+ )?part of)\b'), 'annexation'),
    (R(r'\b(cedes?|ceded|cession|sold|purchase|transferred to|passes to|given to|returned to|handed (over )?to|restored to|acquir\w*)\b'), 'cession'),
    (R(r'\babandon\w*|\bwithdraw\w*|\bwithdrew\b|\btroops (leave|left)\b|\bevacuat\w*'), 'territory'),
    (R(r'\b(colon(y|ies)|coloni[sz]\w*|settle(s|d|ment|rs)?|trading post|arriv\w*|voyage|first fleet)\b'), 'colony'),
    (R(r'\b(renamed?|renames|drops the name|(state|kingdom|dynastic|dynasty|country)(\'s)? name|changes? the (state )?name|(becomes )?an? (\w+ ){0,2}(republic|associated state|dominion|confederation|constitutional monarchy|one-party state|royal province)|republic restored|democracy restored|restores democracy|transition to democracy|multi-?party|(first|second|third|fourth|fifth) republic|dominion of|royal province|one-party state|constitution|constitutional|self-govern\w*|responsible government)\b'), 'reform'),
    (R(r'\b(becomes a (\w+ )?state|found the|founded|founds|founding|foundation|established|establishment|proclamation|proclaimed|proclaims|declared|creation|created|creates|formed)\b'), 'founded'),
    (R(r'\b(adopts? (christianity|buddhism|islam|judaism|hinduism|jainism|\w+ism)|becomes (christian|muslim|buddhist|jewish)|baptis\w*|baptiz\w*|renounces? \w*(ism|ity)\b|christianity|buddhism|islam|judaism|hinduism|jainism|zoroastrianism|manichaeism|convert\w*|convers\w*|christiani[sz]\w*|islami[sz]\w*|church|council|pilgrimage|mission\w*|religio\w*|temple)\b'), 'religion'),
    (R(r'\b(law|code|edict|reform\w*|constitutiones|charter|bull\b|abolition|abolishes|act|statute|parliament|courts|diploma|privileg\w*|landtag|diet|amnest\w*|(motion|resolution) (is |was )?passed|passed a (motion|resolution)|bill (is |was )?passed|bill comes into (effect|force)|act (comes into (effect|force)|is passed|was passed)|comes into (effect|force))\b'), 'law'),
    (R(r'\b(alphabet|script|university|academy|literature|art)\b'), 'culture'),
    (R(r'\b(trade|coinage|currency|market|tax)\b'), 'economy'),
    (R(r'\b(level [IVX]+|stratum|tombs?|graveyards?|cemetery|palace|hoard)\b'), 'site'),
    (R(r'\b(earliest|tablets?|pottery|inscriptions?|first known|(first|last) (appear\w*|mention\w*|record\w*|attest\w*))\b'), 'find'),
    (R(r'\b(culture|horizon|farmers|hunter-\w+|neolithic|phase [IVX]+)\b'), 'horizon'),
]

# ---- the event's own article: infobox types and categories ----
INFOBOX = [
    (R(r'^(military conflict|military operation|battle)$'), 'conflict'),
    (R(r'^(civil conflict|revolution|protest|rebellion)$'), 'unrest'),
    (R(r'^(treaty|international agreement)$'), 'treaty'),
    (R(r'^earthquake$'), 'earthquake'),
    (R(r'^(pandemic|epidemic|disease outbreak)$'), 'epidemic'),
    (R(r'^flood$'), 'flood'),
    (R(r'^famine$'), 'famine'),
    (R(r'^(tropical cyclone|hurricane|storm|weather event)$'), 'storm'),
    (R(r'^(eruption|volcanic eruption)$'), 'eruption'),
    (R(r'^(aircraft occurrence|shipwreck|rail accident)$'), 'transport'),
    (R(r'^wildfire$'), 'wildfire'),
    (R(r'^(disaster|fire)$'), 'disaster'),
    (R(r'^(archaeological site|ancient site|archaeological culture)$'), 'archaeology'),
    (R(r'^(writing system|script)$'), 'culture'),
    (R(r'^(religious building|christian leader|council)$'), 'religion'),
    (R(r'^(legislation|constitution|document)$'), 'law'),
]
CATEGORY = [
    (R(r'\b(scientific|astronomical|mathematical|chemical) discoveries\b|\bdiscoveries by\b'), 'discovery'),
    (R(r'\b(mathematics|astronomy|physics|chemistry|medical|science|scientific|engineering) (books|texts|works|treatises)\b'), 'work'),
    (R(r'^sieges\b|\bsieges (of|involving)\b'), 'siege'),
    (R(r'^battles\b|\bbattles (of|involving)\b'), 'battle'),
    (R(r'\bcoups? d.état\b|military coups'), 'coup'),
    (R(r'\bcivil wars\b'), 'civil-war'),
    (R(r'\brevolutions\b'), 'revolution'),
    (R(r'\b(rebellions|uprisings|revolts)\b'), 'revolt'),
    (R(r'^wars (of|involving)\b|\bwars$'), 'war'),
    (R(r'\binvasions\b|military campaigns|military expeditions'), 'invasion'),
    (R(r'^treaties\b|\btreaties (of|involving)\b'), 'treaty'),
    (R(r'\balliances\b'), 'alliance'),
    (R(r'\bpopulated places established in\b'), 'city-founded'),
    (R(r'\bannexation\b'), 'annexation'),
    # "Buildings destroyed by earthquakes" is about a building (the Mausoleum), not an earthquake
    (R(r'(?<!destroyed by )\bearthquakes\b|\btsunamis\b'), 'earthquake'),
    (R(r'\bvolcanic eruptions\b'), 'eruption'),
    (R(r'^floods\b|\bfloods in\b'), 'flood'),
    (R(r'\b(tropical cyclones|hurricanes|typhoons)\b'), 'storm'),
    (R(r'\bdroughts\b'), 'drought'),
    (R(r'\bfamines\b'), 'famine'),
    (R(r'\b(plagues?|pandemics|epidemics)\b'), 'epidemic'),
    (R(r'\bnuclear (weapons )?test(s|ing)?\b'), 'nuclear-test'),
    (R(r'\b(landslides|avalanches|mudslides)\b'), 'mass-movement'),
    (R(r'\b(heat waves|cold waves)\b'), 'extreme-temperature'),
    (R(r'\b(wildfires|bushfires)\b'), 'wildfire'),
    (R(r'\b(impact events|meteorite falls|geomagnetic storms)\b'), 'impact'),
    # not "maritime incidents": the Beirut explosion's ship was storing its cargo, not travelling
    (R(r'\b(shipwrecks|aviation accidents and incidents|railway accidents|spaceflight accidents)\b'), 'transport'),
    (R(r'\b(dam failures|building collapses|bridge disasters)\b'), 'collapse'),
    (R(r'\b(oil spills|chemical spills)\b'), 'spill'),
    (R(r'\b(human stampedes|crowd crushes)\b'), 'crowd-crush'),
    (R(r'\b(nuclear accidents|industrial disasters|chemical disasters)\b'), 'industrial'),
]

top = lambda v: (ancestors(v) or [v])[-1]
NUCLEAR_TEST = R(r'\bnuclear (weapons )?test(s|ing)?\b')
# kinds a description may decide on its own (descriptions say "founded" and "end of" about many things)
DESCR_OK = {'conflict', 'unrest', 'place', 'diplomacy'}
# words that are a title's head noun when they end it ("Reform War"); others at the end are verbs or objects
HEAD_NOUNS = {'massacre', 'genocide', 'war', 'wars', 'rebellion', 'revolution', 'revolt', 'uprising', 'coup', 'siege', 'battle', 'campaign', 'invasion', 'conquest', 'treaty', 'massacre', 'mutiny'}
PREHISTORIC = re.compile(r'\b(neolithic|mesolithic|palaeolithic|paleolithic|chalcolithic|bronze age|iron age)\b', re.I)
STOPWORDS = {'with', 'from', 'into', 'over', 'under', 'against', 'during', 'after', 'before', 'first', 'second', 'third', 'great', 'king', 'kingdom', 'empire', 'battle', 'siege', 'treaty', 'war', 'wars'}
# words that make a founding a state's founding
STATE_NOUN = re.compile(r'\b(state|kingdom|empire|republic|sultanate|caliphate|khanate|emirate|principality|duchy|county of|march of|dynasty|confederation|federation|colony|protectorate|order of)\b', re.I)
# generic sub-kinds a more specific one of the same top level replaces
WEAK = {'founded'}
PERSON = r'royalty|person|officeholder|monarch|military person|noble|politician|criminal|revolutionary|religious biography|chief'
# a ruler's or office-holder's time in office, at the start of a title
REIGN = re.compile(r'^(?:the )?(reign|presidency|premiership|regency|pontificate|chancellorship|principate|tenure) of\b', re.I)
# a sourced gap in rule, as a span (Kevin, 2026-11-23: its own sub-kind, drawn on the reign line)
INTERREGNUM = re.compile(r'\binterregnum\b|\btime of troubles\b', re.I)
REIGN_ANY = re.compile(r"\brules\b|\b(?:first|second|third|fourth) reign\b|\bregency$", re.I)
WIKI = re.compile(r'^https?://en\.wikipedia\.org/wiki/(.+)$')


def first_match(rules, text):
    for pat, value in rules:
        m = pat.search(text)
        if m:
            return value, m.group(0)
    return None


def article_evidence(title, wp):
    """(value, evidence) from the article: its infobox type, else its categories. None if it isn't about an event."""
    p = wp.page(title)
    if not p or wp.ai_flagged(p['text']):
        return []
    out = []
    m = re.search(r'\{\{\s*infobox[ _]+([^|}\n<]+)', p['text'], re.I)
    box = m.group(1).strip().lower() if m else None
    # a state's, place's or person's article (often the source an event is dated from) says nothing about the event
    if box and re.search(r'country|state|empire|kingdom|dynasty|settlement|city|polity|royalty|person|officeholder|monarch|ethnic group|caliphate|sultanate', box):
        return []
    hit = box and first_match(INFOBOX, box)
    if hit:
        out.append((hit[0], f'article "{p["title"]}": infobox {box}'))
    cats = list(wp.categories(p['text']))
    # a nuclear test (Castle Bravo) is one even when "Nuclear accidents and incidents" comes first among its categories
    test = next((c for c in cats if NUCLEAR_TEST.search(c)), None)
    if test:
        out.append(('nuclear-test', f'article "{p["title"]}": category "{test}"'))
        return out
    for c in cats:
        h = first_match(CATEGORY, c)
        if h:
            out.append((h[0], f'article "{p["title"]}": category "{c}"'))
            break
    return out


def own_articles(e, ds):
    """Articles that may be the event's own, with whether each shares a word with the event's title: cited Wikipedia
    sources, then the event's title."""
    titles = []
    for ref in e.get('sources', []):
        s = ds['sources'].get(ref.get('sourceKey'), {})
        m = WIKI.match(s.get('url', ''))
        if m:
            titles.append(unquote(m.group(1)).replace('_', ' '))
    titles.append(e['title'])
    # a state's article (the row's own) describes the state, not the event: skip articles named like a row
    rows = {t['name'].lower() for t in ds['tracks']}
    # a cited article about another event ("Fall of Babylon" cited by "Cyrus revolts against Astyages") isn't this
    # event's own: it must share a significant word with the event's title
    words = lambda x: {w for w in re.findall(r'\w{4,}', x.lower()) if w not in STOPWORDS}
    mine = words(e['title'])
    return [(t, t == e['title'] or bool(words(t) & mine)) for t in dict.fromkeys(titles) if t.lower() not in rows]


# a polity, not a person: "the Nabhani dynasty rules Oman", "the Ottoman Empire rules Egypt"
POLITY = re.compile(r'\b(dynasty|empire|kingdom|caliphate|sultanate|republic|state|confederation|confederacy|league|'
                    r'khanate|emirate|shogunate|company|church|papacy|council|junta|government|regime|crown|duchy|'
                    r'grand duchy|principality|monarchy|union|federation|commonwealth|protectorate|colony|county|'
                    r'electorate|realm|tsardom|khaganate|beylik|imamate|polity|city-state|tribes?|clan|house of)\b', re.I)


def ruler_is_person(x, ds):
    """Whether the subject of "X rules …" is a person: not any row of the timeline (by name or id, so "Rome rules Egypt"
    on Egypt's row isn't a reign either), not any row's phase ("Sasanian Empire"; rows have no aliases), and not a
    polity ("… dynasty", "Duchy of …", "… monarchy")."""
    name = x.strip().lower()
    slug = re.sub(r'\W+', '-', name).strip('-')
    if any(name == t['name'].lower() or slug == t['id'] for t in ds['tracks']):
        return False
    if any(name == p.get('name', '').lower() for t in ds['tracks'] for p in t.get('phases', [])):
        return False
    return not POLITY.search(x)


# A famine caused mainly by policy or war is not a natural disaster (Kevin, 2026-11-23): it is Disasters › Human-caused ›
# Famine; one classed as genocide (the Holodomor) also gets "Massacre or genocide" as its second category (other policy
# famines, e.g. the Great Chinese Famine or Bengal 1943, are not genocide by default). Any other famine is natural:
# "Drought or crop failure". Read from the event's title and its own articles' categories.
POLICY_GENOCIDE = R(r'\bgenocides?\b|\bholodomor\b')
POLICY_FAMINE = R(r'\b(man-made|great leap forward|famines? (caused|created) by|war crimes|blockades?|sieges?|world war|collectivi[sz]ation|requisition\w*)\b')


def policy_famine(e, ds, wp):
    """'genocide', 'policy' or None, from the event's title and its own articles' categories."""
    texts = [e['title']]
    if wp:
        for t, related in own_articles(e, ds):
            p = related and wp.page(t)
            if p:
                texts += list(wp.categories(p['text']))
    if any(POLICY_GENOCIDE.search(x) for x in texts):
        return 'genocide'
    if any(POLICY_FAMINE.search(x) for x in texts):
        return 'policy'
    return None


def classify(e, ds, wp=None):
    """Up to two categories, main first: [(value, evidence)], or [] when nothing says (left for review)."""
    found = []
    title = e['title']
    # "Reign of Sargon", "Presidency of Juárez": a ruler's time in office, as a span, is a reign (Kevin, 2026-11-22: the
    # layout puts reigns on their row's top event lines). A point ("Reign of X begins") stays a succession.
    # Also "Attila rules the Huns" (a person ruling: not any row of the timeline or its phases, not a polity), "…'s second reign",
    # "Gonghe Regency".
    rm = REIGN.match(title) or REIGN_ANY.search(title)
    rs = re.match(r'(.+?)\s+rules\b', title)
    if rs and not ruler_is_person(rs.group(1), ds):
        rm = REIGN.match(title)
    span = e.get('ongoing') or (e.get('end') is not None and e['end'] != e['start'])
    if rm and span:
        found.append(('reign', f'title: "{rm.group(0)}" (a span)'))
    # "Ottoman Interregnum", "Time of Troubles": a gap in rule, as a span (a point stays a succession)
    im = INTERREGNUM.search(title)
    if im and span and not rm:
        found.append(('interregnum', f'title: "{im.group(0)}" (a span)'))
    # "Fall of X": a state ending when X is one of the timeline's rows, else a city falling
    m = re.match(r'(?:the )?fall of (?:the )?([^,;(]+)', title, re.I)
    if m:
        x = m.group(1).strip().lower()
        # one of the event's own rows, named in full or in part ("Mapungubwe" for the Kingdom of Mapungubwe)
        own = [t for t in ds['tracks'] if t['id'] in e['tracks']]
        is_row = any(x in t['name'].lower() or x.replace(' ', '-') in t['id'] for t in own)
        found.append(('dissolved' if is_row else 'sack', f'title: "{m.group(0)}" ({"a row" if is_row else "not a row"})'))
    # "Capture of" or "Execution of" a person: a ruler or leader removed (Kevin, 2026-11-22), when the article says person
    m2 = re.match(r'(capture|execution) of (?:the )?(.+)$', title, re.I)
    if m2 and wp:
        p = wp.page(m2.group(2))
        b = p and re.search(r'\{\{\s*infobox[ _]+([^|}\n<]+)', p['text'], re.I)
        box = b.group(1).strip().lower() if b else ''
        if re.search(PERSON, box):
            found.append(('coup', f'title: "{m2.group(1)} of" a person (article "{p["title"]}": infobox {box})'))
    # every rule that matches the title, in the order the words come: the first-named kind is the main one
    hits = sorted(((mm.start(), v, mm.group(0)) for pat, v in TEXT_RULES for mm in [pat.search(title)] if mm), key=lambda h: h[0])
    # the title's last word is its head noun ("Reform War", "Dominican Restoration War"): a kind it names comes first
    core = re.sub(r'\s*(\([^)]*\)|\d{3,4}(–\d{2,4})?)\s*$', '', title).rstrip()
    head = core.split()[-1].lower() if core else ''
    if head in HEAD_NOUNS:
        hits.sort(key=lambda h: 0 if h[2].lower().split()[-1] == head and h[0] > 0 else 1)
    # "dynasty" as an object ("Alliance with the Almoravid dynasty", "Fall of Liao dynasty") says nothing about a succession
    obj = lambda start, w: w.lower() == 'dynasty' and re.search(r'\b(of|from|with|by|the)\s+(\S+\s+){0,2}$', title[:start], re.I)
    # "Cimmerians destroy the kingdom of Phrygia": destroying a state ends it; destroying a city sacks it
    own_rows = [t for t in ds['tracks'] if t['id'] in e.get('tracks', [])]
    def destroyed_state(w, st):
        rest = title[st + len(w):].lower()
        return bool(STATE_NOUN.search(rest)) or any(t['name'].lower() in rest for t in own_rows if len(t['name']) > 3)
    hits = [(st, 'dissolved' if v == 'sack' and re.match(r'(destroy|raze|burn)', w, re.I) and destroyed_state(w, st) else v, w) for st, v, w in hits]
    # "Sanganakallu Neolithic settlement": a prehistoric settlement is a site, not a colony
    if PREHISTORIC.search(title):
        hits = [(st, 'site' if v == 'colony' else v, w) for st, v, w in hits]
    # science guards: "discovered" with a resource is economy; with earliest/site/find it is a modern find (archaeology)
    if re.search(r'\b(oil|gold|diamonds?|silver|mines?|coal)\b', title, re.I):
        hits = [(st, 'economy' if v == 'discovery' else v, w) for st, v, w in hits]
    if re.search(r'\b(earliest|site|remains|finds?)\b', title, re.I):
        hits = [(st, 'find' if v == 'discovery' else v, w) for st, v, w in hits]
    # "Assyria under Mitanni": under one of the event's rows, without "rule", is vassalage
    um = re.search(r'\bunder (the )?([A-Z][\w-]+( [A-Z][\w-]+)?)', title)
    if um and any(um.group(2).lower() in (t['name'].lower(), t['id'].replace('-', ' ')) for t in own_rows):
        hits.append((um.start(), 'vassalage', um.group(0)))
        hits.sort(key=lambda h: h[0])
    # "shoots dead a prisoner": a killing of a prisoner is repression, not an attack
    rep_at = {st for st, v, _ in hits if v == 'repression'}
    hits = [h for h in hits if not (h[1] == 'attack' and h[0] in rep_at)]
    # "Creation of the Burmese alphabet", "founding of the university": the thing founded is a script, a school or a
    # church, not a state, unless the title also names a state
    society_obj = any(top(v) == 'society' for _, v, _ in hits) and not STATE_NOUN.search(title)
    found += [(v, f'title: "{w}"') for st, v, w in hits
              if not (m and w.lower() in ('fall of', 'falls')) and not obj(st, w) and not (society_obj and v == 'founded')]
    if wp:
        # an article that shares no word with the event is context, not the event: it may only place it in a culture
        pairs = [(x, related) for t, related in own_articles(e, ds) for x in article_evidence(t, wp)]
        art = [x for x, related in pairs if related]
        # with nothing else to go on, an unrelated article may still place the event in an archaeological culture
        if not found and not art:
            art = [x for x, related in pairs if top(x[0]) == 'archaeology']
        # categories name sub-kinds; the infobox only the broad kind ("military conflict" also covers revolts)
        found += [x for x in art if 'category' in x[1]] + [x for x in art if 'infobox' in x[1]]
    for ref in e.get('sources', []):
        loc = ref.get('sourceLocation', '')
        if loc.startswith('infobox event_start') or loc.startswith('infobox established_event1:'):
            found.append(('founded', f'infobox field: {loc.split(":")[0][8:]}'))
        elif loc.startswith('infobox event_end'):
            found.append(('dissolved', f'infobox field: {loc.split(":")[0][8:]}'))
    if not found and e.get('descr'):
        hit = first_match([r for r in TEXT_RULES if top(r[1]) in DESCR_OK], e['descr'])
        if hit:
            found.append((hit[0], f'description: "{hit[1]}"'))
    # a famine: human-caused when policy or war caused it (and genocide second when classed as one), else natural
    if any(v == 'famine' for v, _ in found):
        pf = policy_famine(e, ds, wp)
        if pf is None:
            found = [('drought', ev + '; no policy or war cause found') if v == 'famine' else (v, ev) for v, ev in found]
        elif pf == 'genocide' and not any(v == 'atrocity' for v, _ in found):
            i = next(i for i, (v, _) in enumerate(found) if v == 'famine')
            found.insert(i + 1, ('atrocity', found[i][1] + '; a famine by policy, classed as genocide'))
    # a sub-kind beats its own top level from weaker evidence (infobox "military conflict" + title "Siege of" = siege)
    out = []
    for v, ev in found:
        # a ruler killed is a coup; "attack" beside it repeats the killing
        if v == 'attack' and out and out[0][0] == 'coup':
            continue
        # a new constitution is a reform of the state; "law" beside it repeats it ("Constitution Act")
        if v == 'law' and out and out[0][0] == 'reform':
            continue
        # an infobox's bare "conflict" adds nothing to a revolt or a coup, which are fights already
        if v == 'conflict' and out and top(out[0][0]) in ('unrest', 'rule') and 'infobox' in ev:
            continue
        same = next((i for i, (w, _) in enumerate(out) if top(w) == top(v)), None)
        # a cascade (Kevin, 2026-11-23): one disaster type triggering another keeps both, the first named (the trigger)
        # first: "Tōhoku earthquake and tsunami" → earthquake; "typhoon … dam failure" → storm, then structural collapse
        cascade = same is not None and v in DISASTER_TYPES and out[same][0] in DISASTER_TYPES and out[same][0] != v
        if same is None or (cascade and len(out) < 2):
            out.append((v, ev))
        elif (out[same][0] in ancestors(v) or out[same][0] in WEAK) and v != top(v) and v not in WEAK:
            # a sub-kind beats its top level (or its cause, for a disaster type), and a specific sub-kind beats a generic
            # one ("declares independence")
            out[same] = (v, out[same][1] + '; ' + ev)
    # a war-made disaster (Kevin, 2026-11-23: the 1938 Yellow River dike breach): the conflict first, the hazard second
    # (a genocide is not a war making a disaster: the Holodomor stays Famine first, Kevin's famine rule)
    if len(out) == 2 and top(out[1][0]) == 'conflict' and out[1][0] != 'atrocity' and top(out[0][0]) == 'disaster':
        out = [out[1], out[0]]
    return out[:2]


def check(values, where):
    """Up to two known values, not a sub-kind beside its own kind; raises on anything else (a bad override fails the run)."""
    for v in values:
        if v not in VOCAB and v not in PARENT:
            raise ValueError(f'{where}: unknown category "{v}"')
    # two sub-kinds of one kind are fine (Statute of Westminster: reform, then independence; Kevin, 2026-11-22); a value
    # beside its own kind repeats it
    if len(values) > 2 or len(set(values)) != len(values) or any(w in ancestors(v) for v in values for w in values if v != w):
        raise ValueError(f'{where}: at most two different categories, and not a value beside one it is part of: {values}')


def apply(data, overrides_path, evidence_path=None):
    """
    Adds the `category` facet to meta.facets and each event's categories to its memberships (main first), in place.
    Reviewed overrides win: overrides_path is {"<event uuid>": ["<value>", ...]} (an empty list: no category).
    Each membership cites the event's first source, the article it is dated from. evidence_path, if given, gets one
    line per event: its categories and what each rests on (the classifier's evidence, or "reviewed").
    Returns {"classified", "reviewed", "none"} counts.
    """
    import wp_dump as wp
    data['meta'].setdefault('facets', {})['category'] = facet()
    overrides = {k: v for k, v in json.load(open(overrides_path)).items() if not k.startswith('_')} if os.path.exists(overrides_path) else {}
    uuids = {e['uuid'] for e in data['events']}
    for k, v in overrides.items():
        if k not in uuids:
            raise ValueError(f'{overrides_path}: no event "{k}"')
        check(v, f'{overrides_path} "{k}"')
    counts = {'classified': 0, 'reviewed': 0, 'none': 0}
    evidence = {}
    for e in data['events']:
        if e['uuid'] in overrides:
            cats = [(v, 'reviewed') for v in overrides[e['uuid']]]
            counts['reviewed'] += 1
        else:
            cats = classify(e, data, wp)
            counts['classified' if cats else 'none'] += 1
        check([v for v, _ in cats], f'event "{e["uuid"]}"')
        rest = [m for m in e.get('memberships', []) if m.get('facet') != 'category']
        mine = [{'facet': 'category', 'value': v, 'sources': [dict(e['sources'][0])]} for v, _ in cats]
        if rest or mine:
            e['memberships'] = mine + rest
        else:
            e.pop('memberships', None)
        # a reviewed "no category" is marked, so only unreviewed events have an empty list (the review queue)
        evidence[e['uuid']] = [[v, ev] for v, ev in cats] if cats or e['uuid'] not in overrides else [[None, 'reviewed: no category']]
    if evidence_path:
        os.makedirs(os.path.dirname(evidence_path), exist_ok=True)
        lines = [f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sorted(evidence.items())]
        head = {'timeline': data['meta']['id'], 'generator': 'pipelines/common/event_categories.py', 'overrides': os.path.relpath(overrides_path, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(evidence_path))))),
                'note': 'Each event\'s categories, main first, with the evidence for each; "reviewed" = from the overrides file. An empty list: not reviewed yet (the review queue); [null, "reviewed: no category"]: reviewed, and none fits.'}
        open(evidence_path, 'w').write(json.dumps(head, indent=1, ensure_ascii=False)[:-2] + ',\n "events": {\n' + ',\n'.join(lines) + '\n }\n}\n')
    return counts


def pilot(files, n):
    try:
        import wp_dump as wp
    except Exception as err:  # no dump on this machine: title and field evidence only
        print(f'(no Wikipedia dump: {err})', file=sys.stderr)
        wp = None
    for f in files:
        ds = json.load(open(f))
        evs = ds['events']
        step = max(1, len(evs) // n)
        sample = [evs[i] for i in range(step // 2, len(evs), step)][:n]
        print(f'\n### {ds["meta"]["title"]} ({len(sample)} of {len(evs)} events, every {step}th)\n')
        print('| Event | Rows | Main | Second | Evidence |')
        print('|---|---|---|---|---|')
        for e in sample:
            cats = classify(e, ds, wp)
            fmt = lambda c: f'{top(c[0])}' + (f' / {c[0]}' if c[0] != top(c[0]) else '') if c else '—'
            evid = ' · '.join(ev for _, ev in cats) or '**review**'
            rows = ', '.join(e['tracks'][:3]) + (' …' if len(e['tracks']) > 3 else '')
            print(f'| {e["title"]} | {rows} | {fmt(cats[0] if cats else None)} | {fmt(cats[1] if len(cats) > 1 else None)} | {evid} |')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--pilot']:
        pilot(a[2:], int(a[1]))
    else:
        print(__doc__)
