"""The rule functions of the reign-rules stage (Workbench "2026-11-25 Timelines ruler rules as code design" §2), by name. rules.json
names each by its `test`. A rule is fn(reign, ctx, params) -> a reason (str) when the reign is in the rule's class, else None; it never
edits anything. reign: {uuid, timeline, row, file, event, review}; ctx: {'spans': {timeline: {row: [(start, end)]}}, 'rows': {timeline:
{row: {'name', 'phases': [phase names], 'phase_spans': [(start, end or None, name)]}}} (data-src: the row's own words are its name and phases, not its id), 'by_row':
{(timeline, row): [{uuid, timeline, event, review}]}, 'office': fn(reign) -> {office, field, route} or None (facts.py; None for a
hand-authored reign: not in the class)}. The quoted date text is in event['sources'][0]['sourceLocation'].

The functions come from the decision table of "2026-11-25 Timelines ruler definition (Fable)" (Kevin took all five recommendations, 2026-11-25). Each names its table row in its docstring. The office text is the recorded stage output; a reign with none (hand-authored, or the freeze read none) is "not in the class" for every rule that reads it. Order in rules.json runs from specific to general."""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'extract')]
import head_spans as HS  # noqa: E402
import office_field_check as OF  # noqa: E402

RULES = {}

# the office text names a head of a state (or a ruler's own title)
HEAD = re.compile(r'\b(president|king|queen|emperor|empress|sultan|shah|tsar|czar|khan|khagan|prince|princess|duke|duchess|grand duke|archduke|pope|caliph|imam|'
                  r'emir|amir|rajah?|maharajah?|negus|pharaoh|doge|tlatoani|voivode|despot|basileus|margrave|count|countess|elector|landgrave|'
                  r'supreme leader|supreme director|bishop of rome|bishop of urgell|head of state|ruler|monarch|chancellor of the state|chairman of the (?:presidency|presidium|state|council of state)|'
                  r'chair of the presidency|captain regent|stadtholder|lord|leader|chief|tsarina|sovereign|archon|tyrant|lugal|ensi|shogun|shōgun|'
                  r'peshwa|bey|dey|pasha|mir|nawab|nizam|sheikh|mullah|kagan|tennō|tenno|wang|gong)\b', re.I)
GOVERNOR = re.compile(r'\b(governors?|governor[- ]general|viceroy|vice-?roy|high commissioner|commissioner|lieutenant[- ]governor|resident|administrator|military governor)\b', re.I)
NOT_A_HEAD = re.compile(r'\b(minister|ambassador|senator|mayor|speaker|secretary|councillor|deputy|vice[- ]president|vice[- ]chancellor|general$|'
                        r'member of|commander|marshal|judge|justice|prefect|chancellor of the university|rector)\b', re.I)
