"""Rules that read the evidence record (Workbench "2026-11-25 Timelines ruler evidence record design" §3, E3), and the stage's side of the record: the pin
that makes the stage refuse an evidence file it doesn't match (the facts.py and leads.py pattern). Every committed reign has a record since PoC 2 (evidence.py --rows all); a reign with no record is "not in the class" for these rules.

A rule decides only where a feature combination is decisive: `head-by-evidence` (the page is in a category of this row's monarchs or heads of state, nothing
in the lead or the categories says another status, and the reign lies in a phase of the row) and `consort-by-evidence` (a consort category and a consort
lead, and no category of the row's monarchs). Anything else stays unclassified for a person, as before."""
import hashlib
import json
import os
import re

import rules as RU
from rules import rule

HERE = os.path.dirname(os.path.abspath(__file__))
PIN = os.path.join(HERE, 'evidence.pin.json')
POSITIVE = {'monarchs', 'heads-of-state'}
RIVAL_OFFICE = re.compile(r'\b(usurper|northern|southern|rival|anti-|pretender|claimant)\b', re.I)  # an office text that names a rival line: a person rules it
RIVAL_QUALIFIER = {'northern', 'southern'}  # polity-name words: the row's own words (Northern Wei, Northern Kingdom of Israel) are no rival line
NOT_A_HEAD = {'consorts', 'pretenders', 'usurpers', 'regents', 'co-rulers', 'governors', 'legendary', 'acting-heads'}


def evidence_path(stages):
    return os.path.join(stages, 'L1', 'reign-evidence', 'all', 'evidence.jsonl')


def pin_problems(path, pin=PIN):
    """[] when the evidence file matches the committed pin (output sha256 and reign count); else what differs."""
    if not os.path.exists(path):
        return [f'{path}: missing (run pipelines/reign-rules/evidence.py --rows all --out <stages>/L1/reign-evidence/all)']
    with open(pin, encoding='utf-8') as f:
        want = json.load(f)
    with open(path, 'rb') as f:
        data = f.read()
    bad = []
    if hashlib.sha256(data).hexdigest() != want['output_sha256']:
        bad.append('evidence.jsonl differs from evidence.pin.json')
    n = data.count(b'\n')
    if n != want['reigns']:
        bad.append(f"evidence.jsonl has {n} reigns, the pin {want['reigns']}")
    return bad


def load(path):
    """{(timeline, uuid): {feature name: [features]}} from evidence.jsonl."""
    out = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            r = json.loads(line)
            by = {}
            for ft in r['features']:
                by.setdefault(ft['feature'], []).append(ft)
            out[(r['timeline'], r['uuid'])] = by
    return out


def _categories(ev):
    return {f['value']: f for f in ev.get('category_family', [])}


def _own_category(reign, ctx, ev):
    """The category of this row's monarchs or heads of state: its quote shares a word with the row's own words for the reign."""
    own = RU._own_words(reign, ctx)
    cats = _categories(ev)
    return next((cats[v]['quote'] for v in sorted(POSITIVE) if v in cats and RU._words(cats[v]['quote']) & own), None)


def _rival_line(reign, ctx):
    """The office text names a rival line: a rival word, except northern or southern when the row's own name, id or phases carry it (Northern Wei).
    (RU._own_words drops directional words, so the row's text is read here.)"""
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    own = ' '.join([d.get('name', ''), reign['row'].replace('-', ' ')] + list(d.get('phases', []))).lower()
    return any(m.group(1).lower() not in RIVAL_QUALIFIER or m.group(1).lower() not in own for m in RIVAL_OFFICE.finditer(RU.office_of(reign, ctx)))


@rule('head-by-evidence')
def head_by_evidence(reign, ctx, params):
    """Table row "Heads the office text does not settle": the office test, read from the record for a reign the office rule (D14) did not decide. The page is in a category of
    this row's own monarchs or heads of state; no category names another status (consort, pretender, usurper, regent, co-ruler, governor, legendary,
    acting); the office text names no rival line (usurper, northern, southern, rival, pretender, claimant); the lead says no status word; the reign lies in a phase of the row (or, with no dated phases, in the row's years); the page's office names no other row."""
    ev = (ctx.get('evidence') or (lambda r: None))(reign)
    if not ev or _rival_line(reign, ctx):
        return None
    cats = _categories(ev)
    own = _own_category(reign, ctx, ev)
    if not own or NOT_A_HEAD & set(cats) or ev.get('lead_status'):
        return None
    if not RU._in_row_years(reign, ctx) or any(f['value'] is False for f in ev.get('span_in_phase', [])) or any(f['value'] is True for f in ev.get('other_row_office', [])):
        return None
    return f'{own!r}; no other status in the categories or the lead; in a phase of the row'


