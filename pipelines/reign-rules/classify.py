"""
The reign-rules stage of `data:regen` (Workbench "2026-11-25 Timelines ruler rules as code design"; Kevin 2026-11-25: the ruler rules as
data-processing scripts, with scores to track). It reads every committed reign (pipelines/<generator>/reigns.json and *-reigns.json,
events and their freeze review), applies the decision table (rules.json, functions in rules.py, uuid `verdict` rulings in
pipelines/common/rulings.json first: engine.py), and writes, to <stages>/L2/reign-rules/current/ ($TIMELINES_STAGES, else ~/data/stages):

  classified.json   {timeline: [{uuid, row, title, start, end, office, field, verdict, rule, decided_by, reason, class, marks, matched, flags}]}
  excluded.json     [{uuid, timeline, row, title, rule, reason}]: reigns an `excluded` verdict or reigns-excluded.json drops
  validations.json  {check: {"<timeline>/<uuid>": detail}} (validate.py)
  scores.json       {timeline: table, total: table} (scores.py)

and pipelines/out/reign-rules-summary.txt (the printed summary). The office text and field come from the recorded rulers inputs
(facts.py); the stage stops when it can't find them or they don't match the committed rulers record. Nothing under data-src or public changes: until the ruler definition's
table is answered the stage only measures. It exits 1 when the decision table is malformed, or when the files it wrote disagree with its
counts (reigns in = classified + excluded; the per-verdict counts; the scores as re-read): such a run is discarded, not read. The
validations and the scores never fail it.

    python3 -I pipelines/reign-rules/classify.py [--stages DIR] [--write-baseline]

--write-baseline also rewrites pipelines/reign-rules/baseline.json from this run's scores (commit it in the PR that moves them).
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import engine as EN  # noqa: E402
import evidence_rules as ER  # noqa: E402  (registers head-by-evidence and consort-by-evidence)
import leads as LD  # noqa: E402
import facts as FA  # noqa: E402
import rules as RU  # noqa: E402
import rulings as RG  # noqa: E402
import scores as SC  # noqa: E402
import validate as VA  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TIMELINE = {'ancient': 'ancient-classical', 'medieval': 'medieval', 'modern-states': 'modern-states'}
TIMELINES = list(TIMELINE.values())
BASELINE = os.path.join(HERE, 'baseline.json')
EXCLUDED = os.path.join(ROOT, 'pipelines', 'extract', 'reigns-excluded.json')
SUMMARY = os.path.join(ROOT, 'pipelines', 'out', 'reign-rules-summary.txt')


def stages_root():
    return os.environ.get('TIMELINES_STAGES') or os.path.join(os.path.expanduser('~'), 'data', 'stages')


def load(root=ROOT):
    """[(file, timeline, event, review)] for every committed reign, duplicates kept (validate.duplicate_uuid reads them)."""
    out = []
    for gen, tl in TIMELINE.items():
        for p in sorted(glob.glob(os.path.join(root, 'pipelines', gen, 'reigns.json')) + glob.glob(os.path.join(root, 'pipelines', gen, '*-reigns.json'))):
            with open(p, encoding='utf-8') as f:
                j = json.load(f)
            out += [(os.path.relpath(p, root).replace(os.sep, '/'), tl, e, j.get('review', {}).get(e['uuid'], {})) for e in j.get('events', [])]
    return out


def rows(root=ROOT):
    """({timeline: {row: [(start, end)]}}, {timeline: {row: {'name', 'phases': [phase names], 'phase_spans': [(start, end or None, name)]}}}) from data-src."""
    spans, names = {}, {}
    for tl in TIMELINES:
        p = os.path.join(root, 'data-src', f'{tl}.json')
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                tracks = json.load(f)['tracks']
            spans[tl] = {t['id']: VA.spans_of(t) for t in tracks}
            names[tl] = {t['id']: {'name': t.get('name', ''), 'phases': [ph.get('name', '') for ph in t.get('phases', [])],
                                    'phase_spans': VA.phase_spans_of(t)} for t in tracks}
    return spans, names


def listed_excluded(path=EXCLUDED):
    """{(timeline, row): {key: why}} from reigns-excluded.json; a key is 'Person' or 'Person@YYYY'."""
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        j = json.load(f)
    return {(tl, row): keys for tl in TIMELINES for row, keys in j.get(tl, {}).items()}


# v4 record: a ruler's kind, from the verdict the rules reached (`figurehead` and `de-facto` come only from rulings by uuid: code has nothing to match)
KIND = {'head': 'head', 'acting': 'head', 'co-ruler': 'co-ruler', 'usurper': 'head', 'regency': 'regent', 'rival': 'rival', 'ceremonial': 'figurehead', 'de-facto': 'de-facto'}


def run(loaded, spans, table, registry, rulings, listed, offices=None, names=None, leads=None, evidence=None):
    """(records, excluded, hits, reigns_in): the stage's work, no files. offices: {(timeline, uuid): {office, field, route}} (facts.py);
 names: {timeline: {row: {name, phases}}} (rows()); leads: {reign uuid: lead sentences} (leads.py); evidence: {(timeline, uuid): {feature: [features]}} (evidence_rules.load; pilot rows only)."""
    offices = offices or {}
    by_uuid = EN.verdict_rulings(rulings)
    by_row = {}
    for f, tl, e, rv in loaded:
        by_row.setdefault((tl, (e.get('tracks') or [rv.get('row')])[0]), []).append({'uuid': e['uuid'], 'timeline': tl, 'event': e, 'review': rv})
    leads = leads or {}
    ctx = {'spans': spans, 'rows': names or {}, 'by_row': by_row, 'office': lambda r: offices.get((r['timeline'], r['uuid'])), 'lead': lambda r: leads.get(r['uuid'], ''),
           'evidence': lambda r: (evidence or {}).get((r['timeline'], r['uuid']))}
    cls = {r['id']: r['class'] for r in table}
    seen, records, excluded = set(), [], []
    reigns_in = {tl: 0 for tl in TIMELINES}
    for f, tl, e, rv in loaded:
        if (tl, e['uuid']) in seen:
            continue  # a uuid twice in one timeline is counted once and listed by validate.duplicate_uuid
        seen.add((tl, e['uuid']))
        reigns_in[tl] += 1
        row = (e.get('tracks') or [rv.get('row')])[0]
        person = rv.get('person') or e.get('title', '')
        reign = {'uuid': e['uuid'], 'timeline': tl, 'row': row, 'file': f, 'event': e, 'review': rv}
        keys = listed.get((tl, row), {})
        hit = next((k for k in (f'{person}@{e.get("start")}', person) if k in keys), None)
        if hit:
            excluded.append({'uuid': e['uuid'], 'timeline': tl, 'row': row, 'title': e.get('title'), 'rule': 'excluded-list', 'reason': keys[hit]})
            continue
        v = EN.classify(reign, ctx, table, registry, by_uuid)
        fact = offices.get((tl, e['uuid'])) or {}
        if v['verdict'] == 'excluded':
            excluded.append({'uuid': e['uuid'], 'timeline': tl, 'row': row, 'title': e.get('title'), 'rule': v['rule'], 'reason': v['reason']})
            continue
        marks = [m for m, on in (('unclassified', v['verdict'] == 'unclassified'), ('single-source', EN.single_source(reign)), ('conflict', v['conflict'])) if on]
        records.append({'uuid': e['uuid'], 'timeline': tl, 'row': row, 'title': e.get('title'), 'start': e.get('start'), 'end': e.get('end'),
                        'office': fact.get('office'), 'field': fact.get('field'), 'verdict': v['verdict'], 'rule': v['rule'], 'decided_by': v['decided_by'], 'reason': v['reason'],
                        'class': cls.get(v['rule'], 'ruling' if v['decided_by'] == 'human' else 'none'), 'marks': marks, 'matched': v['matched'],
                        'flags': list(rv.get('toCheck', [])), 'event': e})
    ER.demote_overlaps(records, evidence or {})
    ER.demote_checks(records, evidence or {}, ctx)
    for r in records:  # after the post-passes, which change verdicts
        r['kind'] = KIND.get(r['verdict'])
    return records, excluded, VA.run(records, loaded, spans), reigns_in


def count_problems(out_dir, records, excluded, reigns_in, scores):
    """Why the written files can't be trusted ("" lists nothing): every count is re-derived from the files as re-read."""
    with open(os.path.join(out_dir, 'classified.json'), encoding='utf-8') as f:
        cl = json.load(f)
    with open(os.path.join(out_dir, 'excluded.json'), encoding='utf-8') as f:
        ex = json.load(f)
    with open(os.path.join(out_dir, 'scores.json'), encoding='utf-8') as f:
        sc = json.load(f)
    out = []
    for tl in TIMELINES:
        n, x = len(cl.get(tl, [])), sum(e['timeline'] == tl for e in ex)
        if n + x != reigns_in[tl]:
            out.append(f'{tl}: {reigns_in[tl]} reigns in, but {n} classified + {x} excluded in the files')
        if sum(sc[tl]['by_verdict'].values()) != n or sc[tl]['classified'] != n or sc[tl]['excluded'] != x:
            out.append(f'{tl}: scores.json does not match classified.json/excluded.json')
    if sc != scores:
        out.append('scores.json as re-read differs from the run')
    if len(records) != sum(len(v) for v in cl.values()) or len(excluded) != len(ex):
        out.append('the files hold a different number of reigns than the run')
    return out