JUNIOR = re.compile(r'\b(caesar|junior|crown prince|heir|designate|king-elect|prince-elect|co-despot|despot-designate)\b', re.I)
CLAIMANT = re.compile(r'\b(claimant|pretender|anti-(?:king|emperor|pope)|self-proclaimed|rival)\b', re.I)
COLLECTIVE_MEMBER = re.compile(r'\bmember of the (?:presidency|collective|federal council|directory|council|junta|triumvirate)', re.I)
REGENT = re.compile(r'\bregent|regency\b', re.I)
CAPTAIN_REGENT = re.compile(r'captain regent', re.I)
CO_RULER = re.compile(r'\b(co-?(?:prince|princess|emperor|empress|king|queen|ruler|regent|consul|president|chair(?:man)?)|joint (?:king|ruler)|co-?rulership)\b', re.I)
ACTING = re.compile(r'\b(acting|interim|caretaker)\b', re.I)
CONSORT = re.compile(r'\bconsort\b', re.I)
# cues in the lead (leads.py: its first two sentences) and in the office text; the exile and claimant classes are read by a person (the definition table: "read, one ruling per case")
# USURPER_CUE is not a rule: under definition v2 `usurper` means a tenure that stayed contested, and how someone came to power (coup, conquest, revolt) is an
# `accession` attribute, never a verdict. The regex stays as the candidate finder for the evidence record's accession attribute (it measured right 38% of the time).
USURPER_CUE = re.compile(r"usurp\w*|seized (?:the )?(?:throne|power|crown|control)|(?:led|leader of|leading) (?:a|the) (?:\w+ )?coup|coup d.état|\bjunta\b|military (?:council|committee)|revolutionary (?:council|committee)|self-proclaimed", re.I)
EXILE_CUE = re.compile(r"government[- ]in[- ]exile|in exile|\bexiled\b|provisional government of (?:the )?(?:republic of )?(?:korea|algeria)|recogni[sz]ed (?:by|as) [^.]{0,60}(?:abroad|countries|states)", re.I)
CLAIMANT_CUE = re.compile(r"\bclaimant|\bpretender|disputed (?:president|claim|leader)|claimed (?:to be|the (?:presidency|throne))|anti-(?:king|emperor)", re.I)
CO_CUE = re.compile(r"jointly with|ruled jointly|joint (?:rule|monarch|ruler)|co-?(?:ruler|monarch|regent|king|queen|emperor|prince|president)|co-ruled|together with (?:his|her) (?:brother|brothers|father|mother|husband|wife)|with his brothers", re.I)
ACTING_LEAD = re.compile(r"\bacting (?:president|head of state|monarch|king|emperor|ruler)|interim (?:president|head of state)|served as acting", re.I)

SPECIFIC = (GOVERNOR, JUNIOR, CLAIMANT, REGENT, CO_RULER, ACTING, CONSORT, COLLECTIVE_MEMBER, NOT_A_HEAD, HS.NOT_A_SEAT)


def rule(name):
    """Registers fn under name: @rule('party-office')."""
    def add(fn):
        if name in RULES:
            raise ValueError(f'rule {name} registered twice')
        RULES[name] = fn
        return fn
    return add


def office_of(reign, ctx):
    """The office text the rulers stage read for this reign, or '' when none (hand-authored reign, or the freeze read none)."""
    d = ctx['office'](reign)
    return (d or {}).get('office') or ''


def lead_of(reign, ctx):
    """The first two sentences of the lead of the page the reign cites (leads.py), or '' when there is none."""
    return (ctx.get('lead') or (lambda r: ''))(reign) or ''


def _cue(reign, ctx):
    """The class a cue in the office text or the lead points to, for a person to read: 'exile', 'claimant' or 'co-ruler'; else None."""
    text = f'{office_of(reign, ctx)} {lead_of(reign, ctx)}'
    for name, rx in (('exile', EXILE_CUE), ('claimant', CLAIMANT_CUE), ('co-ruler', CO_CUE)):
        if rx.search(text):
            return name
    return None


def _acting_by_lead(reign, ctx):
    """The lead says acting (acting president, interim head of state), and the person has this one reign on the row: a lead that says "acting president"
    of a person who also served elected terms describes only one of them."""
    if not ACTING_LEAD.search(lead_of(reign, ctx)):
        return False
    person = reign['review'].get('person')
    same = [r for r in ctx['by_row'].get((reign['timeline'], reign['row']), []) if r['review'].get('person') == person] if person else []
    return len(same) <= 1


def _strip(text):
    return re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', text)


POLITY_NOUNS = {'the', 'and', 'of', 'kingdom', 'empire', 'republic', 'state', 'states', 'duchy', 'principality', 'union', 'dynasty', 'caliphate', 'sultanate',
                'khanate', 'confederation', 'federation', 'commonwealth', 'colony', 'protectorate', 'emirate', 'imamate', 'territory', 'islands', 'island',
                'eastern', 'western', 'northern', 'southern', 'central', 'upper', 'lower', 'great', 'greater', 'first', 'second', 'free', 'holy', 'north', 'south', 'east', 'west',
                'new', 'old', 'saint', 'san', 'sao', 'las', 'los', 'del', 'von', 'van', 'der', 'ben', 'bin', 'abu', 'ibn'}
