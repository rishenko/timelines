"""Rules that read the evidence record (Workbench "2026-11-25 Timelines ruler evidence record design" §3, E3), and the stage's side of the record: the pin
that makes the stage refuse an evidence file it doesn't match (the facts.py and leads.py pattern). Pilot rows only so far: a reign with no record is "not in
the class" for these rules, so every other row classifies exactly as before.

A rule decides only where a feature combination is decisive: `head-by-evidence` (the page is in a category of this row's monarchs or heads of state, nothing
in the lead or the categories says another status, and the reign lies in a phase of the row) and `consort-by-evidence` (a consort category and a consort
lead, and no category of the row's monarchs). Anything else stays unclassified for a person, as before."""
import hashlib
import json
import os

import rules as RU
from rules import rule

HERE = os.path.dirname(os.path.abspath(__file__))
PIN = os.path.join(HERE, 'evidence.pin.json')
POSITIVE = {'monarchs', 'heads-of-state'}
NOT_A_HEAD = {'consorts', 'pretenders', 'usurpers', 'regents', 'co-rulers', 'governors', 'legendary', 'acting-heads'}


def evidence_path(stages):
    return os.path.join(stages, 'L1', 'reign-evidence', 'pilot', 'evidence.jsonl')


def pin_problems(path, pin=PIN):
    """[] when the evidence file matches the committed pin (output sha256 and reign count); else what differs."""
    if not os.path.exists(path):
        return [f'{path}: missing (run pipelines/reign-rules/evidence.py --out <stages>/L1/reign-evidence/pilot)']
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


@rule('head-by-evidence')
def head_by_evidence(reign, ctx, params):
    """Table row "Heads the office text does not settle": the office test, read from the record for a reign the office rule (D14) did not decide. The page is in a category of
    this row's own monarchs or heads of state; no category names another status (consort, pretender, usurper, regent, co-ruler, governor, legendary,
    acting); the lead says no status word; the reign lies in a phase of the row (or, with no dated phases, in the row's years); the page's office names no other row."""
    ev = (ctx.get('evidence') or (lambda r: None))(reign)
    if not ev:
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