def main(argv):
    with open(os.path.join(HERE, 'rules.json'), encoding='utf-8') as f:
        table = json.load(f)
    bad = EN.table_problems(table, RU.RULES)
    if bad:
        print('reign rules: the decision table is malformed:\n  ' + '\n  '.join(bad))
        return 1
    inputs = FA.inputs_dir()
    bad = ['no recorded rulers inputs found (set TIMELINES_RULERS_INPUTS to a regression-inputs checkout\'s kc3-inputs)'] if not inputs else FA.record_problems(inputs)
    if bad:
        print('reign rules: the rulers inputs can\'t be used:\n  ' + '\n  '.join(bad))
        return 1
    stages = argv[argv.index('--stages') + 1] if '--stages' in argv else None
    leads_file = LD.leads_path(stages or stages_root())
    bad = LD.record_problems(leads_file)
    if bad:
        print('reign rules: the reign leads can\'t be used:\n  ' + '\n  '.join(bad))
        return 1
    with open(leads_file, encoding='utf-8') as f:
        leads = json.load(f)
    evidence_file = ER.evidence_path(stages or stages_root())
    bad = ER.pin_problems(evidence_file)
    if bad:
        print('reign rules: the evidence record can\'t be used:\n  ' + '\n  '.join(bad))
        return 1
    evidence = ER.load(evidence_file)
    loaded = load()
    spans, names = rows()
    records, excluded, hits, reigns_in = run(loaded, spans, table, RU.RULES, RG.load(), listed_excluded(), FA.offices(inputs, TIMELINES), names, leads, evidence)
    scores = SC.build(records, excluded, hits, reigns_in, TIMELINES)
    out_dir = os.path.join(argv[argv.index('--stages') + 1] if '--stages' in argv else stages_root(), 'L2', 'reign-rules', 'current')
    os.makedirs(out_dir, exist_ok=True)
    public = lambda r: {k: v for k, v in r.items() if k not in ('event', 'timeline')}
    files = {'classified.json': {tl: [public(r) for r in records if r['timeline'] == tl] for tl in TIMELINES}, 'excluded.json': excluded,
             'validations.json': hits, 'scores.json': scores}
    for name, data in files.items():
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
            f.write('\n')
    bad = count_problems(out_dir, records, excluded, reigns_in, json.loads(json.dumps(scores)))
    if bad:
        print('reign rules: the counts disagree; discard this run:\n  ' + '\n  '.join(bad))
        return 1
    baseline = None
    if os.path.exists(BASELINE):
        with open(BASELINE, encoding='utf-8') as f:
            baseline = json.load(f)
    text = SC.summary(scores, SC.deltas(scores, baseline))
    os.makedirs(os.path.dirname(SUMMARY), exist_ok=True)
    with open(SUMMARY, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text + '\n')
    print(text)
    print(f'reign rules: wrote {out_dir}')
    if '--write-baseline' in argv:
        with open(BASELINE, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(scores, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print(f'reign rules: wrote {os.path.relpath(BASELINE, ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