WORD3 = re.compile(r'[A-Za-zÀ-ÿ]{3,}')


def _words(s):
    """Stems (first six letters) of the 3+ letter words of s, without the bare polity nouns and the, and, of."""
    return {w.lower()[:6] for w in WORD3.findall(re.sub(r'\([^)]*\)', ' ', s)) if w.lower() not in POLITY_NOUNS}


def _row_stems(ctx, timeline, phases=True):
    """{row: stems of the row's own words}: its name, its id and (phases=True) its phases' names; cached on ctx. Other rows' words, for the
    other-realm class, leave the phases out: a phase's regime words (junta, national, united, executive) are not a polity's name."""
    cache = ctx.setdefault('_row_stems', {})
    if (timeline, phases) not in cache:
        cache[(timeline, phases)] = {row: _words(' '.join([d.get('name', ''), row.replace('-', ' ')] + (list(d.get('phases', [])) if phases else [])))
                                     for row, d in ctx['rows'].get(timeline, {}).items()}
    return cache[(timeline, phases)]


def _span(reign):
    e = reign['event']
    return e['start'], (e['end'] if e.get('end') is not None else e['start'] + 1)


def _overlaps(reign, a, b):
    """The reign lies inside [a, b] (b None = ongoing) for more than a shared edge: a reign that ends the year the span starts, or starts the year it
    ends, is outside (Theodosius I, 379-395, on a row that starts in 395); a one-year reign inside the span is inside."""
    e = reign['event']
    s0, s1 = e['start'], (e['end'] if e.get('end') is not None else e['start'])
    b = 10 ** 6 if b is None else b
    return (s0 < b or s0 == s1 == b) and (s1 > a or s0 == s1 == a)


def _in_row_years(reign, ctx):
    """False when the reign lies wholly outside the row's years: no phase overlaps it or, with no phases dated, the row's span does not. True when
    the row has no dated years to test against."""
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    spans = [(a, b) for a, b, _ in d.get('phase_spans', [])] or ctx['spans'].get(reign['timeline'], {}).get(reign['row'], [])
    return not spans or any(_overlaps(reign, a, b) for a, b in spans)


def _own_words(reign, ctx):
    """Stems of the row's own words for this reign: its name and id, and the names of the phases that overlap the reign's years (a phase's regime
    words belong to the years the phase covers: a Jin emperor on china has no Jin phase in 1115-1234)."""
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    phases = [n for a, b, n in d.get('phase_spans', []) if _overlaps(reign, a, b)] if d.get('phase_spans') else list(d.get('phases', []))
    return _words(' '.join([d.get('name', ''), reign['row'].replace('-', ' ')] + phases))


@rule('governor')
def governor(reign, ctx, params):
    """Table row "Governors, governors-general, viceroys, residents, high commissioners": the office is another state's, exercised on its behalf."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is a governor\'s' if o and GOVERNOR.search(o) and not HEAD.search(o) else None


FEMININE = re.compile(r'\b(empress|queen|princess|duchess|countess|margravine|landgravine|sultana|tsarina|despoina|augusta)\b', re.I)
CONSORT_LIST = re.compile(r'empresses|consorts?\b|queens consort|wives|royal women|queens$', re.I)


def _found_only_through_consort_lists(reign, ctx):
    """True when the freeze found the person only through lists of consorts: every list is a consort list, and no office or polity route names her.
    A reigning empress or queen is also on a list of rulers or found through the office (Irene of Athens, Zoe Porphyrogenita, Mary II): rule in her own right."""
    d = ctx['office'](reign) or {}
    parts = [p.strip() for p in (d.get('route') or '').split(';') if p.strip()]
    lists = [p for p in parts if p.startswith('list:')]
    return bool(lists) and len(lists) == len(parts) and all(CONSORT_LIST.search(p) for p in lists)


def _consort_by_route(reign, ctx):
    o = office_of(reign, ctx)
    return bool(o and FEMININE.search(o)) and _found_only_through_consort_lists(reign, ctx)


@rule('consort')
def consort(reign, ctx, params):
    """Table row "Consorts": the office text says consort, or the person was found only through lists of consorts (no list of rulers, no office or
    polity route): a consort in her own right is on a ruler list too. A consort the lead shows ruling is a verdict ruling by uuid."""
    o = office_of(reign, ctx)
    if o and CONSORT.search(o):
        return f'office {o[:60]!r} is a consort\'s'
    return 'found only through lists of consorts, none of rulers' if _consort_by_route(reign, ctx) else None


@rule('junior')
def junior(reign, ctx, params):
    """Table row "Co-rulers": a junior named and never exercising (Caesar, heir, crown prince, designate) is not a reign."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is a junior or designate\'s' if o and JUNIOR.search(o) else None