@rule('consort-by-evidence')
def consort_by_evidence(reign, ctx, params):
    """Table row "Consorts": the page is in a consort category and its lead says consort, and no category names this row's monarchs."""
    ev = (ctx.get('evidence') or (lambda r: None))(reign)
    if not ev or _own_category(reign, ctx, ev):
        return None
    cats = _categories(ev)
    said = [f for f in ev.get('lead_status', []) if f['value'] == 'consort']
    return f'{cats["consorts"]["quote"]!r} and the lead says consort: {said[0]["quote"][:80]!r}' if 'consorts' in cats and said else None


@rule('check-other-realm')
def check_other_realm_rule(reign, ctx, params):
    """Table row C1 (other realm by qualifier): applied in demote_checks after the first pass; as a test it never matches."""
    return None


@rule('check-acting')
def check_acting_rule(reign, ctx, params):
    """Table row C2 (acting in this reign): applied in demote_checks; as a test it never matches."""
    return None


@rule('overlap-post-pass')
def overlap_post_pass(reign, ctx, params):
    """Table row "Co-rulers, rivals and usurpers by overlap" (D6b): decided in demote_overlaps after the first pass, because it needs the other reigns'
    verdicts; as a test it never matches."""
    return None


def _overlap_years(a, b):
    e0 = a['end'] if a['end'] is not None else a['start']
    e1 = b['end'] if b['end'] is not None else b['start']
    return min(e0, e1) - max(a['start'], b['start'])


def demote_overlaps(records, evidence, only_rules=('D14', 'D14b')):
    """A reign the code decided `head` (by one of `only_rules`) whose years overlap another head reign of its row by more than 0 years may be a co-ruler, a
    rival or a usurper (tuning run 0: 12 of the 25 wrong heads on the pilot rows overlapped another head): it becomes unclassified under D6b, class
    co-ruler, for a person to rule. Pilot rows only (reigns with an evidence record), as E3 is. Changes the records in place and returns how many."""
    by_row = {}
    for r in records:
        if r['verdict'] == 'head' and r['start'] is not None and (r['timeline'], r['uuid']) in evidence:
            by_row.setdefault((r['timeline'], r['row']), []).append(r)
    n = 0
    for rs in by_row.values():
        hit = [(r, next(x for x in rs if x is not r and _overlap_years(r, x) > 0)) for r in rs
               if r['decided_by'] == 'code' and r['rule'] in only_rules and any(x is not r and _overlap_years(r, x) > 0 for x in rs)]
        for r, other in hit:  # judged against the first pass, so two overlapping heads are both demoted
            r.update(verdict='unclassified', rule='D6b', decided_by='none', **{'class': 'co-ruler'},
                     reason=f"class co-ruler needs a ruling (D6b): overlaps {other['title']} ({other['start']}–{other['end']}) on the row; a co-ruler, rival or usurper candidate",
                     marks=sorted(set(r['marks']) | {'unclassified'}))
            n += 1
    return n


# PoC 2 checks (Architect design "2026-11-25 Timelines rulers PoC 2 checks design"): a check never decides a verdict. It runs after the first pass and the
# overlap pass on a reign the office rules decided `head` (D14, D14b); when it fires the reign becomes unclassified, needs a ruling, with the check's class.
QUALIFIER = re.compile(r'\b(east|west|north|south|eastern|western|northern|southern|upper|lower|hither|further|greater|lesser)\s+([A-Z][\w\u00c0-\u00ff-]+)', re.I)


def _row_text(reign, ctx):
    """The row's own words for the reign, directional words kept: its name, its id and the phases that overlap the reign's years (as RU._own_words, without dropping them)."""
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    phases = [n for a, b, n in d.get('phase_spans', []) if RU._overlaps(reign, a, b)] if d.get('phase_spans') else list(d.get('phases', []))
    return ' '.join([d.get('name', ''), reign['row'].replace('-', ' ')] + phases).lower()


def check_other_realm(reign, ctx, ev):
    """C1: the office text (the infobox line, else the recorded office) or a category of the monarchs names the row's polity with a qualifier (East, West,
    Upper, Greater...) the row's own words lack: a king of West Francia on the East Francia row."""
    own, text = _row_text(reign, ctx), _row_text(reign, ctx)
    texts = [f['quote'] for f in ev.get('office_infobox', [])] or [f['value'] for f in ev.get('office_recorded', [])]
    texts += [f['quote'] for f in ev.get('category_family', []) if f['value'] in POSITIVE]
    own_words = {w[:4] for w in re.findall(r'[a-z\u00e0-\u00ff]{3,}', own)}
    for t in texts:
        for m in QUALIFIER.finditer(t):
            q, w = m.group(1).lower()[:4], m.group(2).lower()
            if len(w) >= 4 and w[:5] in {x[:5] for x in re.findall(r'[a-z\u00e0-\u00ff]{4,}', own)} and q not in own_words:
                return f"names {m.group(0)!r} ({t[:70]!r}), the row's own words lack {m.group(1).lower()!r}"
    return None


