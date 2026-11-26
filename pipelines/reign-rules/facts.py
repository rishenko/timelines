"""What a rule may know about a reign beyond its event and review (Workbench "2026-11-25 Timelines ruler rules as code design" §2): the
office text and infobox field the rulers stage read for it, by uuid. They come from the RECORDED rulers inputs (the rulers stage's
output: the regression-inputs branch's kc3-inputs, or ~/data/stages/L2/rulers/current) through `reigns_freeze.py --audit`, the reader
reign_audit.py uses; the inputs must match data-src/provenance/stages/rulers.record.json, so the text is the recorded stage output. No
dump, no refreeze. A hand-authored reign (extra-, hittite-, yamato-… files) has no office here: a rule reads that as "not in the class".

The inputs folder: $TIMELINES_RULERS_INPUTS, else ~/data/stages/L2/rulers/current, else the kc3-inputs folder of a git worktree of
this repo (a regression-inputs checkout), as the template's pr-check finds it."""
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'pipelines', 'extract'))
RECORD = os.path.join(ROOT, 'data-src', 'provenance', 'stages', 'rulers.record.json')


def inputs_dir():
    given = os.environ.get('TIMELINES_RULERS_INPUTS')
    if given:
        return given
    stage = os.path.join(os.environ.get('TIMELINES_STAGES') or os.path.join(os.path.expanduser('~'), 'data', 'stages'), 'L2', 'rulers', 'current')
    if os.path.exists(os.path.join(stage, 'term-labels.json')):
        return stage
    trees = subprocess.run(['git', 'worktree', 'list', '--porcelain'], cwd=ROOT, capture_output=True, text=True).stdout.splitlines()
    for t in (line[9:] for line in trees if line.startswith('worktree ')):
        if os.path.exists(os.path.join(t, 'kc3-inputs', 'term-labels.json')):
            return os.path.join(t, 'kc3-inputs')
    return None


def record_problems(inputs, record=RECORD):
    """The recorded outputs whose sha256 the inputs folder doesn't match ([] when it matches the committed record)."""
    with open(record, encoding='utf-8') as f:
        outs = json.load(f)['outputs']
    bad = []
    for name, o in outs.items():
        p = os.path.join(inputs, name)
        if not os.path.exists(p):
            bad.append(f'{name}: missing')
        elif hashlib.sha256(open(p, 'rb').read()).hexdigest() != o['sha256']:
            bad.append(f'{name}: differs from the record')
    return bad


def offices(inputs, timelines):
    """{(timeline, uuid): {office, field, route}} for every reign the freeze keeps from the recorded inputs."""
    import reign_audit as RA  # pipelines/extract: runs reigns_freeze.py --audit on the inputs (about 2 s a timeline)
    return {(tl, r['uuid']): {'office': r['office'], 'field': r['field'], 'route': r['route']} for tl in timelines for r in RA.audit_rows(inputs, tl)}
