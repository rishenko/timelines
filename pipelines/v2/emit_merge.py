"""Merges the events and sources a v2 emitter wrote (pipelines/v2/emitted/<kind>-<timeline>.json) into a generator's
dataset, refusing a clash of ids, a missing row or a source whose url differs. Called by gen_modern and gen_medieval."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def merge(kind, timeline, data, sources):
    path = os.path.join(HERE, 'emitted', f'{kind}-{timeline}.json')
    if not os.path.exists(path):
        return f'{kind}: no emitted file for {timeline}'
    claims = json.load(open(path))
    have = {e['uuid'] for e in data['events']}
    clash = sorted(e['uuid'] for e in claims['events'] if e['uuid'] in have)
    if clash:
        raise SystemExit(f'{kind} events clash with existing ids: {clash[:5]}')
    for t in claims.get('tracks', []):  # a row the kind brings itself (the conflicts' top-level Wars row)
        if all(t['id'] != x['id'] for x in data['tracks']):
            data['tracks'].append(t)
    rows = {t['id'] for t in data['tracks']}
    for rid, edits in claims.get('rowEdits', {}).items():  # a dated membership on an existing row (the wars' "in <war>" strips)
        row = next((t for t in data['tracks'] if t['id'] == rid), None)
        if row is None:
            raise SystemExit(f'{kind} edits a row this timeline lacks: {rid}')
        for ed in edits:
            m = ed['memberOf']
            if all(x.get('row') != m['row'] for x in row.get('memberOf', [])):
                row.setdefault('memberOf', []).append(m)
    lost = sorted({t for e in claims['events'] for t in e['tracks'] if t not in rows})
    if lost:
        raise SystemExit(f'{kind} events name rows this timeline lacks: {lost}')
    for k, v in claims['sources'].items():
        if k in sources and sources[k].get('url') != v.get('url'):
            raise SystemExit(f'source {k} already exists with another url')
        sources.setdefault(k, v)
    data['events'] += claims['events']
    return f"{kind}: {len(claims['events'])} events"