ACTING_OFFICE = re.compile(r'\b(acting|interim|caretaker|transitional)\b', re.I)  # never "provisional": D9's ruling keeps De Nicola and Sun Yat-sen as head


def check_acting(reign, ctx, ev):
    """C2: the lead says acting and the status is this reign's (not another office the person held), or the office text says acting, interim, caretaker or
    transitional. (D9 is the human acting class for the office-text cue; this reads the lead and the evidence record's office text.)"""
    said = [f for f in ev.get('lead_status', []) if f['value'] == 'acting']
    scope = [f for f in ev.get('status_scope', []) if f.get('status') == 'acting' and f['value'] == 'this-reign']
    if said and scope:
        return f"the lead says acting for this reign: {said[0]['quote'][:90]!r}"
    texts = [f['quote'] for f in ev.get('office_infobox', [])] or [f['value'] for f in ev.get('office_recorded', [])]
    hit = next((m for t in texts for m in [ACTING_OFFICE.search(t)] if m), None)
    return f"the office text says {hit.group(1).lower()}: {hit.string[:80]!r}" if hit else None


def co_ruler_evidence(ev):
    """Why the record says the reign was shared, or None: the lead says co-ruler for this reign (status_scope this-reign), a category of co-rulers, or a consort
    of this reign's monarchs (ruling by marriage: jure uxoris)."""
    said = [f for f in ev.get('lead_status', []) if f['value'] == 'co-ruler']
    if said and any(f.get('status') == 'co-ruler' and f['value'] == 'this-reign' for f in ev.get('status_scope', [])):
        return f"the lead says co-ruler for this reign: {said[0]['quote'][:90]!r}"
    cats = _categories(ev)
    if 'co-rulers' in cats:
        return f"a co-rulers category: {cats['co-rulers']['quote']!r}"
    consort = [f for f in ev.get('lead_status', []) if f['value'] == 'consort']
    if consort and any(f.get('status') == 'consort' and f['value'] == 'this-reign' for f in ev.get('status_scope', [])) and set(cats) & POSITIVE:
        return f"ruling by marriage: the lead says consort for this reign and a monarchs category names the row: {consort[0]['quote'][:70]!r}"
    return None


def check_co_ruler(reign, ctx, ev):
    """C3: co-ruler evidence (co_ruler_evidence) on a reign the office rules decided head, with or without an overlap."""
    return co_ruler_evidence(ev)


CHECKS = [('C1', 'other-realm', check_other_realm), ('C2', 'acting', check_acting)]  # C3 (check_co_ruler) was run 11 and reverted: catch 0 vs cost 1


def demote_checks(records, evidence, ctx, checks=None):
    """Runs the checks, in order, over the reigns the code decided head by D14 or D14b (after demote_overlaps). A firing check takes the reign out of the
    code-decided set: unclassified, rule = the check's id, class = its class, for a person to rule. A reign two checks flag keeps the first. Returns {check id: n}."""
    n = {}
    for r in records:
        ev = evidence.get((r['timeline'], r['uuid']))
        if ev is None or r['verdict'] != 'head' or r['decided_by'] != 'code' or r['rule'] not in ('D14', 'D14b'):
            continue
        reign = {'uuid': r['uuid'], 'timeline': r['timeline'], 'row': r['row'], 'event': r['event']}
        for cid, cls, fn in (checks if checks is not None else CHECKS):
            why = fn(reign, ctx, ev)
            if why:
                r.update(verdict='unclassified', rule=cid, decided_by='none', **{'class': cls}, reason=f'class {cls} needs a ruling ({cid}): {why}',
                         marks=sorted(set(r['marks']) | {'unclassified'}))
                n[cid] = n.get(cid, 0) + 1
                break
    return n


@rule('legendary-by-evidence')
def legendary_by_evidence(reign, ctx, params):
    """Table row "Traditional or legendary rulers": the first three sentences of the page's lead call the person legendary or semi-legendary. Shown marked,
    never counted (verdict traditional)."""
    ev = (ctx.get('evidence') or (lambda r: None))(reign)
    said = [f for f in (ev or {}).get('lead_status', []) if f['value'] == 'legendary']
    return f'the lead says legendary: {said[0]["quote"][:90]!r}' if said else None
