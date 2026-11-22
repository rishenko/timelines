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

# ---- the vocabulary: 9 top-level ids (stable), each with a short list of sub-kinds ----
VOCAB = {
    'rule': ('Rulers', {'succession': 'Succession', 'coup': 'Coup or deposition', 'title': 'New title'}),
    'statehood': ('Statehood', {'founded': 'State founded', 'independence': 'Independence', 'union': 'Union', 'dissolved': 'State ends', 'reform': 'New name, form or constitution'}),
    'territory': ('Territory', {'conquest': 'Conquest', 'annexation': 'Annexation', 'cession': 'Cession', 'colony': 'Colony'}),
    'place': ('Cities and places', {'city-founded': 'City founded', 'sack': 'Sack or fall', 'capital-moved': 'Capital moved', 'disaster': 'Disaster'}),
    'conflict': ('Wars and battles', {'war': 'War', 'battle': 'Battle', 'siege': 'Siege', 'invasion': 'Invasion or campaign', 'atrocity': 'Massacre or genocide'}),
    'unrest': ('Revolts', {'revolt': 'Revolt', 'revolution': 'Revolution', 'civil-war': 'Civil war'}),
    'diplomacy': ('Diplomacy', {'treaty': 'Treaty', 'alliance': 'Alliance or bloc', 'vassalage': 'Vassalage'}),
    'society': ('Religion, law and culture', {'religion': 'Religion', 'law': 'Laws', 'culture': 'Culture and learning', 'economy': 'Economy'}),
    'archaeology': ('Archaeology', {'horizon': 'Culture or period', 'site': 'Site', 'find': 'Find or earliest record'}),
}
PARENT = {sub: top for top, (_, subs) in VOCAB.items() for sub in subs}


def facet():
    """The `category` facet as it goes in meta.facets: sub-kinds are values whose `broader` is their top level."""
    values = {}
    for top, (name, subs) in VOCAB.items():
        values[top] = {'name': name}
        for sub, sname in subs.items():
            values[sub] = {'name': sname, 'broader': [top]}
    return {'name': 'Category', 'applies': 'events', 'values': values}


