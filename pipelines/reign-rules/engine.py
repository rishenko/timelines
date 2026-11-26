"""One reign through the decision table (Workbench "2026-11-25 Timelines ruler rules as code design" §2). The order of precedence:
a uuid ruling of kind `verdict` (rulings.json), else the FIRST row of the table that matches: a `code` row decides its verdict, a `human`
row means its class needs a ruling (unclassified until one is made; a later code row never overrides it, so a broad row such as the
head-office test can't decide a reign an earlier human class holds), else R14 (unclassified, no rule decides). Table order is the only
precedence: rows run from specific to general. Two matching code rows with different verdicts mark a conflict; the first still decides."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
import reign_verdicts as RV  # noqa: E402

VERDICTS = set(RV.VERDICTS) | set(RV.NEXT) | {'excluded'}
DECIDERS = {'code', 'human'}
FIELDS = ('id', 'class', 'verdict', 'decided_by', 'test')


def table_problems(table, registry):
    """What is wrong with rules.json, given the registered functions: a missing field, an unknown verdict or test, an id used twice."""
    out, seen = [], set()
    for i, r in enumerate(table):
        rid = r.get('id', f'#{i}')
        out += [f'{rid}: no {k}' for k in FIELDS if k not in r]
        if rid in seen:
            out.append(f'{rid}: id used twice')
        seen.add(rid)
        if r.get('verdict') not in VERDICTS:
            out.append(f'{rid}: verdict {r.get("verdict")!r} is not one of {sorted(VERDICTS)}')
        if r.get('decided_by') not in DECIDERS:
            out.append(f'{rid}: decided_by must be one of {sorted(DECIDERS)}')
        if r.get('test') not in registry:
            out.append(f'{rid}: no rule function named {r.get("test")!r} in rules.py')
    return out


def verdict_rulings(rulings):
    """{reign uuid: ruling} for the `verdict` rulings."""
    return {r['subject']: r for r in rulings if r.get('kind') == 'verdict'}


def classify(reign, ctx, table, registry, by_uuid):
    """The output record for one reign (without marks): verdict, rule, decided_by, reason, the rules that matched, and conflict."""
    matched = []
    for r in table:
        why = registry[r['test']](reign, ctx, r.get('params', {}))
        if why:
            matched.append((r, why))
    code = [(r, why) for r, why in matched if r['decided_by'] == 'code']
    out = {'matched': [r['id'] for r, _ in matched], 'conflict': len({r['verdict'] for r, _ in code}) > 1}
    ruling = by_uuid.get(reign['uuid'])
    if ruling:
        kept = ruling['kept'][0]
        return dict(out, verdict=kept['verdict'], rule=ruling['id'], decided_by='human', reason=ruling['headline'])
    if out['conflict']:  # PoC 2 run 15 (Adviser): two code rules disagree, so neither decides; a person rules it
        return dict(out, verdict='unclassified', rule='R15', decided_by='none',
                    reason='two code rules disagree: ' + '; '.join(f"{r['id']} says {r['verdict']}" for r, _ in code))
    if matched:
        r, why = matched[0]
        if r['decided_by'] == 'code':
            return dict(out, verdict=r['verdict'], rule=r['id'], decided_by='code', reason=why)
        return dict(out, verdict='unclassified', rule=r['id'], decided_by='none', reason=f"class {r['class']} needs a ruling ({r['id']}): {why}")
    return dict(out, verdict='unclassified', rule='R14', decided_by='none', reason='no rule decides')


def single_source(reign):
    """One distinct source behind the reign and no agreeing Wikidata term: the freeze review says "Wikidata differs", or the reign has no
    review (hand-authored). The freeze does not carry "no Wikidata term" into the review, so those count as agreeing (an undercount)."""
    keys = {s.get('sourceKey') for s in reign['event'].get('sources', [])}
    differs = any(str(x).startswith('Wikidata differs') for x in reign['review'].get('toCheck', []))
    return len(keys) <= 1 and (differs or not reign['review'])