@rule('collective-member')
def collective_member(reign, ctx, params):
    """Table row "Collective heads of state": the chair is the reign; a member of the collective is another office."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is a member of a collective head' if o and COLLECTIVE_MEMBER.search(o) and not HEAD.search(re.sub(COLLECTIVE_MEMBER, '', o)) else None


@rule('co-ruler')
def co_ruler(reign, ctx, params):
    """Table rows "Co-rulers" and "Collective heads": each Captain Regent (a spell each) and each Co-Prince exercised the office."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is held jointly, each holder exercising it' if o and (CAPTAIN_REGENT.search(o) or re.search(r'co-?princ|bishop of urgell', o, re.I)) else None


@rule('co-ruler-named')
def co_ruler_named(reign, ctx, params):
    """Table row "Co-rulers": a co-emperor, co-king or co-regent counts only if each exercised the office: a reader decides (human class)."""
    o = office_of(reign, ctx)
    if o and CO_RULER.search(o):
        return f'office {o[:60]!r} names a co-ruler'
    return 'the lead names a co-ruler' if CO_CUE.search(lead_of(reign, ctx)) else None


def _regent_beside_monarch(reign, ctx):
    """(is a regent's office, the head who reigned on the row for two years or more of the regency or None)."""
    o = office_of(reign, ctx)
    if not o or not REGENT.search(o) or CAPTAIN_REGENT.search(o) or CO_RULER.search(o):
        return False, None
    s0, s1 = _span(reign)
    for other in ctx['by_row'].get((reign['timeline'], reign['row']), []):
        oo = office_of(other, ctx)
        a0, a1 = _span(other)
        if other['uuid'] != reign['uuid'] and oo and not REGENT.search(oo) and HEAD.search(oo) and min(s1, a1) - max(s0, a0) >= 2:
            return True, other
    return True, None


@rule('regency')
def regency(reign, ctx, params):
    """Table row "Regents": a regency counts only when no monarch reigned on the row in those years (this is the half where none did)."""
    is_regent, monarch = _regent_beside_monarch(reign, ctx)
    return 'a regent, and no head reigned on the row beside the regency' if is_regent and not monarch else None


@rule('regency-with-monarch')
def regency_with_monarch(reign, ctx, params):
    """Table row "Regents", the other half: a regent beside a reigning monarch is not a reign."""
    is_regent, monarch = _regent_beside_monarch(reign, ctx)
    return f'a regent while {monarch["event"]["title"]!r} reigned' if monarch else None


@rule('acting')
def acting(reign, ctx, params):
    """Table row "Acting and interim holders": the title, the office or the lead says acting or interim. Under definition v2 (Kevin: "acting just means they
    took over until a more permanent ruler could be found or voted in") the cue only names candidates: the row is a human row."""
    o = office_of(reign, ctx)
    if _cue(reign, ctx) in ('exile', 'claimant'):  # an exile or a disputed claim is read by a person first
        return None
    if reign['event'].get('title', '').startswith('Acting'):
        return 'the title says acting'
    if o and ACTING.search(o):
        return f'office {o[:60]!r} is acting or interim'
    return 'the lead says acting, and the person has this one reign on the row' if _acting_by_lead(reign, ctx) else None