# ---- title and description rules: (pattern, value), most specific first; value is a sub-kind or a top level ----
R = lambda p: re.compile(p, re.I)
TEXT_RULES = [
    (R(r'\b(massacres?|genocide|holocaust|pogroms?|ethnic cleansing|atrocit\w*)\b'), 'atrocity'),
    (R(r'\bsiege\b|\bbesieg'), 'siege'),
    (R(r'\bsack(s|ed)?\b|\bsacking\b|\b(destroy|destroys|destroyed|burn|burns|burned|razed?)\b.*\b(city|town|capital)\b'), 'sack'),
    (R(r'\bbattle\b'), 'battle'),
    (R(r'\bcivil war\b'), 'civil-war'),
    (R(r'\brevolution\b'), 'revolution'),
    (R(r'\b(revolt|rebellion|uprising|insurrection|mutiny|rising|riots?)\b|storming'), 'revolt'),
    (R(r'\bcoup\b|\b(deposed?|deposes|overthrow\w*|ousts?|ousted|assassinat\w*|usurp\w*|murder\w*|(takes?|took|seiz\w*|comes? to|came to|in) power|seiz\w* the throne|stole the throne)\b'), 'coup'),
    (R(r'\b(death of|dies|died|accession|accedes|succeeds|succession|enthroned|crowned|coronation|inherit\w*|regency|rules|reigns?|inaugurat\w*|becomes (the )?(\w+ )?ruler|dynasty|interregnum|rule begins|beys rise)\b'), 'succession'),
    (R(r'\b(assumes|takes|adopts) the titles?\b|\braised to\b|\bproclaimed (king|emperor|empire|kingdom|caliph)\b|\belevated\b|\bbecomes (a |an )?(\w+ ){0,2}(kingdom|king|khagan|khan|emperor|caliph|sultan|elector)\b'), 'title'),
    (R(r'\bwars?\b'), 'war'),
    (R(r'\b(invasions?|invades?|campaigns?|expeditions?|raids?|crusades?|offensives?|interventions?)\b'), 'invasion'),
    (R(r'\b(defeat(s|ed)?)\b'), 'conflict'),
    (R(r'\b(treaty|peace of|accords?|agreement|concordat|convention)\b'), 'treaty'),
    (R(r'\b(alliance|pact|joins?|admitted|league|federat\w*)\b'), 'alliance'),
    (R(r'\b(tributary|vassal\w*|protectorate|suzerainty|homage|client|submits|submission)\b'), 'vassalage'),
    (R(r'\b(breaks? (away|from)|secedes?|secession|leaves|self-rule|autonomy)\b'), 'independence'),
    (R(r'\brecogni[sz]\w*'), 'diplomacy'),
    (R(r'\bindependen\w*\b'), 'independence'),
    (R(r'\b(unif\w*|reunit\w*|united(?! (states|kingdom|provinces|arab|nations|netherlands))|unites|reunif\w*|union|merges?|merged|amalgamation)\b'), 'union'),
    (R(r'\b(dissolved|dissolution|abolished|collapse[sd]?|ends|end of|extinct)\b'), 'dissolved'),
    (R(r'\b(found(s|ed|ing|ation) of [A-Z][a-z]+$|founds? the city|city (is )?founded)\b'), 'city-founded'),
    (R(r'\bcapital\b.*\b(moved?|moves|transferred|relocated)\b|\bmoves? the capital\b|\bmoved? (the )?seat\b|\bdesignated (as )?(the )?capital\b'), 'capital-moved'),
    (R(r'\b(earthquake|plague|famine|flood|eruption|epidemic|fire of)\b'), 'disaster'),
    (R(r'\b(fall of|falls?|captures?|captured|takes?(?! effect| office| power| place)|took(?! effect| office| power| place)|retakes|recaptures?|surrender\w*|expelled|occupation|occupies|takeover)\b'), 'conquest'),
    (R(r'\bpartition\w*|\bsplit\b|\bdivided\b'), 'territory'),
    (R(r'\b(conquests?|conquers?|conquered|reconquest|subjugat\w*|lost to)\b'), 'conquest'),
    (R(r'\b(annex\w*|incorporat\w*|bec[oa]me?s? (\w+ )?part of)\b'), 'annexation'),
    (R(r'\b(cedes?|ceded|cession|sold|purchase|transferred to|passes to|given to|returned to|handed (over )?to|restored to|acquir\w*)\b'), 'cession'),
    (R(r'\babandon\w*'), 'territory'),
    (R(r'\b(colony|coloni[sz]\w*|settle(s|d|ment|rs)?|trading post|arriv\w*|voyage|first fleet)\b'), 'colony'),
    (R(r'\b(renamed?|renames|becomes a (\w+ ){0,2}(republic|dominion|confederation|constitutional monarchy|one-party state|royal province)|republic restored|dominion of|royal province|one-party state|constitution|constitutional|self-govern\w*|responsible government)\b'), 'reform'),
    (R(r'\b(found the|founded|founds|founding|foundation|established|establishment|proclamation|proclaimed|proclaims|declared|creation|created|creates|formed)\b'), 'founded'),
    (R(r'\b(convert\w*|convers\w*|christiani[sz]\w*|islami[sz]\w*|church|council|pilgrimage|mission\w*|religio\w*|temple)\b'), 'religion'),
    (R(r'\b(law|code|edict|reform\w*|constitutiones|charter|bull\b|abolition|abolishes|act|statute|parliament|courts|diploma|privileg\w*|landtag|diet)\b'), 'law'),
    (R(r'\b(alphabet|script|university|academy|literature|art)\b'), 'culture'),
    (R(r'\b(trade|coinage|currency|market|tax)\b'), 'economy'),
    (R(r'\b(level [IVX]+|stratum|tombs?|graveyards?|cemetery|palace|hoard)\b'), 'site'),
    (R(r'\b(earliest|tablets?|pottery|inscriptions?|first known)\b'), 'find'),
    (R(r'\b(culture|horizon|farmers|hunter-\w+|neolithic|phase [IVX]+)\b'), 'horizon'),
]

# ---- the event's own article: infobox types and categories ----
INFOBOX = [
    (R(r'^(military conflict|military operation|battle)$'), 'conflict'),
    (R(r'^(civil conflict|revolution|protest|rebellion)$'), 'unrest'),
    (R(r'^(treaty|international agreement)$'), 'treaty'),
    (R(r'^(earthquake|disaster|pandemic|epidemic|flood|fire)$'), 'disaster'),
    (R(r'^(archaeological site|ancient site|archaeological culture)$'), 'archaeology'),
    (R(r'^(writing system|script)$'), 'culture'),
    (R(r'^(religious building|christian leader|council)$'), 'religion'),
    (R(r'^(legislation|constitution|document)$'), 'law'),
]
CATEGORY = [
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
    (R(r'\bearthquakes\b|\bplague\b|\bfamines\b'), 'disaster'),
]

