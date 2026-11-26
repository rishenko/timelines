"""The crew's rulings (wave 2 B1; format in docs/provenance.md): one reviewed answer per question the sources leave open, kept as
data so a generator reads the answer instead of carrying it in code. `date` rulings give a headline date and its claims
(date_rulings.py builds them), `office-scope` rulings say which offices' holders count as a row's rulers (rulers.py reads them), `verdict`
rulings give one reign's ruler verdict (pipelines/reign-rules reads them, ahead of its rule table), and `who`, `where`
and `category` rulings come with the evidence records. `decided_by` names a role (owner or crew), never a person.

    python3 -I pipelines/common/rulings.py        # exits 1 on a malformed ruling or a pointer to a missing one (the CI check)
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reign_verdicts as RV  # noqa: E402

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rulings.json')
KINDS = {'date', 'who', 'where', 'category', 'office-scope', 'verdict'}
VERDICTS = set(RV.VERDICTS) | {'excluded'}  # what a verdict ruling may give (pipelines/reign-rules/engine.py)
RULES = {'head-offices', 'phase-office'}  # what an office-scope ruling tells rulers.py to do
ROLES = {'owner', 'crew'}
REQUIRED = ('id', 'kind', 'subject', 'question', 'headline', 'definition', 'kept', 'rejected', 'sources_read', 'decided_by', 'date')
SUBJECT = re.compile(r'^(row:([a-z0-9-]+/)?[a-z0-9-]+|event:[a-z0-9-]+|reign-[a-z0-9-]+)$')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def load(path=PATH):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def problems(rulings):
    out, seen = [], set()
    for i, r in enumerate(rulings):
        rid = r.get('id', f'#{i}')
        out += [f'{rid}: no {k}' for k in REQUIRED if k not in r]
        if rid in seen:
            out.append(f'{rid}: id used twice')
        seen.add(rid)
        if r.get('kind') not in KINDS:
            out.append(f'{rid}: kind {r.get("kind")!r} is not one of {sorted(KINDS)}')
        if r.get('kind') == 'office-scope' and r.get('rule') not in RULES:
            out.append(f'{rid}: an office-scope ruling needs a rule, one of {sorted(RULES)}')
        if r.get('decided_by') not in ROLES:
            out.append(f'{rid}: decided_by must be a role, one of {sorted(ROLES)}')
        if not SUBJECT.match(str(r.get('subject', ''))):
            out.append(f'{rid}: subject {r.get("subject")!r} is not row:<id>, row:<timeline>/<id>, event:<uuid> or a reign uuid')
        if not DATE.match(str(r.get('date', ''))):
            out.append(f'{rid}: date must be YYYY-MM-DD')
        if not r.get('kept'):
            out.append(f'{rid}: kept is empty')
        if r.get('kind') == 'date' and str(r.get('subject', '')).startswith('reign-'):  # a reign's dates (reigns_freeze.py): each claim names a bound, a page and where on it
            for c in r.get('kept') or []:
                if not (isinstance(c, dict) and c.get('page') and c.get('location') and (c.get('start') or c.get('end'))):
                    out.append(f'{rid}: a reign date claim needs a page, a location and a start and/or end')
                out += [f'{rid}: {side} needs a year' for side in ('start', 'end') if side in c and not isinstance(c[side].get('year'), int)]
        if r.get('kind') == 'verdict':  # one reign's verdict: the subject is its uuid, the one kept claim names the verdict and where it is read
            if not str(r.get('subject', '')).startswith('reign-'):
                out.append(f'{rid}: a verdict ruling\'s subject is a reign uuid')
            k = (r.get('kept') or [{}])[0]
            if len(r.get('kept') or []) != 1 or k.get('verdict') not in VERDICTS or not (k.get('page') and k.get('location')):
                out.append(f'{rid}: a verdict ruling keeps one claim with a verdict (one of {sorted(VERDICTS)}), a page and a location')
        out += [f'{rid}: a rejected value needs value and reason' for x in r.get('rejected', []) if not (x.get('value') and x.get('reason'))]
    return out


def get(rid, rulings=None):
    r = next((r for r in (rulings if rulings is not None else load()) if r['id'] == rid), None)
    if r is None:
        raise SystemExit(f'no ruling {rid!r} in pipelines/common/rulings.json')
    return r


REFERRERS = ['pipelines/v2/overrides/conflicts.json', 'pipelines/v2/overrides/disasters.json', 'pipelines/common/periods.json']


def references(root=os.path.normpath(os.path.join(os.path.dirname(PATH), '..', '..'))):
    """(file, ruling id) for every {"ruling": id} in the files that point to rulings."""
    def walk(x):
        if isinstance(x, dict):
            if isinstance(x.get('ruling'), str):
                yield x['ruling']
            for v in x.values():
                yield from walk(v)
        elif isinstance(x, list):
            for v in x:
                yield from walk(v)
    for f in REFERRERS:
        with open(os.path.join(root, f), encoding='utf-8') as fh:
            yield from ((f, rid) for rid in walk(json.load(fh)))


def office_scope(rule, rulings=None):
    """{(timeline, row id): kept} for the office-scope rulings with this rule."""
    return {tuple(r['subject'][4:].split('/')): r['kept'] for r in (rulings if rulings is not None else load())
            if r['kind'] == 'office-scope' and r.get('rule') == rule}


if __name__ == '__main__':
    ids = {r.get('id') for r in load()}
    bad = problems(load()) + [f'{f}: points to {rid!r}, which is not a ruling' for f, rid in references() if rid not in ids]
    for p in bad:
        print(p)
    print(f'rulings: {len(bad)} problem(s)' if bad else f'rulings: ok ({len(load())})')
    sys.exit(1 if bad else 0)