@rule('claimant')
def claimant(reign, ctx, params):
    """Table rows "Rival claimants" and "Usurpers": the office text says claimant, pretender or anti-king; shown marked, never counted."""
    o = office_of(reign, ctx)
    if not o or not CLAIMANT.search(o):
        return None
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    named = _words(CLAIMANT.sub(' ', o))
    if any(_overlaps(reign, a, b) and named & _words(n) for a, b, n in d.get('phase_spans', [])):  # the row has a phase for this office in these years (the Empire of Nicaea)
        return None
    return f'office {o[:60]!r} is a claimant\'s'


@rule('exile-cue')
def exile_cue(reign, ctx, params):
    """Table row "Exile governments": the office or the lead says government in exile, exiled, or recognised abroad. A person reads it (one ruling per case)."""
    m = EXILE_CUE.search(f'{office_of(reign, ctx)} {lead_of(reign, ctx)}')
    return f'exile cue {m.group(0)!r}' if m else None


@rule('claimant-lead')
def claimant_lead(reign, ctx, params):
    """Table row "Rival claimants with partial recognition": the lead says claimant, pretender, disputed president or anti-king. A person reads it."""
    m = CLAIMANT_CUE.search(lead_of(reign, ctx))
    return f'claimant cue {m.group(0)!r}' if m else None


@rule('other-office')
def other_office(reign, ctx, params):
    """Table row "Another office of the same person": the cited block's office is a minister, an ambassador, a seat, a staff post (head_spans.NOT_A_SEAT
    or the words above) and names no head."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is not a head office' if o and (HS.NOT_A_SEAT.search(o) or NOT_A_HEAD.search(o)) and not HEAD.search(o) else None


@rule('party-office')
def party_office(reign, ctx, params):
    """Table row "Party-states: formal head vs party leader": the office is the presidency, chair or leadership of a party, alliance or movement.
    The class is recognised here; the verdict (de facto leader, or party office out) is a ruling per polity phase (human class)."""
    o = office_of(reign, ctx)
    return f'office {o[:60]!r} is a party\'s' if o and OF.PARTY.search(_strip(o)) else None


@rule('other-realm')
def other_realm(reign, ctx, params):
    """Table row "Office of another polity": the office names another row of the timeline and none of this row's own words. A realm whose monarch is
    its head (Canada) and a phase names are rulings, so the class is recognised here and a ruling decides (human class)."""
    o = office_of(reign, ctx)
    if not o:
        return None
    toks = _words(o)
    if _row_stems(ctx, reign['timeline']).get(reign['row'], set()) & toks:
        return None
    named = sorted(r for r, ws in _row_stems(ctx, reign['timeline'], phases=False).items() if r != reign['row'] and ws & toks)
    return f"office {o[:60]!r} names {', '.join(named[:3])}" if named else None


@rule('head-office')
def head_office(reign, ctx, params):
    """Table row "Supreme religious heads" and the office test itself: the office has a head word and names this row's own state, and (definition v2: a head
    lies inside a phase of the row) the reign lies in the row's years."""
    o = office_of(reign, ctx)
    if not o or not HEAD.search(o) or any(p.search(o) for p in SPECIFIC):  # a more specific class (acting, regent, co-ruler…) names the verdict
        return None
    if _consort_by_route(reign, ctx) or _cue(reign, ctx) or _acting_by_lead(reign, ctx):  # D2's class, or a cue a person reads first (exile, claimant, co-ruler)
        return None
    if not _in_row_years(reign, ctx):  # the office is the row's, but not in the row's years (Theodosius I before the Eastern Roman row starts)
        return None
    toks = _words(o)
    return f'office {o[:60]!r} is the row\'s head office' if _own_words(reign, ctx) & toks else None
