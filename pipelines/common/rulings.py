"""The crew's rulings (wave 2 B1; format in docs/provenance.md): one reviewed answer per question the sources leave open, kept as
data so a generator reads the answer instead of carrying it in code. `date` rulings give a headline date and its claims
(date_rulings.py builds them), `office-scope` rulings say which offices' holders count as a row's rulers (rulers.py reads them), and `who`, `where`
and `category` rulings come with the evidence records. `decided_by` names a role (owner or crew), never a person.

    python3 -I pipelines/common/rulings.py        # exits 1 on a malformed ruling (the CI check)
"""
import json
import os
import re
import sys

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rulings.json')
KINDS = {'date', 'who', 'where', 'category', 'office-scope'}
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
        out += [f'{rid}: a rejected value needs value and reason' for x in r.get('rejected', []) if not (x.get('value') and x.get('reason'))]
    return out


def get(rid, rulings=None):
    return next(r for r in (rulings if rulings is not None else load()) if r['id'] == rid)


def office_scope(rule, rulings=None):
    """{(timeline, row id): kept} for the office-scope rulings with this rule."""
    return {tuple(r['subject'][4:].split('/')): r['kept'] for r in (rulings if rulings is not None else load())
            if r['kind'] == 'office-scope' and r.get('rule') == rule}


if __name__ == '__main__':
    bad = problems(load())
    for p in bad:
        print(p)
    print(f'rulings: {len(bad)} problem(s)' if bad else f'rulings: ok ({len(load())})')
    sys.exit(1 if bad else 0)