top = lambda v: PARENT.get(v, v)
# kinds a description may decide on its own (descriptions say "founded" and "end of" about many things)
DESCR_OK = {'conflict', 'unrest', 'place', 'diplomacy'}
# words that are a title's head noun when they end it ("Reform War"); others at the end are verbs or objects
HEAD_NOUNS = {'massacre', 'genocide', 'war', 'wars', 'rebellion', 'revolution', 'revolt', 'uprising', 'coup', 'siege', 'battle', 'campaign', 'invasion', 'conquest', 'treaty', 'massacre', 'mutiny'}
# generic sub-kinds a more specific one of the same top level replaces
WEAK = {'founded'}
PERSON = r'royalty|person|officeholder|monarch|military person|noble|politician|criminal|revolutionary|religious biography|chief'
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
    for c in wp.categories(p['text']):
        h = first_match(CATEGORY, c)
        if h:
            out.append((h[0], f'article "{p["title"]}": category "{c}"'))
            break
    return out


def own_articles(e, ds):
    """Titles of articles that may be the event's own: cited Wikipedia sources, then the event's title."""
    titles = []
    for ref in e.get('sources', []):
        s = ds['sources'].get(ref.get('sourceKey'), {})
        m = WIKI.match(s.get('url', ''))
        if m:
            titles.append(unquote(m.group(1)).replace('_', ' '))
    titles.append(e['title'])
    # a state's article (the row's own) describes the state, not the event: skip articles named like a row
    rows = {t['name'].lower() for t in ds['tracks']}
    return [t for t in dict.fromkeys(titles) if t.lower() not in rows]


def classify(e, ds, wp=None):
    """Up to two categories, main first: [(value, evidence)], or [] when nothing says (left for review)."""
    found = []
    title = e['title']
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
    found += [(v, f'title: "{w}"') for st, v, w in hits if not (m and w.lower() in ('fall of', 'falls')) and not obj(st, w)]
    if wp:
        art = [x for t in own_articles(e, ds) for x in article_evidence(t, wp)]
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
    # a sub-kind beats its own top level from weaker evidence (infobox "military conflict" + title "Siege of" = siege)
    out = []
    for v, ev in found:
        # a new constitution is a reform of the state; "law" beside it repeats it ("Constitution Act")
        if v == 'law' and out and out[0][0] == 'reform':
            continue
        # an infobox's bare "conflict" adds nothing to a revolt or a coup, which are fights already
        if v == 'conflict' and out and top(out[0][0]) in ('unrest', 'rule') and 'infobox' in ev:
            continue
        same = next((i for i, (w, _) in enumerate(out) if top(w) == top(v)), None)
        if same is None:
            out.append((v, ev))
        elif (out[same][0] == top(v) or out[same][0] in WEAK) and v != top(v) and v not in WEAK:
            # a sub-kind beats its top level, and a specific sub-kind beats a generic one ("declares independence")
            out[same] = (v, out[same][1] + '; ' + ev)
    return out[:2]


def check(values, where):
    """Up to two known values with different top levels; raises on anything else (a bad override fails the run)."""
    for v in values:
        if v not in VOCAB and v not in PARENT:
            raise ValueError(f'{where}: unknown category "{v}"')
    if len(values) > 2 or len({top(v) for v in values}) != len(values):
        raise ValueError(f'{where}: at most two categories, with different top levels: {values}')


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
        evidence[e['uuid']] = [[v, ev] for v, ev in cats]
    if evidence_path:
        os.makedirs(os.path.dirname(evidence_path), exist_ok=True)
        lines = [f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sorted(evidence.items())]
        head = {'timeline': data['meta']['id'], 'generator': 'pipelines/common/event_categories.py', 'overrides': os.path.relpath(overrides_path, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(evidence_path))))),
                'note': 'Each event\'s categories, main first, with the evidence for each; "reviewed" = from the overrides file. An empty list: no category yet (review).'}
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
